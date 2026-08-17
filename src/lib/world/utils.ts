export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const smoothstep = (t: number): number => {
  const s = clamp(t, 0, 1);
  return s * s * (3 - 2 * s);
};

export const finiteOr = (value: number, fallback = 0): number =>
  Number.isFinite(value) ? value : fallback;

export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function frameLerp(factor: number, dt: number): number {
  const FRAME_MS = 1000 / 60;
  const normalized = Math.max(0, dt) / FRAME_MS;
  return 1 - Math.pow(1 - factor, normalized);
}

export function frameDamping(retention: number, dt: number): number {
  const FRAME_MS = 1000 / 60;
  return Math.pow(retention, Math.max(0, dt) / FRAME_MS);
}

export function smoothProgress(value: number, start: number, end: number): number {
  const distance = Math.max(1, end - start);
  const progress = clamp((finiteOr(value) - start) / distance, 0, 1);
  return smoothstep(progress);
}

export function stablePointSample(x: number, y: number, salt = 0): number {
  const qx = Math.round(finiteOr(x) * 8);
  const qy = Math.round(finiteOr(y) * 8);
  let hash =
    Math.imul(qx, 374761393) ^
    Math.imul(qy, 668265263) ^
    Math.imul(Math.round(finiteOr(salt)), 1442695041);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}

export function routeLength(points: [number, number][]): number {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return total;
}

export function pointOnRoute(
  points: [number, number][],
  distance: number,
  target: { x: number; y: number },
  knownLength = 0
): { x: number; y: number } {
  if (!Array.isArray(points) || points.length === 0) {
    target.x = 0;
    target.y = 0;
    return target;
  }
  const total = knownLength || routeLength(points);
  if (points.length === 1 || total <= 0) {
    target.x = points[0][0];
    target.y = points[0][1];
    return target;
  }
  let remaining = ((distance % total) + total) % total;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const segment = Math.hypot(to[0] - from[0], to[1] - from[1]);
    if (remaining <= segment || i === points.length - 1) {
      const progress = segment ? Math.min(1, remaining / segment) : 0;
      target.x = from[0] + (to[0] - from[0]) * progress;
      target.y = from[1] + (to[1] - from[1]) * progress;
      return target;
    }
    remaining -= segment;
  }
  target.x = points[points.length - 1][0];
  target.y = points[points.length - 1][1];
  return target;
}
