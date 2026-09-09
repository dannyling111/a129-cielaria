import { PILLAR, createCliffSampler } from "./cliffShape";
import {
  AWNING_A,
  AWNING_B,
  BLOOMS,
  CANOPY,
  SHIRTS,
  SHUTTERS,
  STONE,
  WOOD,
  houseName,
  lighten,
  pickRoof,
  pickWall,
} from "./palette";
import { Occupancy } from "./quantize";
import { chance, mulberry32, pick, randInt, shuffle, type Rng } from "./rng";
import {
  BASE_Y,
  BUCKETS,
  CELL,
  FACE,
  MAIN_H,
  cellBottom,
  cellWorld,
  emptyItems,
  item,
  type Facade,
  type House,
  type HouseVariant,
  type Items,
  type Village,
} from "./types";

const TEMPLATES: { sx: number; sy: number; sz: number; w: number; variant: HouseVariant }[] = [
  { sx: 1, sy: 1, sz: 1, w: 8, variant: "cottage" },
  { sx: 1, sy: 2, sz: 1, w: 5, variant: "townhouse" },
  { sx: 2, sy: 1, sz: 1, w: 3, variant: "villa" },
  { sx: 1, sy: 1, sz: 2, w: 3, variant: "villa" },
  { sx: 2, sy: 2, sz: 1, w: 2, variant: "villa" },
  { sx: 1, sy: 3, sz: 1, w: 1, variant: "townhouse" },
  { sx: 2, sy: 1, sz: 2, w: 1, variant: "shop" },
];

function pickTemplate(rng: Rng) {
  const total = TEMPLATES.reduce((s, t) => s + t.w, 0);
  let r = rng() * total;
  for (const t of TEMPLATES) {
    r -= t.w;
    if (r <= 0) return t;
  }
  return TEMPLATES[0]!;
}

function outwardFacade(x: number, z: number, sx: number, sz: number): Facade {
  const cx = x + sx / 2;
  const cz = z + sz / 2;
  if (Math.abs(cz) >= Math.abs(cx)) return cz >= 0 ? 0 : 2;
  return cx >= 0 ? 1 : 3;
}

function neighborColors(houses: House[], x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  const set = new Set<string>();
  for (const h of houses) {
    const ox = Math.max(0, Math.min(x + sx, h.x + h.sx) - Math.max(x, h.x));
    const oy = Math.max(0, Math.min(y + sy, h.y + h.sy) - Math.max(y, h.y));
    const oz = Math.max(0, Math.min(z + sz, h.z + h.sz) - Math.max(z, h.z));
    const adjacent =
      (ox > 0 && oy > 0 && (z === h.z + h.sz || h.z === z + sz)) ||
      (oz > 0 && oy > 0 && (x === h.x + h.sx || h.x === x + sx)) ||
      (ox > 0 && oz > 0 && (y === h.y + h.sy || h.y === y + sy));
    if (adjacent) set.add(h.color);
  }
  return set;
}

function push(items: Items, bucket: keyof Items, it: ReturnType<typeof item>) {
  items[bucket].push(it);
}

