import * as THREE from 'three';
import './styles/global.css';
import type { Country } from './types';
import { createScene, type SceneCtx } from './globe/scene';
import { createEarth } from './globe/earth';
import { createPicking } from './globe/picking';
import { createHighlight } from './globe/highlight';
import { createAtmosphere } from './globe/atmosphere';
import { createStars } from './globe/stars';
import { flyTo, tickFly } from './globe/flyTo';
import { latLonToVec3, vec3ToLonLat } from './globe/geo';
import { countries, pickableCountries, countryByA3 } from './data/world';
import { createStore } from './state';
import { createTooltip } from './ui/tooltip';
import { createPanel } from './ui/detailPanel';
import { createSearch } from './ui/search';

function boot() {
  const loadingEl = document.getElementById('loading')!;
  const container = document.getElementById('scene')!;

  // ── 场景与各渲染层 ──
  let ctx: SceneCtx;
  try {
    ctx = createScene(container);
  } catch {
    loadingEl.innerHTML = '<p>当前浏览器暂时无法显示地球，请更换浏览器重试。</p>';
    return;
  }

  const earth = createEarth(countries, ctx.renderer.capabilities.getMaxAnisotropy());
  ctx.scene.add(earth.mesh);

  const picking = createPicking(pickableCountries);
  const highlight = createHighlight(picking.texture);
  ctx.scene.add(highlight.mesh);

  ctx.scene.add(createAtmosphere());
  const stars = createStars();
  ctx.scene.add(stars.group);

  // ── 状态与 UI ──
  const store = createStore();
  const tooltip = createTooltip(document.getElementById('tooltip')!);
  const panel = createPanel(document.getElementById('panel')!, {
    getCountry: (a3) => countryByA3.get(a3),
    onSelect: select,
    onClosed: deselect,
  });
  createSearch(document.getElementById('search')!, {
    getCountries: () => countries,
    onSelect: select,
    getSelected: () => store.selected,
  });

  // ── 大洲快捷定位 ──
  const CONTINENTS: Array<[string, number, number]> = [
    ['非洲', 20, 3],
    ['欧洲', 15, 50],
    ['亚洲', 90, 30],
    ['北美洲', -100, 45],
    ['南美洲', -60, -15],
    ['大洋洲', 140, -25],
    ['南极洲', 0, -75],
  ];
  const continentsEl = document.getElementById('continents')!;
  for (const [name, lon, lat] of CONTINENTS) {
    const b = document.createElement('button');
    b.className = 'continent-chip';
    b.textContent = name;
    b.title = `定位到${name}`;
    b.addEventListener('click', () => flyTo(ctx.camera, ctx.controls, latLonToVec3(lat, lon)));
    continentsEl.appendChild(b);
  }

  store.on('hover', (c) => highlight.setHover(c));
  store.on('select', (c) => highlight.setSelected(c));

  // ── 从 URL 恢复选中国家（分享 / 刷新场景） ──
  const initial = new URLSearchParams(location.search).get('c');
  if (initial) {
    const c = countryByA3.get(initial.toUpperCase());
    if (c) select(c);
  }

  // 开发调试句柄（仅 DEV 构建暴露，生产构建不注入）
  if (import.meta.env.DEV) {
    window.__earth = {
      camera: ctx.camera,
      controls: ctx.controls,
      store,
      pickAt,
      pickLonLat,
      pickCanvas: picking.canvas,
      pickBlobs: picking.debugBlobs,
      countries,
      counts: {
        countries: countries.length,
        pickable: pickableCountries.length,
        features: pickableCountries.reduce((n, c) => n + c.features.length, 0),
      },
      // 冻结自转（测试用）：lastInteraction 置无穷远，自动恢复靠真实交互
      holdRotation() {
        lastInteraction = Infinity;
      },
    };
  }

  // ── 拾取：解析射线与单位球求交（比逐三角形遍历更快更稳） ──
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  /** 经纬度直达拾取（供调试与测试复用） */
  function pickLonLat(lon: number, lat: number) {
    return picking.pick(lon, lat);
  }

  function pickAt(clientX: number, clientY: number) {
    const rect = ctx.renderer.domElement.getBoundingClientRect();
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, ctx.camera);
    const { origin: o, direction: d } = raycaster.ray;
    const b = o.dot(d);
    const c0 = o.lengthSq() - 1;
    const disc = b * b - c0;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    if (t < 0) return null;
    const p = o.clone().addScaledVector(d, t);
    const [lon, lat] = vec3ToLonLat(p);
    return pickLonLat(lon, lat);
  }

  // ── 选中 / 取消选中：高亮 + 详情卡 + 飞行定位 + URL 同步 ──
  function select(c: Country) {
    store.setSelected(c);
    panel.open(c);
    // URL 同步：支持刷新恢复与分享（replaceState 不产生历史记录）
    history.replaceState(null, '', `?c=${c.a3}`);
    if (c.centroid) {
      flyTo(ctx.camera, ctx.controls, latLonToVec3(c.centroid[1], c.centroid[0]));
    }
  }

  function deselect() {
    panel.close();
    store.setSelected(null);
    history.replaceState(null, '', location.pathname);
  }

  // ── 指针交互 ──
  const canvasEl = ctx.renderer.domElement;
  let downInfo: { x: number; y: number; t: number } | null = null;

  canvasEl.addEventListener('pointermove', (e) => {
    if (e.buttons > 0) {
      // 拖拽旋转中不做拾取
      store.setHovered(null);
      tooltip.hide();
      canvasEl.style.cursor = 'grabbing';
      return;
    }
    const c = pickAt(e.clientX, e.clientY);
    store.setHovered(c);
    canvasEl.style.cursor = c ? 'pointer' : 'grab';
    if (c) tooltip.show(c, e.clientX, e.clientY);
    else tooltip.hide();
  });

  canvasEl.addEventListener('pointerdown', (e) => {
    downInfo = { x: e.clientX, y: e.clientY, t: performance.now() };
  });

  canvasEl.addEventListener('pointerup', (e) => {
    if (!downInfo) return;
    const dx = e.clientX - downInfo.x;
    const dy = e.clientY - downInfo.y;
    const dt = performance.now() - downInfo.t;
    downInfo = null;
    // 位移大或时间长视为拖拽，不触发选中
    if (dx * dx + dy * dy > 36 || dt > 400) return;
    const c = pickAt(e.clientX, e.clientY);
    if (c) select(c);
    else deselect();
  });

  canvasEl.addEventListener('pointerleave', () => {
    store.setHovered(null);
    tooltip.hide();
  });

  window.addEventListener('keydown', (e) => {
    // 搜索框自己处理 Esc；全局 Esc 关闭详情卡
    if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement)) {
      deselect();
    }
  });

  // ── 渲染循环：飞行接管 / 自转恢复 / 高亮呼吸 ──
  let lastInteraction = -1e9;
  ctx.controls.addEventListener('start', () => {
    lastInteraction = performance.now();
  });
  ctx.controls.addEventListener('end', () => {
    lastInteraction = performance.now();
  });

  ctx.onFrame((dt, now) => {
    const flying = tickFly(ctx.camera, ctx.controls);
    ctx.setControlsUpdate(!flying);
    if (!flying) {
      // 选中国家或最近 3s 有交互时暂停自转
      ctx.controls.autoRotate = !store.selected && now - lastInteraction > 3000;
    }
    highlight.tick(now);
    stars.tick(dt);
  });

  // 关闭加载遮罩：数据全部同步加载完成，这里必须立即关闭——
  // 不能依赖 rAF：后台标签页 / 省电模式下 rAF 暂停，遮罩会永远挡住整个页面
  loadingEl.classList.add('off');
}

boot();

// 开发调试句柄（不影响功能）
declare global {
  interface Window {
    __earth?: {
      camera: THREE.PerspectiveCamera;
      controls: unknown;
      store: ReturnType<typeof createStore>;
      pickAt(x: number, y: number): import('./types').Country | null;
      pickLonLat(lon: number, lat: number): import('./types').Country | null;
      pickCanvas: HTMLCanvasElement;
      pickBlobs: Array<[number, number, number]>;
      countries: import('./types').Country[];
      counts: { countries: number; pickable: number; features: number };
      holdRotation(): void;
    };
  }
}
