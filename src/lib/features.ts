/**
 * Audio features provider — Music Metrics "Spotify Audio Features / Track
 * Analysis" on RapidAPI. Spotify deprecated /v1/audio-features for new apps
 * on 2024-11-27; this restores BPM + key. Everything downstream only knows
 * about `TrackFeatures`, so swapping providers is a one-file change.
 *
 * Endpoint shape (from the API's own cURL snippet):
 *   GET /tracks/spotify_audio_features?spotify_track_id={id}&isrc={isrc}
 * Response nests values under `audio_features`, all as strings, with
 * key + mode instead of Camelot — so Camelot is computed via toCamelot().
 */

import { toCamelot } from "./camelot";

const RAPIDAPI_HOST = "spotify-audio-features-track-analysis.p.rapidapi.com";

const endpoint = (id: string, isrc?: string | null) => {
  const q = new URLSearchParams({ spotify_track_id: id });
  if (isrc) q.set("isrc", isrc);
  return `https://${RAPIDAPI_HOST}/tracks/spotify_audio_features?${q.toString()}`;
};

export type TrackFeatures = {
  bpm: number | null;
  camelot: string | null;
  energy: number | null;
};

export type FeatureInput = { id: string; isrc?: string | null };

export type FeaturesBatch = {
  features: Map<string, TrackFeatures | null>;
  statuses: Record<string, number>;
};

// Cache successes and genuine 404s only; never transient failures, so a
// fixed key/subscription works on the next run without a restart.
const cache = new Map<string, TrackFeatures | null>();

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v));
  return Number.isFinite(n) ? n : null;
};

async function fetchOne(
  input: FeatureInput,
  attempt = 0
): Promise<{ feat: TrackFeatures | null; status: number }> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return { feat: null, status: 0 };

  const res = await fetch(endpoint(input.id, input.isrc), {
    headers: {
      "x-rapidapi-key": key,
      "x-rapidapi-host": RAPIDAPI_HOST,
    },
    cache: "no-store",
  });

  // Rate limited: back off and retry up to 3 times. Free tiers often cap
  // requests per second, so a short wait clears it.
  if (res.status === 429 && attempt < 3) {
    const retryAfter = Number(res.headers.get("retry-after")) || 0;
    const wait = retryAfter > 0 ? retryAfter * 1000 : 1000 * (attempt + 1);
    console.log(
      `[features] 429 for ${input.id}, retry ${attempt + 1} after ${wait}ms`
    );
    await new Promise((r) => setTimeout(r, wait));
    return fetchOne(input, attempt + 1);
  }

  if (!res.ok) {
    console.log("[features] provider returned", res.status, "for", input.id);
    return { feat: null, status: res.status };
  }

  const j = await res.json().catch(() => null);
  const af = j?.audio_features ?? null;
  if (!af) {
    console.log(
      "[features] no audio_features in payload. keys:",
      Object.keys(j ?? {})
    );
    return { feat: null, status: 200 };
  }

  const bpm = num(af.tempo);
  const camelot = toCamelot(af.key, af.mode);
  const energy = num(af.energy);

  if (bpm == null && camelot == null) {
    console.log("[features] could not parse key/tempo. keys:", Object.keys(af));
  }
  return { feat: { bpm, camelot, energy }, status: 200 };
}

export async function getFeaturesBatch(
  inputs: FeatureInput[]
): Promise<FeaturesBatch> {
  const features = new Map<string, TrackFeatures | null>();
  const statuses: Record<string, number> = {};
  const bump = (k: string) => (statuses[k] = (statuses[k] ?? 0) + 1);
  const queue = inputs.slice();

  const worker = async () => {
    while (queue.length) {
      const input = queue.shift();
      if (!input) break;
      if (cache.has(input.id)) {
        features.set(input.id, cache.get(input.id) ?? null);
        bump("cached");
        continue;
      }
      try {
        const { feat, status } = await fetchOne(input);
        bump(String(status));
        features.set(input.id, feat);
        if (status === 200 || status === 404) cache.set(input.id, feat);
      } catch (e) {
        console.log("[features] error for", input.id, e);
        bump("error");
        features.set(input.id, null);
      }
      await new Promise((r) => setTimeout(r, 350));
    }
  };

  // Concurrency of 1: free-tier providers rate-limit aggressively, and a
  // sequential trickle with retries lands more tracks than parallel bursts
  // that trip 429s.
  await Promise.all(Array.from({ length: 1 }, worker));
  return { features, statuses };
}
