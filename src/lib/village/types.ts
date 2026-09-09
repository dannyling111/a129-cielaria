export const CELL = 1.2;
export const BASE_Y = 0.28;
export const MAIN_H = 16;
export const MAIN_R = 4.55;

export type CellKind = "air" | "rock" | "house" | "walk" | "stair";
export type Support = "ground" | "stack" | "cantilever";
export type HouseVariant = "cottage" | "townhouse" | "villa" | "hanging" | "shop";
export type TimeOfDay = "day" | "golden" | "dusk";
export type Facade = 0 | 1 | 2 | 3;

export interface Item {
  p: [number, number, number];
  r: [number, number, number];
  s: [number, number, number];
  c: string;
}

export type Bucket =
  | "body"
  | "roof"
  | "cornice"
  | "base"
  | "door"
  | "doorFrame"
  | "glassCool"
  | "glassWarm"
  | "frame"
  | "shutter"
  | "box"
  | "bloom"
  | "balcony"
  | "rail"
  | "awningA"
  | "awningB"
  | "lantern"
  | "glow"
  | "chimney"
  | "trunk"
  | "canopy"
  | "slab"
  | "step"
  | "stone"
  | "person"
  | "head"
  | "boat"
  | "cloud"
  | "hangInner"
  | "pot"
  | "parapet"
  | "vine"
  | "sail";

export const BUCKETS: Bucket[] = [
  "body",
  "roof",
  "cornice",
  "base",
  "door",
  "doorFrame",
  "glassCool",
  "glassWarm",
  "frame",
  "shutter",
  "box",
  "bloom",
  "balcony",
  "rail",
  "awningA",
  "awningB",
  "lantern",
  "glow",
  "chimney",
  "trunk",
  "canopy",
  "slab",
  "step",
  "stone",
  "person",
  "head",
  "boat",
  "cloud",
  "hangInner",
  "pot",
  "parapet",
  "vine",
  "sail",
];

export interface House {
  id: number;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color: string;
  roofColor: string;
  facade: Facade;
  support: Support;
  variant: HouseVariant;
  name: string;
  center: [number, number, number];
}

export interface VillageStats {
  seed: number;
  houses: number;
  doors: number;
  cells: number;
  rock: number;
  cantilevers: number;
  stacks: number;
  cellSize: number;
  integrated: boolean;
}

export type Items = Record<Bucket, Item[]>;

export interface Village {
  seed: number;
  density: number;
  houses: House[];
  items: Items;
  stats: VillageStats;
}

export const FACE: readonly { nx: number; nz: number; rot: number }[] = [
  { nx: 0, nz: 1, rot: 0 },
  { nx: 1, nz: 0, rot: Math.PI / 2 },
  { nx: 0, nz: -1, rot: Math.PI },
  { nx: -1, nz: 0, rot: -Math.PI / 2 },
];

export function emptyItems(): Items {
  const items = {} as Items;
  for (const b of BUCKETS) items[b] = [];
  return items;
}

export function item(
  p: [number, number, number],
  s: [number, number, number],
  c: string,
  r: [number, number, number] = [0, 0, 0],
): Item {
  return { p, s, c, r };
}

export function cellWorld(x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): [number, number, number] {
  return [(x + sx / 2) * CELL, BASE_Y + y * CELL + (sy * CELL) / 2, (z + sz / 2) * CELL];
}

export function cellBottom(y: number): number {
  return BASE_Y + y * CELL;
}
