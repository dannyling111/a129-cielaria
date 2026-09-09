import { CELL, type CellKind } from "./types";

export class Occupancy {
  private cells = new Map<string, CellKind>();
  readonly cell = CELL;

  key(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  get(x: number, y: number, z: number): CellKind {
    return this.cells.get(this.key(x, y, z)) ?? "air";
  }

  set(x: number, y: number, z: number, kind: CellKind): void {
    if (kind === "air") this.cells.delete(this.key(x, y, z));
    else this.cells.set(this.key(x, y, z), kind);
  }

  isSolid(x: number, y: number, z: number): boolean {
    const k = this.get(x, y, z);
    return k === "rock" || k === "house";
  }

  isFree(x: number, y: number, z: number): boolean {
    const k = this.get(x, y, z);
    return k === "air" || k === "walk" || k === "stair";
  }

  regionFree(x: number, y: number, z: number, sx: number, sy: number, sz: number): boolean {
    for (let i = 0; i < sx; i++) {
      for (let j = 0; j < sy; j++) {
        for (let k = 0; k < sz; k++) {
          if (this.isSolid(x + i, y + j, z + k)) return false;
        }
      }
    }
    return true;
  }

  fill(x: number, y: number, z: number, sx: number, sy: number, sz: number, kind: CellKind): void {
    for (let i = 0; i < sx; i++) {
      for (let j = 0; j < sy; j++) {
        for (let k = 0; k < sz; k++) {
          this.set(x + i, y + j, z + k, kind);
        }
      }
    }
  }

  support(
    x: number,
    y: number,
    z: number,
    sx: number,
    sz: number,
  ): "ground" | "stack" | "cantilever" | false {
    if (y <= 0) return "ground";
    let below = 0;
    const total = sx * sz;
    for (let i = 0; i < sx; i++) {
      for (let k = 0; k < sz; k++) {
        if (this.isSolid(x + i, y - 1, z + k)) below++;
      }
    }
    if (below / total >= 0.45) return "stack";

    let side = 0;
    for (let j = 0; j < 1; j++) {
      for (let i = 0; i < sx; i++) {
        if (this.isSolid(x + i, y + j, z - 1) || this.isSolid(x + i, y + j, z + sz)) side++;
      }
      for (let k = 0; k < sz; k++) {
        if (this.isSolid(x - 1, y + j, z + k) || this.isSolid(x + sx, y + j, z + k)) side++;
      }
    }
    if (side >= 1 && below >= 1) return "cantilever";
    if (side >= 2) return "cantilever";
    if (below >= 1) return "cantilever";
    return false;
  }

  count(kind: CellKind): number {
    let n = 0;
    for (const v of this.cells.values()) if (v === kind) n++;
    return n;
  }

  list(kind: CellKind): { x: number; y: number; z: number }[] {
    const out: { x: number; y: number; z: number }[] = [];
    for (const [key, v] of this.cells) {
      if (v !== kind) continue;
      const [x, y, z] = key.split(",").map(Number) as [number, number, number];
      out.push({ x, y, z });
    }
    return out;
  }

  faceExposed(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    facade: 0 | 1 | 2 | 3,
  ): boolean {
    let open = 0;
    let total = 0;
    for (let j = 0; j < sy; j++) {
      if (facade === 0) {
        for (let i = 0; i < sx; i++) {
          total++;
          if (this.isFree(x + i, y + j, z + sz)) open++;
        }
      } else if (facade === 2) {
        for (let i = 0; i < sx; i++) {
          total++;
          if (this.isFree(x + i, y + j, z - 1)) open++;
        }
      } else if (facade === 1) {
        for (let k = 0; k < sz; k++) {
          total++;
          if (this.isFree(x + sx, y + j, z + k)) open++;
        }
      } else {
        for (let k = 0; k < sz; k++) {
          total++;
          if (this.isFree(x - 1, y + j, z + k)) open++;
        }
      }
    }
    return total > 0 && open / total >= 0.5;
  }
}