export function generateVillage(seed: number, density = 1): Village {
  const rng = mulberry32(seed);
  const rngDecor = mulberry32(seed ^ 0xa5a5);
  const rngTree = mulberry32(seed ^ 0x11c1);
  const sampler = createCliffSampler(seed);
  const grid = new Occupancy();
  const houses: House[] = [];
  const items = emptyItems();
  const maxHouses = Math.round(42 + density * 28);

  fillRock(grid, sampler);

  const tryPlace = (
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    forceVariant?: HouseVariant,
  ): House | null => {
    if (y < 0 || y + sy > MAIN_H + 3) return null;
    if (!grid.regionFree(x, y, z, sx, sy, sz)) return null;
    const sup = grid.support(x, y, z, sx, sz);
    if (!sup) return null;
    const hanging = forceVariant === "hanging" || (sup === "cantilever" && chance(rng, 0.28));
    const variant = forceVariant ?? (hanging ? "hanging" : pickTemplate(rng).variant);
    const color = pickWall(rng, hanging, neighborColors(houses, x, y, z, sx, sy, sz));
    const roofColor = pickRoof(rng, color);
    let facade = outwardFacade(x, z, sx, sz);
    const ranked: Facade[] = [facade, 0, 1, 2, 3];
    const unique = [...new Set(ranked)];
    const found = unique.find((f) => grid.faceExposed(x, y, z, sx, sy, sz, f));
    facade = found ?? facade;
    grid.fill(x, y, z, sx, sy, sz, "house");
    const center = cellWorld(x, y, z, sx, sy, sz);
    const house: House = {
      id: houses.length,
      x,
      y,
      z,
      sx,
      sy,
      sz,
      color,
      roofColor,
      facade,
      support: sup,
      variant,
      name: houseName(rng),
      center,
    };
    houses.push(house);
    return house;
  };

  ringPlace(rng, sampler, tryPlace, density, maxHouses);
  stackPlace(rng, houses, tryPlace, density, maxHouses);
  sidePlace(rng, houses, tryPlace, density, maxHouses);
  hangingPlace(rng, houses, tryPlace, maxHouses);
  spitPlace(rng, tryPlace, maxHouses, houses);
  pillarPlace(rng, tryPlace, maxHouses, houses);

  for (const h of houses) emitHouse(h, grid, items, rngDecor);

  emitStairs(grid, sampler, items, rngDecor);
  emitWalks(houses, grid, items);
  emitBridge(items);
  emitTrees(houses, grid, items, rngTree, sampler);
  emitPeople(grid, items, rngDecor);
  emitBoats(items, rngDecor);
  emitClouds(items, rngDecor);
  emitDistant(items, rngDecor);
  emitVines(houses, items, rngDecor);

  const stats = {
    seed,
    houses: houses.length,
    doors: items.door.length,
    cells: grid.count("house"),
    rock: grid.count("rock"),
    cantilevers: houses.filter((h) => h.support === "cantilever").length,
    stacks: houses.filter((h) => h.support === "stack").length,
    cellSize: CELL,
    integrated: items.door.length === houses.length && houses.length > 8,
  };

  for (const b of BUCKETS) {
    if (!items[b]) items[b] = [];
  }

  return { seed, density, houses, items, stats };
}

function fillRock(grid: Occupancy, sampler: ReturnType<typeof createCliffSampler>) {
  for (let y = 0; y < MAIN_H; y++) {
    for (let ix = -12; ix <= 12; ix++) {
      for (let iz = -12; iz <= 12; iz++) {
        const wx = (ix + 0.5) * CELL;
        const wz = (iz + 0.5) * CELL;
        const wy = cellBottom(y) + CELL * 0.45;
        if (sampler.insideMain(wx, wy, wz) || sampler.insidePillar(wx, wy, wz)) {
          grid.set(ix, y, iz, "rock");
        }
      }
    }
  }
  for (let ix = 5; ix <= 13; ix++) {
    for (let iz = 4; iz <= 11; iz++) {
      const d = Math.hypot(ix - 9, iz - 7.5);
      if (d < 3.4) {
        grid.set(ix, 0, iz, "rock");
        if (d < 2.2) grid.set(ix, 1, iz, "rock");
      }
    }
  }
}

function ringPlace(
  rng: Rng,
  sampler: ReturnType<typeof createCliffSampler>,
  tryPlace: (x: number, y: number, z: number, sx: number, sy: number, sz: number) => House | null,
  density: number,
  maxHouses: number,
) {
  for (let y = 0; y < MAIN_H; y++) {
    const nAng = Math.floor(9 + density * 7);
    for (let i = 0; i < nAng; i++) {
      const a = (i / nAng) * Math.PI * 2 + y * 0.19 + rng() * 0.22;
      const sea = (Math.cos(a) + 1) * 0.5;
      if (rng() > 0.28 + 0.55 * sea * density) continue;
      const wy = cellBottom(y) + 0.4;
      const rad = sampler.mainRadius(wy, a) + CELL * 0.55;
      const t = pickTemplate(rng);
      const cx = Math.sin(a) * rad;
      const cz = Math.cos(a) * rad;
      let x = Math.round(cx / CELL - t.sx / 2);
      let z = Math.round(cz / CELL - t.sz / 2);
      let placed = tryPlace(x, y, z, t.sx, t.sy, t.sz);
      if (!placed) {
        x += Math.sign(Math.sin(a)) || 1;
        z += Math.sign(Math.cos(a)) || 0;
        placed = tryPlace(x, y, z, 1, 1, 1);
      }
      if (placed && placed.id >= maxHouses - 1) return;
    }
  }
}

