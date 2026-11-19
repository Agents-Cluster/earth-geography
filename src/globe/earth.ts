import * as THREE from 'three';
import { geoEquirectangular, geoPath, geoGraticule10 } from 'd3-geo';
import type { Country } from '../types';

/** 主纹理尺寸：4096×2048 保证放大到 1.6 距离时国界依然清晰 */
const W = 4096;
const H = 2048;

const COLORS = {
  ocean: '#0a1a2f',
  land: '#1a3a2f',
  border: 'rgba(105, 224, 244, 0.30)',
  graticule: 'rgba(148, 184, 220, 0.05)',
};

/**
 * 地球主球体：离屏 canvas 按 equirectangular 投影绘制
 * （海洋底色 + 经纬网 + 大陆填充 + 国界线），一次性生成静态纹理，之后零重绘。
 */
export function createEarth(
  countries: Country[],
  maxAnisotropy: number,
): { mesh: THREE.Mesh; texture: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 与拾取层一致的投影：经度 ±180 对齐纹理左右边缘，纬度 ±90 对齐上下边缘
  const projection = geoEquirectangular().translate([W / 2, H / 2]).scale(W / (2 * Math.PI));
  const path = geoPath(projection, ctx);

  // 海洋
  ctx.fillStyle = COLORS.ocean;
  ctx.fillRect(0, 0, W, H);

  // 经纬网（10° 间隔，弱化装饰）
  ctx.beginPath();
  path(geoGraticule10());
  ctx.strokeStyle = COLORS.graticule;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 第一遍：大陆填充
  for (const c of countries) {
    for (const f of c.features) {
      ctx.beginPath();
      path(f);
      ctx.fillStyle = COLORS.land;
      ctx.fill();
    }
  }
  // 第二遍：国界描边（避免被相邻国家的填充盖住半边线）
  for (const c of countries) {
    for (const f of c.features) {
      ctx.beginPath();
      path(f);
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 64),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  return { mesh, texture };
}
