import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { generateVillage } from "@/lib/village/generate";
import { useVillage } from "@/lib/village/store";
import { Village } from "./Village";
import { Birds, Blimp, Cliffs, DistantHills, LIGHT, Lights, Sea, SkyDome } from "./World";

function AimCamera() {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.set(24, 15.5, 32);
    camera.lookAt(0, 8, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function Scene() {
  const seed = useVillage((s) => s.seed);
  const density = useVillage((s) => s.density);
  const autoRotate = useVillage((s) => s.autoRotate);
  const timeOfDay = useVillage((s) => s.timeOfDay);
  const selected = useVillage((s) => s.selected);
  const setSelected = useVillage((s) => s.setSelected);
  const setStats = useVillage((s) => s.setStats);

  const village = useMemo(() => generateVillage(seed, density), [seed, density]);

  useEffect(() => {
    setStats(village.stats);
    (
      window as Window & {
        __cielaria?: { houses: number; doors: number; seed: number };
      }
    ).__cielaria = {
      houses: village.stats.houses,
      doors: village.stats.doors,
      seed: village.stats.seed,
    };
  }, [village, setStats]);

  const preset = LIGHT[timeOfDay];
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = preset.exposure;
  }, [gl, preset.exposure]);

  const controls = useRef<{ target: THREE.Vector3 } | null>(null);
  const focus = useRef(new THREE.Vector3(0, 8, 0));

  useFrame((state, dt) => {
    const w = window as Window & {
      __r3f?: { calls: number; tris: number; cam: number[] };
    };
    w.__r3f = {
      calls: state.gl.info.render.calls,
      tris: state.gl.info.render.triangles,
      cam: state.camera.position.toArray(),
    };
    const c = controls.current;
    if (!c) return;
    const d = Math.min(dt, 0.1);
    if (selected) {
      focus.current.set(selected.center[0], selected.center[1], selected.center[2]);
    } else {
      focus.current.set(0, 8, 0);
    }
    c.target.lerp(focus.current, 1 - Math.exp(-3.2 * d));
  });

  return (
    <>
      <AimCamera />
      <color attach="background" args={[preset.horizon]} />
      <fog attach="fog" args={[preset.fog, 55, 140]} />
      <SkyDome timeOfDay={timeOfDay} />
      <Lights timeOfDay={timeOfDay} />
      <Sea timeOfDay={timeOfDay} />
      <Cliffs seed={seed} />
      <DistantHills />
      <Village
        key={`${seed}-${density}`}
        village={village}
        timeOfDay={timeOfDay}
        onSelect={(index) => {
          const house = village.houses[index];
          setSelected(house ?? null);
        }}
      />
      {selected ? (
        <mesh position={selected.center}>
          <boxGeometry
            args={[selected.sx * 1.2 + 0.18, selected.sy * 1.2 + 0.18, selected.sz * 1.2 + 0.18]}
          />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.7} />
        </mesh>
      ) : null}
      <Blimp />
      <Birds />
      <OrbitControls
        ref={controls as never}
        makeDefault
        enableDamping
        dampingFactor={0.06}
        autoRotate={autoRotate && !selected}
        autoRotateSpeed={0.35}
        minPolarAngle={0.62}
        maxPolarAngle={Math.PI * 0.45}
        minDistance={22}
        maxDistance={64}
        target={[0, 8, 0]}
      />
    </>
  );
}

export function VillageCanvas() {
  const [isMobile, setIsMobile] = useState(false);
  const setSelected = useVillage((s) => s.setSelected);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
  }, []);

  return (
    <Canvas
      className="absolute inset-0 z-[1] h-full w-full touch-none"
      shadows
      dpr={[1, isMobile ? 1.25 : 1.7]}
      camera={{ position: [24, 15.5, 32], fov: 34, near: 1.4, far: 240 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 8, 0);
      }}
      onPointerMissed={() => setSelected(null)}
    >
      <Scene />
    </Canvas>
  );
}