function stackPlace(
  rng: Rng,
  houses: House[],
  tryPlace: (x: number, y: number, z: number, sx: number, sy: number, sz: number) => House | null,
  density: number,
  maxHouses: number,
) {
  const existing = houses.slice();
  for (const h of existing) {
    if (houses.length >= maxHouses) return;
    if (!chance(rng, 0.64 * density)) continue;
    const ox = randInt(rng, -1, 1);
    const oz = randInt(rng, -1, 1);
    const t = pickTemplate(rng);
    tryPlace(h.x + ox, h.y + h.sy, h.z + oz, Math.min(t.sx, 2), 1, Math.min(t.sz, 2));
  }
}

function sidePlace(
  rng: Rng,
  houses: House[],
  tryPlace: (x: number, y: number, z: number, sx: number, sy: number, sz: number) => House | null,
  density: number,
  maxHouses: number,
) {
  const existing = houses.slice();
  for (const h of existing) {
    if (houses.length >= maxHouses) return;
    if (!chance(rng, 0.42 * density)) continue;
    const f = FACE[h.facade]!;
    tryPlace(h.x + f.nx * h.sx, h.y, h.z + f.nz * h.sz, 1, chance(rng, 0.35) ? 2 : 1, 1);
  }
}

function hangingPlace(
  rng: Rng,
  houses: House[],
  tryPlace: (
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    v?: HouseVariant,
  ) => House | null,
  maxHouses: number,
) {
  const existing = houses.filter((h) => h.y >= 3 && h.y <= 10);
  for (const h of shuffle(rng, existing).slice(0, 6)) {
    if (houses.length >= maxHouses) return;
    const f = FACE[h.facade]!;
    tryPlace(h.x + f.nx * h.sx, Math.max(1, h.y - 1), h.z + f.nz * h.sz, 1, 1, 1, "hanging");
  }
}

function spitPlace(
  rng: Rng,
  tryPlace: (x: number, y: number, z: number, sx: number, sy: number, sz: number) => House | null,
  maxHouses: number,
  houses: House[],
) {
  for (let i = 0; i < 5; i++) {
    if (houses.length >= maxHouses) return;
    const x = randInt(rng, 6, 12);
    const z = randInt(rng, 5, 10);
    const y = chance(rng, 0.45) ? 1 : 0;
    tryPlace(x, y, z, 1, chance(rng, 0.3) ? 2 : 1, 1);
  }
}

function pillarPlace(
  rng: Rng,
  tryPlace: (x: number, y: number, z: number, sx: number, sy: number, sz: number) => House | null,
  maxHouses: number,
  houses: House[],
) {
  const ox = Math.round(PILLAR.x / CELL);
  const oz = Math.round(PILLAR.z / CELL);
  for (let i = 0; i < 8; i++) {
    if (houses.length >= maxHouses) return;
    const x = ox + randInt(rng, -2, 2);
    const z = oz + randInt(rng, -2, 2);
    const y = randInt(rng, 2, 8);
    tryPlace(x, y, z, 1, 1, 1);
  }
}

