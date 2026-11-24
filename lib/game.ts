// Core crash-game math + small helpers shared by the UI.

export const HOUSE_EDGE_FACTOR = 0.99; // 1% edge, same shape as classic crash games
export const MAX_MULTIPLIER = 5000;
export const GROWTH_RATE = 0.07; // multiplier = e^(0.07 * seconds)

/** FNV-1a + avalanche mix. Fast, deterministic, good enough for a client demo. */
export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32) for fake-player tables. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Crash point for a given server seed + round number.
 * u ~ [0,1)  ->  crash = 0.99 / (1 - u)
 * Roughly 1% of rounds bust at 1.00x, ~50% bust below 2x.
 */
export function crashPointFor(seed: string, round: number): number {
  const h = hashString(`${seed}:${round}`);
  const u = h / 4294967296;
  const raw = HOUSE_EDGE_FACTOR / (1 - u);
  const stepped = Math.floor(raw * 100) / 100;
  // Below 1.00x is the instant bust bucket (~1% of rounds); keep 1.01x distinct.
  if (stepped < 1) return 1;
  if (stepped < 1.01) return 1.01;
  return Math.min(MAX_MULTIPLIER, stepped);
}

/** Current multiplier for a flight that started `elapsedMs` ago. */
export function multiplierAt(elapsedMs: number): number {
  const seconds = Math.max(0, elapsedMs) / 1000;
  return Math.exp(GROWTH_RATE * seconds);
}

/** Milliseconds needed to reach a multiplier (inverse of multiplierAt). */
export function msForMultiplier(multiplier: number): number {
  return (Math.log(Math.max(1, multiplier)) / GROWTH_RATE) * 1000;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function multiplierLabel(value: number): string {
  if (value >= 100) return `${value.toFixed(0)}x`;
  if (value >= 10) return `${value.toFixed(1)}x`;
  return `${value.toFixed(2)}x`;
}

const kesFormatter = new Intl.NumberFormat("en-KE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(value: number): string {
  return `KES ${kesFormatter.format(Number.isFinite(value) ? value : 0)}`;
}

export function compactMoney(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function shortHash(hash: string, size = 10): string {
  return `${hash.slice(0, size)}…${hash.slice(-4)}`;
}

export function timeLabel(date: Date): string {
  return date.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
