export type Rng = () => number;

export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export function mulberry32(a: number): Rng {
  let t = a | 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function parseSeed(input: string): number {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10) >>> 0;
  return xmur3(trimmed || "cielaria")();
}

export function randInt(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length]!;
}

export function chance(rng: Rng, p: number): boolean {
  return rng() < p;
}

export function shuffle<T>(rng: Rng, list: T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export type Noise = {
  noise3: (x: number, y: number, z: number) => number;
  fbm: (x: number, y: number, z: number) => number;
};

export function makeNoise(seed: number): Noise {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const table = Float32Array.from({ length: 256 }, () => rng());

  function hash(x: number, y: number, z: number): number {
    let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1597334677);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return table[(n >>> 0) & 255]!;
  }

  function fade(t: number): number {
    return t * t * (3 - 2 * t);
  }

  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  function noise3(x: number, y: number, z: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const z0 = Math.floor(z);
    const fx = fade(x - x0);
    const fy = fade(y - y0);
    const fz = fade(z - z0);
    const n000 = hash(x0, y0, z0);
    const n100 = hash(x0 + 1, y0, z0);
    const n010 = hash(x0, y0 + 1, z0);
    const n110 = hash(x0 + 1, y0 + 1, z0);
    const n001 = hash(x0, y0, z0 + 1);
    const n101 = hash(x0 + 1, y0, z0 + 1);
    const n011 = hash(x0, y0 + 1, z0 + 1);
    const n111 = hash(x0 + 1, y0 + 1, z0 + 1);
    return lerp(
      lerp(lerp(n000, n100, fx), lerp(n010, n110, fx), fy),
      lerp(lerp(n001, n101, fx), lerp(n011, n111, fx), fy),
      fz,
    );
  }

  function fbm(x: number, y: number, z: number): number {
    let v = 0;
    let a = 0.5;
    let f = 1;
    let s = 0;
    for (let i = 0; i < 4; i++) {
      v += a * noise3(x * f, y * f, z * f);
      s += a;
      a *= 0.5;
      f *= 2.03;
    }
    return v / s;
  }

  return { noise3, fbm };
}
