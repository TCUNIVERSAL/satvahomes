// Front entry door (guide p.40-47): the leaf is cut to the selected profile,
// glazed with the selected glass and fitted with the selected handle, so the
// door on screen matches the product photo on its option card.
//
// The leaf is rebuilt whenever the selection changes, which is cheap — it is a
// few dozen boxes — and far simpler than pre-building every combination.
import { Color3, MeshBuilder } from './babylon.js';
import { Geo } from './geometry.js';
import { findOption } from '../catalog.js';

const T_FACE = -0.12; // outer face of the leaf, in wall-local depth
const T_BACK = -0.18; // inner face
const GLASS_D = -0.15; // glazing sits mid-leaf
// Glazing stops short of the lock stile so the handle always lands on timber,
// the way it does on every door in the guide.
const STILE = 0.80;
const HANDLE_U = 0.885;

// Glazed openings for one profile, as fractions of the leaf (u across, v up).
// Measured off the guide's own product photography.
function openings(p) {
  if (!p) return [];
  const out = [];
  const { cut } = p;
  if (cut === 'full') {
    out.push([0.09, 0.05, STILE, 0.95]);
  } else if (cut === 'slot') {
    out.push([0.68, 0.05, 0.80, 0.95]);
  } else if (cut === 'hSlots') {
    const n = p.rows || 4;
    const top = 0.94;
    const bot = 0.06;
    const gap = 0.035;
    const h = (top - bot - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const v0 = bot + i * (h + gap);
      out.push([0.09, v0, 0.74, v0 + h]);
    }
  } else if (cut === 'vSlots') {
    const n = p.rows || 5;
    const l = 0.08;
    const r = STILE;
    const gap = 0.028;
    const w = (r - l - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const u0 = l + i * (w + gap);
      out.push([u0, 0.07, u0 + w, 0.93]);
    }
  } else if (cut === 'grid') {
    // glazed head over a solid bottom panel
    const [cols, rows] = p.grid || [1, 1];
    const l = 0.10;
    const r = STILE;
    const bot = 0.30;
    const top = 0.92;
    const gap = 0.03;
    const w = (r - l - gap * (cols - 1)) / cols;
    const h = (top - bot - gap * (rows - 1)) / rows;
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        const u0 = l + cx * (w + gap);
        const v0 = bot + cy * (h + gap);
        out.push([u0, v0, u0 + w, v0 + h]);
      }
    }
  } else if (cut === 'panelled') {
    // glazed lights over matching solid panels
    const n = p.rows || 1;
    const l = 0.12;
    const r = STILE;
    const gap = 0.04;
    const w = (r - l - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const u0 = l + i * (w + gap);
      out.push([u0, 0.46, u0 + w, 0.92]);
    }
  }
  return out;
}

// Solid recessed panels (no glass) that some profiles carry under the glazing.
function panels(p) {
  if (!p) return [];
  if (p.cut === 'grid') return [[0.10, 0.06, STILE, 0.24]];
  if (p.cut === 'panelled') {
    const n = p.rows || 1;
    const l = 0.12;
    const r = STILE;
    const gap = 0.04;
    const w = (r - l - gap * (n - 1)) / n;
    const out = [];
    for (let i = 0; i < n; i++) {
      const u0 = l + i * (w + gap);
      out.push([u0, 0.07, u0 + w, 0.40]);
    }
    return out;
  }
  return [];
}

