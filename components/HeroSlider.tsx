"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Info, Play, Sparkles, Star } from "lucide-react";
import type { MovieCard } from "@/lib/types";
import { baseSpotlightScore, normalizedLabelSet } from "@/lib/spotlight";
import { proxiedImage, ratingLabel } from "@/lib/utils";

const SLIDE_INTERVAL_MS = 5000;
const FAV_KEY = "film.bluesia.net:favorites";
const HISTORY_KEY = "film.bluesia.net:history";
const LEGACY_FAV_KEY = "bluesia:favorites";
const LEGACY_HISTORY_KEY = "bluesia:history";
const LOCAL_MOVIES_UPDATED_EVENT = "film.bluesia.net:local-movies-updated";
const LEGACY_LOCAL_MOVIES_UPDATED_EVENT = "bluesia:local-movies-updated";

type StoredMovie = MovieCard & { savedAt?: number };
type PersonalData = { favorites: StoredMovie[]; history: StoredMovie[] };

type PreferenceMap = {
  favoriteSlugs: Set<string>;
  watchedSlugs: Set<string>;
  country: Map<string, number>;
  category: Map<string, number>;
  type: Map<string, number>;
};

function readStoredRaw(key: string): StoredMovie[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((movie) => movie?.slug) : [];
  } catch {
    return [];
  }
}

function readStored(key: string, legacyKey?: string): StoredMovie[] {
  const current = readStoredRaw(key);
  if (current.length || !legacyKey) return current;
  return readStoredRaw(legacyKey);
}

function addWeight(map: Map<string, number>, labels: Set<string>, weight: number) {
  labels.forEach((label) => {
    map.set(label, (map.get(label) || 0) + weight);
  });
}

function buildPreferences(data: PersonalData | null): PreferenceMap | null {
  if (!data || (!data.favorites.length && !data.history.length)) return null;

  const prefs: PreferenceMap = {
    favoriteSlugs: new Set(data.favorites.map((movie) => movie.slug)),
    watchedSlugs: new Set(data.history.map((movie) => movie.slug)),
    country: new Map(),
    category: new Map(),
    type: new Map()
  };

  data.favorites.slice(0, 60).forEach((movie, index) => {
    const recency = Math.max(1, 1.35 - index * 0.02);
    addWeight(prefs.country, normalizedLabelSet(movie.country), 15 * recency);
    addWeight(prefs.category, normalizedLabelSet(movie.category), 13 * recency);
    addWeight(prefs.type, normalizedLabelSet(movie.type), 6 * recency);
  });

  data.history.slice(0, 80).forEach((movie, index) => {
    const recency = Math.max(0.4, 1.15 - index * 0.015);
    addWeight(prefs.country, normalizedLabelSet(movie.country), 7 * recency);
    addWeight(prefs.category, normalizedLabelSet(movie.category), 6 * recency);
    addWeight(prefs.type, normalizedLabelSet(movie.type), 3 * recency);
  });

  return prefs;
}

function matchingWeight(map: Map<string, number>, labels: Set<string>, cap: number) {
  let score = 0;
  labels.forEach((label) => {
    score += map.get(label) || 0;
  });
  return Math.min(cap, score);
}

