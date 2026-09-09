import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PILLAR } from "@/lib/village/cliffShape";
import type { TimeOfDay } from "@/lib/village/types";
import { buildMainCliff, buildPillarCliff } from "./cliffMesh";

const SKY_VERT = `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAG = `
varying vec3 vPos;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uNadir;
void main() {
  float h = normalize(vPos).y;
  vec3 col = h > 0.0
    ? mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.62))
    : mix(uHorizon, uNadir, pow(clamp(-h, 0.0, 1.0), 0.45));
  gl_FragColor = vec4(col, 1.0);
}
`;

const SEA_VERT = `
varying vec3 vWorld;
uniform float uTime;
void main() {
  vec3 p = position;
  float w = sin(p.x * 0.12 + uTime * 0.45) * 0.08 + sin(p.y * 0.1 + uTime * 0.32) * 0.06;
  p.z += w;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SEA_FRAG = `
varying vec3 vWorld;
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFoam;
uniform vec3 uFog;
void main() {
  float d = length(vWorld.xz);
  float waves = sin(vWorld.x * 0.16 + uTime * 0.4) * sin(vWorld.z * 0.19 + uTime * 0.33);
  vec3 col = mix(uShallow, uDeep, smoothstep(7.0, 55.0, d) + waves * 0.07);
  float foam = smoothstep(8.4, 5.6, d);
  col = mix(col, uFoam, foam * 0.4);
  float spark = pow(max(waves, 0.0), 6.0) * 0.12;
  col += spark;
  float fogF = smoothstep(50.0, 130.0, d);
  col = mix(col, uFog, fogF);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const LIGHT = {
  day: {
    zenith: "#2f8fe0",
    horizon: "#c8e9fb",
    nadir: "#6eb4dc",
    fog: "#9fd4ee",
    sun: new THREE.Vector3(28, 38, 16),
    sunColor: "#fff4e4",
    sunInt: 1.25,
    hemiSky: "#b7e0ff",
    hemiGround: "#f0e2c4",
    hemiInt: 1.05,
    fill: "#c5e8ff",
    fillInt: 0.55,
    ambient: 0.52,
    exposure: 1.12,
    glow: 0.22,
  },
  golden: {
    zenith: "#4a86c4",
    horizon: "#ffd2a4",
    nadir: "#e8a878",
    fog: "#f0c8a0",
    sun: new THREE.Vector3(36, 16, 10),
    sunColor: "#ffb978",
    sunInt: 1.45,
    hemiSky: "#ffc8a0",
    hemiGround: "#e8c090",
    hemiInt: 0.6,
    fill: "#8ab0d8",
    fillInt: 0.28,
    ambient: 0.22,
    exposure: 1.05,
    glow: 0.48,
  },
  dusk: {
    zenith: "#1e3f6e",
    horizon: "#f0b48a",
    nadir: "#3d5a78",
    fog: "#6a7ea0",
    sun: new THREE.Vector3(18, 7, -28),
    sunColor: "#ff8a5c",
    sunInt: 0.85,
    hemiSky: "#6a88b8",
    hemiGround: "#c89878",
    hemiInt: 0.45,
    fill: "#4a68a0",
    fillInt: 0.22,
    ambient: 0.16,
    exposure: 0.92,
    glow: 1.15,
  },
} as const;

export function SkyDome({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const preset = LIGHT[timeOfDay];
  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    (m.uniforms.uZenith!.value as THREE.Color).set(preset.zenith);
    (m.uniforms.uHorizon!.value as THREE.Color).set(preset.horizon);
    (m.uniforms.uNadir!.value as THREE.Color).set(preset.nadir);
  });
  const uniforms = useMemo(
    () => ({
      uZenith: { value: new THREE.Color(preset.zenith) },
      uHorizon: { value: new THREE.Color(preset.horizon) },
      uNadir: { value: new THREE.Color(preset.nadir) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return (
    <mesh>
      <sphereGeometry args={[180, 24, 16]} />
      <shaderMaterial
        ref={mat}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
        vertexShader={SKY_VERT}
        fragmentShader={SKY_FRAG}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export function Sea({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const preset = LIGHT[timeOfDay];
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color("#1c6ea6") },
      uShallow: { value: new THREE.Color("#5eb7d8") },
      uFoam: { value: new THREE.Color("#d8f1f8") },
      uFog: { value: new THREE.Color(preset.fog) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useFrame((_, dt) => {
    const m = mat.current;
    if (!m) return;
    m.uniforms.uTime!.value = (m.uniforms.uTime!.value as number) + dt;
    (m.uniforms.uFog!.value as THREE.Color).set(preset.fog);
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[220, 220, 72, 72]} />
      <shaderMaterial ref={mat} vertexShader={SEA_VERT} fragmentShader={SEA_FRAG} uniforms={uniforms} />
    </mesh>
  );
}

export function Cliffs({ seed }: { seed: number }) {
  const main = useMemo(() => buildMainCliff(seed), [seed]);
  const pillar = useMemo(() => buildPillarCliff(seed), [seed]);
  return (
    <>
      <mesh geometry={main} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.96} metalness={0} />
      </mesh>
      <mesh geometry={pillar} position={[PILLAR.x, 0, PILLAR.z]} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.96} metalness={0} />
      </mesh>
    </>
  );
}

export function Lights({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const preset = LIGHT[timeOfDay];
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  return (
    <>
      <ambientLight intensity={preset.ambient} />
      <hemisphereLight args={[preset.hemiSky, preset.hemiGround, preset.hemiInt]} />
      <directionalLight
        castShadow
        position={preset.sun.toArray()}
        color={preset.sunColor}
        intensity={preset.sunInt}
        shadow-mapSize={isMobile ? [1024, 1024] : [1536, 1536]}
        shadow-camera-near={2}
        shadow-camera-far={90}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.00045}
        shadow-normalBias={0.04}
      />
      <directionalLight position={[-18, 10, 22]} color={preset.fill} intensity={preset.fillInt} />
    </>
  );
}

export function Blimp() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.08;
    if (!ref.current) return;
    ref.current.position.set(Math.sin(t) * 14 - 4, 21 + Math.sin(t * 1.4) * 0.4, Math.cos(t) * 10 + 2);
    ref.current.rotation.y = t + Math.PI / 2;
  });
  return (
    <group ref={ref}>
      <mesh castShadow>
        <sphereGeometry args={[1.15, 16, 12]} />
        <meshStandardMaterial color="#f4efe4" roughness={0.7} />
      </mesh>
      <mesh scale={[1.8, 0.72, 0.72]} castShadow>
        <sphereGeometry args={[1.15, 16, 12]} />
        <meshStandardMaterial color="#efe6d4" roughness={0.7} />
      </mesh>
      <mesh position={[0, -1.05, 0]} castShadow>
        <boxGeometry args={[0.7, 0.32, 0.42]} />
        <meshStandardMaterial color="#c48a62" roughness={0.6} />
      </mesh>
      <mesh position={[-1.9, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.5, 0.08, 0.7]} />
        <meshStandardMaterial color="#d9c4a0" />
      </mesh>
    </group>
  );
}

export function Birds() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.children.forEach((c, i) => {
      const a = t * 0.25 + i * 0.7;
      c.position.set(Math.sin(a) * (10 + i), 14 + Math.sin(a * 2 + i) * 1.2, Math.cos(a) * (8 + i * 0.4));
      c.rotation.y = a + Math.PI / 2;
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.35, 0.03, 0.12]} />
          <meshBasicMaterial color="#1c2430" />
        </mesh>
      ))}
    </group>
  );
}

export function DistantHills() {
  return (
    <group>
      <mesh position={[-18, 2.2, -28]} rotation={[0, 0.4, 0]}>
        <coneGeometry args={[8, 9, 5]} />
        <meshLambertMaterial color="#9bb8c8" />
      </mesh>
      <mesh position={[12, 1.6, -32]}>
        <coneGeometry args={[10, 7, 5]} />
        <meshLambertMaterial color="#b3c9d4" />
      </mesh>
      <mesh position={[28, 0.8, -12]}>
        <coneGeometry args={[6, 5, 4]} />
        <meshLambertMaterial color="#a8c4d0" />
      </mesh>
    </group>
  );
}