function emitHouse(h: House, grid: Occupancy, items: Items, rng: Rng) {
  const insetX = 0.9 + rng() * 0.07;
  const insetZ = 0.9 + rng() * 0.07;
  const bw = h.sx * CELL * insetX;
  const bd = h.sz * CELL * insetZ;
  const bh = h.sy * CELL;
  const [cx, , cz] = cellWorld(h.x, h.y, h.z, h.sx, h.sy, h.sz);
  const slackX = (h.sx * CELL - bw) * (rng() - 0.5) * 0.7;
  const slackZ = (h.sz * CELL - bd) * (rng() - 0.5) * 0.7;
  const px = cx + slackX;
  const pz = cz + slackZ;
  const by = cellBottom(h.y);
  const py = by + bh / 2;
  const hanging = h.variant === "hanging";

  push(items, "body", item([px, py, pz], [bw, bh, bd], h.color));
  push(items, "base", item([px, by + 0.05, pz], [bw + 0.08, 0.1, bd + 0.08], lighten(h.color, 0.08)));
  push(items, "cornice", item([px, by + bh - 0.05, pz], [bw + 0.1, 0.1, bd + 0.1], lighten(h.color, 0.16)));
  push(items, "roof", item([px, by + bh + 0.07, pz], [bw + 0.16, 0.14, bd + 0.16], h.roofColor));

  const parapetH = 0.22;
  const pw = 0.08;
  push(items, "parapet", item([px, by + bh + 0.18, pz + bd / 2 - 0.02], [bw + 0.1, parapetH, pw], lighten(h.color, 0.1)));
  push(items, "parapet", item([px, by + bh + 0.18, pz - bd / 2 + 0.02], [bw + 0.1, parapetH, pw], lighten(h.color, 0.1)));
  push(items, "parapet", item([px + bw / 2 - 0.02, by + bh + 0.18, pz], [pw, parapetH, bd], lighten(h.color, 0.1)));
  push(items, "parapet", item([px - bw / 2 + 0.02, by + bh + 0.18, pz], [pw, parapetH, bd], lighten(h.color, 0.1)));

  if (chance(rng, 0.28)) {
    push(
      items,
      "chimney",
      item(
        [px + (rng() - 0.5) * bw * 0.4, by + bh + 0.38, pz + (rng() - 0.5) * bd * 0.4],
        [0.18, 0.46, 0.18],
        pick(rng, ["#c4b8a8", "#b08978", lighten(h.color, -0.05)]),
      ),
    );
  }

  if (hanging) {
    push(items, "hangInner", item([px, py, pz], [bw * 0.78, bh * 0.72, bd * 0.78], "#d9c4a8"));
    push(items, "hangInner", item([px, by + 0.16, pz + 0.08], [0.42, 0.14, 0.28], "#8a5a44"));
    push(items, "glow", item([px, py + 0.08, pz], [0.12, 0.12, 0.12], "#ffd7a0"));
  }

  emitDoor(h, px, pz, by, bw, bd, bh, items, rng);
  emitFacades(h, grid, px, pz, by, bw, bd, bh, items, rng);

  if (chance(rng, 0.4)) emitRoofGarden(px, pz, by + bh, items, rng);
}

function emitDoor(
  h: House,
  px: number,
  pz: number,
  by: number,
  bw: number,
  bd: number,
  _bh: number,
  items: Items,
  rng: Rng,
) {
  const f = FACE[h.facade]!;
  const extX = bw / 2;
  const extZ = bd / 2;
  const doorW = Math.min(0.38, Math.max(0.3, (Math.abs(f.nx) ? bd : bw) * 0.38));
  const doorH = 0.74;
  const frameDepth = 0.045;
  const doorDepth = 0.05;
  const ox = px + f.nx * (extX + 0.055);
  const oz = pz + f.nz * (extZ + 0.055);
  const oy = by + doorH / 2 + 0.02;
  const rot: [number, number, number] = [0, f.rot, 0];
  const wood = pick(rng, WOOD);
  push(items, "doorFrame", item([ox, oy, oz], [doorW + 0.08, doorH + 0.08, frameDepth], "#f4f1ea", rot));
  push(
    items,
    "door",
    item([ox + f.nx * 0.04, oy, oz + f.nz * 0.04], [doorW, doorH, doorDepth], wood, rot),
  );
  push(
    items,
    "lantern",
    item([ox + (f.nz !== 0 ? 0.28 : 0) * (f.nz || f.nx), oy + 0.28, oz + (f.nx !== 0 ? 0.28 : 0) * (f.nx || -f.nz)], [0.07, 0.22, 0.07], "#5a4638"),
  );
  push(
    items,
    "glow",
    item(
      [ox + (f.nz !== 0 ? 0.28 : 0) * (f.nz || f.nx), oy + 0.4, oz + (f.nx !== 0 ? 0.28 : 0) * (f.nx || -f.nz)],
      [0.09, 0.09, 0.09],
      "#ffe6b0",
    ),
  );
}

