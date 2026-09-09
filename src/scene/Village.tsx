import type { TimeOfDay, Village as VillageData } from "@/lib/village/types";
import { Instanced } from "./Instanced";
import { boxGeo, cloudGeo, cylGeo, planeGeo, sphereGeo } from "./geometries";
import { LIGHT } from "./World";

type Props = {
  village: VillageData;
  timeOfDay: TimeOfDay;
  onSelect: (index: number) => void;
};

export function Village({ village, timeOfDay, onSelect }: Props) {
  const { items } = village;
  const glow = LIGHT[timeOfDay].glow;

  return (
    <group>
      <Instanced items={items.body} geometry={boxGeo} roughness={0.78} onClick={onSelect} />
      <Instanced items={items.roof} geometry={boxGeo} roughness={0.88} />
      <Instanced items={items.cornice} geometry={boxGeo} roughness={0.8} />
      <Instanced items={items.base} geometry={boxGeo} roughness={0.86} />
      <Instanced items={items.door} geometry={boxGeo} roughness={0.7} renderOrder={1} />
      <Instanced items={items.doorFrame} geometry={boxGeo} roughness={0.72} renderOrder={1} />
      <Instanced
        items={items.glassCool}
        geometry={planeGeo}
        roughness={0.22}
        metalness={0.12}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
        renderOrder={3}
        castShadow={false}
        receiveShadow={false}
      />
      <Instanced
        items={items.glassWarm}
        geometry={planeGeo}
        roughness={0.35}
        emissive="#f0c070"
        emissiveIntensity={glow}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
        renderOrder={3}
        castShadow={false}
        receiveShadow={false}
      />
      <Instanced
        items={items.frame}
        geometry={planeGeo}
        roughness={0.7}
        polygonOffset
        polygonOffsetFactor={-1.5}
        polygonOffsetUnits={-2}
        renderOrder={2}
        castShadow={false}
        receiveShadow={false}
      />
      <Instanced items={items.shutter} geometry={boxGeo} roughness={0.76} />
      <Instanced items={items.box} geometry={boxGeo} roughness={0.8} />
      <Instanced items={items.bloom} geometry={sphereGeo} roughness={0.7} castShadow={false} />
      <Instanced items={items.balcony} geometry={boxGeo} roughness={0.82} />
      <Instanced items={items.rail} geometry={boxGeo} roughness={0.7} />
      <Instanced items={items.awningA} geometry={boxGeo} roughness={0.74} />
      <Instanced items={items.awningB} geometry={boxGeo} roughness={0.74} />
      <Instanced items={items.lantern} geometry={boxGeo} roughness={0.7} />
      <Instanced
        items={items.glow}
        geometry={sphereGeo}
        roughness={0.4}
        emissive="#ffe6b0"
        emissiveIntensity={0.55 + glow * 0.5}
        castShadow={false}
      />
      <Instanced items={items.chimney} geometry={boxGeo} roughness={0.9} />
      <Instanced items={items.trunk} geometry={cylGeo} roughness={0.92} />
      <Instanced items={items.canopy} geometry={sphereGeo} roughness={0.9} />
      <Instanced items={items.slab} geometry={boxGeo} roughness={0.95} />
      <Instanced items={items.step} geometry={boxGeo} roughness={0.95} />
      <Instanced items={items.stone} geometry={boxGeo} roughness={0.96} />
      <Instanced items={items.person} geometry={boxGeo} roughness={0.8} />
      <Instanced items={items.head} geometry={sphereGeo} roughness={0.7} />
      <Instanced items={items.boat} geometry={boxGeo} roughness={0.7} />
      <Instanced items={items.sail} geometry={boxGeo} roughness={0.65} />
      <Instanced
        items={items.cloud}
        geometry={cloudGeo}
        roughness={1}
        metalness={0}
        castShadow={false}
        receiveShadow={false}
        basic
      />
      <Instanced items={items.hangInner} geometry={boxGeo} roughness={0.8} />
      <Instanced items={items.pot} geometry={cylGeo} roughness={0.86} />
      <Instanced items={items.parapet} geometry={boxGeo} roughness={0.8} />
      <Instanced items={items.vine} geometry={boxGeo} roughness={0.9} />
    </group>
  );
}
