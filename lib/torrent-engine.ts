import torrentStream from 'torrent-stream';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Configuration
const TMP_DIR = path.join(os.tmpdir(), 'torrents');
const CACHE_LIFETIME = 6 * 60 * 60 * 1000; // Trở lại 6 giờ cho dự án cá nhân
const CLEANUP_INTERVAL = 60 * 60 * 1000;   // Dọn dẹp mỗi giờ
const READY_TIMEOUT_MS  = 30_000;          // 30s max wait for engine ready
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const PREBUFFER_BYTES = 500 * 1024 * 1024;
const TORRENT_PORT = Number(process.env.TORRENT_PORT || 6881);
const TORRENT_CONNECTIONS = Number(process.env.TORRENT_CONNECTIONS || 300);
const TORRENT_UPLOAD_SLOTS = Number(process.env.TORRENT_UPLOAD_SLOTS || 4);

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Popular public trackers to maximise peer discovery
const TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://vito-tracker.space:6969/announce',
  'udp://vito-tracker.duckdns.org:6969/announce',
  'udp://udp.tracker.projectk.org:23333/announce',
  'udp://tracker.tryhackx.org:6969/announce',
  'udp://tracker.t-1.org:6969/announce',
  'udp://tracker.startwork.cv:1337/announce',
  'udp://tracker.srv00.com:6969/announce',
  'udp://tracker.qu.ax:6969/announce',
  'udp://tracker.plx.im:6969/announce',
  'udp://tracker.opentorrent.top:6969/announce',
  'udp://tracker.iperson.xyz:6969/announce',
  'udp://tracker.gmi.gd:6969/announce',
  'udp://tracker.ducks.party:1984/announce',
  'udp://tracker.bluefrog.pw:2710/announce',
  'udp://tracker.bittor.pw:1337/announce',
  'udp://tracker.auctor.tv:6969/announce',
  'http://tracker.opentrackr.org:1337/announce',
  'https://tracker.tamersunion.org:443/announce',
];

interface EngineInstance {
  engine: any;
  file: any;
  lastAccessed: number;
  activeStreams: number;
  idleTimer: NodeJS.Timeout | null;
}