function emitFacades(
  h: House,
  grid: Occupancy,
  px: number,
  pz: number,
  by: number,
  bw: number,
  bd: number,
  bh: number,
  items: Items,
  rng: Rng,
) {
  for (let face = 0 as Facade; face < 4; face = (face + 1) as Facade) {
    if (!grid.faceExposed(h.x, h.y, h.z, h.sx, h.sy, h.sz, face) && face !== h.facade) continue;
    const f = FACE[face]!;
    const hangingGlass = h.variant === "hanging" && face === h.facade;
    const rows = h.sy;
    const cols = Math.abs(f.nx) ? h.sz : h.sx;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const isDoor = face === h.facade && j === 0 && i === Math.floor((cols - 1) / 2);
        if (isDoor && !hangingGlass) continue;
        const tangent = cols === 1 ? 0 : (i + 0.5) / cols - 0.5;
        const alongW = Math.abs(f.nx) ? bd : bw;
        const along = tangent * alongW * 0.72;
        const wall = 0.022;
        const glassLift = 0.016;
        const wx = px + f.nx * (bw / 2 + wall) + f.nz * along;
        const wz = pz + f.nz * (bd / 2 + wall) + f.nx * along;
        const wy = by + (j + 0.55) * (bh / rows);
        const rot: [number, number, number] = [0, f.rot, 0];
        if (hangingGlass && j === 0) {
          push(
            items,
            "frame",
            item([wx, by + bh * 0.52, wz], [Math.abs(f.nx) ? bd * 0.82 : bw * 0.82, bh * 0.78, 1], "#152238", rot),
          );
          push(
            items,
            "glassCool",
            item(
              [wx + f.nx * glassLift, by + bh * 0.52, wz + f.nz * glassLift],
              [Math.abs(f.nx) ? bd * 0.7 : bw * 0.7, bh * 0.66, 1],
              "#8ec4e0",
              rot,
            ),
          );
          continue;
        }
        const ww = 0.28;
        const wh = 0.34;
        const warm = chance(rng, 0.32);
        push(items, "frame", item([wx, wy, wz], [ww + 0.07, wh + 0.07, 1], "#f6f3ec", rot));
        push(
          items,
          warm ? "glassWarm" : "glassCool",
          item(
            [wx + f.nx * glassLift, wy, wz + f.nz * glassLift],
            [ww, wh, 1],
            warm ? "#f0c888" : "#1b3550",
            rot,
          ),
        );
        if (!hangingGlass && chance(rng, 0.72)) {
          const sc = pick(rng, SHUTTERS);
          const open = 0.22;
          push(items, "shutter", item([wx + f.nz * (ww * 0.7), wy, wz + f.nx * (ww * 0.7)], [0.1, wh, 0.035], sc, [0, f.rot + open, 0]));
          push(items, "shutter", item([wx - f.nz * (ww * 0.7), wy, wz - f.nx * (ww * 0.7)], [0.1, wh, 0.035], sc, [0, f.rot - open, 0]));
        }
        if (chance(rng, 0.7)) {
          const bx = wx + f.nx * 0.08;
          const bz = wz + f.nz * 0.08;
          push(items, "box", item([bx, wy - wh / 2 - 0.07, bz], [ww + 0.08, 0.09, 0.14], pick(rng, ["#c48a6a", "#e8d9c4", "#8a5540"]), rot));
          const blooms = 3 + randInt(rng, 0, 2);
          for (let b = 0; b < blooms; b++) {
            push(
              items,
              "bloom",
              item(
                [bx + (rng() - 0.5) * 0.2, wy - wh / 2 - 0.01 + rng() * 0.08, bz + (rng() - 0.5) * 0.08],
                [0.08 + rng() * 0.05, 0.08 + rng() * 0.05, 0.08 + rng() * 0.05],
                pick(rng, BLOOMS),
              ),
            );
          }
        }
        if (j === 0 && chance(rng, 0.18)) {
          const a1 = pick(rng, AWNING_A);
          const a2 = pick(rng, AWNING_B);
          for (let s = 0; s < 5; s++) {
            const t = (s + 0.5) / 5 - 0.5;
            push(
              items,
              s % 2 === 0 ? "awningA" : "awningB",
              item(
                [wx + f.nz * t * (ww + 0.16) + f.nx * 0.12, wy + wh / 2 + 0.06, wz + f.nx * t * (ww + 0.16) + f.nz * 0.12],
                [0.08, 0.04, 0.28],
                s % 2 === 0 ? a1 : a2,
                [0.42 * (f.nx !== 0 ? Math.sign(f.nx) : 0) || 0.42 * Math.sign(f.nz || 1), f.rot, 0],
              ),
            );
          }
        }
      }
    }
    if (h.sy >= 2 && face === h.facade && chance(rng, 0.55)) {
      const f2 = FACE[face]!;
      const by2 = by + CELL * 0.95;
      const ox = px + f2.nx * (bw / 2 + 0.22);
      const oz = pz + f2.nz * (bd / 2 + 0.22);
      const span = Math.abs(f2.nx) ? bd * 0.72 : bw * 0.72;
      push(items, "balcony", item([ox, by2, oz], [Math.abs(f2.nx) ? 0.38 : span, 0.07, Math.abs(f2.nz) ? 0.38 : span], "#efe8dc", [0, f2.rot, 0]));
      const posts = 4;
      for (let p = 0; p < posts; p++) {
        const t = (p + 0.5) / posts - 0.5;
        const rx = ox + f2.nz * t * span * 0.9;
        const rz = oz + f2.nx * t * span * 0.9;
        push(items, "rail", item([rx, by2 + 0.22, rz], [0.04, 0.4, 0.04], "#f4f1ea"));
      }
      push(items, "rail", item([ox + f2.nx * 0.02, by2 + 0.4, oz + f2.nz * 0.02], [Math.abs(f2.nx) ? 0.04 : span, 0.04, Math.abs(f2.nz) ? 0.04 : span], "#f4f1ea"));
    }
  }
}

