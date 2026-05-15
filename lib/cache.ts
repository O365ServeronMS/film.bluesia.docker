import crypto from "crypto";
import path from "path";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "fs/promises";

const DEFAULT_CACHE_ROOT = "/tmp/film-bluesia-net-cache";
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024 * 1024;
const DEFAULT_IMAGE_TTL_SECONDS = 60 * 60 * 24 * 15;
const DEFAULT_DETAIL_TTL_SECONDS = 60 * 60 * 24 * 15;
const DEFAULT_TAXONOMY_TTL_SECONDS = 60 * 60 * 24 * 15;
const DEFAULT_LIST_TTL_SECONDS = 60 * 5;
const DEFAULT_SEARCH_TTL_SECONDS = 60 * 30;
const PRUNE_INTERVAL_MS = 10 * 60 * 1000;
const PRUNE_TARGET_RATIO = 0.9;

let lastPruneAt = 0;

type CacheMeta = {
  key: string;
  namespace: string;
  contentType?: string;
  sourceUrl?: string;
  cachedAt: string;
};

type CacheEntry = {
  dir: string;
  namespace: string;
  size: number;
  mtimeMs: number;
};

export type BinaryCacheHit = {
  body: Buffer;
  contentType: string;
  sourceUrl?: string;
};

function firstDefinedEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

function numberFromEnvs(names: string[], fallback: number) {
  for (const name of names) {
    const value = Number(process.env[name]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return fallback;
}

export function cacheRoot() {
  return firstDefinedEnv(["FILM_BLUESIA_NET_CACHE_DIR", "BLUESIA_CACHE_DIR", "IMAGE_CACHE_DIR"]) || DEFAULT_CACHE_ROOT;
}

export function cacheMaxBytes() {
  return numberFromEnvs(["FILM_BLUESIA_NET_CACHE_MAX_BYTES", "BLUESIA_CACHE_MAX_BYTES"], DEFAULT_MAX_BYTES);
}

export function imageCacheTtlSeconds() {
  return numberFromEnvs(
    ["FILM_BLUESIA_NET_IMAGE_CACHE_TTL_SECONDS", "BLUESIA_IMAGE_CACHE_TTL_SECONDS"],
    numberFromEnvs(["FILM_BLUESIA_NET_CACHE_TTL_SECONDS", "BLUESIA_CACHE_TTL_SECONDS"], DEFAULT_IMAGE_TTL_SECONDS)
  );
}

export function detailCacheTtlSeconds() {
  return numberFromEnvs(
    ["FILM_BLUESIA_NET_DETAIL_CACHE_TTL_SECONDS", "BLUESIA_DETAIL_CACHE_TTL_SECONDS"],
    numberFromEnvs(["FILM_BLUESIA_NET_CACHE_TTL_SECONDS", "BLUESIA_CACHE_TTL_SECONDS"], DEFAULT_DETAIL_TTL_SECONDS)
  );
}

export function taxonomyCacheTtlSeconds() {
  return numberFromEnvs(["FILM_BLUESIA_NET_TAXONOMY_CACHE_TTL_SECONDS", "BLUESIA_TAXONOMY_CACHE_TTL_SECONDS"], detailCacheTtlSeconds());
}

export function listCacheTtlSeconds() {
  return numberFromEnvs(["FILM_BLUESIA_NET_LIST_CACHE_TTL_SECONDS", "BLUESIA_LIST_CACHE_TTL_SECONDS"], DEFAULT_LIST_TTL_SECONDS);
}

export function searchCacheTtlSeconds() {
  return numberFromEnvs(["FILM_BLUESIA_NET_SEARCH_CACHE_TTL_SECONDS", "BLUESIA_SEARCH_CACHE_TTL_SECONDS"], DEFAULT_SEARCH_TTL_SECONDS);
}

function safeNamespace(namespace: string) {
  return namespace.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
}

function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function entryDir(namespace: string, key: string) {
  return path.join(cacheRoot(), safeNamespace(namespace), hashKey(key));
}

function dataPath(namespace: string, key: string, extension: "bin" | "json") {
  return path.join(entryDir(namespace, key), `data.${extension}`);
}

function metaPath(namespace: string, key: string) {
  return path.join(entryDir(namespace, key), "meta.json");
}

function isFresh(mtimeMs: number, ttlSeconds: number) {
  return Date.now() - mtimeMs <= ttlSeconds * 1000;
}

async function fileSize(filePath: string) {
  try {
    const info = await stat(filePath);
    return info.isFile() ? info.size : 0;
  } catch {
    return 0;
  }
}

async function dirSize(dir: string): Promise<number> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const sizes = await Promise.all(entries.map(async (entry) => {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) return dirSize(child);
      if (entry.isFile()) return fileSize(child);
      return 0;
    }));
    return sizes.reduce((total, size) => total + size, 0);
  } catch {
    return 0;
  }
}

