import './styles/global.css';
import type { Country } from './types';

function afterFirstPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function showLoadError(loadingEl: HTMLElement): void {
  loadingEl.innerHTML = '<p>当前浏览器暂时无法显示地球，请更换浏览器重试。</p>';
}

async function boot() {
  const loadingEl = document.getElementById('loading');
  const container = document.getElementById('scene');
  if (!loadingEl || !container) return;

  // 让基础 UI 先完成一次绘制，再加载地理数据和 Three.js 模块。
  await afterFirstPaint();

  let three: typeof import('three');
  let ctx: import('./globe/scene').SceneCtx;
  let stars: ReturnType<typeof import('./globe/stars').createStars>;
  try {
    const [threeModule, sceneModule, starsModule] = await Promise.all([
      import('three'),
      import('./globe/scene'),
      import('./globe/stars'),
    ]);
    three = threeModule;
    ctx = sceneModule.createScene(container);
    stars = starsModule.createStars();
    ctx.scene.add(stars.group);
  } catch {
    showLoadError(loadingEl);
    return;
  }

  try {
    const [
      worldModule,
      earthModule,
      pickingModule,
      highlightModule,
      atmosphereModule,
      flyToModule,
      geoModule,
      stateModule,
      tooltipModule,
      panelModule,
      searchModule,
    ] = await Promise.all([
      import('./data/world'),
      import('./globe/earth'),
      import('./globe/picking'),
      import('./globe/highlight'),
      import('./globe/atmosphere'),
      import('./globe/flyTo'),
      import('./globe/geo'),
      import('./state'),
      import('./ui/tooltip'),
      import('./ui/detailPanel'),
      import('./ui/search'),
    ]);

    const { countries, pickableCountries, countryByA3 } = await worldModule.loadWorldData();
    const earth = earthModule.createEarth(countries, ctx.renderer.capabilities.getMaxAnisotropy(), {
      width: 2048,
      height: 1024,
    });
    ctx.scene.add(earth.mesh);

    const picking = pickingModule.createPicking(pickableCountries, {
      width: 1024,
      height: 512,
    });
    const highlight = highlightModule.createHighlight(picking.texture);
    ctx.scene.add(highlight.mesh);
    ctx.scene.add(atmosphereModule.createAtmosphere());

    const store = stateModule.createStore();
    const tooltip = tooltipModule.createTooltip(document.getElementById('tooltip')!);
    const panel = panelModule.createPanel(document.getElementById('panel')!, {
      getCountry: (a3) => countryByA3.get(a3),
      onSelect: select,
      onClosed: deselect,
    });
    searchModule.createSearch(document.getElementById('search')!, {
      getCountries: () => countries,
      onSelect: select,
      getSelected: () => store.selected,
    });

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
      const button = document.createElement('button');
      button.className = 'continent-chip';
      button.textContent = name;
      button.title = `定位到${name}`;
      button.addEventListener('click', () =>
        flyToModule.flyTo(ctx.camera, ctx.controls, geoModule.latLonToVec3(lat, lon)),
      );
      continentsEl.appendChild(button);
    }

    store.on('hover', (country) => highlight.setHover(country));
    store.on('select', (country) => highlight.setSelected(country));

    const raycaster = new three.Raycaster();
    const ndc = new three.Vector2();

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
      const { origin, direction } = raycaster.ray;
      const b = origin.dot(direction);
      const c0 = origin.lengthSq() - 1;
      const discriminant = b * b - c0;
      if (discriminant < 0) return null;
      const distance = -b - Math.sqrt(discriminant);
      if (distance < 0) return null;
      const point = origin.clone().addScaledVector(direction, distance);
      const [lon, lat] = geoModule.vec3ToLonLat(point);
      return pickLonLat(lon, lat);
    }

    function select(country: Country) {
      store.setSelected(country);
      panel.open(country);
      history.replaceState(null, '', `?c=${country.a3}`);
      if (country.centroid) {
        flyToModule.flyTo(
          ctx.camera,
          ctx.controls,
          geoModule.latLonToVec3(country.centroid[1], country.centroid[0]),
        );
      }
    }

    function deselect() {
      panel.close();
      store.setSelected(null);
      history.replaceState(null, '', location.pathname);
    }

    const canvasEl = ctx.renderer.domElement;
    let downInfo: { x: number; y: number; t: number } | null = null;

    canvasEl.addEventListener('pointermove', (event) => {
      if (event.buttons > 0) {
        store.setHovered(null);
        tooltip.hide();
        canvasEl.style.cursor = 'grabbing';
        return;
      }
      const country = pickAt(event.clientX, event.clientY);
      store.setHovered(country);
      canvasEl.style.cursor = country ? 'pointer' : 'grab';
      if (country) tooltip.show(country, event.clientX, event.clientY);
      else tooltip.hide();
    });

    canvasEl.addEventListener('pointerdown', (event) => {
      downInfo = { x: event.clientX, y: event.clientY, t: performance.now() };
    });

    canvasEl.addEventListener('pointerup', (event) => {
      if (!downInfo) return;
      const dx = event.clientX - downInfo.x;
      const dy = event.clientY - downInfo.y;
      const dt = performance.now() - downInfo.t;
      downInfo = null;
      if (dx * dx + dy * dy > 36 || dt > 400) return;
      const country = pickAt(event.clientX, event.clientY);
      if (country) select(country);
      else deselect();
    });

    canvasEl.addEventListener('pointerleave', () => {
      store.setHovered(null);
      tooltip.hide();
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !(event.target instanceof HTMLInputElement)) deselect();
    });

    let lastInteraction = -1e9;
    ctx.controls.addEventListener('start', () => {
      lastInteraction = performance.now();
    });
    ctx.controls.addEventListener('end', () => {
      lastInteraction = performance.now();
    });

    ctx.onFrame((dt, now) => {
      const flying = flyToModule.tickFly(ctx.camera, ctx.controls);
      ctx.setControlsUpdate(!flying);
      if (!flying) ctx.controls.autoRotate = !store.selected && now - lastInteraction > 3000;
      highlight.tick(now);
      stars.tick(dt);
    });

    const initial = new URLSearchParams(location.search).get('c');
    if (initial) {
      const country = countryByA3.get(initial.toUpperCase());
      if (country) select(country);
    }

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
          features: pickableCountries.reduce((count, country) => count + country.features.length, 0),
        },
        holdRotation() {
          lastInteraction = Infinity;
        },
      };
    }

    loadingEl.classList.add('off');
  } catch {
    showLoadError(loadingEl);
  }
}

void boot();

declare global {
  interface Window {
    __earth?: {
      camera: import('three').PerspectiveCamera;
      controls: unknown;
      store: ReturnType<typeof import('./state').createStore>;
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