function emitRoofGarden(px: number, pz: number, top: number, items: Items, rng: Rng) {
  const n = randInt(rng, 2, 5);
  for (let i = 0; i < n; i++) {
    const x = px + (rng() - 0.5) * 0.7;
    const z = pz + (rng() - 0.5) * 0.7;
    push(items, "pot", item([x, top + 0.12, z], [0.16, 0.16, 0.16], pick(rng, ["#c48a6a", "#e8d9c4", "#8a5540"])));
    push(items, "canopy", item([x, top + 0.32, z], [0.28, 0.28, 0.28], pick(rng, CANOPY)));
    if (chance(rng, 0.5)) {
      push(items, "bloom", item([x, top + 0.34, z], [0.12, 0.12, 0.12], pick(rng, BLOOMS)));
    }
  }
}

function emitStairs(grid: Occupancy, sampler: ReturnType<typeof createCliffSampler>, items: Items, rng: Rng) {
  const steps = 46;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const yWorld = BASE_Y + t * (MAIN_H * CELL - 1.4);
    const a = t * Math.PI * 2 * 1.28 + 0.35;
    const rad = sampler.mainRadius(yWorld, a) + 1.25;
    const x = Math.sin(a) * rad;
    const z = Math.cos(a) * rad;
    const gx = Math.round(x / CELL);
    const gz = Math.round(z / CELL);
    const gy = Math.round((yWorld - BASE_Y) / CELL);
    if (grid.isSolid(gx, gy, gz)) continue;
    grid.set(gx, gy, gz, "stair");
    push(
      items,
      "step",
      item([(gx + 0.5) * CELL, cellBottom(gy) + 0.07, (gz + 0.5) * CELL], [CELL * 0.92, 0.14, CELL * 0.92], pick(rng, STONE), [0, a, 0]),
    );
    if (i % 5 === 0) {
      push(items, "lantern", item([(gx + 0.5) * CELL + Math.sin(a) * 0.4, cellBottom(gy) + 0.7, (gz + 0.5) * CELL + Math.cos(a) * 0.4], [0.08, 1.1, 0.08], "#5a4638"));
      push(items, "glow", item([(gx + 0.5) * CELL + Math.sin(a) * 0.4, cellBottom(gy) + 1.28, (gz + 0.5) * CELL + Math.cos(a) * 0.4], [0.12, 0.12, 0.12], "#ffe6b0"));
    }
  }
}

