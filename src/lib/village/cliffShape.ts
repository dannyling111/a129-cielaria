import { makeNoise, type Noise } from "./rng";
import { MAIN_H, MAIN_R } from "./types";

export const PILLAR = { x: -10.6, z: -2.1, h: 11.2, r: 2.15 };

export type CliffSampler = {
  noise: Noise;
  mainRadius: (y: number, angle: number) => number;
  pillarRadius: (y: number, angle: number) => number;
  insideMain: (x: number, y: number, z: number) => boolean;
  insidePillar: (x: number, y: number, z: number) => boolean;
};

export function createCliffSampler(seed: number): CliffSampler {
  const noise = makeNoise(seed ^ 0x51ed);

  function mainRadius(y: number, angle: number): number {
    const t = Math.max(0, y) / (MAIN_H * 1.2);
    const n = noise.fbm(Math.cos(angle) * 1.7, t * 2.4, Math.sin(angle) * 1.7);
    const n2 = noise.fbm(Math.cos(angle * 2.2) * 3.1, y * 0.18, Math.sin(angle * 2.2) * 3.1);
    let r = MAIN_R - t * 1.22 + (n - 0.5) * 1.55 + (n2 - 0.5) * 0.55;
    const sea = Math.cos(angle);
    if (sea > 0.12) {
      const band = Math.sin(y * 1.55 + n * 2);
      if (band > 0.38) r -= 0.62 * sea;
    }
    const foot = Math.max(0, 1 - y * 0.55);
    r += foot * 0.85;
    return Math.max(1.8, r);
  }

  function pillarRadius(y: number, angle: number): number {
    const t = Math.max(0, y) / PILLAR.h;
    const n = noise.fbm(Math.cos(angle) * 2.4 + 8, t * 3, Math.sin(angle) * 2.4);
    return Math.max(0.9, PILLAR.r * (1 - t * 0.22) + (n - 0.5) * 0.55);
  }

  function insideMain(x: number, y: number, z: number): boolean {
    if (y < -6 || y > MAIN_H * 1.2 + 1) return false;
    const a = Math.atan2(x, z);
    return Math.hypot(x, z) < mainRadius(y, a);
  }

  function insidePillar(x: number, y: number, z: number): boolean {
    if (y < -2 || y > PILLAR.h) return false;
    const dx = x - PILLAR.x;
    const dz = z - PILLAR.z;
    const a = Math.atan2(dx, dz);
    return Math.hypot(dx, dz) < pillarRadius(y, a);
  }

  return { noise, mainRadius, pillarRadius, insideMain, insidePillar };
}
