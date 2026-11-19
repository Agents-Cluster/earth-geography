import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { latLonToVec3 } from './geo';

export interface SceneCtx {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  /** 注册每帧回调（dt 毫秒、now 高精度时间戳），回调在控制器更新与渲染前执行 */
  onFrame(cb: (dt: number, now: number) => void): void;
  /** 飞行动画接管相机时关闭控制器更新，结束后恢复 */
  setControlsUpdate(enabled: boolean): void;
}

/** 球体在安全区域内的视觉半径，包含大气辉光的外缘。 */
const FIT_RADIUS = 1.08;

function cssPixels(name: string, fallback: number): number {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

function fitDistance(camera: THREE.PerspectiveCamera, height: number): number {
  // 取上下安全区中的较大值，让居中的球体同时远离两侧 UI。
  const safeInset = Math.max(cssPixels('--globe-safe-top', 108), cssPixels('--globe-safe-bottom', 42)) + 12;
  const usableHeight = Math.max(1, height - safeInset * 2);
  const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
  const halfVisibleAngle = Math.atan((usableHeight / Math.max(1, height)) * Math.tan(halfFov));
  return FIT_RADIUS / Math.sin(halfVisibleAngle);
}

/** 创建渲染器 / 相机 / 控制器，并启动渲染循环 */
export function createScene(container: HTMLElement): SceneCtx {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050510');

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    200,
  );
  // 初始视角对准东亚上空
  camera.position.copy(latLonToVec3(30, 105, 2.7));
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 1.6;
  controls.maxDistance = 4.5;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.7;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;

  function updateCameraBounds() {
    const minDistance = Math.max(1.6, fitDistance(camera, container.clientHeight));
    controls.minDistance = minDistance;
    controls.maxDistance = Math.max(4.5, minDistance + 1.4);
    if (camera.position.length() < minDistance) camera.position.setLength(minDistance);
    controls.update();
  }

  updateCameraBounds();

  const frameCbs: Array<(dt: number, now: number) => void> = [];
  let updateControls = true;
  let last = performance.now();

  renderer.setAnimationLoop((now) => {
    // 后台标签页恢复后 rAF 会一次性给出巨大的 dt，钳制避免星空/动画跳变
    const dt = Math.min(now - last, 100);
    last = now;
    for (const cb of frameCbs) cb(dt, now);
    if (updateControls) controls.update();
    renderer.render(scene, camera);
  });

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    updateCameraBounds();
  });

  return {
    renderer,
    scene,
    camera,
    controls,
    onFrame(cb) {
      frameCbs.push(cb);
    },
    setControlsUpdate(enabled) {
      updateControls = enabled;
    },
  };
}
