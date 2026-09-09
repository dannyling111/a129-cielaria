import * as THREE from "three";

export const boxGeo = new THREE.BoxGeometry(1, 1, 1);
export const sphereGeo = new THREE.SphereGeometry(0.5, 12, 10);
export const cloudGeo = new THREE.SphereGeometry(0.5, 8, 6);
export const cylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
export const coneGeo = new THREE.ConeGeometry(0.5, 1, 8);
/** Outward-facing window decals. XY plane, +Z normal — matches FACE.rot. */
export const planeGeo = new THREE.PlaneGeometry(1, 1);
