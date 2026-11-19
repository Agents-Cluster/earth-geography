import * as THREE from 'three';

export interface Stars {
  group: THREE.Group;
  /** 缓慢漂移，给星空一点生命感 */
  tick(dt: number): void;
}

/** 圆形柔和光点贴图：PointsMaterial 默认渲染方块，需要圆形 sprite */
function makeStarSprite(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.85)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 生成一层星点：球壳上均匀随机分布 + 少量冷暖色点缀 */
function makeLayer(count: number, rMin: number, rMax: number, size: number, opacity: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // 均匀球面随机方向（Marsaglia 法）
    const u = Math.random() * 2 - 1;
    const theta = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = rMin + Math.random() * (rMax - rMin);
    positions[i * 3] = s * Math.cos(theta) * r;
    positions[i * 3 + 1] = u * r;
    positions[i * 3 + 2] = s * Math.sin(theta) * r;

    const t = Math.random();
    const c = new THREE.Color(
      t < 0.72 ? '#cfd8ff' : t < 0.86 ? '#9fd0ff' : t < 0.95 ? '#ffe3c2' : '#7be8ff',
    );
    c.toArray(colors, i * 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size,
    map: makeStarSprite(),
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geometry, material);
}

export function createStars(): Stars {
  const group = new THREE.Group();
  group.add(makeLayer(1500, 40, 90, 0.5, 0.8));
  group.add(makeLayer(220, 40, 80, 1.15, 0.95));

  let elapsed = 0;
  return {
    group,
    tick(dt: number) {
      elapsed += dt;
      group.rotation.y = elapsed * 0.00001;
      group.rotation.x = elapsed * 0.0000035;
    },
  };
}
