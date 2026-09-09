import { create } from "zustand";
import type { House, TimeOfDay, VillageStats } from "./types";

type VillageState = {
  seed: number;
  density: number;
  autoRotate: boolean;
  timeOfDay: TimeOfDay;
  selected: House | null;
  stats: VillageStats | null;
  intro: boolean;
  setSeed: (seed: number) => void;
  setDensity: (density: number) => void;
  setAutoRotate: (autoRotate: boolean) => void;
  setTimeOfDay: (timeOfDay: TimeOfDay) => void;
  setSelected: (selected: House | null) => void;
  setStats: (stats: VillageStats) => void;
  dismissIntro: () => void;
  reroll: () => void;
};

const INITIAL_SEED = 20260909;

export const useVillage = create<VillageState>((set) => ({
  seed: INITIAL_SEED,
  density: 1,
  autoRotate: true,
  timeOfDay: "day",
  selected: null,
  stats: null,
  intro: true,
  setSeed: (seed) => set({ seed, selected: null }),
  setDensity: (density) => set({ density, selected: null }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setSelected: (selected) => set({ selected }),
  setStats: (stats) => set({ stats }),
  dismissIntro: () => set({ intro: false }),
  reroll: () => set({ seed: (Math.random() * 0xffffffff) >>> 0, selected: null, intro: false }),
}));
