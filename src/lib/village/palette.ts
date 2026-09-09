import { pick, type Rng } from "./rng";

export const WALLS = [
  "#f4d0d4",
  "#f0b7c2",
  "#e89aaa",
  "#f7c9bc",
  "#ffe3d2",
  "#f6e4c4",
  "#fff8ee",
  "#f2eee4",
  "#d5e6f4",
  "#b4d2ea",
  "#86b4d8",
  "#4d78b8",
  "#2f5a9a",
  "#1e447c",
  "#bfe3d2",
  "#93cbb6",
  "#f0b089",
  "#e58b74",
  "#f3dc86",
  "#c9d3e2",
  "#e7d2de",
] as const;

export const DARK_WALLS = ["#3a5f96", "#2f5a9a", "#4d78b8", "#1e447c"] as const;

export const ROOFS = ["#d88968", "#c48a72", "#eee0ce", "#b56d52", "#e4d6c2", "#6d8fba", "#c9b49a"] as const;

export const WOOD = ["#6a3d28", "#8a5540", "#4a2a1c", "#355246", "#7a3030", "#2f4a6e"] as const;

export const SHUTTERS = ["#2d5a8f", "#f4f1e8", "#3c7a62", "#c45c4a", "#e6d07a", "#4a6fa5"] as const;

export const BLOOMS = ["#f2a0b4", "#f6d36a", "#f7f3ea", "#e0565c", "#f4b183", "#d98ec4", "#8fd4a8"] as const;

export const AWNING_A = ["#f0d56a", "#f4f0e6", "#3d6cb0", "#e9897a"] as const;
export const AWNING_B = ["#fffdf6", "#f0d56a", "#f4f0e6", "#f4f0e6"] as const;

export const STONE = ["#d8d1c4", "#cfc6b6", "#e2dbd0", "#c4bbaa", "#b7c0b2"] as const;

export const CANOPY = ["#3f6b3c", "#2f5a34", "#4d7a45", "#1f4728", "#5a8a52"] as const;

export const SHIRTS = ["#e89aaa", "#3d6cb0", "#f3dc86", "#f0b089", "#fff8ee", "#93cbb6", "#e58b74"] as const;

export const NOUNS = ["Casa", "Villa", "Torre", "Atelier", "Nido", "Studio", "Corte", "Terrazza"] as const;
export const ADJS = [
  "Rosa",
  "Azzurra",
  "Sole",
  "Nuvole",
  "Mare",
  "Limone",
  "Pesca",
  "Bianca",
  "Cobalto",
  "Vento",
  "Luce",
  "Corallo",
  "Menta",
  "Alba",
] as const;

export function pickWall(rng: Rng, hanging: boolean, neighbor: Set<string>): string {
  const source = hanging ? DARK_WALLS : WALLS;
  for (let i = 0; i < 8; i++) {
    const c = pick(rng, source);
    if (!neighbor.has(c)) return c;
  }
  return pick(rng, source);
}

export function pickRoof(rng: Rng, wall: string): string {
  if (wall.startsWith("#1") || wall.startsWith("#2")) return pick(rng, ["#1a2f4c", "#c48a72", "#eee0ce"]);
  return pick(rng, ROOFS);
}

export function houseName(rng: Rng): string {
  return `${pick(rng, NOUNS)} ${pick(rng, ADJS)}`;
}

export function lighten(hex: string, amt = 0.12): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + Math.round(255 * amt)));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + Math.round(255 * amt)));
  const b = Math.min(255, Math.max(0, (n & 255) + Math.round(255 * amt)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
