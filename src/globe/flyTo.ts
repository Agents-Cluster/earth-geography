import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface Flight {
  /** 起始方向 -> 目标方向的旋转 */
  q: THREE.Quaternion;
  startDir: THREE.Vector3;
  dist: number;
  t0: number;
  duration: number;
}

let flight: Flight | null = null;

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function isFlying(): boolean {
  return flight !== null;
}

/**
 * 相机沿球面滑到 dir 方向的正对视角。
 * 飞行期间禁用控制器，由 tickFly 每帧接管相机位置（调用方跳过 controls.update）。
 */
export function flyTo(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  dir: THREE.Vector3,
  duration = 1150,
): void {
  const startDir = camera.position.clone().normalize();
  const endDir = dir.clone().normalize();
  flight = {
    q: new THREE.Quaternion().setFromUnitVectors(startDir, endDir),
    startDir,
    dist: THREE.MathUtils.clamp(camera.position.length(), 1.9, 3.2),
    t0: performance.now(),
    duration,
  };
  controls.enabled = false;
}

/** 每帧调用。返回 true 表示仍在飞行（调用方应跳过 controls.update）。 */
export function tickFly(camera: THREE.PerspectiveCamera, controls: OrbitControls): boolean {
  if (!flight) return false;
  const t = Math.min(1, (performance.now() - flight.t0) / flight.duration);
  const q = new THREE.Quaternion().slerpQuaternions(
    new THREE.Quaternion(),
    flight.q,
    easeInOutCubic(t),
  );
  camera.position.copy(flight.startDir).applyQuaternion(q).multiplyScalar(flight.dist);
  camera.lookAt(0, 0, 0);
  if (t >= 1) {
    flight = null;
    controls.enabled = true;
    return false;
  }
  return true;
}
