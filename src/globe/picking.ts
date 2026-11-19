import * as THREE from 'three';
import { geoEquirectangular, geoPath } from 'd3-geo';
import type { Country } from '../types';

/** 默认拾取纹理尺寸；拾取只需辨识国家编码，因此使用比显示纹理更低的分辨率。 */
const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 512;

/**
 * 编码低位校验：有效编码 = (code << 4) | 0b1010。
 * canvas 抗锯齿会在国界边缘混色出「介于两编码之间」的假编码，
 * 校验位能把绝大多数假值直接过滤掉（仅约 1/16 撞入），
 * 剩余的由 pick() 的 3×3 多数投票兜底。0 表示海洋/无效。
 */
const CHECK = 10;

export interface Picking {
  /** 编码纹理，供高亮 shader 在 GPU 端读取（NearestFilter 保证取到精确编码） */
  texture: THREE.CanvasTexture;
  /** 编码画布本体（调试/测试用，可 toDataURL 导出检查） */
  canvas: HTMLCanvasElement;
  /** 微型几何兜底圆点记录（调试/测试用） */
  debugBlobs: Array<[number, number, number]>;
  /** 经纬度 -> 国家；海洋返回 null */
  pick(lon: number, lat: number): Country | null;
}

/** 下标 -> 24bit 编码色 */
function encodeColor(code: number): string {
  const v = (code << 4) | CHECK;
  return `#${((v >> 16) & 255).toString(16).padStart(2, '0')}${((v >> 8) & 255)
    .toString(16)
    .padStart(2, '0')}${(v & 255).toString(16).padStart(2, '0')}`;
}

/** 原始 24bit 值 -> 国家下标（1-based）或 0（无效/海洋） */
function decodeRaw(v: number): number {
  if (v === 0 || v % 16 !== CHECK) return 0;
  return v >> 4;
}

/**
 * 颜色索引拾取：把每个国家在离屏 canvas 上填成「编码 = 下标」的唯一颜色。
 * hover 时用射线求交得到球面点 -> 经纬度 -> 读像素 -> 解码出国家，O(1)。
 */
export function createPicking(
  countries: Country[],
  options: { width?: number; height?: number } = {},
): Picking {
  const W = options.width ?? DEFAULT_WIDTH;
  const H = options.height ?? DEFAULT_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  // imageData 只读一次，开启 willReadFrequently 提示浏览器走 CPU 后备存储
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const projection = geoEquirectangular().translate([W / 2, H / 2]).scale(W / (2 * Math.PI));
  const path = geoPath(projection, ctx);

  // 海洋涂黑 = 编码 0（无国家）
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // 第一遍：全部国家 fill + stroke（按 NE 顺序，大国可能盖住先画的小国）
  for (const c of countries) {
    if (!c.code || !c.features.length) continue;
    const color = encodeColor(c.code);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    // 同一记录的多条 feature（如澳大利亚 + 塔斯马尼亚）共用一个编码
    for (const f of c.features) {
      ctx.beginPath();
      path(f);
      ctx.fill();
      ctx.stroke();
    }
  }

  // 收集微型几何（投影后不足 8px），第二遍统一补圆点——
  // 必须放在所有国家之后画，否则 blob 会被后画的大国 fill 覆盖。
  // 门槛 8px：3~6px 的几何 fill 后几乎全是抗锯齿混色像素，没有可靠的纯色区可拾取，
  // 必须整体走圆点兜底。
  const blobs: Array<[number, number, number]> = [];
  for (const c of countries) {
    if (!c.code || !c.features.length) continue;
    for (const f of c.features) {
      const b = path.bounds(f);
      if (b[1][0] - b[0][0] < 8 || b[1][1] - b[0][1] < 8) {
        const center = path.centroid(f);
        // 半径 3px：保证 3×3 投票窗口基本落在 blob 内，
        // 同时尽量减少相邻微岛（加勒比群岛相距仅数 px）blob 之间的互相覆盖
        blobs.push([center[0], center[1], c.code]);
      }
    }
  }
  for (const [cx, cy, code] of blobs) {
    const color = encodeColor(code);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const imageData = ctx.getImageData(0, 0, W, H).data;

  /** 3×3 邻域多数投票解码：抗锯齿混色像素会被真实编码的多数票淹没 */
  function decodeVote(x: number, y: number): number {
    const at = (xx: number, yy: number) => {
      const o = (yy * W + xx) * 4;
      return decodeRaw((imageData[o] << 16) | (imageData[o + 1] << 8) | imageData[o + 2]);
    };
    const center = at(x, y);
    const tally = new Map<number, number>();
    for (let dy = -1; dy <= 1; dy++) {
      const yy = Math.min(H - 1, Math.max(0, y + dy));
      for (let dx = -1; dx <= 1; dx++) {
        const xx = Math.min(W - 1, Math.max(0, x + dx));
        const idx = at(xx, yy);
        if (idx > 0) tally.set(idx, (tally.get(idx) ?? 0) + 1);
      }
    }
    let best = 0;
    let bestN = 0;
    for (const [idx, n] of tally) {
      if (n > bestN) {
        best = idx;
        bestN = n;
      }
    }
    // 规则：多票直接采纳；仅中心单票有效时也采纳（微岛国的 1px 细线几何）；
    // 孤点混色（中心是假编码且邻居无票）被排除——两个假编码恰好相同的概率极低
    if (bestN >= 2) return best;
    return bestN === 1 && center === best ? best : 0;
  }

  function pick(lon: number, lat: number): Country | null {
    const x = Math.min(W - 1, Math.max(0, Math.floor(((lon + 180) / 360) * W)));
    const y = Math.min(H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * H)));
    const idx = decodeVote(x, y);
    return idx > 0 && idx <= countries.length ? countries[idx - 1] : null;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  // 关键：数据纹理不做 sRGB 色彩转换，否则 GPU 端解码出的编码值会失真
  texture.colorSpace = THREE.NoColorSpace;

  return { texture, canvas, debugBlobs: blobs, pick };
}
