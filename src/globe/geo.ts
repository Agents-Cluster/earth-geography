import * as THREE from 'three';

/**
 * 经纬度（度）-> 单位球方向向量。
 *
 * 这是全项目唯一的球面映射约定，equirectangular 纹理绘制与拾取都必须与它一致：
 *   x = cos(lat)·cos(lon)，y = sin(lat)，z = -cos(lat)·sin(lon)
 * 该约定与 three.js SphereGeometry 默认 UV 展开正好对齐（纹理左边缘 = 180°W）。
 */
export function latLonToVec3(lat: number, lon: number, r = 1): THREE.Vector3 {
  const phi = (lat * Math.PI) / 180;
  const lambda = (lon * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.cos(phi) * Math.cos(lambda),
    r * Math.sin(phi),
    -r * Math.cos(phi) * Math.sin(lambda),
  );
}

/** 球面点 -> [经度, 纬度]（度），latLonToVec3 的逆运算 */
export function vec3ToLonLat(p: THREE.Vector3): [number, number] {
  const n = p.length();
  const lat = (Math.asin(THREE.MathUtils.clamp(p.y / n, -1, 1)) * 180) / Math.PI;
  const lon = (Math.atan2(-p.z, p.x) * 180) / Math.PI;
  return [lon, lat];
}