function emitWalks(houses: House[], grid: Occupancy, items: Items) {
  for (const h of houses) {
    const f = FACE[h.facade]!;
    const gx = h.x + (f.nx > 0 ? h.sx : f.nx < 0 ? -1 : Math.floor(h.sx / 2));
    const gz = h.z + (f.nz > 0 ? h.sz : f.nz < 0 ? -1 : Math.floor(h.sz / 2));
    const gy = h.y;
    if (grid.isSolid(gx, gy, gz)) continue;
    grid.set(gx, gy, gz, "walk");
    push(items, "slab", item([gx * CELL + CELL / 2, cellBottom(gy) + 0.04, gz * CELL + CELL / 2], [CELL * 0.95, 0.1, CELL * 0.95], "#d8d0c2"));
  }
  for (let ix = -3; ix <= 3; ix++) {
    for (let iz = 4; iz <= 8; iz++) {
      if (grid.isSolid(ix, 0, iz)) continue;
      push(items, "slab", item([(ix + 0.5) * CELL, BASE_Y + 0.05, (iz + 0.5) * CELL], [CELL * 0.96, 0.1, CELL * 0.96], "#d2cbbd"));
    }
  }
}

function emitBridge(items: Items) {
  const from: [number, number, number] = [-4.2, cellBottom(8) + 0.2, -1.2];
  const to: [number, number, number] = [PILLAR.x + 2.1, cellBottom(7) + 0.4, PILLAR.z];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * 1.65;
    const x = from[0] + (to[0] - from[0]) * t;
    const z = from[2] + (to[2] - from[2]) * t;
    push(items, "stone", item([x, y, z], [0.85, 0.28, 0.7], i % 2 ? "#d8d1c4" : "#cfc6b6"));
    if (i > 0 && i < n) {
      push(items, "rail", item([x, y + 0.45, z + 0.28], [0.7, 0.08, 0.08], "#f0ece3"));
      push(items, "rail", item([x, y + 0.45, z - 0.28], [0.7, 0.08, 0.08], "#f0ece3"));
    }
  }
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const a = Math.PI * t;
    const x = (from[0] + to[0]) / 2;
    const z = (from[2] + to[2]) / 2;
    const y = Math.min(from[1], to[1]) - 0.2 + Math.sin(a) * 1.5;
    const span = Math.hypot(to[0] - from[0], to[2] - from[2]);
    const ox = Math.cos(a) * (span * 0.42);
    push(items, "stone", item([x + ox * 0.15, y - 0.4, z], [0.55, 0.4, 0.55], "#c9c0b0"));
  }
}

function emitTrees(
  houses: House[],
  _grid: Occupancy,
  items: Items,
  rng: Rng,
  sampler: ReturnType<typeof createCliffSampler>,
) {
  const tops = houses.filter((h) => h.y + h.sy >= 6);
  for (const h of tops) {
    if (!chance(rng, 0.55)) continue;
    const [cx, , cz] = h.center;
    const top = cellBottom(h.y) + h.sy * CELL + 0.2;
    const cypress = chance(rng, 0.55);
    push(items, "trunk", item([cx + (rng() - 0.5) * 0.4, top + 0.4, cz + (rng() - 0.5) * 0.4], [0.12, 0.8, 0.12], "#5a3a28"));
    if (cypress) {
      push(items, "canopy", item([cx, top + 1.5, cz], [0.7, 2.2, 0.7], pick(rng, CANOPY)));
    } else {
      push(items, "canopy", item([cx, top + 1.15, cz], [1.6, 0.7, 1.6], pick(rng, CANOPY)));
    }
  }
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2;
    const y = 2 + rng() * 10;
    const rad = sampler.mainRadius(y, a) + 0.2;
    const x = Math.sin(a) * rad;
    const z = Math.cos(a) * rad;
    if (chance(rng, 0.5)) {
      push(items, "canopy", item([x, y + 1.2, z], [0.55, 1.8, 0.55], pick(rng, CANOPY)));
      push(items, "trunk", item([x, y + 0.3, z], [0.1, 0.6, 0.1], "#5a3a28"));
    }
  }
  for (let i = 0; i < 8; i++) {
    const x = PILLAR.x + (rng() - 0.5) * 3;
    const z = PILLAR.z + (rng() - 0.5) * 3;
    const y = 8 + rng() * 3;
    push(items, "canopy", item([x, y, z], [rng() > 0.5 ? 1.5 : 0.6, rng() > 0.5 ? 0.65 : 1.9, rng() > 0.5 ? 1.5 : 0.6], pick(rng, CANOPY)));
    push(items, "trunk", item([x, y - 0.8, z], [0.12, 0.9, 0.12], "#5a3a28"));
  }
}

