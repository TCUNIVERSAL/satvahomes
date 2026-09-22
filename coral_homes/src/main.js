import './style.css';
import { createEngine, createScene, flyTo, focusPoint, cancelFlight, VIEWS } from './scene/setup.js';
import { createMaterials } from './scene/materials.js';
import { buildHouse } from './scene/house.js';
import { buildEntryDoor } from './scene/entryDoor.js';
import { buildLandscape } from './scene/landscape.js';
import { buildInterior } from './scene/interior/index.js';
import { CATEGORIES, findOption } from './catalog.js';
import { INTERIOR_CATEGORIES } from './interiorCatalog.js';
import { createStore } from './state.js';
import { createPanel } from './ui/panel.js';
import { createOverlay } from './ui/overlay.js';
import { createInteriorPicker } from './ui/interiorPicker.js';
import { createSummary } from './ui/summary.js';
import { createLighting } from './app/lighting.js';
import { createCapture } from './app/capture.js';

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
  // The entry door leaf is cut to the selected profile, so it lives in its own
  // rebuildable module rather than in the merged house geometry.
  const entryDoor = buildEntryDoor({ scene, M, shadows, ...house.entryOpening });

  const store = createStore();
  for (const c of CATEGORIES) await apply(c.key, store.state.sel[c.key], false);
  entryDoor.apply(store.state.sel.entry);

  setLoad('Fitting out the interior…');
  await tick();
  const interior = await buildInterior({ scene, M, shadows, house });
  await interior.buildAll(store.state.int);

  // Guide p.18-19 extras are geometry, not just materials, so they are toggled
  // alongside the frame material whenever the Window Frame selection changes.
  const syncWindowExtras = () => {
    const sel = store.state.sel.frame || {};
    house.setWindowExtras({
      flyscreen: !!findOption(sel.flyscreen)?.mesh,
      barrier: !!findOption(sel.barrier)?.barrier,
      boutique: findOption(sel.boutique)?.boutique || null,
    });
  };
  syncWindowExtras();
  // Guide p.21 — brick infill with a steel lintel, or fibre cement sheeting.
  const syncInfill = () => house.setInfill(findOption(store.state.sel.bricks?.infill)?.infill || 'brick');
  syncInfill();

  // part → meshes (for hover highlight)
  const partMeshes = (part) => {
    if (!part) return [];
    return scene.meshes.filter((m) => m.metadata?.part === part);
  };

  // ------------------------------------------------ light, mood & cutaway
  const lighting = createLighting({
    scene, sun, hemi, pipeline, M, house, ground, interior, entryDoor, setSky,
    onInside: (on) => $('[data-act="transparent"]').classList.toggle('on', on),
  });
  const setMood = lighting.setMood;
  const setInside = lighting.setInside;

  // ------------------------------------------------ UI
  let autoRotate = false;
  const panel = createPanel({
    root: $('.panel'),
    store,
    onOpen: (cat, tab) => {
      setMode(tab);
      overlay.setActive(tab === 'int' ? null : cat?.key || null);
      if (!cat) return;
      stopRotate();
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

  const interiorPick = createInteriorPicker({
    stage,
    scene,
    engine,
    store,
    onPick: (key) => {
      if (panel.openKey !== key) panel.open(key);
      document.body.classList.add('sheet-open');
    },
  });

  // External mode shows the A–L pins; Internal mode hides them and makes every
  // configurable item in the house hoverable instead.
  let mode = 'ext';
  function setMode(next) {
    if (!next || mode === next) return;
    mode = next;
    const internal = mode === 'int';
    overlay.setEnabled(!internal);
    interiorPick.setEnabled(internal);
    document.body.classList.toggle('mode-int', internal);
    if (internal) setInside(true);
  }

  const summary = createSummary({
    root: $('#summary'),
    store,
    capture: createCapture({
      engine,
      canvas,
      camera,
      lighting,
      rotate: { isOn: () => autoRotate, stop: () => stopRotate(), toggle: () => toggleRotate() },
    }),
  });

  // re-apply materials when selections change
  let prevSel = JSON.stringify(store.state.sel);
  let prevInt = JSON.stringify(store.state.int);
  store.subscribe(async (state, change) => {
    const now = state.sel;
    const before = JSON.parse(prevSel);
    prevSel = JSON.stringify(now);
    for (const c of CATEGORIES) {
      if (JSON.stringify(before[c.key]) !== JSON.stringify(now[c.key])) {
        await apply(c.key, now[c.key], true);
        if (c.key === 'frame') syncWindowExtras();
        if (c.key === 'bricks') syncInfill();
        if (c.key === 'entry') entryDoor.apply(now.entry);
      }
    }
    const nowInt = state.int;
    const beforeInt = JSON.parse(prevInt);
    prevInt = JSON.stringify(nowInt);
    for (const c of INTERIOR_CATEGORIES) {
      if (JSON.stringify(beforeInt[c.key]) !== JSON.stringify(nowInt[c.key])) await interior.apply(c.key, nowInt[c.key]);
    }
  });

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
      setInside(!lighting.isInside());
      if (lighting.isInside()) {
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

  // Double-click (or double-tap) anywhere to make that spot the pivot, so you can
  // orbit around whatever you are looking at.
  function recentre(e) {
    const pick = scene.pick(scene.pointerX, scene.pointerY, (m) => m.isPickable && m.isVisible && m.name !== 'skybox');
    if (!pick?.hit || !pick.pickedPoint) return;
    overlay.cancelTap();
    interiorPick.cancelTap();
    stopRotate();
    focusPoint(camera, pick.pickedPoint);
    ping(e);
  }
  canvas.addEventListener('dblclick', recentre);
  let lastTap = 0;
  let lastXY = null;
  canvas.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') return;
    const now = performance.now();
    const near = lastXY && Math.hypot(e.clientX - lastXY.x, e.clientY - lastXY.y) < 26;
    if (now - lastTap < 330 && near) {
      recentre(e);
      lastTap = 0;
    } else {
      lastTap = now;
      lastXY = { x: e.clientX, y: e.clientY };
    }
  });
  // brief marker so the new pivot is obvious
  const pingEl = document.createElement('div');
  pingEl.className = 'pivot-ping';
  pingEl.hidden = true;
  stage.appendChild(pingEl);
  let pingTimer = null;
  function ping(e) {
    const r = stage.getBoundingClientRect();
    pingEl.style.left = `${e.clientX - r.left}px`;
    pingEl.style.top = `${e.clientY - r.top}px`;
    pingEl.hidden = false;
    pingEl.classList.remove('on');
    void pingEl.offsetWidth;
    pingEl.classList.add('on');
    clearTimeout(pingTimer);
    pingTimer = setTimeout(() => {
      pingEl.hidden = true;
    }, 700);
  }
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
  if (store.completed().length < CATEGORIES.length) {
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
