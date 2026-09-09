import { useEffect, useState, type ReactNode } from "react";
import {
  CloudSun,
  Info,
  Moon,
  RotateCcw,
  RotateCw,
  Sun,
  X,
} from "lucide-react";
import { parseSeed } from "@/lib/village/rng";
import { useVillage } from "@/lib/village/store";
import type { TimeOfDay } from "@/lib/village/types";

const TIMES: { id: TimeOfDay; label: string; icon: typeof Sun }[] = [
  { id: "day", label: "Day", icon: Sun },
  { id: "golden", label: "Golden", icon: CloudSun },
  { id: "dusk", label: "Dusk", icon: Moon },
];

export function Overlay() {
  const seed = useVillage((s) => s.seed);
  const density = useVillage((s) => s.density);
  const autoRotate = useVillage((s) => s.autoRotate);
  const timeOfDay = useVillage((s) => s.timeOfDay);
  const selected = useVillage((s) => s.selected);
  const stats = useVillage((s) => s.stats);
  const intro = useVillage((s) => s.intro);
  const setSeed = useVillage((s) => s.setSeed);
  const setDensity = useVillage((s) => s.setDensity);
  const setAutoRotate = useVillage((s) => s.setAutoRotate);
  const setTimeOfDay = useVillage((s) => s.setTimeOfDay);
  const setSelected = useVillage((s) => s.setSelected);
  const reroll = useVillage((s) => s.reroll);
  const dismissIntro = useVillage((s) => s.dismissIntro);

  const [seedText, setSeedText] = useState(String(seed));
  const [engineOpen, setEngineOpen] = useState(false);

  useEffect(() => {
    setSeedText(String(seed));
  }, [seed]);

  useEffect(() => {
    const t = window.setTimeout(() => dismissIntro(), 3200);
    return () => window.clearTimeout(t);
  }, [dismissIntro]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "KeyR") reroll();
      if (e.code === "Space") {
        e.preventDefault();
        setAutoRotate(!useVillage.getState().autoRotate);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reroll, setAutoRotate]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-ink">
      <div
        className={
          "absolute inset-0 bg-sky/10 transition-opacity duration-[var(--motion-slow)] " +
          (intro ? "opacity-100" : "opacity-0")
        }
      />

      <header className="pointer-events-none absolute top-0 left-0 right-0 flex items-start justify-between gap-3 p-4 sm:p-6">
        <div className="pointer-events-auto max-w-[16rem]">
          <p className="font-display text-2xl leading-none tracking-display text-ink sm:text-3xl">
            Cielaria
          </p>
          <p className="mt-1 text-xs text-ink-soft sm:text-sm">Cliff village in the clouds</p>
        </div>
        <div className="pointer-events-auto flex flex-wrap justify-end gap-2">
          <IconBtn
            label={autoRotate ? "Stop rotation" : "Auto-rotate"}
            onClick={() => setAutoRotate(!autoRotate)}
          >
            <RotateCw className={"size-4 " + (autoRotate ? "" : "opacity-40")} />
          </IconBtn>
          <IconBtn label="Rebuild village" onClick={reroll}>
            <RotateCcw className="size-4" />
          </IconBtn>
          <IconBtn
            label="Quantization engine"
            onClick={() => setEngineOpen((v) => !v)}
          >
            <Info className="size-4" />
          </IconBtn>
        </div>
      </header>

      <div
        className={
          "pointer-events-none absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-[var(--motion-emphasis)] " +
          (intro ? "opacity-100" : "pointer-events-none opacity-0")
        }
      >
        <p className="font-display text-5xl tracking-display text-ink sm:text-7xl">Cielaria</p>
        <p className="mt-3 text-sm text-ink-soft sm:text-base">A village stacked into the sky</p>
      </div>

      {selected ? (
        <aside className="pointer-events-auto absolute top-20 right-4 w-[min(18rem,calc(100%-2rem))] rounded-xl border border-line bg-paper p-4 shadow-sm sm:top-24 sm:right-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-lg leading-snug tracking-tight">{selected.name}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-ink-soft">{selected.variant}</p>
            </div>
            <button
              type="button"
              className="rounded-sm p-1 text-ink-soft hover:text-ink"
              onClick={() => setSelected(null)}
              aria-label="Close house"
            >
              <X className="size-4" />
            </button>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <Row label="Grid" value={`${selected.sx}×${selected.sy}×${selected.sz}`} />
            <Row label="Support" value={selected.support} />
            <Row label="Cell" value={`${selected.x}, ${selected.y}, ${selected.z}`} />
            <Row label="Door" value={["Sea", "East", "Land", "West"][selected.facade] ?? "—"} />
          </dl>
          <div className="mt-3 flex items-center gap-2">
            <span
              className="size-4 rounded-sm border border-line"
              style={{ background: selected.color }}
            />
            <span className="text-xs text-ink-soft">{selected.color}</span>
          </div>
        </aside>
      ) : null}

      {engineOpen ? (
        <section className="pointer-events-auto absolute bottom-28 left-4 w-[min(20rem,calc(100%-2rem))] rounded-xl border border-line bg-paper p-4 shadow-sm sm:left-6">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Quantize engine</p>
          <p className="mt-1 font-display text-lg">Snapped stack</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <Row label="Houses" value={stats ? String(stats.houses) : "—"} />
            <Row label="Doors" value={stats ? String(stats.doors) : "—"} />
            <Row label="Cells" value={stats ? String(stats.cells) : "—"} />
            <Row label="Grid" value={stats ? `${stats.cellSize.toFixed(2)} m` : "—"} />
            <Row label="Stacks" value={stats ? String(stats.stacks) : "—"} />
            <Row label="Cantilever" value={stats ? String(stats.cantilevers) : "—"} />
          </dl>
          <p className="mt-3 text-xs text-ink-soft">
            {stats?.integrated
              ? "Every house has a door. Volumes snap to the grid with no overlap."
              : "Building village…"}
          </p>
        </section>
      ) : null}

      <footer className="pointer-events-auto absolute right-0 bottom-0 left-0 p-4 sm:p-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-line bg-paper/95 p-3 sm:flex-row sm:items-center sm:gap-4 sm:rounded-2xl sm:p-3">
          <label className="flex min-w-0 flex-1 items-center gap-2">
            <span className="hidden text-xs text-ink-soft sm:inline">Seed</span>
            <input
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              onBlur={() => setSeed(parseSeed(seedText))}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSeed(parseSeed(seedText));
              }}
              className="h-10 w-full rounded-md border border-line bg-paper-2 px-3 text-sm tabular-nums outline-none focus:ring-2 focus:ring-sky/40"
              aria-label="Village seed"
              suppressHydrationWarning
            />
          </label>
          <label className="flex items-center gap-2 sm:w-44">
            <span className="text-xs text-ink-soft">Stack</span>
            <input
              type="range"
              min={0.6}
              max={1.35}
              step={0.05}
              value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
              className="h-10 w-full accent-sky"
              aria-label="Village density"
              suppressHydrationWarning
            />
          </label>
          <div className="flex rounded-md border border-line p-0.5">
            {TIMES.map((t) => {
              const Icon = t.icon;
              const on = timeOfDay === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeOfDay(t.id)}
                  className={
                    "flex h-10 min-w-10 items-center justify-center rounded-sm px-2.5 text-xs " +
                    (on ? "bg-ink text-paper" : "text-ink-soft hover:text-ink")
                  }
                  aria-pressed={on}
                  aria-label={t.label}
                >
                  <Icon className="size-4" />
                  <span className="ml-1 hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-ink-soft">
          Drag to orbit · scroll to zoom · click a house
        </p>
      </footer>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-lg border border-line bg-paper text-ink shadow-sm"
    >
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </>
  );
}
