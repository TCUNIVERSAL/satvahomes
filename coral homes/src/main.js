import './style.css';
import { Color3, Vector3, PointLight } from './scene/babylon.js';
import { createEngine, createScene, flyTo, setView, cancelFlight, VIEWS, SUN_DAY, SUN_DUSK } from './scene/setup.js';
import { createMaterials } from './scene/materials.js';
import { buildHouse } from './scene/house.js';
import { buildLandscape } from './scene/landscape.js';
import { buildInterior } from './scene/interior.js';
import { CATEGORIES, REGIONS } from './catalog.js';
import { INTERIOR_CATEGORIES } from './interiorCatalog.js';
import { createStore } from './state.js';
import { createPanel } from './ui/panel.js';
import { createOverlay } from './ui/overlay.js';
import { createSummary } from './ui/summary.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#renderCanvas');
const stage = $('.stage');
const loader = $('.loader');
const setLoad = (t) => (loader.querySelector('p').textContent = t);
// yield so the loader text can paint (timer fallback: rAF pauses in hidden tabs)
const tick = () => new Promise((r) => {
  requestAnimationFrame(() => setTimeout(r, 0));
  setTimeout(r, 60);
});

async function boot() {
  const engine = createEngine(canvas);
  const { scene, camera, sun, hemi, shadows, pipeline, setSky } = createScene(engine, canvas);
  setLoad('Painting the sky…');
  await tick();
  await setSky('day');
  setLoad('Mixing materials…');
  await tick();
  const { M, apply } = await createMaterials(scene);
  setLoad('Building your home…');
  await tick();
  const house = buildHouse(scene, M, shadows);
  const ground = buildLandscape(scene, M, shadows);

  const store = createStore();
  for (const c of CATEGORIES) await apply(c.key, store.state.sel[c.key], false);

  setLoad('Fitting out the interior…');
  await tick();
  const interior = await buildInterior({ scene, M, shadows, house });
  await interior.buildAll(store.state.int);

  // part → meshes (for hover highlight)
  const partMeshes = (part) => {
    if (!part) return [];
    return scene.meshes.filter((m) => m.metadata?.part === part);
  };

  // ------------------------------------------------ mood (day / dusk)
  const duskLights = house.lightSpots.map(([x, y, z], i) => {
    const zOff = z > 0 ? 0.35 : -0.35;
    const l = new PointLight(`sconce${i}`, new Vector3(x, y - 0.1, z + zOff), scene);
    l.diffuse = new Color3(1, 0.72, 0.42);
    l.intensity = 0;
    l.range = 7;
    return l;
  });
  const interiorMats = [M.interiorWall, M.interiorCeil, M.interiorFloor, M.carpet];
  let baseEnv = 0.65;
  let baseHemi = 0.9;
  async function setMood(mode) {
    const dusk = mode === 'dusk';
    await setSky(mode);
    sun.direction = (dusk ? SUN_DUSK : SUN_DAY).clone();
    sun.position = sun.direction.scale(-70);
    sun.intensity = dusk ? 2.2 : 8.5;
    sun.diffuse = dusk ? new Color3(1, 0.62, 0.42) : new Color3(1, 0.96, 0.9);
    baseHemi = dusk ? 0.35 : 0.9;
    hemi.intensity = isTransparent ? baseHemi : 0;
    baseEnv = dusk ? 0.38 : 0.65;
    scene.environmentIntensity = isTransparent ? baseEnv * 1.7 : baseEnv;
    pipeline.imageProcessing.exposure = dusk ? 1.2 : 0.95;
    for (const m of interiorMats) m.emissiveColor = dusk ? new Color3(1.0, 0.7, 0.42).scale(m === M.interiorFloor || m === M.carpet ? 0.35 : 0.75) : Color3.Black();
    M.glassFrosted.emissiveColor = dusk ? new Color3(0.9, 0.66, 0.4) : Color3.Black();
    M.glass.environmentIntensity = dusk ? 0.6 : 1.4;
    house.glow.setEnabled(dusk);
    ground.setMood(dusk);
    interior.setMood(dusk);
    for (const l of duskLights) l.intensity = dusk ? 1.6 : 0;
    document.body.dataset.mood = mode;
  }

  // ------------------------------------------------ UI
  let autoRotate = false;
  const panel = createPanel({
    root: $('.panel'),
    store,
    onOpen: (cat, tab) => {
      overlay.setActive(tab === 'int' ? null : cat?.key || null);
      if (!cat) return;
      stopRotate();
      // internal selections are only visible with the roof off
      if (tab === 'int') setInside(true);
      flyTo(camera, cat.view);
      if (tab !== 'int') overlay.flash(cat.key);
    },
    onDone: () => summary.show(),
  });
  const overlay = createOverlay({
    stage,
    scene,
    camera,
    engine,
    anchors: house.anchors,
    partMeshes,
    store,
    onPick: (key) => {
      if (panel.openKey !== key) panel.open(key);
      document.body.classList.add('sheet-open');
    },
  });

  const summary = createSummary({
    root: $('#summary'),
    store,
    capture: async (views, { inside = false } = {}) => {
      const saved = { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, target: camera.target.clone() };
      const wasRotating = autoRotate;
      const wasInside = isTransparent;
      stopRotate();
      if (inside !== wasInside) setInside(inside);
      const shots = [];
      // render at a fixed landscape size so snapshots match on phones and desktops
      engine.setSize(1600, 1000, true);
      for (const v of views) {
        setView(camera, v);
        for (let i = 0; i < 4; i++) await new Promise((r) => engine.onEndFrameObservable.addOnce(r));
        shots.push(grab());
      }
      engine.resize(true);
      if (inside !== wasInside) setInside(wasInside);
      camera.alpha = saved.alpha;
      camera.beta = saved.beta;
      camera.radius = saved.radius;
      camera.target.copyFrom(saved.target);
      if (wasRotating) toggleRotate();
      return shots;
    },
  });

  // crop the canvas to 16:10 and export as JPEG
  function grab() {
    const W = canvas.width;
    const H = canvas.height;
    const ratio = 1.6;
    let cw = W;
    let ch = W / ratio;
    if (ch > H) {
      ch = H;
      cw = H * ratio;
    }
    const out = document.createElement('canvas');
    out.width = 1600;
    out.height = 1000;
    out.getContext('2d').drawImage(canvas, (W - cw) / 2, (H - ch) / 2, cw, ch, 0, 0, 1600, 1000);
    return out.toDataURL('image/jpeg', 0.9);
  }

  // re-apply materials when selections change
  let prevSel = JSON.stringify(store.state.sel);
  let prevInt = JSON.stringify(store.state.int);
  store.subscribe(async (state, change) => {
    const now = state.sel;
    const before = JSON.parse(prevSel);
    prevSel = JSON.stringify(now);
    for (const c of CATEGORIES) {
      if (JSON.stringify(before[c.key]) !== JSON.stringify(now[c.key])) await apply(c.key, now[c.key], true);
    }
    const nowInt = state.int;
    const beforeInt = JSON.parse(prevInt);
    prevInt = JSON.stringify(nowInt);
    for (const c of INTERIOR_CATEGORIES) {
      if (JSON.stringify(beforeInt[c.key]) !== JSON.stringify(nowInt[c.key])) await interior.apply(c.key, nowInt[c.key]);
    }
    if (change.type === 'region') updateRegionLabel();
  });

  // ------------------------------------------------ region
  const regionDlg = $('#region');
  const regionBtn = $('[data-act="region"]');
  function updateRegionLabel() {
    const r = REGIONS.find((x) => x.id === store.state.region);
    regionBtn.querySelector('span').textContent = r ? r.name : 'Choose region';
  }
  function askRegion(first = false) {
    regionDlg.querySelector('.region-list').innerHTML = REGIONS.map(
      (r) => `<button class="region-card${store.state.region === r.id ? ' on' : ''}" data-region="${r.id}">
        <b>${r.name}</b><span>${r.detail}</span></button>`,
    ).join('');
    regionDlg.querySelector('.dlg-intro').hidden = !first;
    regionDlg.hidden = false;
    document.body.classList.add('modal-open');
  }
  regionDlg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-region]');
    if (b) {
      store.setRegion(b.dataset.region);
      regionDlg.hidden = true;
      document.body.classList.remove('modal-open');
      if (!panel.openKey) panel.open(CATEGORIES.find((c) => !store.completed().includes(c))?.key || 'roof');
    } else if (e.target.closest('[data-act="close"]') && store.state.region) {
      regionDlg.hidden = true;
      document.body.classList.remove('modal-open');
    }
  });
  regionBtn.addEventListener('click', () => askRegion(false));
  updateRegionLabel();

  // ------------------------------------------------ dock
  const dock = $('.dock');
  function stopRotate() {
    if (!autoRotate) return;
    toggleRotate();
  }
  function toggleRotate() {
    autoRotate = !autoRotate;
    camera.useAutoRotationBehavior = autoRotate;
    if (autoRotate) {
      camera.autoRotationBehavior.idleRotationSpeed = 0.12;
      camera.autoRotationBehavior.idleRotationWaitTime = 1500;
      camera.autoRotationBehavior.idleRotationSpinupTime = 1200;
    }
    dock.querySelector('[data-act="rotate"]').classList.toggle('on', autoRotate);
  }

  let isTransparent = false;
  const transBtn = $('[data-act="transparent"]');
  function setInside(on) {
    if (isTransparent === on) return;
    isTransparent = on;
    house.setTransparent(on);
    interior.setTransparent(on);
    // with the roof off, lift the ambient so rooms read the way they do on site
    scene.environmentIntensity = on ? baseEnv * 1.7 : baseEnv;
    // the faded exterior walls still block the sun, so fill the rooms indoors
    hemi.intensity = on ? baseHemi : 0;
    transBtn.classList.toggle('on', on);
  }

  dock.addEventListener('click', (e) => {
    const v = e.target.closest('[data-view]');
    if (v) {
      stopRotate();
      flyTo(camera, v.dataset.view);
      for (const b of dock.querySelectorAll('[data-view]')) b.classList.toggle('on', b === v);
      return;
    }
    const t = e.target.closest('[data-act="transparent"]');
    if (t) {
      setInside(!isTransparent);
      if (isTransparent) {
        stopRotate();
        flyTo(camera, 'dollhouse');
        for (const b of dock.querySelectorAll('[data-view]')) b.classList.remove('on');
      }
      return;
    }
    const mood = e.target.closest('[data-mood]');
    if (mood) {
      setMood(mood.dataset.mood);
      for (const b of dock.querySelectorAll('[data-mood]')) b.classList.toggle('on', b === mood);
      return;
    }
    if (e.target.closest('[data-act="pins"]')) {
      const b = e.target.closest('[data-act="pins"]');
      b.classList.toggle('on');
      overlay.setPins(b.classList.contains('on'));
    }
    if (e.target.closest('[data-act="rotate"]')) toggleRotate();
  });
  // a manual drag/zoom cancels any camera glide and clears the active view button
  const userMoved = () => {
    cancelFlight();
    for (const b of dock.querySelectorAll('[data-view].on')) b.classList.remove('on');
  };
  canvas.addEventListener('pointerdown', userMoved);
  canvas.addEventListener('wheel', userMoved, { passive: true });
  $('[data-act="done-top"]').addEventListener('click', () => summary.show());
  store.subscribe(() => updateTopDone());
  function updateTopDone() {
    const n = store.completed().length + store.completedInt().length;
    const all = CATEGORIES.length + INTERIOR_CATEGORIES.length;
    const b = $('[data-act="done-top"]');
    b.disabled = store.completed().length < CATEGORIES.length;
    $('.top-progress b').textContent = `${n}/${all}`;
    $('.top-progress i').style.setProperty('--p', `${(n / all) * 360}deg`);
  }
  updateTopDone();

  // mobile: bottom sheet toggle
  $('[data-act="sheet"]').addEventListener('click', () => document.body.classList.toggle('sheet-open'));
  $('.panel').addEventListener('click', (e) => {
    if (e.target.closest('.panel-head') && matchMedia('(max-width: 820px)').matches) document.body.classList.toggle('sheet-open');
  });

  // ------------------------------------------------ go
  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
  new ResizeObserver(() => engine.resize()).observe(stage);
  await scene.whenReadyAsync();
  loader.classList.add('gone');
  setTimeout(() => loader.remove(), 800);
  if (!store.state.region) askRegion(true);
  else if (store.completed().length < CATEGORIES.length) {
    // gentle intro sweep
    const v = VIEWS.home;
    camera.alpha = v.alpha - 0.5;
    camera.radius = v.radius + 6;
    flyTo(camera, 'home', 2200);
  }
}

boot().catch((err) => {
  console.error(err);
  setLoad('Sorry — 3D could not start on this device. Please try a recent version of Chrome, Edge, Safari or Firefox.');
});