function rankForUser(items: MovieCard[], data: PersonalData | null) {
  const prefs = buildPreferences(data);

  return [...items]
    .map((movie, index) => {
      let score = baseSpotlightScore(movie, [], index) + Math.max(0, items.length - index) * 0.8;

      if (prefs) {
        score += matchingWeight(prefs.country, normalizedLabelSet(movie.country), 34);
        score += matchingWeight(prefs.category, normalizedLabelSet(movie.category), 30);
        score += matchingWeight(prefs.type, normalizedLabelSet(movie.type), 12);

        if (prefs.favoriteSlugs.has(movie.slug)) score += 14;
        if (prefs.watchedSlugs.has(movie.slug) && !prefs.favoriteSlugs.has(movie.slug)) score -= 10;
      }

      return { movie, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.movie);
}

export function HeroSlider({ items }: { items: MovieCard[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [personalData, setPersonalData] = useState<PersonalData | null>(null);

  const slides = useMemo(() => rankForUser(items.filter((movie) => movie.slug), personalData).slice(0, 8), [items, personalData]);

  useEffect(() => {
    const refreshPersonalData = () => {
      setPersonalData({
        favorites: readStored(FAV_KEY, LEGACY_FAV_KEY),
        history: readStored(HISTORY_KEY, LEGACY_HISTORY_KEY)
      });
    };

    refreshPersonalData();
    window.addEventListener("storage", refreshPersonalData);
    window.addEventListener("focus", refreshPersonalData);
    window.addEventListener(LOCAL_MOVIES_UPDATED_EVENT, refreshPersonalData);
    window.addEventListener(LEGACY_LOCAL_MOVIES_UPDATED_EVENT, refreshPersonalData);

    return () => {
      window.removeEventListener("storage", refreshPersonalData);
      window.removeEventListener("focus", refreshPersonalData);
      window.removeEventListener(LOCAL_MOVIES_UPDATED_EVENT, refreshPersonalData);
      window.removeEventListener(LEGACY_LOCAL_MOVIES_UPDATED_EVENT, refreshPersonalData);
    };
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  const active = slides[activeIndex] ?? slides[0];
  const isPersonalized = Boolean(personalData && (personalData.favorites.length || personalData.history.length));

  return (
    <section className="px-4 pt-5">
      <div className="relative min-h-[290px] overflow-hidden rounded-3xl bg-panel shadow-2xl shadow-black/30 ring-1 ring-white/5">
        {slides.map((movie, index) => {
          const image = movie.thumb || movie.poster;
          if (!image) return null;

          return (
            <img
              key={`${movie.slug}-${image}`}
              src={proxiedImage(image)}
              alt={movie.name}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${index === activeIndex ? "opacity-80" : "opacity-0"}`}
            />
          );
        })}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div key={active.slug} className="relative z-10 flex min-h-[290px] flex-col justify-end p-5 animate-[fadeIn_0.45s_ease-out]">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2.5 py-1 text-xs font-black text-white backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-gold" /> {isPersonalized ? "Dành cho bạn" : "Smart Spotlight"}
            </span>
            <span className="rounded-md bg-gold px-2.5 py-1 text-xs font-black text-black">{active.episodeCurrent || "FULL"}</span>
            {active.quality && <span className="rounded-md bg-white/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">{active.quality}</span>}
            <span className="inline-flex items-center gap-1 rounded-md bg-black/60 px-2.5 py-1 text-xs font-bold text-gold backdrop-blur">
              <Star className="h-3.5 w-3.5 fill-gold" /> {ratingLabel(active)}
            </span>
          </div>
          <h1 className="max-w-[70%] text-3xl font-black tracking-tight text-white drop-shadow-lg">{active.name}</h1>
          <p className="mt-1 max-w-[75%] text-sm italic text-zinc-200">{active.originName || active.name} · {active.year || "N/A"}{active.country ? ` · ${active.country}` : ""}</p>
          <div className="mt-5 flex items-center gap-3">
            <Link href={`/watch/${active.slug}`} className="grid h-16 w-16 place-items-center rounded-full bg-gold text-black shadow-glow transition hover:scale-105">
              <Play className="ml-1 h-8 w-8 fill-black" />
            </Link>
            <Link href={`/movie/${active.slug}`} className="grid h-14 w-14 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/25">
              <Info className="h-7 w-7" />
            </Link>
          </div>
          <div className="mt-7 flex items-center justify-center gap-2">
            {slides.map((movie, index) => (
              <button
                key={movie.slug}
                type="button"
                aria-label={`Chuyển tới ${movie.name}`}
                onClick={() => setActiveIndex(index)}
                className={index === activeIndex ? "h-2.5 w-10 rounded-full bg-gold transition-all" : "h-2.5 w-2.5 rounded-full bg-white/40 transition-all hover:bg-white"}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