class TorrentEngine {
  private engines: Map<string, EngineInstance> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  private startCleanupTimer() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = setInterval(() => this.cleanupOldEngines(), CLEANUP_INTERVAL);
  }

  private cleanupOldEngines() {
    const now = Date.now();
    for (const [hash, instance] of this.engines.entries()) {
      if (now - instance.lastAccessed > CACHE_LIFETIME && instance.activeStreams === 0) {
        this.destroyEngine(hash);
      }
    }
    // Clean up physical files older than CACHE_LIFETIME
    try {
      if (fs.existsSync(TMP_DIR)) {
        const files = fs.readdirSync(TMP_DIR);
        files.forEach((file) => {
          const filePath = path.join(TMP_DIR, file);
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > CACHE_LIFETIME) {
            fs.rmSync(filePath, { recursive: true, force: true });
            console.log(`[TorrentEngine] Cleaned up: ${filePath}`);
          }
        });
      }
    } catch (e) {
      console.error(`[TorrentEngine] Cleanup error:`, e);
    }
  }

  public destroyEngine(hash: string) {
    const instance = this.engines.get(hash);
    if (instance) {
      if (instance.idleTimer) clearTimeout(instance.idleTimer);
      try { instance.engine.destroy(() => {}); } catch {}
      this.engines.delete(hash);
      console.log(`[TorrentEngine] Destroyed idle engine: ${hash}`);
    }
  }

  public getStats() {
    return Array.from(this.engines.entries()).map(([hash, instance]) => {
      const swarm = instance.engine?.swarm;
      return {
        hash,
        fileName: instance.file?.name || '',
        fileSize: instance.file?.length || 0,
        activeStreams: instance.activeStreams,
        lastAccessed: instance.lastAccessed,
        peersConnected: swarm?.wires?.length || 0,
        peersQueued: swarm?.queued || 0,
        downloadedBytes: swarm?.downloaded || 0,
        uploadedBytes: swarm?.uploaded || 0,
        downloadSpeedBytesPerSecond: swarm?.downloadSpeed?.() || 0,
        uploadSpeedBytesPerSecond: swarm?.uploadSpeed?.() || 0,
        maxConnections: TORRENT_CONNECTIONS,
        uploadSlots: TORRENT_UPLOAD_SLOTS,
        listeningPort: TORRENT_PORT,
      };
    });
  }

  /**
   * Returns a Promise<file>.
   * Rejects after READY_TIMEOUT_MS if no peers found.
   */
  public getStreamFile(magnetOrHash: string): Promise<any> {
    // Normalise to hex hash
    let hash = '';
    const btihMatch = magnetOrHash.match(/xt=urn:btih:([^&\s]+)/i);
    if (btihMatch) {
      hash = btihMatch[1].toLowerCase();
    } else if (/^[0-9a-fA-F]{40,64}$/.test(magnetOrHash.trim())) {
      hash = magnetOrHash.trim().toLowerCase();
    } else {
      return Promise.reject(new Error('Invalid magnet or hash'));
    }

    // Build full magnet URI with trackers
    const trString = TRACKERS.map(t => `tr=${encodeURIComponent(t)}`).join('&');
    const magnet = `magnet:?xt=urn:btih:${hash}&${trString}`;

    // Return cached file immediately
    if (this.engines.has(hash)) {
      const instance = this.engines.get(hash)!;
      instance.lastAccessed = Date.now();
      return Promise.resolve(instance.file);
    }

    return new Promise<any>((resolve, reject) => {
      console.log(`[TorrentEngine] Starting engine for: ${hash}`);

      const engine = torrentStream(magnet, {
        tmp: os.tmpdir(),
        path: path.join(TMP_DIR, hash),
        trackers: TRACKERS,
        connections: TORRENT_CONNECTIONS,
        uploads: TORRENT_UPLOAD_SLOTS,
      });

      engine.listen(TORRENT_PORT, () => {
        console.log(`[TorrentEngine] Listening for peers on TCP ${TORRENT_PORT}`);
      });

      const timeout = setTimeout(() => {
        console.error(`[TorrentEngine] Timeout waiting for ready: ${hash}`);
        try { engine.destroy(() => {}); } catch {}
        reject(new Error('Torrent engine timed out — no peers found within 30s'));
      }, READY_TIMEOUT_MS);

      engine.on('ready', () => {
        clearTimeout(timeout);
        if (!engine.files || engine.files.length === 0) {
          reject(new Error('Torrent has no files'));
          return;
        }
        // Pick the largest file (most likely the video)
        const chosen = engine.files.reduce((a: any, b: any) =>
          a.length > b.length ? a : b
        );
        console.log(`[TorrentEngine] Ready: ${hash} → ${chosen.name} (${(chosen.length / 1e9).toFixed(2)} GB)`);
        
        const instance: EngineInstance = { 
          engine, 
          file: chosen, 
          lastAccessed: Date.now(),
          activeStreams: 0,
          idleTimer: null
        };

        // Bọc (Wrap) hàm createReadStream để theo dõi người xem
        const originalCreateReadStream = chosen.createReadStream.bind(chosen);
        chosen.createReadStream = (opts: any) => {
          instance.lastAccessed = Date.now();
          instance.activeStreams++;
          if (instance.idleTimer) {
            clearTimeout(instance.idleTimer);
            instance.idleTimer = null;
          }

          const start = Math.max(0, opts?.start ?? 0);
          const requestedEnd = Math.min(
            chosen.length - 1,
            opts?.end ?? start + PREBUFFER_BYTES - 1
          );
          const prebufferEnd = Math.min(chosen.length - 1, start + PREBUFFER_BYTES - 1);
          const internalEngine = engine as any;
          const fileOffset = (chosen as any).offset ?? 0;
          const pieceLength = internalEngine.torrent?.pieceLength;
          let prebufferSelection: { from: number; to: number } | null = null;

          if (pieceLength && prebufferEnd > requestedEnd) {
            const from = ((fileOffset + requestedEnd + 1) / pieceLength) | 0;
            const to = ((fileOffset + prebufferEnd) / pieceLength) | 0;
            if (to >= from) {
              internalEngine.select(from, to, false);
              prebufferSelection = { from, to };
            }
          }

          const stream = originalCreateReadStream({ ...opts, start, end: requestedEnd });
          let streamClosed = false;
          
          const onStreamEnd = () => {
            if (streamClosed) return;
            streamClosed = true;
            if (prebufferSelection) {
              try {
                internalEngine.deselect(prebufferSelection.from, prebufferSelection.to, false);
              } catch {}
            }
            instance.activeStreams--;
            if (instance.activeStreams <= 0) {
              instance.activeStreams = 0;
              // Nếu không còn luồng nào xem, hẹn giờ 5 phút sau sẽ tắt Engine để tránh tải ngầm phí băng thông
              instance.idleTimer = setTimeout(() => {
                this.destroyEngine(hash);
              }, IDLE_TIMEOUT_MS);
            }
          };

          stream.on('close', onStreamEnd);
          stream.on('end', onStreamEnd);
          stream.on('error', onStreamEnd);

          return stream;
        };

        this.engines.set(hash, instance);
        resolve(chosen);
      });

      engine.on('error', (err: any) => {
        clearTimeout(timeout);
        console.error(`[TorrentEngine] Error: ${hash}`, err);
        this.destroyEngine(hash);
        reject(err);
      });
    });
  }
}

// Export singleton instance
export const torrentEngine = new TorrentEngine();
