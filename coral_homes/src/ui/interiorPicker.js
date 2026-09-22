import { INTERIOR_CATEGORIES } from '../interiorCatalog.js';
import { describeInterior } from '../describe.js';
import { createTinter } from './hoverTint.js';

// While the Internal tab is open, every configurable item in the house answers
// the pointer: hovering washes it in the accent colour and names the choice it
// belongs to, clicking opens that category.
export function createInteriorPicker({ stage, scene, engine, store, onPick }) {
  const canvas = engine.getRenderingCanvas();
  const tip = document.createElement('div');
  tip.className = 'tip tip-int';
  tip.hidden = true;
  stage.appendChild(tip);

  const tinter = createTinter();
  const catOf = (key) => INTERIOR_CATEGORIES.find((c) => c.key === key) || null;
  const canPick = (m) => !!m.metadata?.int && m.isVisible && m.visibility > 0.4;

  let enabled = false;
  let hovered = null;
  let last = 0;
  let down = null;

  function light(mesh) {
    if (mesh === hovered) return;
    hovered = mesh;
    tinter.set(mesh);
  }

  function clear() {
    light(null);
    tip.hidden = true;
    canvas.style.cursor = 'grab';
  }

  canvas.addEventListener('pointermove', (e) => {
    if (!enabled) return;
    if (e.buttons) {
      tip.hidden = true;
      return;
    }
    const now = performance.now();
    if (now - last < 55) return;
    last = now;
    const pick = scene.pick(scene.pointerX, scene.pointerY, canPick);
    const mesh = pick?.hit ? pick.pickedMesh : null;
    light(mesh);
    canvas.style.cursor = mesh ? 'pointer' : 'grab';
    const cat = catOf(mesh?.metadata?.int);
    if (!cat) {
      tip.hidden = true;
      return;
    }
    const d = describeInterior(cat, store.state.int[cat.key], store.state.intDone.includes(cat.key));
    tip.innerHTML = `<b>${cat.letter} · ${cat.name}</b><span>${d.main || 'Standard'} — click to change</span>`;
    const r = stage.getBoundingClientRect();
    tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px)`;
    tip.hidden = false;
  });

  canvas.addEventListener('pointerleave', () => {
    if (enabled) clear();
  });

  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });

  // A tap opens the item's options, but a double-tap is the recentre gesture, so
  // hold the pick briefly and drop it if a second tap follows.
  let pending = null;
  const cancelTap = () => {
    clearTimeout(pending);
    pending = null;
  };
  canvas.addEventListener('pointerup', (e) => {
    const start = down;
    down = null;
    if (!enabled || !start) return;
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (moved > 6 || performance.now() - start.t > 500) return;
    const pick = scene.pick(scene.pointerX, scene.pointerY, canPick);
    if (!pick?.hit) return;
    const key = pick.pickedMesh.metadata.int;
    cancelTap();
    pending = setTimeout(() => {
      pending = null;
      onPick(key);
    }, 240);
  });
  canvas.addEventListener('dblclick', cancelTap);

  return {
    cancelTap,
    setEnabled(on) {
      if (enabled === on) return;
      enabled = on;
      if (!on) clear();
    },
    refresh() {
      if (hovered) tip.hidden = true;
    },
  };
}
