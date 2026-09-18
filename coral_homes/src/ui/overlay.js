import { Vector3, Matrix, Ray, Color3 } from '../scene/babylon.js';
import { CATEGORIES } from '../catalog.js';
import { describe } from '../describe.js';

// A–L pins projected over the 3D view, plus hover highlighting of parts.
export function createOverlay({ stage, scene, camera, engine, anchors, partMeshes, store, onPick }) {
  const layer = document.createElement('div');
  layer.className = 'pins';
  stage.appendChild(layer);
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.hidden = true;
  stage.appendChild(tip);

  const pins = CATEGORIES.map((c) => {
    const b = document.createElement('button');
    b.className = 'pin';
    b.type = 'button';
    b.dataset.cat = c.key;
    b.innerHTML = `<span>${c.letter}</span><em>${c.name}</em>`;
    b.setAttribute('aria-label', `${c.letter}: ${c.name}`);
    b.addEventListener('click', () => onPick(c.key));
    b.addEventListener('mouseenter', () => highlight(c.key));
    b.addEventListener('mouseleave', () => highlight(null));
    layer.appendChild(b);
    return { el: b, cat: c, pos: anchors[c.key], visible: true };
  });

  let showPins = true;
  let active = null;
  const tmp = new Vector3();
  const identity = Matrix.Identity();
  let frame = 0;

  scene.onAfterRenderObservable.add(() => {
    if (!showPins) return;
    const w = engine.getRenderWidth();
    const h = engine.getRenderHeight();
    const scaleX = stage.clientWidth / w;
    const scaleY = stage.clientHeight / h;
    const vp = camera.viewport.toGlobal(w, h);
    const tm = scene.getTransformMatrix();
    frame++;
    for (const p of pins) {
      Vector3.ProjectToRef(p.pos, identity, tm, vp, tmp);
      const behind = tmp.z < 0 || tmp.z > 1;
      // occlusion test every few frames
      if (frame % 8 === pins.indexOf(p) % 8) {
        const origin = camera.globalPosition;
        const dir = p.pos.subtract(origin);
        const len = dir.length();
        const ray = new Ray(origin, dir.normalize(), len - 0.25);
        const hit = scene.pickWithRay(ray, (m) => m.isPickable && m.isEnabled() && m.metadata?.part !== undefined && m.metadata?.part !== p.cat.key && !(p.cat.key === 'frame' && m.metadata?.part === 'frame'));
        p.visible = !hit?.hit;
      }
      const show = !behind && p.visible;
      p.el.classList.toggle('hidden', !show);
      p.el.style.transform = `translate(${tmp.x * scaleX}px, ${tmp.y * scaleY}px)`;
    }
  });

  function refreshStates() {
    for (const p of pins) {
      const d = describe(p.cat, store.state.sel[p.cat.key], store.state.region);
      p.el.classList.toggle('done', d.done);
      p.el.classList.toggle('active', p.cat.key === active);
    }
  }
  store.subscribe(refreshStates);
  refreshStates();

  // ---- hover highlight in the 3D view
  const accent = Color3.FromHexString('#ff8a57');
  let hovered = null;
  function highlight(part) {
    if (hovered === part) return;
    for (const m of partMeshes(hovered)) m.renderOverlay = false;
    hovered = part;
    for (const m of partMeshes(part)) {
      m.overlayColor = accent;
      m.overlayAlpha = 0.22;
      m.renderOverlay = true;
    }
  }

  let last = 0;
  const canvas = engine.getRenderingCanvas();
  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons) {
      tip.hidden = true;
      return;
    }
    const now = performance.now();
    if (now - last < 50) return;
    last = now;
    const pick = scene.pick(scene.pointerX, scene.pointerY, (m) => !!m.metadata?.part);
    const part = pick?.hit ? pick.pickedMesh.metadata.part : null;
    highlight(part);
    canvas.style.cursor = part ? 'pointer' : 'grab';
    if (part) {
      const cat = CATEGORIES.find((c) => c.key === part);
      const d = describe(cat, store.state.sel[part], store.state.region);
      tip.innerHTML = `<b>${cat.letter} · ${cat.name}</b><span>${d.done ? d.main : 'Click to choose'}</span>`;
      const r = stage.getBoundingClientRect();
      tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px)`;
      tip.hidden = false;
    } else tip.hidden = true;
  });
  canvas.addEventListener('pointerleave', () => {
    highlight(null);
    tip.hidden = true;
  });
  let down = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved < 6 && performance.now() - down.t < 500) {
      const pick = scene.pick(scene.pointerX, scene.pointerY, (m) => !!m.metadata?.part);
      if (pick?.hit) onPick(pick.pickedMesh.metadata.part);
    }
    down = null;
  });

  return {
    setActive(key) {
      active = key;
      refreshStates();
    },
    setPins(on) {
      showPins = on;
      layer.hidden = !on;
    },
    flash(key) {
      highlight(key);
      setTimeout(() => {
        if (hovered === key) highlight(null);
      }, 900);
    },
  };
}