async function listCacheEntries() {
  const root = cacheRoot();
  const result: CacheEntry[] = [];

  try {
    const namespaces = await readdir(root, { withFileTypes: true });

    for (const namespace of namespaces) {
      if (!namespace.isDirectory()) continue;
      const namespacePath = path.join(root, namespace.name);
      const entries = await readdir(namespacePath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const dir = path.join(namespacePath, entry.name);
        const dataBin = path.join(dir, "data.bin");
        const dataJson = path.join(dir, "data.json");
        const dataInfo = await stat(dataBin).catch(() => stat(dataJson).catch(() => null));
        const size = await dirSize(dir);
        result.push({ dir, namespace: namespace.name, size, mtimeMs: dataInfo?.mtimeMs || 0 });
      }
    }
  } catch {
    return [];
  }

  return result;
}

function ttlForNamespace(namespace: string) {
  if (namespace === "images") return imageCacheTtlSeconds();
  if (namespace === "metadata-list") return listCacheTtlSeconds();
  if (namespace === "metadata-search") return searchCacheTtlSeconds();
  if (namespace === "metadata-detail") return detailCacheTtlSeconds();
  if (namespace === "metadata-taxonomy") return taxonomyCacheTtlSeconds();
  return detailCacheTtlSeconds();
}

export async function cacheStats() {
  const entries = await listCacheEntries();
  const namespaces = new Map<string, { bytes: number; entries: number }>();

  for (const entry of entries) {
    const current = namespaces.get(entry.namespace) || { bytes: 0, entries: 0 };
    current.bytes += entry.size;
    current.entries += 1;
    namespaces.set(entry.namespace, current);
  }

  return {
    root: cacheRoot(),
    maxBytes: cacheMaxBytes(),
    totalBytes: entries.reduce((total, entry) => total + entry.size, 0),
    entries: entries.length,
    ttlSeconds: {
      images: imageCacheTtlSeconds(),
      metadataList: listCacheTtlSeconds(),
      metadataSearch: searchCacheTtlSeconds(),
      metadataDetail: detailCacheTtlSeconds(),
      metadataTaxonomy: taxonomyCacheTtlSeconds()
    },
    namespaces: Object.fromEntries(namespaces.entries())
  };
}

export async function pruneCache(force = false) {
  const now = Date.now();
  if (!force && now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;

  const maxBytes = cacheMaxBytes();
  let entries = await listCacheEntries();

  const expired = entries.filter((entry) => !isFresh(entry.mtimeMs, ttlForNamespace(entry.namespace)));
  await Promise.all(expired.map((entry) => rm(entry.dir, { recursive: true, force: true }).catch(() => undefined)));

  entries = (await listCacheEntries()).sort((a, b) => a.mtimeMs - b.mtimeMs);
  let totalBytes = entries.reduce((total, entry) => total + entry.size, 0);
  const targetBytes = Math.floor(maxBytes * PRUNE_TARGET_RATIO);

  for (const entry of entries) {
    if (totalBytes <= targetBytes) break;
    await rm(entry.dir, { recursive: true, force: true }).catch(() => undefined);
    totalBytes -= entry.size;
  }
}

export async function readBinaryCache(namespace: string, key: string, ttlSeconds = ttlForNamespace(namespace)): Promise<BinaryCacheHit | null> {
  const bodyPath = dataPath(namespace, key, "bin");
  const metadataPath = metaPath(namespace, key);

  try {
    const bodyInfo = await stat(bodyPath);
    if (!isFresh(bodyInfo.mtimeMs, ttlSeconds)) return null;

    const [body, metaRaw] = await Promise.all([
      readFile(bodyPath),
      readFile(metadataPath, "utf8").catch(() => "{}")
    ]);
    const meta = JSON.parse(metaRaw) as Partial<CacheMeta>;

    return {
      body,
      contentType: meta.contentType || "application/octet-stream",
      sourceUrl: meta.sourceUrl
    };
  } catch {
    return null;
  }
}

export async function writeBinaryCache(namespace: string, key: string, body: Buffer, contentType: string, sourceUrl?: string) {
  const dir = entryDir(namespace, key);
  await mkdir(dir, { recursive: true });

  const meta: CacheMeta = {
    namespace: safeNamespace(namespace),
    key,
    contentType,
    sourceUrl,
    cachedAt: new Date().toISOString()
  };

  await Promise.all([
    writeFile(dataPath(namespace, key, "bin"), body),
    writeFile(metaPath(namespace, key), JSON.stringify(meta))
  ]);

  pruneCache(false).catch(() => undefined);
}

export async function readJsonCache<T>(namespace: string, key: string, ttlSeconds = ttlForNamespace(namespace), allowExpired = false): Promise<T | null> {
  const bodyPath = dataPath(namespace, key, "json");

  try {
    const bodyInfo = await stat(bodyPath);
    if (!allowExpired && !isFresh(bodyInfo.mtimeMs, ttlSeconds)) return null;

    const body = await readFile(bodyPath, "utf8");
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

export async function writeJsonCache(namespace: string, key: string, value: unknown, sourceUrl?: string) {
  const dir = entryDir(namespace, key);
  await mkdir(dir, { recursive: true });

  const meta: CacheMeta = {
    namespace: safeNamespace(namespace),
    key,
    contentType: "application/json",
    sourceUrl,
    cachedAt: new Date().toISOString()
  };

  await Promise.all([
    writeFile(dataPath(namespace, key, "json"), JSON.stringify(value)),
    writeFile(metaPath(namespace, key), JSON.stringify(meta))
  ]);

  pruneCache(false).catch(() => undefined);
}
