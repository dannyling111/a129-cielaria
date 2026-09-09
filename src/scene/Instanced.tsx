import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { Item } from "@/lib/village/types";

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();

type Props = {
  items: Item[];
  geometry: THREE.BufferGeometry;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  basic?: boolean;
  polygonOffset?: boolean;
  polygonOffsetFactor?: number;
  polygonOffsetUnits?: number;
  renderOrder?: number;
  onClick?: (instanceId: number) => void;
};

export function Instanced({
  items,
  geometry,
  roughness = 0.84,
  metalness = 0.02,
  emissive = "#000000",
  emissiveIntensity = 0,
  transparent = false,
  opacity = 1,
  depthWrite = true,
  castShadow = true,
  receiveShadow = true,
  basic = false,
  polygonOffset = false,
  polygonOffsetFactor = 0,
  polygonOffsetUnits = 0,
  renderOrder = 0,
  onClick,
}: Props) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = items.length;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || n === 0) return;
    for (let i = 0; i < n; i++) {
      const it = items[i]!;
      _p.set(it.p[0], it.p[1], it.p[2]);
      _e.set(it.r[0], it.r[1], it.r[2]);
      _q.setFromEuler(_e);
      _s.set(it.s[0], it.s[1], it.s[2]);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      mesh.setColorAt(i, _c.set(it.c));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, n]);

  if (n === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, n]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled
      renderOrder={renderOrder}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              if (e.instanceId != null) onClick(e.instanceId);
            }
          : undefined
      }
    >
      {basic ? (
        <meshBasicMaterial
          transparent={transparent}
          opacity={opacity}
          depthWrite={depthWrite}
          toneMapped={false}
          polygonOffset={polygonOffset}
          polygonOffsetFactor={polygonOffsetFactor}
          polygonOffsetUnits={polygonOffsetUnits}
        />
      ) : (
        <meshStandardMaterial
          roughness={roughness}
          metalness={metalness}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          transparent={transparent}
          opacity={opacity}
          depthWrite={depthWrite}
          envMapIntensity={0.3}
          polygonOffset={polygonOffset}
          polygonOffsetFactor={polygonOffsetFactor}
          polygonOffsetUnits={polygonOffsetUnits}
        />
      )}
    </instancedMesh>
  );
}