export function buildEntryDoor({ scene, M, shadows, wall, x0, x1, height }) {
  const W = x1 - x0;
  const u = (f) => x0 + f * W;
  const v = (f) => 0.02 + f * (height - 0.02);
  let meshes = [];

  const dispose = () => {
    for (const m of meshes) m.dispose(false, false);
    meshes = [];
  };

  function build(sel = {}) {
    dispose();
    const profile = findOption(sel.profile) || { cut: 'hSlots', rows: 4 };
    const handle = findOption(sel.handle);
    const glass = findOption(sel.glazing);
    const G = {};
    const geo = (k) => (G[k] = G[k] || new Geo());

    const holes = openings(profile);
    // --- leaf, built as the bands left over between the glazed openings
    const leaf = geo('entryDoor');
    const cutsV = new Set([0, 1]);
    const cutsU = new Set([0, 1]);
    for (const [a, b, c, d] of holes) {
      cutsU.add(a);
      cutsU.add(c);
      cutsV.add(b);
      cutsV.add(d);
    }
    const US = [...cutsU].sort((a, b) => a - b);
    const VS = [...cutsV].sort((a, b) => a - b);
    const inHole = (uu, vv) => holes.some(([a, b, c, d]) => uu > a && uu < c && vv > b && vv < d);
    for (let i = 0; i < US.length - 1; i++) {
      for (let j = 0; j < VS.length - 1; j++) {
        const cu = (US[i] + US[i + 1]) / 2;
        const cv = (VS[j] + VS[j + 1]) / 2;
        if (inHole(cu, cv)) continue;
        if (US[i + 1] - US[i] < 1e-4 || VS[j + 1] - VS[j] < 1e-4) continue;
        wall.box(leaf, u(US[i]), u(US[i + 1]), v(VS[j]), v(VS[j + 1]), T_FACE, T_BACK);
      }
    }

    // --- glazing beads and glass
    if (holes.length) {
      const bead = geo('entryBead');
      const g = geo(glass?.obscure ? 'glassFrosted' : 'glass');
      const b = 0.016;
      for (const [a, bb, c, d] of holes) {
        wall.box(bead, u(a) - b, u(c) + b, v(bb) - b, v(bb), T_FACE + 0.006, T_BACK);
        wall.box(bead, u(a) - b, u(c) + b, v(d), v(d) + b, T_FACE + 0.006, T_BACK);
        wall.box(bead, u(a) - b, u(a), v(bb), v(d), T_FACE + 0.006, T_BACK);
        wall.box(bead, u(c), u(c) + b, v(bb), v(d), T_FACE + 0.006, T_BACK);
        g.poly(
          [
            wall.world(u(a), v(bb), GLASS_D),
            wall.world(u(c), v(bb), GLASS_D),
            wall.world(u(c), v(d), GLASS_D),
            wall.world(u(a), v(d), GLASS_D),
          ],
          wall.n,
        );
      }
    }

    // --- recessed solid panels
    for (const [a, bb, c, d] of panels(profile)) {
      const pnl = geo('entryPanel');
      wall.box(pnl, u(a), u(c), v(bb), v(d), T_FACE + 0.004, T_FACE - 0.008);
    }

    // --- grooved leaves (XLR150 horizontal, XLR500 vertical battens)
    if (profile.groove) {
      const gr = geo('entryGroove');
      const n = profile.groove === 'v' ? 22 : 7;
      for (let i = 1; i < n; i++) {
        const f = i / n;
        if (profile.groove === 'v') wall.box(gr, u(f) - 0.004, u(f) + 0.004, v(0.02), v(0.98), T_FACE + 0.002, T_FACE - 0.006);
        else wall.box(gr, u(0.02), u(0.98), v(f) - 0.004, v(f) + 0.004, T_FACE + 0.002, T_FACE - 0.006);
      }
    }

    // --- hardware
    const hw = geo('entryHardware');
    const hx = u(HANDLE_U); // handle centre line, on the lock stile
    const cy = 1.05;
    if (handle?.shape === 'bar') {
      const len = handle.bar || 0.6;
      wall.box(hw, hx - 0.018, hx + 0.018, cy - len / 2, cy + len / 2, T_FACE + 0.035, T_FACE + 0.012);
      for (const yy of [cy - len / 2 + 0.05, cy + len / 2 - 0.05]) {
        wall.box(hw, hx - 0.013, hx + 0.013, yy - 0.013, yy + 0.013, T_FACE + 0.014, T_FACE);
      }
      wall.box(hw, hx - 0.03, hx + 0.03, cy - len / 2 - 0.20, cy - len / 2 - 0.12, T_FACE + 0.008, T_FACE - 0.004);
    } else if (handle?.shape === 'knob') {
      const knob = MeshBuilder.CreateSphere('entryKnob', { diameter: 0.075, segments: 14 }, scene);
      const p = wall.world(hx, cy, T_FACE + 0.035);
      knob.position.set(p[0], p[1], p[2]);
      knob.material = M.entryHardware;
      meshes.push(knob);
      wall.box(hw, hx - 0.032, hx + 0.032, cy - 0.10, cy + 0.10, T_FACE + 0.006, T_FACE - 0.004);
    } else {
      // lever on a backplate — the standard Trilock
      wall.box(hw, hx - 0.034, hx + 0.034, cy - 0.16, cy + 0.16, T_FACE + 0.008, T_FACE - 0.004);
      wall.box(hw, hx - 0.016, hx + 0.016, cy + 0.03, cy + 0.075, T_FACE + 0.034, T_FACE + 0.006);
      wall.box(hw, hx - 0.10, hx + 0.016, cy + 0.03, cy + 0.062, T_FACE + 0.034, T_FACE + 0.014);
      wall.box(hw, hx - 0.018, hx + 0.018, cy - 0.10, cy - 0.06, T_FACE + 0.012, T_FACE - 0.002);
    }

    // --- emit
    const MAT = {
      entryDoor: M.entryDoor,
      entryBead: M.entryDoor,
      entryPanel: M.entryDoor,
      entryGroove: M.entryDoorShade,
      entryHardware: M.entryHardware,
      glass: M.glass,
      glassFrosted: M.glassFrosted,
    };
    for (const [k, g] of Object.entries(G)) {
      if (!g.count) continue;
      const m = g.toMesh(`entry-${k}`, scene, MAT[k] || M.entryDoor);
      m.metadata = { part: 'entry', int: null };
      m.isPickable = true;
      if (k !== 'glass' && k !== 'glassFrosted') shadows?.addShadowCaster(m, false);
      m.receiveShadows = true;
      m.freezeWorldMatrix();
      meshes.push(m);
    }
    for (const m of meshes) m.metadata = m.metadata || { part: 'entry', int: null };
  }

  // Finish and hardware are material-only, so they never need a rebuild.
  function applyFinish(sel = {}) {
    const stained = sel.finishType === 'df-stain';
    const opt = findOption(stained ? sel.stain : sel.paint);
    const hex = opt?.hex || '#f1efea';
    M.entryDoor.albedoColor = Color3.FromHexString(hex).toLinearSpace();
    M.entryDoor.roughness = stained ? 0.5 : 0.62;
    M.entryDoorShade.albedoColor = Color3.FromHexString(hex).toLinearSpace().scale(0.68);
    M.entryDoorShade.roughness = M.entryDoor.roughness;
    const f = findOption(sel.handleFinish) || { hex: '#d8dce0', metal: 0.95, rough: 0.12 };
    M.entryHardware.albedoColor = Color3.FromHexString(f.hex).toLinearSpace();
    M.entryHardware.metallic = f.metal;
    M.entryHardware.roughness = f.rough;
  }

  // Rebuild only when the geometry actually changes.
  let key = null;
  function apply(sel = {}) {
    const k = `${sel.profile}|${sel.handle}|${sel.glazing}`;
    if (k !== key) {
      key = k;
      build(sel);
    }
    applyFinish(sel);
    const g = findOption(sel.glazing);
    if (g && !g.obscure) {
      M.glass.albedoColor = Color3.FromHexString(g.tint).toLinearSpace();
      M.glass.alpha = g.alpha;
      M.glass.roughness = g.rough;
    }
  }

  const setTransparent = (on) => {
    for (const m of meshes) m.visibility = on ? 0.32 : 1;
  };

  return { apply, dispose, setTransparent, get meshes() { return meshes; } };
}