function emitPeople(grid: Occupancy, items: Items, rng: Rng) {
  const spots = [...grid.list("walk"), ...grid.list("stair")];
  const picked = shuffle(rng, spots).slice(0, 16);
  for (const s of picked) {
    const x = (s.x + 0.5) * CELL + (rng() - 0.5) * 0.2;
    const z = (s.z + 0.5) * CELL + (rng() - 0.5) * 0.2;
    const y = cellBottom(s.y) + 0.42;
    const shirt = pick(rng, SHIRTS);
    push(items, "person", item([x, y, z], [0.16, 0.38, 0.12], shirt));
    push(items, "head", item([x, y + 0.28, z], [0.13, 0.13, 0.13], "#f3d2b8"));
  }
}

function emitBoats(items: Items, rng: Rng) {
  for (let i = 0; i < 5; i++) {
    const a = -0.35 + rng() * 1.1;
    const rad = 14 + rng() * 16;
    const x = Math.sin(a) * rad + 2;
    const z = Math.cos(a) * rad + 4;
    const y = 0.12;
    const rot: [number, number, number] = [0, a + Math.PI / 2, 0];
    push(items, "boat", item([x, y, z], [1.4, 0.22, 0.48], "#f4f0e8", rot));
    if (chance(rng, 0.7)) {
      push(items, "sail", item([x, y + 1.05, z], [0.08, 1.7, 0.9], pick(rng, ["#f4f0e8", "#e89aaa", "#fff8ee"]), rot));
    }
  }
}

function emitClouds(items: Items, rng: Rng) {
  const clusters: [number, number, number, number][] = [
    [18, 28, -22, 1.15],
    [-24, 24, -8, 0.9],
    [8, 32, -28, 0.8],
    [-16, 26, 18, 0.7],
    [32, 22, 4, 0.6],
    [-30, 20, -16, 0.55],
  ];
  for (const [cx, cy, cz, s] of clusters) {
    const n = 16 + Math.floor(rng() * 12);
    for (let i = 0; i < n; i++) {
      const ox = (rng() - 0.5) * 10 * s;
      const oy = (rng() - 0.5) * 4 * s;
      const oz = (rng() - 0.5) * 7 * s;
      const sc = (1.6 + rng() * 3.2) * s;
      const peach = oy < -0.4;
      push(
        items,
        "cloud",
        item([cx + ox, cy + oy, cz + oz], [sc * (1.1 + rng() * 0.4), sc * 0.75, sc * (1 + rng() * 0.3)], peach ? "#fff1e4" : "#ffffff"),
      );
    }
  }
}

function emitDistant(items: Items, rng: Rng) {
  for (let i = 0; i < 7; i++) {
    const x = 16 + rng() * 8;
    const z = 9 + rng() * 6;
    const y = 0.45 + rng() * 0.8;
    push(items, "body", item([x, y, z], [0.7 + rng() * 0.5, 0.7 + rng() * 1.1, 0.6 + rng() * 0.4], pick(rng, ["#e89aaa", "#4d78b8", "#fff8ee", "#f0b089", "#f3dc86"])));
  }
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2;
    const r = 28 + rng() * 18;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    push(items, "stone", item([x, 1.2 + rng(), z], [2.4 + rng() * 2, 3 + rng() * 4, 2.2], "#c5d0c8"));
  }
}

function emitVines(houses: House[], items: Items, rng: Rng) {
  for (const h of houses) {
    if (!chance(rng, 0.22)) continue;
    const f = FACE[h.facade]!;
    const [cx, cy, cz] = h.center;
    push(
      items,
      "vine",
      item(
        [cx + f.nx * (h.sx * CELL * 0.48), cy - 0.05, cz + f.nz * (h.sz * CELL * 0.48)],
        [0.05, 0.35 + rng() * 0.35, 0.05],
        pick(rng, CANOPY),
      ),
    );
  }
}
