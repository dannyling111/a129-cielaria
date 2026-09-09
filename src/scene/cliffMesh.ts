import * as THREE from "three";
import { createCliffSampler, PILLAR } from "@/lib/village/cliffShape";
import { MAIN_H } from "@/lib/village/types";

export function buildMainCliff(seed: number): THREE.BufferGeometry {
  const sampler = createCliffSampler(seed);
  const geo = new THREE.CylinderGeometry(1, 1, MAIN_H * 1.2 + 6, 36, 28, false);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();
  const rockA = new THREE.Color("#e4ddd0");
  const rockB = new THREE.Color("#c9c0b0");
  const moss = new THREE.Color("#8aa07a");
  const wet = new THREE.Color("#b7c0b8");

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const worldY = y + (MAIN_H * 1.2) / 2 - 3;
    const angle = Math.atan2(x, z);
    const target = sampler.mainRadius(worldY, angle);
    const len = Math.hypot(x, z) || 1;
    const n = sampler.noise.fbm(x * 0.35, worldY * 0.4, z * 0.35);
    const stripe = Math.sin(worldY * 8.2 + n * 4) * 0.5 + 0.5;
    const r = target * (0.96 + n * 0.08);
    pos.setXYZ(i, (x / len) * r, worldY, (z / len) * r);
    color.copy(rockA).lerp(rockB, stripe);
    if (worldY < 1.2) color.lerp(wet, 0.35);
    if (n > 0.62 && worldY > 2) color.lerp(moss, 0.28);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export function buildPillarCliff(seed: number): THREE.BufferGeometry {
  const sampler = createCliffSampler(seed);
  const geo = new THREE.CylinderGeometry(1, 1, PILLAR.h + 4, 20, 16, false);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();
  const rockA = new THREE.Color("#e4ddd0");
  const rockB = new THREE.Color("#c9c0b0");

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const worldY = y + PILLAR.h / 2 - 1.5;
    const angle = Math.atan2(x, z);
    const target = sampler.pillarRadius(worldY, angle);
    const len = Math.hypot(x, z) || 1;
    const n = sampler.noise.fbm(x * 0.5 + 9, worldY * 0.4, z * 0.5);
    pos.setXYZ(i, (x / len) * target, worldY, (z / len) * target);
    color.copy(rockA).lerp(rockB, n);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}
