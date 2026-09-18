// Interior fit-out: kitchen (built from the Ground Floor Plan), walk-in pantry,
// storage room, bathrooms, laundry, joinery, trims, window furnishings and
// furniture. Everything follows the Internal selections from the Pre-Selection
// Guide, so each group can be rebuilt on its own when a choice changes.
import { Color3, PBRMaterial, DynamicTexture, Texture, Vector3, Mesh, MeshBuilder, PointLight } from './babylon.js';
import { Group, roundedBox, lathe, tube, cylinder, sphere, place } from './interiorParts.js';
import { makeCanvas, noiseCanvas, loadImage, rng } from './textures.js';
import { FINISHES, resolveAll, INTERIOR_CATEGORIES, interiorDefaults } from '../interiorCatalog.js';

const lin = (hex) => Color3.FromHexString(hex || '#ffffff').toLinearSpace();

// ------------------------------------------------------------------ layout
// Model coordinates in metres, taken from the wall faces in house.js.
// X: garage/kitchen side negative, bedroom wing positive. Z: street negative.
const CEIL = 2.70;
const BENCH_H = 0.9;
const BENCH_D = 0.6;
const KICK_H = 0.12;
const KICK_IN = 0.055;
const OVER_Y0 = 1.75;
const OVER_Y1 = 2.45;
const OVER_D = 0.35;

// Kitchen 2810 x 4850, island 3237 x 1000, 1010 & 1300 aisles (Ground Floor Plan)
const K = {
  wall: -5.54, // kitchen side wall, inner face
  benchFront: -4.94, // 600 deep bench
  benchZ0: -1.865, // between the two nib walls
  benchZ1: 0.945,
  pantryZ0: -3.455, // walk-in pantry, 1500 deep
  pantryZ1: -1.955,
  islandX0: -3.925,
  islandX1: -0.692,
  islandZ0: 0.035,
  islandZ1: 1.035,
  colX1: -0.045, // tall run: fridge -> oven tower -> tall cupboards
  colZ0: -1.865,
  colZ1: -1.265,
  ovenX: [-2.801, -2.202],
  fridgeX: [-3.817, -2.818],
  cooktopZ: -0.563,
  winKitchen: [-1.51, 0.59], // Afw 2100 x 600 splashback window
  sink: { x: -3.508, z: 0.366 },
  pantrySink: { x: -5.24, z: -2.70 },
  pantryDiv: -2.18, // storage / pantry divider, pantry face
  storageX: [-2.09, -0.045],
  storageZ: [-3.455, -1.955],
};

// Rooms (inner wall faces)
const ENS = { x0: 1.785, x1: 5.23, z0: -6.01, z1: -4.10 };
const BATH = { x0: 2.385, x1: 5.23, z0: 5.19, z1: 6.60 };
const WC = { x0: 4.275, x1: 5.23, z0: 6.69, z1: 8.00 };
const LDRY = { x0: 1.785, x1: 5.23, z0: -4.01, z1: -2.30 };
const MEDIA = { x0: 1.785, x1: 5.23, z0: -2.21, z1: 2.10 };

// Wall faces that receive skirting + cornice: [axis, position, from, to, side].
// axis 'z' -> the wall runs along Z at x = pos; axis 'x' -> runs along X at z = pos.
// side +1 -> the room is on the positive side of that face.
const WALL_LINES = [
  ['z', -5.54, -3.50, 8.245, +1, 'ext'], // kitchen / family side wall
  ['x', 8.245, -5.50, -2.70, -1, 'ext'], // family rear wall beside the alfresco
  ['z', -2.44, 8.29, 8.54, +1, 'ext'], // alfresco return
  ['x', 8.54, -2.40, 0.755, -1], // family / rear passage wall
  ['z', 1.695, -9.305, 8.045, -1], // hall wall, entry & family side
  ['z', 1.785, -9.305, 11.585, +1], // hall wall, bedroom side
  ['z', 5.23, -9.305, 11.585, -1, 'ext'], // bedroom wing outer wall
  ['x', -9.305, 0.045, 5.23, +1, 'ext'], // front wall
  ['x', 11.585, -2.40, 5.23, -1, 'ext'], // rear wall
  ['z', 0.045, -9.305, -1.216, +1], // entry passage / garage wall
  ['x', -1.865, -3.838, -0.045, +1], // kitchen side of the pantry wall
  ...[-6.055, -4.055, -2.255, 2.145, 5.145, 6.645, 8.045].flatMap((z) => [
    ['x', z - 0.045, 1.785, 5.23, -1],
    ['x', z + 0.045, 1.785, 5.23, +1],
  ]),
];
// Floor-level openings that are not in the window list (the entry door).
const EXTRA_GAPS = [['x', -9.305, 0.15, 1.35]];

// ------------------------------------------------------------------ helpers
function pbr(name, scene, { color = '#ffffff', rough = 0.6, metal = 0, alpha = 1 } = {}) {
  const m = new PBRMaterial(name, scene);
  m.albedoColor = lin(color);
  m.metallic = metal;
  m.roughness = rough;
  m.maxSimultaneousLights = 6; // keep the shader under GL_MAX_VERTEX_UNIFORM_BUFFERS
  m.environmentIntensity = 0.8;
  if (alpha < 1) {
    m.alpha = alpha;
    m.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
    m.backFaceCulling = false;
  }
  return m;
}

// Tapware and handles only have an environment cube to reflect, so pure chrome
// would mirror the lawn. Slightly softer metal reads much closer to a product shot.
function setFinish(mat, key) {
  const f = FINISHES[key] || FINISHES.chrome;
  mat.albedoTexture = null;
  mat.albedoColor = lin(f.hex);
  mat.metallic = Math.min(f.metal, 0.72);
  mat.roughness = Math.max(f.rough, 0.17);
}

export async function buildInterior({ scene, M, shadows, house }) {
  const canvasCache = new Map();

  const dynTex = (name, canvas, uSize, vSize = uSize) => {
    const t = new DynamicTexture(name, canvas, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
    t.update(true);
    t.anisotropicFilteringLevel = 8;
    t.wrapU = t.wrapV = Texture.WRAP_ADDRESSMODE;
    t.uScale = 1 / uSize;
    t.vScale = 1 / vSize;
    return t;
  };

  // A guide swatch mirrored into a seamless tile.
  async function guideCanvas(src, size = 512) {
    if (!src) return null;
    if (canvasCache.has(src)) return canvasCache.get(src);
    try {
      const img = await loadImage(src);
      const c = makeCanvas(size, size);
      const x = c.getContext('2d');
      const h = size / 2;
      x.drawImage(img, 0, 0, size, h);
      x.save();
      x.translate(0, size);
      x.scale(1, -1);
      x.drawImage(img, 0, 0, size, h);
      x.restore();
      canvasCache.set(src, c);
      return c;
    } catch {
      return null;
    }
  }

  async function plankCanvas(src, hex) {
    const key = `plank:${src}:${hex}`;
    if (canvasCache.has(key)) return canvasCache.get(key);
    const c = makeCanvas(1024, 1024);
    const x = c.getContext('2d');
    x.fillStyle = hex || '#c9a97c';
    x.fillRect(0, 0, 1024, 1024);
    const img = src ? await loadImage(src).catch(() => null) : null;
    const rows = 6;
    const rh = 1024 / rows;
    const r = rng(7);
    for (let i = 0; i < rows; i++) {
      const off = (i % 2) * 300 + r() * 120;
      for (let k = -1; k < 3; k++) {
        const px = k * 520 + off;
        if (img) {
          x.save();
          x.beginPath();
          x.rect(px, i * rh + 1, 516, rh - 2);
          x.clip();
          x.drawImage(img, r() * img.width * 0.3, 0, img.width * 0.6, img.height, px, i * rh, 516, rh);
          x.restore();
        }
        x.fillStyle = 'rgba(0,0,0,0.26)';
        x.fillRect(px - 1, i * rh, 2, rh);
      }
      x.fillStyle = 'rgba(0,0,0,0.22)';
      x.fillRect(0, i * rh, 1024, 2);
    }
    const n = noiseCanvas(256, { base: 8, octaves: 4, seed: 3 });
    x.globalAlpha = 0.12;
    x.globalCompositeOperation = 'overlay';
    x.drawImage(n, 0, 0, 1024, 1024);
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
    canvasCache.set(key, c);
    return c;
  }

  function tileCanvas(hex, grout = '#b9b5ad') {
    const key = `tile:${hex}`;
    if (canvasCache.has(key)) return canvasCache.get(key);
    const c = makeCanvas(512, 512);
    const x = c.getContext('2d');
    x.fillStyle = grout;
    x.fillRect(0, 0, 512, 512);
    x.fillStyle = hex;
    x.fillRect(3, 3, 506, 506);
    const n = noiseCanvas(256, { base: 5, octaves: 4, seed: 11 });
    x.globalAlpha = 0.14;
    x.globalCompositeOperation = 'overlay';
    x.drawImage(n, 0, 0, 512, 512);
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
    canvasCache.set(key, c);
    return c;
  }

  function carpetCanvas(hex) {
    const key = `carpet:${hex}`;
    if (canvasCache.has(key)) return canvasCache.get(key);
    const c = makeCanvas(512, 512);
    const x = c.getContext('2d');
    x.fillStyle = hex;
    x.fillRect(0, 0, 512, 512);
    const r = rng(5);
    for (let i = 0; i < 30000; i++) {
      x.fillStyle = `rgba(0,0,0,${r() * 0.05})`;
      x.fillRect(r() * 512, r() * 512, 2, 2);
      x.fillStyle = `rgba(255,255,255,${r() * 0.05})`;
      x.fillRect(r() * 512, r() * 512, 2, 2);
    }
    canvasCache.set(key, c);
    return c;
  }

  // ---------------------------------------------------------------- materials
  const IM = {
    wall: M.interiorWall,
    ceil: M.interiorCeil,
    wetTile: M.tileWet,
    glassFrosted: M.glassFrosted,
    floorMain: M.interiorFloor,
    carpet: M.carpet,
    woodwork: pbr('int-woodwork', scene, { color: '#f4f2ee', rough: 0.45 }),
    feature: pbr('int-feature', scene, { color: '#e9e6e0', rough: 0.85 }),
    kStone: pbr('int-kstone', scene, { color: '#f4f3f0', rough: 0.22 }),
    kCab: pbr('int-kcab', scene, { color: '#eceae5', rough: 0.55 }),
    kIsland: pbr('int-kisland', scene, { color: '#eceae5', rough: 0.55 }),
    kOver: pbr('int-kover', scene, { color: '#eceae5', rough: 0.55 }),
    kick: pbr('int-kick', scene, { color: '#3c3a37', rough: 0.6 }),
    handle: pbr('int-handle', scene, { color: '#e6eaec', rough: 0.12, metal: 0.95 }),
    sink: pbr('int-sink', scene, { color: '#d2d5d7', rough: 0.25, metal: 0.85 }),
    mixer: pbr('int-mixer', scene, { color: '#e6eaec', rough: 0.1, metal: 0.95 }),
    appSS: pbr('int-appss', scene, { color: '#c6cace', rough: 0.3, metal: 0.8 }),
    appBlack: pbr('int-appblack', scene, { color: '#17181a', rough: 0.35, metal: 0.4 }),
    appGlass: pbr('int-appglass', scene, { color: '#0c0d0f', rough: 0.06, metal: 0.2 }),
    cooker: pbr('int-cooker', scene, { color: '#c9ccce', rough: 0.3, metal: 0.6 }),
    vStone: pbr('int-vstone', scene, { color: '#f6f5f2', rough: 0.22 }),
    vCab: pbr('int-vcab', scene, { color: '#d9c7a8', rough: 0.55 }),
    basin: pbr('int-basin', scene, { color: '#ffffff', rough: 0.09 }),
    tap: pbr('int-tap', scene, { color: '#e6eaec', rough: 0.1, metal: 0.95 }),
    shower: pbr('int-shower', scene, { color: '#e6eaec', rough: 0.1, metal: 0.95 }),
    acc: pbr('int-acc', scene, { color: '#e6eaec', rough: 0.1, metal: 0.95 }),
    screenFrame: pbr('int-screenframe', scene, { color: '#e6eaec', rough: 0.15, metal: 0.9 }),
    screenGlass: pbr('int-screenglass', scene, { color: '#eef4f4', rough: 0.07, metal: 0, alpha: 0.12 }),
    mirror: pbr('int-mirror', scene, { color: '#d8e0e3', rough: 0.09, metal: 0.55 }),
    porcelain: pbr('int-porcelain', scene, { color: '#fbfbfa', rough: 0.1 }),
    bath: pbr('int-bath', scene, { color: '#ffffff', rough: 0.12 }),
    lCab: pbr('int-lcab', scene, { color: '#eceae5', rough: 0.55 }),
    lStone: pbr('int-lstone', scene, { color: '#efeeea', rough: 0.3 }),
    tub: pbr('int-tub', scene, { color: '#cdd1d3', rough: 0.3, metal: 0.8 }),
    robeDoor: pbr('int-robedoor', scene, { color: '#d5dee1', rough: 0.08, metal: 0.5 }),
    mel: pbr('int-mel', scene, { color: '#f3f1ec', rough: 0.6 }),
    fabricSofa: pbr('int-sofa', scene, { color: '#cfc7ba', rough: 0.95 }),
    fabricAccent: pbr('int-accent', scene, { color: '#7d8a86', rough: 0.95 }),
    rug: pbr('int-rug', scene, { color: '#b9b0a2', rough: 1 }),
    curtain: pbr('int-curtain', scene, { color: '#efece6', rough: 0.9 }),
    blind: pbr('int-blind', scene, { color: '#e8e5de', rough: 0.85 }),
    shutter: pbr('int-shutter', scene, { color: '#f6f5f1', rough: 0.55 }),
    oak: pbr('int-oak', scene, { color: '#b78f5e', rough: 0.5 }),
    oakDark: pbr('int-oakdark', scene, { color: '#6d4f33', rough: 0.55 }),
    blackMetal: pbr('int-blackmetal', scene, { color: '#1c1c1c', rough: 0.4, metal: 0.6 }),
    brass: pbr('int-brass', scene, { color: '#c8a566', rough: 0.3, metal: 0.9 }),
    leaf: pbr('int-leaf', scene, { color: '#3f6b3a', rough: 0.75 }),
    pot: pbr('int-pot', scene, { color: '#cfc7bb', rough: 0.7 }),
    art: pbr('int-art', scene, { color: '#f7f4ed', rough: 0.7 }),
    led: pbr('int-led', scene, { color: '#fff3dd', rough: 0.3 }),
    tv: pbr('int-tv', scene, { color: '#0d0e10', rough: 0.07, metal: 0.3 }),
    towel: pbr('int-towel', scene, { color: '#eceae4', rough: 1 }),
    linen: pbr('int-linen', scene, { color: '#f2efe8', rough: 0.9 }),
    splash: pbr('int-splash', scene, { color: '#eeece7', rough: 0.25 }),
    book: pbr('int-book', scene, { color: '#9c6b4f', rough: 0.8 }),
  };
  IM.led.emissiveColor = lin('#f6e6c8');
  IM.screenGlass.environmentIntensity = 0.35; // stop the screen mirroring the lawn
  // polished metal with only an environment cube picks up the lawn, so damp it down
  for (const k of ['mixer', 'tap', 'shower', 'acc', 'handle', 'sink', 'screenFrame', 'tub', 'appSS']) {
    IM[k].environmentIntensity = 0.6;
    IM[k].metallic = Math.min(IM[k].metallic, 0.72);
    IM[k].roughness = Math.max(IM[k].roughness, 0.17);
  }
  IM.mirror.environmentIntensity = 0.55;
  IM.robeDoor.environmentIntensity = 0.55;
  for (const k of ['fabricSofa', 'fabricAccent', 'rug', 'curtain', 'blind', 'towel', 'linen']) IM[k].environmentIntensity = 0.45;

  // ---------------------------------------------------------------- state
  const S = {}; // resolved options per category
  const groups = {};
  const makeGroup = (name) => {
    groups[name]?.dispose();
    groups[name] = new Group(scene, IM, shadows, name);
    return groups[name];
  };

  // =================================================================
  // TRIMS: skirting, cornice, feature wall
  // =================================================================
  // Break a wall line where a door or floor-level opening crosses it.
  function runs(axis, pos, a, b) {
    const gaps = [];
    for (const op of house.plan.openings) {
      if (op.axis === axis && Math.abs(op.pos - pos) < 0.12) gaps.push([op.a - 0.035, op.b + 0.035]);
    }
    for (const w of house.plan.windows) {
      if (w.y0 > 0.12) continue;
      const p = w.wall.world(w.s0, 0, 0);
      const q = w.wall.world(w.s1, 0, 0);
      const along = Math.abs(q[0] - p[0]) > Math.abs(q[2] - p[2]) ? 'x' : 'z';
      if (along !== axis) continue;
      const fixed = axis === 'x' ? 2 : 0; // the wall's constant coordinate
      if (Math.abs(p[fixed] - pos) > 0.3) continue;
      const j = axis === 'x' ? 0 : 2;
      gaps.push([Math.min(p[j], q[j]) - 0.02, Math.max(p[j], q[j]) + 0.02]);
    }
    for (const g of EXTRA_GAPS) if (g[0] === axis && Math.abs(g[1] - pos) < 0.3) gaps.push([g[2], g[3]]);
    let segs = [[a, b]];
    for (const [ga, gb] of gaps) {
      const next = [];
      for (const [s0, s1] of segs) {
        if (gb <= s0 || ga >= s1) next.push([s0, s1]);
        else {
          if (ga > s0) next.push([s0, ga]);
          if (gb < s1) next.push([gb, s1]);
        }
      }
      segs = next;
    }
    return segs;
  }

  // A thin face applied to a wall line, `depth` out from the wall face.
  function faceBox(g, key, axis, pos, s0, s1, y0, y1, side, depth) {
    if (depth <= 0 || s1 - s0 <= 0) return;
    if (axis === 'z') g.box(key, pos, y0, s0, pos + side * depth, y1, s1);
    else g.box(key, s0, y0, pos, s1, y1, pos + side * depth);
  }

  // Every opening that crosses a wall line, as [s0, s1, y0, y1] in line coordinates.
  function holesOn(axis, pos) {
    const holes = [];
    for (const op of house.plan.openings) {
      if (op.axis === axis && Math.abs(op.pos - pos) < 0.12) holes.push([op.a - 0.02, op.b + 0.02, 0, 2.40]);
    }
    for (const w of house.plan.windows) {
      const p = w.wall.world(w.s0, 0, 0);
      const q = w.wall.world(w.s1, 0, 0);
      const along = Math.abs(q[0] - p[0]) > Math.abs(q[2] - p[2]) ? 'x' : 'z';
      if (along !== axis) continue;
      const fixed = axis === 'x' ? 2 : 0;
      if (Math.abs(p[fixed] - pos) > 0.3) continue;
      const j = axis === 'x' ? 0 : 2;
      holes.push([Math.min(p[j], q[j]), Math.max(p[j], q[j]), w.y0, w.y1]);
    }
    for (const g of EXTRA_GAPS) if (g[0] === axis && Math.abs(g[1] - pos) < 0.3) holes.push([g[2], g[3], 0, 2.40]);
    return holes;
  }

  // Split a wall face into the solid cells left between its openings.
  function cells(a, b, y0, y1, holes) {
    const S1 = [...new Set([a, b, ...holes.flatMap((h) => [h[0], h[1]]).filter((v) => v > a && v < b)])].sort((p, q) => p - q);
    const Y1 = [...new Set([y0, y1, ...holes.flatMap((h) => [h[2], h[3]]).filter((v) => v > y0 && v < y1)])].sort((p, q) => p - q);
    const out = [];
    for (let i = 0; i < S1.length - 1; i++) {
      let start = null;
      for (let j = 0; j < Y1.length - 1; j++) {
        const cs = (S1[i] + S1[i + 1]) / 2;
        const cy = (Y1[j] + Y1[j + 1]) / 2;
        const solid = !holes.some((h) => cs > h[0] && cs < h[1] && cy > h[2] && cy < h[3]);
        if (solid && start === null) start = Y1[j];
        if ((!solid || j === Y1.length - 2) && start !== null) {
          out.push([S1[i], S1[i + 1], start, solid ? Y1[j + 1] : Y1[j]]);
          start = null;
        }
      }
    }
    return out;
  }

  // Plasterboard lining on the inside face of the brick exterior walls.
  function buildLining() {
    const g = makeGroup('lining');
    for (const [axis, pos, a, b, side, kind] of WALL_LINES) {
      if (kind !== 'ext') continue;
      const holes = holesOn(axis, pos);
      for (const [s0, s1, y0, y1] of cells(a, b, 0.0, CEIL, holes)) {
        if (s1 - s0 < 0.02 || y1 - y0 < 0.02) continue;
        faceBox(g, 'wall', axis, pos, s0, s1, y0, y1, side, 0.012);
      }
    }
    g.finish();
  }

  function buildTrims() {
    const g = makeGroup('trims');
    const skirt = S.trims?.skirting;
    const corn = S.trims?.cornice;
    const sh = 0.092; // 92mm skirting
    const st = 0.018;
    const cs = corn?.size ?? 0.075;
    const steps = corn?.profile === 'step' || corn?.profile === 'newyork' ? 3 : corn?.profile === 'manly' ? 2 : 4;
    for (const [axis, pos, a, b, side] of WALL_LINES) {
      for (const [s0, s1] of runs(axis, pos, a, b)) {
        if (s1 - s0 < 0.12) continue;
        faceBox(g, 'woodwork', axis, pos, s0, s1, 0.012, sh, side, st);
        if (skirt?.profile === 'round') faceBox(g, 'woodwork', axis, pos, s0, s1, sh, sh + 0.008, side, st - 0.006);
        else if (skirt?.profile === 'bevel') faceBox(g, 'woodwork', axis, pos, s0, s1, sh - 0.024, sh, side, st - 0.008);
        else faceBox(g, 'woodwork', axis, pos, s0, s1, sh - 0.014, sh, side, st - 0.005); // half splayed
      }
      if (cs > 0) {
        for (let i = 0; i < steps; i++) {
          const d = cs * (1 - (i + 0.5) / steps) + 0.006;
          faceBox(g, 'ceil', axis, pos, a, b, CEIL - (cs * (i + 1)) / steps, CEIL - (cs * i) / steps, side, d);
        }
      }
    }
    // feature wall - family room TV wall, between the two side windows
    const kind = S.feature?.type?.id;
    const z0 = 3.05;
    const z1 = 6.35;
    if (kind === 'fw-hardigroove') {
      for (let z = z0; z < z1 - 0.01; z += 0.133) {
        g.box('feature', K.wall, 0.10, z, K.wall + 0.022, CEIL - 0.08, Math.min(z1, z + 0.115));
      }
    } else if (kind === 'fw-dado') {
      g.box('feature', K.wall, 0.10, z0, K.wall + 0.018, 1.05, z1);
      g.box('feature', K.wall, 1.05, z0, K.wall + 0.038, 1.105, z1); // dado rail
      for (let z = z0 + 0.1; z < z1 - 0.5; z += 0.62) {
        g.box('feature', K.wall + 0.018, 0.2, z, K.wall + 0.03, 0.96, Math.min(z1 - 0.1, z + 0.5));
      }
    }
    g.finish();
  }

  // =================================================================
  // INTERNAL DOORS: jambs, architraves, leaves, handles
  // =================================================================
  function buildDoors() {
    const g = makeGroup('doors');
    const style = S.doors?.style;
    const lever = S.handles?.lever;
    const H = 2.34;
    for (const op of house.plan.openings) {
      const { axis, pos, a, b, half } = op;
      if (b - a < 0.3) continue;
      const at = op.swingLeft ? b - 0.075 : a + 0.075;
      if (axis === 'x') {
        // the wall runs along X at z = pos
        g.box('woodwork', a - 0.022, 0, pos - half - 0.006, a, H + 0.022, pos + half + 0.006);
        g.box('woodwork', b, 0, pos - half - 0.006, b + 0.022, H + 0.022, pos + half + 0.006);
        g.box('woodwork', a - 0.022, H, pos - half - 0.006, b + 0.022, H + 0.022, pos + half + 0.006);
        for (const s of [-1, 1]) {
          const d = s * (half + 0.006);
          g.box('woodwork', a - 0.07, 0, pos + d, a - 0.022, H + 0.07, pos + d + s * 0.012);
          g.box('woodwork', b + 0.022, 0, pos + d, b + 0.07, H + 0.07, pos + d + s * 0.012);
          g.box('woodwork', a - 0.07, H + 0.022, pos + d, b + 0.07, H + 0.07, pos + d + s * 0.012);
        }
        leaf(g, a + 0.012, b - 0.012, pos, 'x', style, H);
        handle(g, 'x', pos, at);
      } else {
        g.box('woodwork', pos - half - 0.006, 0, a - 0.022, pos + half + 0.006, H + 0.022, a);
        g.box('woodwork', pos - half - 0.006, 0, b, pos + half + 0.006, H + 0.022, b + 0.022);
        g.box('woodwork', pos - half - 0.006, H, a - 0.022, pos + half + 0.006, H + 0.022, b + 0.022);
        for (const s of [-1, 1]) {
          const d = s * (half + 0.006);
          g.box('woodwork', pos + d, 0, a - 0.07, pos + d + s * 0.012, H + 0.07, a - 0.022);
          g.box('woodwork', pos + d, 0, b + 0.022, pos + d + s * 0.012, H + 0.07, b + 0.07);
          g.box('woodwork', pos + d, H + 0.022, a - 0.07, pos + d + s * 0.012, H + 0.07, b + 0.07);
        }
        leaf(g, a + 0.012, b - 0.012, pos, 'z', style, H);
        handle(g, 'z', pos, at);
      }
    }
    g.finish();

    function leaf(gr, s0, s1, pos, axis, st, h) {
      const t = 0.019;
      const put = (u0, v0, u1, v1, d0, d1, key = 'woodwork') => {
        if (axis === 'x') gr.box(key, u0, v0, pos + d0, u1, v1, pos + d1);
        else gr.box(key, pos + d0, v0, u0, pos + d1, v1, u1);
      };
      const p = st?.panels || 'flush';
      put(s0, 0.02, s1, h, -t, t);
      if (p === 'groove' || p === 'barn') {
        for (let u = s0 + 0.09; u < s1 - 0.06; u += 0.115) put(u, 0.06, u + 0.012, h - 0.06, -t - 0.005, -t);
      } else if (p === 'panel' || p === 'shaker' || p === 'settler') {
        const rows = p === 'shaker' ? 2 : 3;
        const inner = h - 0.26;
        for (let i = 0; i < rows; i++) {
          const v0 = 0.14 + i * (inner / rows);
          const v1 = v0 + inner / rows - 0.1;
          put(s0 + 0.11, v0, s1 - 0.11, v1, -t - 0.006, -t);
          put(s0 + 0.11, v0, s1 - 0.11, v1, t, t + 0.006);
        }
      } else if (p === 'glazed') {
        put(s0 + 0.09, 0.2, s1 - 0.09, h - 0.12, -t - 0.001, t + 0.001, 'glassFrosted');
      }
      if (st?.glass && p !== 'glazed') put(s0 + 0.13, h * 0.5, s1 - 0.13, h - 0.14, -t - 0.001, t + 0.001, 'glassFrosted');
    }

    function handle(gr, axis, pos, at) {
      const y = 1.02;
      const square = ['dh-sierra', 'dh-rivera', 'dh-alba'].includes(lever?.id);
      const r = square ? 0.032 : 0.027;
      for (const s of [-1, 1]) {
        const d = s * 0.026;
        if (axis === 'x') {
          gr.box('handle', at - r, y - r, pos + d, at + r, y + r, pos + d * 1.35);
          gr.box('handle', at - 0.011, y - 0.011, pos + d * 1.35, at + 0.09, y + 0.011, pos + d * 2.8);
        } else {
          gr.box('handle', pos + d, y - r, at - r, pos + d * 1.35, y + r, at + r);
          gr.box('handle', pos + d * 1.35, y - 0.011, at - 0.011, pos + d * 2.8, y + 0.011, at + 0.09);
        }
      }
    }
  }

  // =================================================================
  // ROBES: sliding doors (one panel slid open) + fit-out
  // =================================================================
  function buildRobes() {
    const g = makeGroup('robes');
    const doorKey = S.robes?.door?.style === 'painted' ? 'woodwork' : 'robeDoor';
    const fitout = S.robes?.fitout?.fitout || 'standard';
    const H = 2.31;
    for (const r of house.plan.robes) {
      if (r.faceDir === 'x') {
        const x = r.x0;
        const mid = (r.z0 + r.z1) / 2;
        g.box(doorKey, x + 0.012, 0.03, r.z0, x + 0.032, H, mid + 0.02);
        g.box('handle', x + 0.032, 0.95, mid - 0.02, x + 0.04, 1.2, mid);
        g.box(doorKey, x + 0.038, 0.03, mid + 0.28, x + 0.058, H, r.z1);
        g.box('handle', x + 0.058, 0.95, mid + 0.28, x + 0.066, 1.2, mid + 0.3);
        fit(g, x - 0.56, r.z0 + 0.02, x - 0.02, r.z1 - 0.02, fitout, 'x');
      } else {
        const z = r.z0;
        const mid = (r.x0 + r.x1) / 2;
        g.box(doorKey, r.x0, 0.03, z + 0.012, mid + 0.02, H, z + 0.032);
        g.box('handle', mid - 0.02, 0.95, z + 0.032, mid, 1.2, z + 0.04);
        g.box(doorKey, mid + 0.28, 0.03, z + 0.038, r.x1, H, z + 0.058);
        g.box('handle', mid + 0.28, 0.95, z + 0.058, mid + 0.3, 1.2, z + 0.066);
        fit(g, r.x0 + 0.02, z - 0.56, r.x1 - 0.02, z - 0.02, fitout, 'z');
      }
    }
    g.finish();

    function fit(gr, x0, z0, x1, z1, kind, dir) {
      const mat = kind === 'custom' ? 'oakDark' : 'mel';
      gr.box(mat, x0, 1.78, z0, x1, 1.81, z1); // top shelf
      if (dir === 'x') gr.box('handle', x0 + 0.24, 1.66, z0, x0 + 0.268, 1.688, z1);
      else gr.box('handle', x0, 1.66, z0 + 0.24, x1, 1.688, z0 + 0.268);
      if (kind !== 'standard') {
        const cx = (x0 + x1) / 2;
        const cz = (z0 + z1) / 2;
        if (dir === 'x') {
          gr.box(mat, x0, 0.02, cz - 0.3, x1, 1.78, cz - 0.282);
          gr.box(mat, x0, 0.02, cz + 0.282, x1, 1.78, cz + 0.3);
          for (let y = 0.34; y < 1.72; y += 0.33) gr.box(mat, x0, y, cz - 0.282, x1, y + 0.018, cz + 0.282);
        } else {
          gr.box(mat, cx - 0.3, 0.02, z0, cx - 0.282, 1.78, z1);
          gr.box(mat, cx + 0.282, 0.02, z0, cx + 0.3, 1.78, z1);
          for (let y = 0.34; y < 1.72; y += 0.33) gr.box(mat, cx - 0.282, y, z0, cx + 0.282, y + 0.018, z1);
        }
      }
      const r = rng(3);
      for (let i = 0; i < 14; i++) {
        const t = (i + 0.5) / 14;
        const key = i % 3 ? 'linen' : 'fabricAccent';
        if (dir === 'x') {
          const z = z0 + t * (z1 - z0);
          if (kind !== 'standard' && Math.abs(z - (z0 + z1) / 2) < 0.32) continue;
          gr.box(key, x0 + 0.07, 0.94 + r() * 0.1, z, x1 - 0.07, 1.63, z + 0.032);
        } else {
          const x = x0 + t * (x1 - x0);
          if (kind !== 'standard' && Math.abs(x - (x0 + x1) / 2) < 0.32) continue;
          gr.box(key, x, 0.94 + r() * 0.1, z0 + 0.07, x + 0.032, 1.63, z1 - 0.07);
        }
      }
    }
  }

  // =================================================================
  // CABINETRY PRIMITIVES
  // =================================================================
  function cabinetRun(g, key, { x0, x1, z0, z1, y0 = 0, y1 = BENCH_H, face, profile, handle: hOpt, drawers = false, unit = 0.6 }) {
    const base = y0 + (y0 === 0 ? KICK_H : 0);
    g.box(key, x0, base, z0, x1, y1, z1);
    if (y0 === 0) {
      const kx0 = face === 'x-' ? x0 + KICK_IN : x0;
      const kx1 = face === 'x+' ? x1 - KICK_IN : x1;
      const kz0 = face === 'z-' ? z0 + KICK_IN : z0;
      const kz1 = face === 'z+' ? z1 - KICK_IN : z1;
      g.box('kick', kx0, 0.012, kz0, kx1, KICK_H, kz1);
    }
    const along = face === 'z-' || face === 'z+' ? 'x' : 'z';
    const s0 = along === 'x' ? x0 : z0;
    const s1 = along === 'x' ? x1 : z1;
    const n = Math.max(1, Math.round((s1 - s0) / unit));
    const rows = drawers ? (S['k-cabinets']?.drawers?.layout === 'bank' ? 4 : 3) : 1;
    for (let i = 0; i < n; i++) {
      const a = s0 + ((s1 - s0) * i) / n + 0.004;
      const b = s0 + ((s1 - s0) * (i + 1)) / n - 0.004;
      for (let r = 0; r < rows; r++) {
        const v0 = base + ((y1 - base) * r) / rows + 0.004;
        const v1 = base + ((y1 - base) * (r + 1)) / rows - 0.004;
        front(g, key, along, a, b, v0, v1, face, x0, x1, z0, z1, profile);
        if (hOpt) {
          const hy = drawers ? (v0 + v1) / 2 : Math.min(v1 - 0.1, base + 0.75);
          handleAt(g, along, (a + b) / 2, hy, face, x0, x1, z0, z1, hOpt, drawers ? (b - a) * 0.45 : 0);
        }
      }
    }
  }

  function front(g, key, along, a, b, v0, v1, face, x0, x1, z0, z1, profile) {
    const fd = 0.018;
    const out = face === 'z-' ? [z0 - fd, z0] : face === 'z+' ? [z1, z1 + fd] : face === 'x-' ? [x0 - fd, x0] : [x1, x1 + fd];
    const outward = face === 'z-' || face === 'x-' ? -1 : 1;
    const put = (aa, bb, w0, w1, d0, d1) => {
      if (along === 'x') g.box(key, aa, w0, d0, bb, w1, d1);
      else g.box(key, d0, w0, aa, d1, w1, bb);
    };
    put(a, b, v0, v1, out[0], out[1]);
    const p = profile?.profile;
    const facePlane = outward > 0 ? out[1] : out[0];
    if (p === 'shaker' || p === 'settler' || p === 'square') {
      const inset = p === 'settler' ? 0.055 : 0.075;
      const d = p === 'square' ? 0.004 : 0.007;
      if (b - a > inset * 2.4 && v1 - v0 > inset * 2.4) {
        put(a + inset, b - inset, v0 + inset, v1 - inset, facePlane, facePlane + outward * d);
      }
    } else if (p === 'vgroove') {
      for (let u = a + 0.05; u < b - 0.03; u += 0.068) {
        put(u, u + 0.009, v0 + 0.012, v1 - 0.012, facePlane, facePlane + outward * 0.005);
      }
    }
  }

  function handleAt(g, along, at, y, face, x0, x1, z0, z1, hOpt, span = 0) {
    const shape = hOpt.shape || 'bar';
    const outward = face === 'z-' || face === 'x-' ? -1 : 1;
    const base = face === 'z-' ? z0 - 0.019 : face === 'z+' ? z1 + 0.019 : face === 'x-' ? x0 - 0.019 : x1 + 0.019;
    const D = (d) => base + outward * d;
    const put = (u0, u1, v0, v1, d0, d1) => {
      if (along === 'x') g.box('handle', u0, v0, d0, u1, v1, d1);
      else g.box('handle', d0, v0, u0, d1, v1, u1);
    };
    if (shape === 'finger') {
      put(at - Math.max(0.16, span), at + Math.max(0.16, span), y + 0.02, y + 0.052, D(0), D(0.012));
      return;
    }
    if (shape === 'knob') {
      put(at - 0.007, at + 0.007, y - 0.007, y + 0.007, D(0), D(0.022));
      put(at - 0.018, at + 0.018, y - 0.018, y + 0.018, D(0.022), D(0.042));
      return;
    }
    const half = Math.max(hOpt.len || 0.12, span) / 2;
    if (shape === 'cup' || shape === 'bow') {
      put(at - half, at + half, y - 0.013, y + 0.013, D(0.018), D(0.032));
      put(at - half, at - half + 0.018, y - 0.022, y + 0.022, D(0), D(0.02));
      put(at + half - 0.018, at + half, y - 0.022, y + 0.022, D(0), D(0.02));
    } else {
      put(at - half, at + half, y - 0.009, y + 0.009, D(0.022), D(0.04));
      put(at - half, at - half + 0.016, y - 0.008, y + 0.008, D(0), D(0.024));
      put(at + half - 0.016, at + half, y - 0.008, y + 0.008, D(0), D(0.024));
    }
  }

  // =================================================================
  // KITCHEN + WALK-IN PANTRY + STORAGE (Ground Floor Plan)
  // =================================================================
  function buildKitchen() {
    const g = makeGroup('kitchen');
    const profile = S['k-cabinets']?.profile;
    const hOpt = S['k-handles']?.handle;
    const stoneT = S['k-benchtop']?.style?.thick ?? 0.02;
    const waterfall = !!S['k-benchtop']?.style?.waterfall;
    const oh = S['k-cabinets']?.overheads?.kind || 'full';
    const rh = S['k-cooking']?.rangehood;
    const setup = S['k-cooking']?.setup?.id;

    // ---- back bench (cooktop run) between the two nib walls
    cabinetRun(g, 'kCab', { x0: K.wall, x1: K.benchFront, z0: K.benchZ0, z1: K.benchZ1, face: 'x+', profile, handle: hOpt, drawers: true });
    g.box('kStone', K.wall, BENCH_H, K.benchZ0, K.benchFront + 0.02, BENCH_H + stoneT, K.benchZ1);
    g.box('splash', K.wall, BENCH_H + stoneT, K.benchZ0, K.wall + 0.016, 1.05, K.benchZ1);

    // ---- walk-in pantry bench, standard 1 3/4 bowl sink under the window
    cabinetRun(g, 'kCab', { x0: K.wall, x1: K.benchFront, z0: K.pantryZ0, z1: K.pantryZ1, face: 'x+', profile, handle: hOpt });
    const pSink = { bowls: 1.75, mount: 'inset', mat: 'stainless' };
    benchTop(g, 'kStone', K.wall, BENCH_H, K.pantryZ0, K.benchFront + 0.02, BENCH_H + stoneT, K.pantryZ1,
      sinkRect(pSink, K.pantrySink.x, K.pantrySink.z, 'x'));
    g.box('splash', K.wall, BENCH_H + stoneT, K.pantryZ0, K.wall + 0.016, 1.05, K.pantryZ1);
    sinkAt(g, K.pantrySink.x, K.pantrySink.z, pSink, stoneT, 'x');
    mixerAt(g, K.wall + 0.11, K.pantrySink.z, { shape: 'gooseneck' }, BENCH_H + stoneT, 'x');

    // ---- island 3237 x 1000 with a 400 breakfast overhang
    const iz0 = K.islandZ0;
    const iz1 = K.islandZ1;
    cabinetRun(g, 'kIsland', { x0: K.islandX0, x1: K.islandX1, z0: iz0, z1: iz0 + BENCH_D, face: 'z-', profile, handle: hOpt, drawers: true });
    g.box('kIsland', K.islandX0, KICK_H, iz0 + BENCH_D, K.islandX1, BENCH_H, iz0 + BENCH_D + 0.02); // panelled back
    const kSink = S['k-sink']?.sink || { bowls: 1.75, mount: 'inset', mat: 'stainless' };
    benchTop(g, 'kStone', K.islandX0 - (waterfall ? 0.022 : 0.012), BENCH_H, iz0 - 0.022,
      K.islandX1 + (waterfall ? 0.022 : 0.012), BENCH_H + stoneT, iz1,
      sinkRect(kSink, K.sink.x, K.sink.z, 'z'));
    if (waterfall) {
      g.box('kStone', K.islandX0 - 0.022, 0.012, iz0 - 0.022, K.islandX0, BENCH_H + stoneT, iz1);
      g.box('kStone', K.islandX1, 0.012, iz0 - 0.022, K.islandX1 + 0.022, BENCH_H + stoneT, iz1);
    }
    sinkAt(g, K.sink.x, K.sink.z, kSink, stoneT, 'z');
    mixerAt(g, K.sink.x, K.sink.z + 0.30, S['k-sink']?.mixer || {}, BENCH_H + stoneT, 'z');
    const dw = S['k-appliances']?.dishwasher;
    if (dw && dw.kind !== 'none') {
      const dx0 = K.sink.x + 0.46;
      const key = dw.kind === 'integrated' ? 'kIsland' : dw.kind === 'black' ? 'appBlack' : 'appSS';
      g.box(key, dx0, KICK_H, iz0 - 0.02, dx0 + 0.6, BENCH_H - 0.02, iz0 + 0.02);
      if (dw.kind !== 'integrated') g.box('handle', dx0 + 0.05, BENCH_H - 0.14, iz0 - 0.055, dx0 + 0.55, BENCH_H - 0.1, iz0 - 0.03);
      else if (hOpt) handleAt(g, 'x', dx0 + 0.3, BENCH_H - 0.14, 'z-', dx0, dx0 + 0.6, iz0 - 0.02, iz0 + 0.02, hOpt, 0.25);
    }

    // ---- tall run: pantry cupboards -> oven tower -> fridge
    const TALL_Y = 2.45;
    cabinetRun(g, 'kCab', { x0: K.colX1 - 2.157, x1: K.colX1, z0: K.colZ0, z1: K.colZ1, y1: TALL_Y, face: 'z+', profile, handle: hOpt });
    ovenTower(g, TALL_Y, profile, hOpt, setup);
    fridge(g, TALL_Y, profile, hOpt);

    // ---- overhead cupboards over the bench, either side of the window
    if (oh !== 'none') {
      const segs = [[K.benchZ0, K.winKitchen[0] - 0.03], [K.winKitchen[1] + 0.03, K.benchZ1]];
      for (const [a, b] of segs) {
        if (b - a < 0.2) continue;
        if (oh === 'open') {
          for (const y of [1.78, 2.14]) g.box('oak', K.wall, y, a, K.wall + OVER_D, y + 0.035, b);
        } else {
          cabinetRun(g, 'kOver', {
            x0: K.wall, x1: K.wall + OVER_D, z0: a, z1: b, y0: OVER_Y0, y1: OVER_Y1,
            face: 'x+', profile, handle: hOpt, unit: oh === 'two' ? (b - a) / 2 : 0.5,
          });
        }
      }
      if (oh !== 'open' && rh?.kind !== 'canopy') {
        cabinetRun(g, 'kOver', {
          x0: K.wall, x1: K.wall + OVER_D, z0: K.winKitchen[0] - 0.03, z1: K.winKitchen[1] + 0.03,
          y0: 1.72, y1: OVER_Y1, face: 'x+', profile, handle: hOpt,
        });
      }
      g.box('ceil', K.wall, OVER_Y1, K.benchZ0, K.wall + OVER_D, CEIL, K.benchZ1); // bulkhead
    }

    // ---- cooking
    const cz = K.cooktopZ;
    if (setup === 'cs-freestanding') {
      const w = 0.9;
      g.box('cooker', K.wall + 0.02, 0.02, cz - w / 2, K.wall + 0.66, 0.92, cz + w / 2);
      g.box('appGlass', K.wall + 0.03, 0.26, cz - w / 2 + 0.06, K.wall + 0.05, 0.76, cz + w / 2 - 0.06);
      g.box('appSS', K.wall + 0.02, 0.9, cz - w / 2, K.wall + 0.64, 0.93, cz + w / 2);
      for (let i = 0; i < 5; i++) g.box('handle', K.wall + 0.02, 0.84, cz - 0.38 + i * 0.19, K.wall + 0.05, 0.88, cz - 0.31 + i * 0.19);
      g.box('appSS', K.wall - 0.02, 0.79, cz - w / 2 + 0.04, K.wall + 0.02, 0.83, cz + w / 2 - 0.04);
      for (const zz of [-0.3, -0.1, 0.1, 0.3]) {
        g.add(cylinder(scene, 0.03, 0.15, 0.17, { x: K.wall + 0.3, y: 0.945, z: cz + zz }), 'appBlack');
      }
    } else if (S['k-cooking']?.cooktop) {
      const ct = S['k-cooking'].cooktop;
      const w = ct.w || 0.6;
      g.box('appGlass', K.wall + 0.06, BENCH_H + stoneT, cz - w / 2, K.wall + 0.58, BENCH_H + stoneT + 0.007, cz + w / 2);
      if (ct.kind === 'gas') {
        for (const zz of [-0.32, -0.11, 0.11, 0.32]) {
          const bx = K.wall + (Math.abs(zz) > 0.2 ? 0.2 : 0.4);
          const bz = cz + zz * (w / 0.9);
          g.box('appSS', bx - 0.09, BENCH_H + stoneT + 0.006, bz - 0.09, bx + 0.09, BENCH_H + stoneT + 0.018, bz + 0.09);
          g.add(cylinder(scene, 0.028, 0.1, 0.13, { x: bx, y: BENCH_H + stoneT + 0.03, z: bz }), 'appBlack');
        }
      }
    }
    if (rh) {
      const w = rh.w || 0.6;
      if (rh.kind === 'canopy') {
        g.box(rh.dark ? 'appBlack' : 'appSS', K.wall + 0.02, 1.72, cz - w / 2, K.wall + 0.54, 1.85, cz + w / 2);
        g.box(rh.dark ? 'appBlack' : 'appSS', K.wall + 0.02, 1.85, cz - 0.14, K.wall + 0.28, CEIL, cz + 0.14);
      } else if (rh.kind === 'slideout') {
        g.box('appSS', K.wall + 0.02, 1.62, cz - w / 2, K.wall + 0.34, 1.72, cz + w / 2);
        g.box('appSS', K.wall + 0.34, 1.64, cz - w / 2, K.wall + 0.46, 1.69, cz + w / 2);
      } else {
        g.box('appSS', K.wall + 0.03, 1.66, cz - w / 2, K.wall + 0.32, 1.73, cz + w / 2);
      }
    }

    // ---- walk-in pantry L-shelving + storage room shelves
    for (let y = 0.42; y <= 1.95; y += 0.5) {
      g.box('mel', K.pantryDiv - 0.5, y, K.pantryZ0, K.pantryDiv, y + 0.024, K.pantryZ1);
      g.box('mel', -3.84, y, K.pantryZ0, K.pantryDiv - 0.5, y + 0.024, K.pantryZ0 + 0.5);
    }
    g.box('mel', K.pantryDiv - 0.5, BENCH_H, K.pantryZ0, K.pantryDiv, BENCH_H + 0.03, K.pantryZ1);
    for (let y = 0.45; y <= 1.95; y += 0.48) {
      g.box('mel', K.storageX[0], y, K.storageZ[0] + 0.05, K.storageX[0] + 0.4, y + 0.024, K.storageZ[1] - 0.05);
    }

    // ---- stools + pendants
    for (const sx of [-1.25, -2.15, -3.05]) stool(g, sx, iz1 + 0.35);
    for (const sx of [-1.35, -2.3, -3.25]) pendant(g, sx, (iz0 + iz1) / 2 - 0.05);

    g.finish();
  }

  function ovenTower(g, TALL_Y, profile, hOpt, setup) {
    const [x0, x1] = K.ovenX;
    const z0 = K.colZ0;
    const z1 = K.colZ1;
    g.box('kCab', x0, KICK_H, z0, x1, TALL_Y, z1);
    g.box('kick', x0, 0.012, z0, x1, KICK_H, z1 - KICK_IN);
    const oven = S['k-cooking']?.oven;
    const mw = S['k-appliances']?.microwave;
    let y = 0.86;
    if (setup !== 'cs-freestanding' && oven) {
      const h = oven.w >= 0.9 ? 0.5 : 0.6;
      g.box(oven.face === 'stainless' ? 'appSS' : 'appBlack', x0 + 0.012, y, z1 - 0.012, x1 - 0.012, y + h, z1 + 0.018);
      g.box('appGlass', x0 + 0.055, y + 0.1, z1 + 0.018, x1 - 0.055, y + h - 0.1, z1 + 0.026);
      g.box('handle', x0 + 0.04, y + h - 0.075, z1 + 0.018, x1 - 0.04, y + h - 0.04, z1 + 0.055);
      y += h + 0.02;
    }
    if (mw?.kind === 'builtin') {
      g.box('appSS', x0 + 0.012, y, z1 - 0.012, x1 - 0.012, y + 0.42, z1 + 0.016);
      g.box('appGlass', x0 + 0.05, y + 0.06, z1 + 0.016, x1 - 0.17, y + 0.34, z1 + 0.022);
      y += 0.44;
    }
    cabinetRun(g, 'kCab', { x0, x1, z0, z1, y0: Math.max(y, 1.6), y1: TALL_Y, face: 'z+', profile, handle: hOpt });
  }

  function fridge(g, TALL_Y, profile, hOpt) {
    const [x0, x1] = K.fridgeX;
    const z0 = K.colZ0;
    const z1 = K.colZ1;
    const fr = S['k-appliances']?.fridge;
    if (fr?.kind === 'integrated') {
      cabinetRun(g, 'kCab', { x0, x1, z0, z1, y0: 0, y1: TALL_Y, face: 'z+', profile, handle: hOpt, unit: (x1 - x0) / 2 });
      return;
    }
    const mid = (x0 + x1) / 2;
    g.box('appSS', x0 + 0.02, 0.02, z0 + 0.02, x1 - 0.02, 1.86, z1 + 0.12);
    g.box('appBlack', x0 + 0.03, 0.04, z1 + 0.12, x1 - 0.03, 1.18, z1 + 0.15); // freezer drawer
    g.box('appBlack', x0 + 0.03, 1.21, z1 + 0.12, mid - 0.006, 1.84, z1 + 0.15);
    g.box('appBlack', mid + 0.006, 1.21, z1 + 0.12, x1 - 0.03, 1.84, z1 + 0.15);
    g.box('handle', mid - 0.09, 1.32, z1 + 0.15, mid - 0.068, 1.76, z1 + 0.19);
    g.box('handle', mid + 0.068, 1.32, z1 + 0.15, mid + 0.09, 1.76, z1 + 0.19);
    g.box('handle', x0 + 0.12, 0.86, z1 + 0.15, x0 + 0.142, 1.1, z1 + 0.19);
    cabinetRun(g, 'kCab', { x0, x1, z0, z1, y0: 1.92, y1: TALL_Y, face: 'z+', profile, handle: hOpt, unit: (x1 - x0) / 2 });
  }

  // Benchtop with the sink/basin cut-out left open.
  function benchTop(g, key, x0, y0, z0, x1, y1, z1, hole) {
    if (!hole) {
      g.box(key, x0, y0, z0, x1, y1, z1);
      return;
    }
    const [hx0, hz0, hx1, hz1] = hole;
    const put = (a, b, c, d) => {
      if (b - a > 0.004 && d - c > 0.004) g.box(key, a, y0, c, b, y1, d);
    };
    put(x0, x1, z0, Math.max(z0, hz0));
    put(x0, x1, Math.min(z1, hz1), z1);
    put(x0, Math.max(x0, hx0), Math.max(z0, hz0), Math.min(z1, hz1));
    put(Math.min(x1, hx1), x1, Math.max(z0, hz0), Math.min(z1, hz1));
  }

  // Footprint of a sink, so the benchtop can be cut around it.
  function sinkRect(sink, x, z, axis = 'z') {
    const bowls = sink.bowls || 1;
    const long = sink.w || (bowls >= 1.75 ? 0.82 : 0.5);
    const w = axis === 'x' ? 0.42 : long;
    const d = axis === 'x' ? long : 0.42;
    return [x - w / 2, z - d / 2, x + w / 2, z + d / 2];
  }

  // Sink cut into a benchtop. axis 'z' -> bowls run along X, 'x' -> along Z.
  function sinkAt(g, x, z, sink, stoneT, axis = 'z') {
    const y = BENCH_H + stoneT;
    const bowls = sink.bowls || 1;
    const long = sink.w || (bowls >= 1.75 ? 0.82 : 0.5);
    const w = axis === 'x' ? 0.42 : long;
    const d = axis === 'x' ? long : 0.42;
    const mat = sink.mat === 'ceramic' || sink.mat === 'granite-white' ? 'porcelain' : sink.mat === 'granite-black' ? 'appBlack' : 'sink';
    const depth = 0.19;
    const t = 0.012;
    const x0 = x - w / 2;
    const x1 = x + w / 2;
    const z0 = z - d / 2;
    const z1 = z + d / 2;
    if (sink.mount === 'over' || sink.mount === 'inset') {
      const r = sink.mount === 'over' ? 0.016 : 0.008;
      g.box(mat, x0 - r, y, z0 - r, x1 + r, y + 0.007, z0 + 0.004);
      g.box(mat, x0 - r, y, z1 - 0.004, x1 + r, y + 0.007, z1 + r);
      g.box(mat, x0 - r, y, z0 - r, x0 + 0.004, y + 0.007, z1 + r);
      g.box(mat, x1 - 0.004, y, z0 - r, x1 + r, y + 0.007, z1 + r);
    }
    g.box(mat, x0, y - depth, z0, x1, y - depth + t, z1);
    g.box(mat, x0, y - depth, z0, x0 + t, y, z1);
    g.box(mat, x1 - t, y - depth, z0, x1, y, z1);
    g.box(mat, x0, y - depth, z0, x1, y, z0 + t);
    g.box(mat, x0, y - depth, z1 - t, x1, y, z1);
    if (bowls >= 2) {
      if (axis === 'z') g.box(mat, x - t / 2, y - depth, z0, x + t / 2, y, z1);
      else g.box(mat, x0, y - depth, z - t / 2, x1, y, z + t / 2);
    } else if (bowls === 1.75) {
      if (axis === 'z') g.box(mat, x1 - 0.24 - t / 2, y - depth * 0.55, z0, x1 - 0.24 + t / 2, y, z1);
      else g.box(mat, x0, y - depth * 0.55, z1 - 0.24 - t / 2, x1, y, z1 - 0.24 + t / 2);
    }
    if (sink.mount === 'farmhouse' || sink.mount === 'butler') {
      if (axis === 'z') g.box(mat, x0 - 0.02, y - 0.44, z0 - 0.03, x1 + 0.02, y, z0 + 0.02);
      else g.box(mat, x0 - 0.03, y - 0.44, z0 - 0.02, x0 + 0.02, y, z1 + 0.02);
    }
    g.add(place(cylinder(scene, 0.02, 0.09, 0.09), x, y - depth + 0.02, z), mat === 'sink' ? 'sink' : 'mixer');
  }

  function mixerAt(g, x, z, mixer, y, axis = 'x') {
    const shape = mixer.shape || 'gooseneck';
    g.add(place(cylinder(scene, 0.03, 0.055, 0.06), x, y + 0.015, z), 'mixer');
    const dx = axis === 'x' ? 1 : 0;
    const dz = axis === 'x' ? 0 : 1;
    if (shape === 'spring' || shape === 'pullout') {
      g.add(place(cylinder(scene, 0.34, 0.032, 0.034), x, y + 0.2, z), 'mixer');
      g.add(tube(scene, [
        [x, y + 0.37, z],
        [x + dx * 0.05, y + 0.43, z + dz * 0.05],
        [x + dx * 0.13, y + 0.41, z + dz * 0.13],
      ], 0.017, 10), 'mixer');
      g.add(place(cylinder(scene, 0.1, 0.038, 0.042), x + dx * 0.13, y + 0.34, z + dz * 0.13), 'mixer');
    } else {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const bend = Math.max(0, (t - 0.5) / 0.5) ** 1.5 * 0.17;
        pts.push([x + dx * bend, y + 0.05 + t * 0.32 - bend * 0.3, z + dz * bend]);
      }
      g.add(tube(scene, pts, shape === 'square' ? 0.019 : 0.016, 10), 'mixer');
      const lev = cylinder(scene, 0.09, 0.015, 0.017, { rot: [dz ? Math.PI / 2.3 : 0, 0, dx ? Math.PI / 2.3 : 0] });
      g.add(place(lev, x - dx * 0.04, y + 0.13, z - dz * 0.04), 'mixer');
    }
  }

  function stool(g, x, z) {
    const seat = roundedBox(scene, 0.36, 0.07, 0.34, 0.03, 4);
    place(seat, x, 0.665, z);
    g.add(seat, 'oak');
    for (const [dx, dz] of [[-0.14, -0.13], [0.14, -0.13], [-0.14, 0.13], [0.14, 0.13]]) {
      g.add(cylinder(scene, 0.63, 0.024, 0.03, { x: x + dx, y: 0.315, z: z + dz }), 'blackMetal');
    }
    const ring = MeshBuilder.CreateTorus('stool-ring', { diameter: 0.31, thickness: 0.016, tessellation: 14 }, scene);
    place(ring, x, 0.22, z);
    g.add(ring, 'blackMetal');
  }

  function pendant(g, x, z) {
    g.add(place(cylinder(scene, 0.86, 0.008, 0.008), x, CEIL - 0.44, z), 'blackMetal');
    g.add(place(cylinder(scene, 0.02, 0.09, 0.09), x, CEIL - 0.012, z), 'blackMetal');
    const shade = lathe(scene, [[0.004, 0.24], [0.075, 0.15], [0.115, 0.02], [0.118, 0.0]], { tess: 22 });
    place(shade, x, 1.7, z);
    g.add(shade, 'blackMetal');
    g.add(sphere(scene, 0.09, { x, y: 1.73, z }), 'led');
  }

  // =================================================================
  // ENSUITE, MAIN BATHROOM, WC
  // =================================================================
  function buildBath() {
    const g = makeGroup('bath');
    const stoneT = S['b-benchtop']?.edge?.thick ?? 0.02;
    const acc = S['b-accessories'];

    // --- Ensuite: vanity on the laundry wall, shower + toilet on the outer wall
    vanity(g, { x0: 2.86, x1: 4.06, zWall: ENS.z1, dir: -1, stoneT });
    shower(g, { x0: 4.22, x1: ENS.x1, z0: -5.12, z1: ENS.z1 - 0.02, head: S['b-shower']?.ensuite });
    toiletAt(g, ENS.x1, -5.62, -1, S['b-toilet']);
    towelRail(g, 'x', 2.45, ENS.z1, -1, acc);
    // walk-in robe shelving on the hallway side of the ensuite zone
    for (let y = 0.5; y <= 1.95; y += 0.46) g.box('mel', ENS.x0, y, -5.93, ENS.x0 + 0.55, y + 0.024, -4.62);
    g.box('handle', ENS.x0 + 0.26, 1.70, -5.93, ENS.x0 + 0.288, 1.728, -4.62);

    // --- Main bathroom: bath along the outer wall, vanity beside it, shower in the corner
    bathTub(g, S['b-bath']?.bath, BATH.x0 + 0.05, BATH.z0 + 0.04, S['b-bath']?.tap);
    vanity(g, { x0: 2.44, x1: 3.64, zWall: BATH.z1, dir: -1, stoneT });
    shower(g, { x0: 4.28, x1: BATH.x1, z0: BATH.z0 + 0.02, z1: BATH.z1 - 0.02, head: S['b-shower']?.main });
    towelRail(g, 'x', 4.05, BATH.z1, -1, acc);

    // --- Separate WC
    toiletAt(g, WC.x1, 7.32, -1, S['b-toilet']);
    g.box('acc', WC.x1 - 0.13, 0.72, 6.98, WC.x1 - 0.02, 0.79, 7.06); // roll holder
    g.box('mirror', WC.x0 + 0.1, 1.2, WC.z1 - 0.018, WC.x0 + 0.62, 1.8, WC.z1 - 0.008);

    // --- Linen cupboard shelves (between the bathroom and the hall)
    for (let y = 0.45; y <= 2.0; y += 0.42) g.box('mel', 1.79, y, 5.19, 2.29, y + 0.022, 6.6);

    g.finish();
  }

  function vanity(g, { x0, x1, zWall, dir, stoneT }) {
    const v = S['b-vanity'];
    const style = v?.style?.style || 'wall';
    const d = 0.46;
    const z0 = dir < 0 ? zWall - d : zWall;
    const z1 = dir < 0 ? zWall : zWall + d;
    const y0 = style === 'wall' || style === 'drawers' ? 0.36 : 0.0;
    const top = 0.85;
    cabinetRun(g, 'vCab', {
      x0, x1, z0, z1, y0, y1: top, face: dir < 0 ? 'z-' : 'z+',
      profile: v?.profile, handle: v?.handle, drawers: style === 'drawers', unit: (x1 - x0) / 2,
    });
    if (style === 'shelf') {
      const cx = (x0 + x1) / 2;
      g.box('vCab', cx - 0.22, 0.0, z0, cx + 0.22, top, z1 - 0.1);
      for (const yy of [0.32, 0.56]) g.box('oak', cx - 0.2, yy, z0 + 0.02, cx + 0.2, yy + 0.022, z1 - 0.12);
    }
    const bx = (x0 + x1) / 2;
    const bz = (z0 + z1) / 2;
    const basin = S['b-basin']?.basin;
    const inset = (basin?.mount || 'inset') !== 'above';
    benchTop(g, 'vStone', x0 - 0.012, top, z0, x1 + 0.012, top + stoneT, z1,
      inset ? [bx - 0.23, bz - 0.185, bx + 0.23, bz + 0.185] : null);
    basinAt(g, bx, bz, top + stoneT, basin);
    const tapType = S['b-basin']?.tapType;
    if (tapType?.mount === 'wall') {
      const zt = dir < 0 ? zWall - 0.012 : zWall + 0.012;
      g.box('tap', bx - 0.075, 1.09, Math.min(zt, zt + dir * 0.035), bx + 0.075, 1.155, Math.max(zt, zt + dir * 0.035));
      g.add(place(cylinder(scene, 0.17, 0.026, 0.028, { rot: [Math.PI / 2, 0, 0] }), bx, 1.122, zt + dir * 0.085), 'tap');
    } else {
      mixerAt(g, bx, bz - dir * 0.165, { shape: S['b-basin']?.range?.style === 'square' ? 'square' : 'gooseneck' }, top + stoneT, 'z');
    }
    // mirror
    const mw = Math.min(x1 - x0, 1.2);
    const shape = S['b-accessories']?.mirror?.shape || 'rect';
    const zm = dir < 0 ? zWall - 0.018 : zWall + 0.018;
    if (shape === 'round' || shape === 'arch') {
      const disc = MeshBuilder.CreateCylinder('mirror-disc', { height: 0.02, diameter: Math.min(0.78, mw), tessellation: 32 }, scene);
      disc.rotation.x = Math.PI / 2;
      place(disc, bx, shape === 'arch' ? 1.62 : 1.5, zm);
      g.add(disc, 'mirror');
      if (shape === 'arch') g.box('mirror', bx - Math.min(0.39, mw / 2), 1.08, zm - 0.008, bx + Math.min(0.39, mw / 2), 1.62, zm + 0.008);
    } else {
      const r = shape === 'curved' ? 0.06 : 0;
      g.box('mirror', bx - mw / 2 + r, 1.05, zm - 0.008, bx + mw / 2 - r, 1.95, zm + 0.008);
      if (r) g.box('mirror', bx - mw / 2, 1.05 + r, zm - 0.008, bx + mw / 2, 1.95 - r, zm + 0.008);
    }
  }

  function basinAt(g, x, z, y, basin) {
    const shape = basin?.shape || 'round';
    const mount = basin?.mount || 'inset';
    IM.basin.albedoColor = lin(basin?.colour || basin?.hex || '#ffffff');
    if (mount === 'above') {
      const prof = shape === 'oval' || shape === 'pill'
        ? [[0.0, 0.135], [0.2, 0.135], [0.21, 0.115], [0.185, 0.0], [0.0, 0.0]]
        : [[0.0, 0.125], [0.18, 0.125], [0.19, 0.105], [0.165, 0.0], [0.0, 0.0]];
      const m = lathe(scene, prof, { tess: 28, sx: shape === 'oval' || shape === 'pill' ? 1.4 : 1 });
      place(m, x, y, z);
      g.add(m, 'basin');
      g.add(place(cylinder(scene, 0.016, 0.045, 0.045), x, y + 0.012, z), 'tap');
    } else {
      const m = lathe(scene, [[0.0, 0.0], [0.195, 0.0], [0.2, -0.02], [0.17, -0.14], [0.0, -0.15]], {
        tess: 28, sx: shape === 'square' ? 1.18 : 1.25,
      });
      place(m, x, y + 0.002, z);
      g.add(m, 'basin');
      if (shape === 'square') g.box('basin', x - 0.235, y - 0.006, z - 0.19, x + 0.235, y + 0.006, z + 0.19);
      g.add(place(cylinder(scene, 0.016, 0.045, 0.045), x, y - 0.138, z), 'tap');
    }
  }

  function shower(g, { x0, x1, z0, z1, head }) {
    const kind = head?.kind || 'single';
    g.box('wetTile', x0, 0.031, z0, x1, 0.041, z1); // tiled shower floor
    // semi-frameless screen: fixed panel + return, door gap left open
    g.box('screenFrame', x0 - 0.022, 0.03, z0, x0, 2.0, z1);
    g.box('screenGlass', x0 - 0.014, 0.04, z0 + 0.02, x0 - 0.006, 1.98, z1 - 0.62);
    g.box('screenFrame', x0 - 0.022, 0.03, z1 - 0.65, x0, 2.0, z1 - 0.61);
    g.box('screenGlass', x0 - 0.014, 0.04, z0 + 0.02, x1 - 0.02, 1.98, z0 + 0.028);
    const cx = (x0 + x1) / 2;
    const zr = z0 + 0.42;
    if (kind === 'ceiling') {
      g.add(place(cylinder(scene, 0.3, 0.022, 0.022), cx, CEIL - 0.16, (z0 + z1) / 2), 'shower');
      g.add(place(cylinder(scene, 0.02, 0.23, 0.23, { tess: 24 }), cx, CEIL - 0.31, (z0 + z1) / 2), 'shower');
    } else {
      g.box('shower', x1 - 0.115, 0.95, zr, x1 - 0.085, 1.96, zr + 0.032); // slide rail
      g.add(place(cylinder(scene, 0.03, 0.1, 0.1, { rot: [0, 0, Math.PI / 2] }), x1 - 0.1, 1.56, zr + 0.06), 'shower');
      g.add(place(cylinder(scene, 0.11, 0.028, 0.028, { rot: [0, 0, Math.PI / 2.6] }), x1 - 0.16, 1.5, zr + 0.06), 'shower');
      if (kind === 'twin') {
        g.box('shower', x1 - 0.115, 1.96, zr, x1 - 0.055, 2.01, zr + 0.032);
        g.add(place(cylinder(scene, 0.016, 0.2, 0.2, { tess: 20, rot: [0.22, 0, 0] }), x1 - 0.34, 1.99, zr + 0.03), 'shower');
      }
      g.add(place(cylinder(scene, 0.045, 0.085, 0.085, { rot: [0, 0, Math.PI / 2] }), x1 - 0.022, 1.1, zr + 0.4), 'shower'); // mixer
    }
    g.box('shower', cx - 0.05, 0.038, (z0 + z1) / 2 - 0.05, cx + 0.05, 0.044, (z0 + z1) / 2 + 0.05); // floor waste
  }

  // The bath sits along the outer wall of the main bathroom (a 1500 deep room),
  // so its length runs along X and its width along Z.
  function bathTub(g, bath, x0, z0, tap) {
    const kind = bath?.kind || 'free';
    const len = Math.min(bath?.len || 1.6, 1.5);
    const w = 0.74;
    IM.bath.albedoColor = lin(bath?.colour || '#ffffff');
    const cx = x0 + len / 2;
    const cz = z0 + w / 2;
    const prof = [[0.0, 0.0], [0.46, 0.0], [0.5, 0.05], [0.5, 0.55], [0.47, 0.58], [0.44, 0.55], [0.42, 0.1], [0.0, 0.08]];
    const m = lathe(scene, prof, { tess: 30, sx: len / 1.0, sz: w / 1.0 });
    place(m, cx, 0.02, cz);
    g.add(m, 'bath');
    if (kind === 'btw') g.box('bath', cx - len / 2, 0.02, z0 - 0.06, cx + len / 2, 0.6, z0 + 0.04);
    if (tap?.mount === 'floor') {
      g.add(place(cylinder(scene, 0.86, 0.03, 0.05), cx - len / 2 - 0.16, 0.43, cz + 0.42), 'tap');
      g.add(tube(scene, [
        [cx - len / 2 - 0.16, 0.86, cz + 0.42],
        [cx - len / 2 - 0.10, 0.95, cz + 0.42],
        [cx - len / 2 + 0.04, 0.93, cz + 0.42],
      ], 0.019, 10), 'tap');
    } else {
      g.box('tap', cx - len / 2 - 0.06, 0.76, cz - 0.07, cx - len / 2 - 0.045, 0.83, cz + 0.07);
      g.add(place(cylinder(scene, 0.19, 0.025, 0.025, { rot: [0, 0, Math.PI / 2] }), cx - len / 2 + 0.05, 0.795, cz), 'tap');
    }
    g.box('towel', cx + len / 2 - 0.30, 0.3, cz - 0.36, cx + len / 2 - 0.04, 0.62, cz - 0.2);
  }

  // dir -1 -> the suite stands against a wall at +X and faces -X
  function toiletAt(g, xWall, z, dir, sel) {
    const kind = sel?.suite?.kind || 'coupled';
    const back = xWall + dir * 0.01;
    const pan = lathe(scene, [[0.0, 0.0], [0.14, 0.02], [0.16, 0.2], [0.185, 0.38], [0.2, 0.4], [0.0, 0.4]], { tess: 22, sz: 1.35 });
    place(pan, back + dir * 0.33, 0.0, z);
    g.add(pan, 'porcelain');
    const seat = roundedBox(scene, 0.4, 0.035, 0.5, 0.016, 3);
    place(seat, back + dir * 0.33, 0.425, z);
    g.add(seat, 'porcelain');
    const lid = roundedBox(scene, 0.12, 0.03, 0.46, 0.014, 3);
    place(lid, back + dir * 0.13, 0.45, z);
    g.add(lid, 'porcelain');
    if (kind === 'inwall') {
      g.box('porcelain', Math.min(back, back + dir * 0.2), 0.0, z - 0.3, Math.max(back, back + dir * 0.2), 1.1, z + 0.3);
      g.box('acc', Math.min(back + dir * 0.2, back + dir * 0.215), 0.9, z - 0.11, Math.max(back + dir * 0.2, back + dir * 0.215), 1.05, z + 0.11);
    } else {
      g.box('porcelain', Math.min(back, back + dir * 0.22), 0.4, z - 0.2, Math.max(back, back + dir * 0.22), 0.82, z + 0.2);
      g.add(place(cylinder(scene, 0.02, 0.07, 0.07), back + dir * 0.11, 0.83, z), 'acc');
    }
  }

  function towelRail(g, axis, at, wallPos, dir, acc) {
    const style = acc?.range?.style || 'round';
    const put = (a, b, y0, y1, o0, o1) => {
      const d0 = Math.min(wallPos + dir * o0, wallPos + dir * o1);
      const d1 = Math.max(wallPos + dir * o0, wallPos + dir * o1);
      if (axis === 'x') g.box('acc', a, y0, d0, b, y1, d1);
      else g.box('acc', d0, y0, a, d1, y1, b);
    };
    const towel = (a, b, y0, y1) => {
      const d0 = Math.min(wallPos + dir * 0.02, wallPos + dir * 0.075);
      const d1 = Math.max(wallPos + dir * 0.02, wallPos + dir * 0.075);
      if (axis === 'x') g.box('towel', a, y0, d0, b, y1, d1);
      else g.box('towel', d0, y0, a, d1, y1, b);
    };
    if (style === 'ladder') {
      put(at - 0.28, at - 0.25, 0.9, 1.66, 0.005, 0.04);
      put(at + 0.25, at + 0.28, 0.9, 1.66, 0.005, 0.04);
      for (let y = 0.98; y < 1.66; y += 0.17) put(at - 0.28, at + 0.28, y, y + 0.022, 0.01, 0.055);
      towel(at - 0.2, at + 0.04, 0.98, 1.44);
    } else {
      put(at - 0.3, at + 0.3, 1.19, 1.215, 0.02, 0.055);
      put(at - 0.3, at + 0.3, 1.13, 1.155, 0.04, 0.075);
      put(at - 0.3, at - 0.27, 1.13, 1.22, 0.005, 0.075);
      put(at + 0.27, at + 0.3, 1.13, 1.22, 0.005, 0.075);
      towel(at - 0.24, at - 0.04, 0.83, 1.205);
      towel(at + 0.04, at + 0.24, 0.83, 1.205);
    }
  }

  // =================================================================
  // LAUNDRY
  // =================================================================
  function buildLaundry() {
    const g = makeGroup('laundry');
    const sel = S.laundry;
    const stone = sel?.bench?.top === 'stone';
    const v = S['b-vanity'];
    const z0 = LDRY.z0;
    const z1 = LDRY.z0 + BENCH_D;
    const topY = BENCH_H + (stone ? 0.02 : 0.033);
    cabinetRun(g, 'lCab', { x0: 2.0, x1: 2.76, z0, z1, face: 'z+', profile: v?.profile, handle: v?.handle, unit: 0.38 });
    g.box(stone ? 'lStone' : 'lCab', 1.98, BENCH_H, z0, 2.78, topY, z1 + 0.02);
    // stainless drop-in tub
    g.box('tub', 2.12, topY - 0.22, z0 + 0.1, 2.64, topY - 0.2, z1 - 0.06);
    g.box('tub', 2.12, topY - 0.22, z0 + 0.1, 2.14, topY, z1 - 0.06);
    g.box('tub', 2.62, topY - 0.22, z0 + 0.1, 2.64, topY, z1 - 0.06);
    g.box('tub', 2.12, topY - 0.22, z0 + 0.1, 2.64, topY, z0 + 0.12);
    g.box('tub', 2.12, topY - 0.22, z1 - 0.08, 2.64, topY, z1 - 0.06);
    mixerAt(g, 2.38, z0 + 0.13, { shape: 'gooseneck' }, topY, 'z');
    // washer + dryer under the bench return
    for (const x of [2.95, 3.65]) {
      g.box('appSS', x, 0.02, z0 + 0.04, x + 0.6, 0.86, z0 + 0.64);
      g.add(place(cylinder(scene, 0.04, 0.34, 0.34, { rot: [Math.PI / 2, 0, 0] }), x + 0.3, 0.5, z0 + 0.02), 'appGlass');
      g.box('appSS', x + 0.02, 0.72, z0, x + 0.58, 0.82, z0 + 0.04);
    }
    g.box(stone ? 'lStone' : 'lCab', 2.9, 0.86, z0 + 0.02, 4.32, 0.9, z1 + 0.02);
    const extras = sel?.extras?.extras;
    if (extras === 'overhead') {
      cabinetRun(g, 'lCab', { x0: 2.0, x1: 4.32, z0, z1: z0 + 0.35, y0: 1.55, y1: 2.15, face: 'z+', profile: v?.profile, handle: v?.handle });
    } else if (extras === 'shelves') {
      for (const y of [1.55, 1.9]) g.box('oak', 2.0, y, z0, 4.32, y + 0.035, z0 + 0.3);
    }
    // broom cupboard against the media wall
    cabinetRun(g, 'lCab', { x0: 4.62, x1: 5.22, z0: LDRY.z1 - 0.62, z1: LDRY.z1, y0: 0, y1: 2.25, face: 'z-', profile: v?.profile, handle: v?.handle, unit: 0.6 });
    g.finish();
  }

  // =================================================================
  // FURNITURE
  // =================================================================
  function buildFurniture() {
    const g = makeGroup('furniture');

    // ---- family room
    rug(g, -5.25, 3.15, -1.85, 6.55);
    sofa(g, -2.55, 4.85, 2.5, 0.96, 1); // faces -X toward the TV wall
    coffeeTable(g, -3.85, 4.85);
    tvUnit(g, K.wall, 4.85);
    plant(g, -5.2, 7.75, 1.0);
    floorLamp(g, -5.15, 3.05);
    art(g, 1.695, 1.72, 6.45, 1.15, 0.85, -1);

    // ---- dining
    diningTable(g, -1.15, 6.45, 1.0, 1.9);
    for (let i = 0; i < 3; i++) {
      chair(g, -1.72, 5.7 + i * 0.75, 'x+');
      chair(g, -0.58, 5.7 + i * 0.75, 'x-');
    }
    pendantBar(g, -1.15, 6.45);

    // ---- media room
    rug(g, 2.25, -1.45, 4.85, 1.35);
    sofa(g, 2.8, -0.05, 2.4, 0.96, -1); // faces +X toward the screen
    g.box('oakDark', MEDIA.x1 - 0.44, 0.08, -0.9, MEDIA.x1 - 0.06, 0.52, 0.9);
    g.box('handle', MEDIA.x1 - 0.47, 0.3, -0.62, MEDIA.x1 - 0.44, 0.33, -0.18);
    g.box('handle', MEDIA.x1 - 0.47, 0.3, 0.18, MEDIA.x1 - 0.44, 0.33, 0.62);
    g.box('tv', MEDIA.x1 - 0.075, 0.95, -0.8, MEDIA.x1 - 0.04, 1.72, 0.8);

    // ---- bedrooms
    bed(g, { hx: 1.83, hz: -8.33, dir: '+x', w: 1.83, bounds: [1.785, -9.305, 5.23, -6.10] }); // master
    bed(g, { hx: 3.65, hz: 2.23, dir: '+z', bounds: [2.36, 2.19, 5.23, 5.10] }); // bed 2
    bed(g, { hx: 3.40, hz: 11.545, dir: '-z', bounds: [1.785, 8.09, 5.23, 11.585] }); // bed 3
    bed(g, { hx: 0.715, hz: 10.45, dir: '-x', bounds: [-2.44, 9.20, 0.755, 11.585] }); // bed 4

    // ---- entry console
    g.box('oak', 0.28, 0.7, -8.6, 0.6, 0.75, -7.6);
    for (const z of [-8.52, -7.72]) {
      g.box('blackMetal', 0.33, 0.02, z, 0.37, 0.7, z + 0.04);
      g.box('blackMetal', 0.52, 0.02, z, 0.56, 0.7, z + 0.04);
    }
    g.add(place(sphere(scene, 0.2, { sy: 1.2 }), 0.44, 0.84, -8.05), 'pot');
    art(g, 0.045, 1.6, -8.1, 0.9, 0.7, +1);

    // ---- alfresco setting
    diningTable(g, -4.15, 10.15, 0.95, 1.6, 'oakDark');
    for (const dz of [-0.5, 0.5]) {
      chair(g, -4.62, 10.15 + dz, 'x+', 'oakDark');
      chair(g, -3.68, 10.15 + dz, 'x-', 'oakDark');
    }
    g.box('appSS', -5.42, 0.08, 8.8, -4.82, 0.92, 9.45); // BBQ
    g.box('appBlack', -5.44, 0.6, 8.78, -4.8, 0.7, 9.47);
    g.box('handle', -5.47, 0.72, 8.85, -5.44, 0.76, 9.4);

    g.finish();
  }

  function rug(g, x0, z0, x1, z1) {
    g.box('rug', x0, 0.032, z0, x1, 0.048, z1);
  }

  // dir +1 -> the sofa faces -X (back at +X); dir -1 -> faces +X
  function sofa(g, x, z, len, depth, dir) {
    const seatH = 0.42;
    const base = roundedBox(scene, depth, seatH, len, 0.05, 4);
    place(base, x, seatH / 2 + 0.06, z);
    g.add(base, 'fabricSofa');
    const back = roundedBox(scene, 0.24, 0.58, len, 0.07, 4);
    place(back, x + dir * (depth / 2 - 0.12), seatH + 0.3, z);
    g.add(back, 'fabricSofa');
    for (const s of [-1, 1]) {
      const arm = roundedBox(scene, depth, 0.3, 0.24, 0.07, 4);
      place(arm, x, seatH + 0.17, z + s * (len / 2 - 0.12));
      g.add(arm, 'fabricSofa');
    }
    const n = Math.max(2, Math.round(len / 0.92));
    for (let i = 0; i < n; i++) {
      const cz = z - len / 2 + (len / n) * (i + 0.5);
      const cus = roundedBox(scene, depth - 0.3, 0.15, len / n - 0.08, 0.05, 4);
      place(cus, x - dir * 0.07, seatH + 0.13, cz);
      g.add(cus, 'fabricSofa');
      const pil = roundedBox(scene, 0.13, 0.36, 0.36, 0.06, 4);
      place(pil, x + dir * (depth / 2 - 0.27), seatH + 0.36, cz + 0.12);
      pil.rotation.z = -dir * 0.2;
      g.add(pil, i % 2 ? 'fabricAccent' : 'linen');
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        g.add(cylinder(scene, 0.12, 0.028, 0.034, { x: x + sx * (depth / 2 - 0.12), y: 0.06, z: z + sz * (len / 2 - 0.16) }), 'oakDark');
      }
    }
  }

  function coffeeTable(g, x, z) {
    const top = roundedBox(scene, 0.64, 0.05, 1.15, 0.02, 3);
    place(top, x, 0.42, z);
    g.add(top, 'oak');
    for (const [dx, dz] of [[-0.25, -0.47], [0.25, -0.47], [-0.25, 0.47], [0.25, 0.47]]) {
      g.add(cylinder(scene, 0.4, 0.028, 0.028, { x: x + dx, y: 0.2, z: z + dz }), 'blackMetal');
    }
    g.add(place(lathe(scene, [[0, 0], [0.085, 0.02], [0.095, 0.12], [0.055, 0.2], [0.05, 0.22]], { tess: 18 }), x, 0.445, z - 0.22), 'pot');
    g.box('book', x - 0.16, 0.445, z + 0.12, x + 0.16, 0.487, z + 0.38);
    g.box('linen', x - 0.15, 0.487, z + 0.14, x + 0.15, 0.515, z + 0.36);
  }

  function tvUnit(g, xWall, z) {
    g.box('oakDark', xWall, 0.12, z - 0.95, xWall + 0.44, 0.54, z + 0.95);
    g.box('handle', xWall + 0.44, 0.3, z - 0.66, xWall + 0.47, 0.33, z - 0.24);
    g.box('handle', xWall + 0.44, 0.3, z + 0.24, xWall + 0.47, 0.33, z + 0.66);
    g.box('tv', xWall + 0.04, 0.98, z - 0.75, xWall + 0.09, 1.76, z + 0.75);
    g.box('blackMetal', xWall + 0.05, 0.54, z - 0.05, xWall + 0.12, 0.98, z + 0.05);
  }

  function diningTable(g, x, z, w = 1.0, d = 1.9, mat = 'oak') {
    g.box(mat, x - w / 2, 0.72, z - d / 2, x + w / 2, 0.765, z + d / 2);
    g.box(mat, x - w / 2 + 0.06, 0.66, z - d / 2 + 0.06, x + w / 2 - 0.06, 0.72, z + d / 2 - 0.06);
    for (const dx of [-w / 2 + 0.12, w / 2 - 0.12]) {
      for (const dz of [-d / 2 + 0.12, d / 2 - 0.12]) {
        g.box('blackMetal', x + dx - 0.028, 0.02, z + dz - 0.028, x + dx + 0.028, 0.66, z + dz + 0.028);
      }
    }
    g.add(place(lathe(scene, [[0, 0], [0.07, 0.01], [0.08, 0.1], [0.05, 0.16], [0.045, 0.18]], { tess: 16 }), x, 0.765, z), 'pot');
    g.add(sphere(scene, 0.17, { x, y: 0.94, z, sy: 0.9 }), 'leaf');
  }

  // facing 'x+' -> the chair's back is at -X (it looks toward +X)
  function chair(g, x, z, facing, mat = 'oak') {
    const dir = facing === 'x+' ? -1 : 1;
    const seat = roundedBox(scene, 0.46, 0.07, 0.44, 0.025, 3);
    place(seat, x, 0.45, z);
    g.add(seat, mat === 'oak' ? 'fabricSofa' : mat);
    const back = roundedBox(scene, 0.07, 0.46, 0.42, 0.03, 3);
    place(back, x + dir * 0.2, 0.72, z);
    back.rotation.z = -dir * 0.08;
    g.add(back, mat === 'oak' ? 'fabricSofa' : mat);
    for (const dx of [-0.18, 0.18]) {
      for (const dz of [-0.17, 0.17]) {
        g.add(cylinder(scene, 0.45, 0.022, 0.028, { x: x + dx, y: 0.225, z: z + dz }), mat === 'oak' ? 'oakDark' : 'blackMetal');
      }
    }
  }

  function pendantBar(g, x, z) {
    g.box('blackMetal', x - 0.045, CEIL - 0.055, z - 0.5, x + 0.045, CEIL - 0.015, z + 0.5);
    for (const dz of [-0.36, 0, 0.36]) {
      g.add(place(cylinder(scene, 0.55, 0.006, 0.006), x, CEIL - 0.33, z + dz), 'blackMetal');
      const sh = lathe(scene, [[0.004, 0.17], [0.07, 0.11], [0.1, 0.0]], { tess: 18 });
      place(sh, x, 1.88, z + dz);
      g.add(sh, 'brass');
      g.add(sphere(scene, 0.07, { x, y: 1.89, z: z + dz }), 'led');
    }
  }

  // Bed built in local coordinates: u across, v from the headboard into the room.
  function bed(g, { hx, hz, dir, w = 1.6, len = 2.05, bounds }) {
    const ax = dir === '+x' || dir === '-x';
    const map = (u, v) => (
      dir === '+x' ? [hx + v, hz + u]
        : dir === '-x' ? [hx - v, hz - u]
          : dir === '+z' ? [hx - u, hz + v] : [hx + u, hz - v]);
    const lbox = (key, u0, y0, v0, u1, y1, v1) => {
      const a = map(u0, v0);
      const b = map(u1, v1);
      g.box(key, a[0], y0, a[1], b[0], y1, b[1]);
    };
    const size = (across, along) => (ax ? [along, across] : [across, along]);
    lbox('oakDark', -w / 2, 0.07, 0.06, w / 2, 0.32, len); // base
    const [mw, md] = size(w - 0.05, len - 0.06);
    const mat = roundedBox(scene, mw, 0.26, md, 0.04, 4);
    const mc = map(0, len / 2 + 0.03);
    place(mat, mc[0], 0.45, mc[1]);
    g.add(mat, 'linen');
    const [dwid, ddep] = size(w + 0.06, len - 0.62);
    const doona = roundedBox(scene, dwid, 0.13, ddep, 0.05, 4);
    const dc = map(0, (0.62 + len) / 2);
    place(doona, dc[0], 0.585, dc[1]);
    g.add(doona, 'fabricSofa');
    for (const s of [-1, 1]) {
      const [pw, pd] = size(w * 0.42, 0.35);
      const p = roundedBox(scene, pw, 0.14, pd, 0.06, 4);
      const pc = map(s * w * 0.24, 0.3);
      place(p, pc[0], 0.63, pc[1]);
      p.rotation[ax ? 'z' : 'x'] = 0.14;
      g.add(p, 'linen');
    }
    lbox('fabricSofa', -w / 2 - 0.08, 0.1, -0.1, w / 2 + 0.08, 1.06, 0.02); // headboard
    // bedside tables, skipped where the room runs out
    for (const s of [-1, 1]) {
      const u = s * (w / 2 + 0.24);
      const c = map(u, 0.24);
      if (bounds && (c[0] < bounds[0] + 0.24 || c[0] > bounds[2] - 0.24 || c[1] < bounds[1] + 0.24 || c[1] > bounds[3] - 0.24)) continue;
      lbox('oak', u - 0.22, 0.07, 0.02, u + 0.22, 0.5, 0.46);
      lbox('handle', u - 0.07, 0.3, -0.008, u + 0.07, 0.33, 0.02);
      g.add(place(cylinder(scene, 0.025, 0.14, 0.14), c[0], 0.52, c[1]), 'brass');
      g.add(place(cylinder(scene, 0.2, 0.018, 0.018), c[0], 0.62, c[1]), 'brass');
      const shade = lathe(scene, [[0.004, 0.19], [0.1, 0.19], [0.13, 0.0]], { tess: 18 });
      place(shade, c[0], 0.7, c[1]);
      g.add(shade, 'linen');
    }
  }

  function plant(g, x, z, s = 1) {
    const pot = lathe(scene, [[0, 0], [0.19, 0.02], [0.21, 0.32], [0.18, 0.34], [0.165, 0.32], [0.175, 0.04], [0, 0.03]], { tess: 20 });
    place(pot, x, 0.02, z);
    pot.scaling.setAll(s);
    g.add(pot, 'pot');
    const r = rng(9);
    for (let i = 0; i < 16; i++) {
      const h = (0.35 + r() * 0.85) * s;
      const ang = r() * Math.PI * 2;
      const leaf = MeshBuilder.CreatePlane('leaf', { width: 0.17 * s, height: 0.3 * s, sideOrientation: Mesh.DOUBLESIDE }, scene);
      leaf.position.set(x + Math.cos(ang) * 0.14 * s, 0.36 * s + h, z + Math.sin(ang) * 0.14 * s);
      leaf.rotation.set(r() * 0.7 - 0.35, ang, r() * 0.5 - 0.25);
      g.add(leaf, 'leaf');
      g.add(cylinder(scene, h, 0.011 * s, 0.015 * s, {
        x: x + Math.cos(ang) * 0.05 * s, y: 0.34 * s + h / 2, z: z + Math.sin(ang) * 0.05 * s,
      }), 'leaf');
    }
  }

  function floorLamp(g, x, z) {
    g.add(place(cylinder(scene, 0.03, 0.3, 0.3), x, 0.035, z), 'blackMetal');
    g.add(place(cylinder(scene, 1.45, 0.022, 0.022), x, 0.78, z), 'blackMetal');
    const shade = lathe(scene, [[0.004, 0.25], [0.14, 0.22], [0.17, 0.0]], { tess: 18 });
    place(shade, x, 1.5, z);
    g.add(shade, 'linen');
    g.add(sphere(scene, 0.1, { x, y: 1.6, z }), 'led');
  }

  // Framed art on a wall plane at x = xWall, facing `dir`.
  function art(g, xWall, y, z, w, h, dir) {
    const a = xWall;
    const b = xWall + dir * 0.035;
    g.box('oakDark', Math.min(a, b), y - h / 2, z - w / 2, Math.max(a, b), y + h / 2, z + w / 2);
    const c = xWall + dir * 0.036;
    const d = xWall + dir * 0.042;
    g.box('art', Math.min(c, d), y - h / 2 + 0.05, z - w / 2 + 0.05, Math.max(c, d), y + h / 2 - 0.05, z + w / 2 - 0.05);
  }

  // =================================================================
  // CEILINGS: media bulkhead with LED cove + downlights
  // =================================================================
  function buildCeilings() {
    const g = makeGroup('ceilings');
    const b = 0.42;
    const { x0, x1, z0, z1 } = MEDIA;
    g.box('ceil', x0, CEIL - 0.3, z0, x1, CEIL, z0 + b);
    g.box('ceil', x0, CEIL - 0.3, z1 - b, x1, CEIL, z1);
    g.box('ceil', x0, CEIL - 0.3, z0 + b, x0 + b, CEIL, z1 - b);
    g.box('ceil', x1 - b, CEIL - 0.3, z0 + b, x1, CEIL, z1 - b);
    const ly = CEIL - 0.265;
    g.box('led', x0 + b, ly, z0 + b, x1 - b, ly + 0.025, z0 + b + 0.02);
    g.box('led', x0 + b, ly, z1 - b - 0.02, x1 - b, ly + 0.025, z1 - b);
    g.box('led', x0 + b, ly, z0 + b, x0 + b + 0.02, ly + 0.025, z1 - b);
    g.box('led', x1 - b - 0.02, ly, z0 + b, x1 - b, ly + 0.025, z1 - b);

    const spots = [];
    for (let z = 1.7; z <= 8.0; z += 1.55) for (const x of [-4.7, -2.7, -0.7]) spots.push([x, z]);
    spots.push([-4.9, -0.5], [-4.9, 0.7], [-2.0, -0.6], [-4.9, -2.7], [-1.1, -2.7]);
    for (let z = -8.6; z <= -4.2; z += 1.45) spots.push([0.9, z]);
    for (const p of [[3.5, -7.8], [3.5, -5.1], [3.5, -3.1], [3.5, 3.6], [3.5, 5.9], [3.5, 7.3], [3.5, 9.8], [-1.0, 10.2], [1.2, 9.4]]) spots.push(p);
    for (const [x, z] of spots) {
      g.box('ceil', x - 0.055, CEIL - 0.012, z - 0.055, x + 0.055, CEIL - 0.004, z + 0.055);
      g.box('led', x - 0.042, CEIL - 0.016, z - 0.042, x + 0.042, CEIL - 0.01, z + 0.042);
    }
    g.finish();
  }

  // =================================================================
  // WINDOW FURNISHINGS
  // =================================================================
  function buildWindowFurnishings() {
    const g = makeGroup('winfurn');
    const kind = S['window-furnishings']?.type?.kind;
    if (!kind) {
      g.finish();
      return;
    }
    for (const w of house.plan.windows) {
      if (w.frosted || w.room === 'pantry' || w.room === 'kitchen') continue;
      if (w.y1 - w.y0 < 0.9 || w.s1 - w.s0 < 0.5) continue;
      // wall-local box: s along the wall, d negative = into the room
      const box = (key, s0, s1, y0, y1, d0, d1) => {
        const p = w.wall.world(s0, y0, d0);
        const q = w.wall.world(s1, y1, d1);
        g.box(key, p[0], p[1], p[2], q[0], q[1], q[2]);
      };
      if (kind === 'shutter') {
        const d0 = -0.055;
        const d1 = -0.078;
        box('shutter', w.s0 - 0.03, w.s1 + 0.03, w.y1, w.y1 + 0.04, d0, d1);
        box('shutter', w.s0 - 0.03, w.s1 + 0.03, w.y0 - 0.04, w.y0, d0, d1);
        const panels = Math.max(2, Math.round((w.s1 - w.s0) / 0.55));
        for (let i = 0; i <= panels; i++) {
          const s = w.s0 + ((w.s1 - w.s0) * i) / panels;
          box('shutter', s - 0.022, s + 0.022, w.y0, w.y1, d0, d1);
        }
        for (let i = 0; i < panels; i++) {
          const a = w.s0 + ((w.s1 - w.s0) * i) / panels + 0.024;
          const b = w.s0 + ((w.s1 - w.s0) * (i + 1)) / panels - 0.024;
          for (let y = w.y0 + 0.03; y < w.y1 - 0.05; y += 0.076) box('shutter', a, b, y, y + 0.058, d0 - 0.002, d0 - 0.014);
        }
      } else if (kind === 'roller') {
        const drop = 0.4;
        box('blind', w.s0 - 0.02, w.s1 + 0.02, w.y1 - (w.y1 - w.y0) * drop, w.y1 + 0.02, -0.05, -0.062);
        box('woodwork', w.s0 - 0.04, w.s1 + 0.04, w.y1 + 0.02, w.y1 + 0.09, -0.042, -0.072);
      } else {
        const yTop = Math.min(CEIL - 0.06, Math.max(w.y1 + 0.22, 2.46));
        box('woodwork', w.s0 - 0.36, w.s1 + 0.36, yTop, yTop + 0.045, -0.085, -0.135);
        for (const side of [-1, 1]) {
          const base = side < 0 ? w.s0 - 0.32 : w.s1 - 0.08;
          for (let i = 0; i < 6; i++) {
            const s = base + i * 0.07;
            const dd = -0.085 - (i % 2) * 0.05;
            box('curtain', s, s + 0.055, 0.03, yTop - 0.012, dd, dd - 0.055);
          }
        }
      }
    }
    g.finish();
  }

  // =================================================================
  // interior lighting
  // =================================================================
  const lights = [
    new PointLight('int-living', new Vector3(-2.8, 2.45, 5.0), scene),
    new PointLight('int-kitchen', new Vector3(-2.4, 2.45, -0.2), scene),
    new PointLight('int-master', new Vector3(3.4, 2.45, -7.8), scene),
    new PointLight('int-bath', new Vector3(3.8, 2.45, 5.9), scene),
    new PointLight('int-media', new Vector3(3.5, 2.3, 0.0), scene),
    new PointLight('int-entry', new Vector3(0.9, 2.45, -7.0), scene),
  ];
  for (const l of lights) {
    l.diffuse = new Color3(1, 0.94, 0.86);
    l.specular = new Color3(0.25, 0.25, 0.25);
    l.intensity = 0.85;
    l.range = 12;
  }
  let inLight = 0.85;

  function setMood(dusk) {
    inLight = dusk ? 1.7 : 0.85;
    for (const l of lights) l.intensity = inLight;
    IM.led.emissiveColor = dusk ? lin('#ffd79a') : lin('#f6e6c8');
  }

  // =================================================================
  // materials driven by the selections
  // =================================================================
  async function stoneMat(mat, opt) {
    const canvas = await guideCanvas(opt.tex || opt.img, 512);
    mat.albedoTexture?.dispose();
    if (canvas) {
      mat.albedoTexture = dynTex('stone', canvas, 1.4);
      mat.albedoColor = lin('#ffffff');
    } else {
      mat.albedoTexture = null;
      mat.albedoColor = lin(opt.hex || '#f2f1ee');
    }
    mat.roughness = 0.18;
    mat.metallic = 0.02;
  }

  async function laminateMat(mat, opt, finishOpt) {
    mat.albedoTexture?.dispose();
    mat.albedoTexture = null;
    if (opt?.wood && (opt.tex || opt.img)) {
      const canvas = await guideCanvas(opt.tex || opt.img, 512);
      if (canvas) {
        mat.albedoTexture = dynTex('lam', canvas, 0.9, 1.6);
        mat.albedoColor = lin('#ffffff');
      }
    }
    if (!mat.albedoTexture) mat.albedoColor = lin(opt?.hex || '#ece9e3');
    mat.roughness = finishOpt?.rough ?? 0.55;
    mat.metallic = 0;
  }

  async function applyMaterials() {
    // flooring
    const fl = S.flooring;
    if (fl?.type && fl?.colour) {
      IM.floorMain.albedoTexture?.dispose();
      if (fl.type.kind === 'tile') {
        IM.floorMain.albedoTexture = dynTex('floor', tileCanvas(fl.colour.hex || '#d9d6cf'), fl.type.size || 0.45);
        IM.floorMain.roughness = 0.34;
      } else {
        const c = await plankCanvas(fl.colour.tex || fl.colour.img, fl.colour.hex);
        const [pl, pw] = fl.type.plank || [1.2, 0.19];
        IM.floorMain.albedoTexture = dynTex('floor', c, pl * 2, pw * 6);
        IM.floorMain.roughness = 0.42;
      }
      IM.floorMain.albedoColor = lin('#ffffff');
    }
    // carpet
    if (S.carpet?.colour) {
      IM.carpet.albedoTexture?.dispose();
      IM.carpet.albedoTexture = dynTex('carpet', carpetCanvas(S.carpet.colour.hex), 1.1);
      IM.carpet.albedoColor = lin('#ffffff');
    }
    // paint
    if (S.paint?.walls) IM.wall.albedoColor = lin(S.paint.walls.hex);
    if (S.paint?.woodwork) IM.woodwork.albedoColor = lin(S.paint.woodwork.hex);
    if (S.paint?.finish) IM.wall.roughness = S.paint.finish.id === 'pf-washwear' ? 0.62 : 0.92;
    IM.feature.albedoColor = lin(S.feature?.colour?.hex || S.paint?.walls?.hex || '#e9e6e0');

    // kitchen
    if (S['k-benchtop']?.colour) await stoneMat(IM.kStone, S['k-benchtop'].colour);
    const kc = S['k-cabinets'];
    if (kc?.colour) {
      await laminateMat(IM.kCab, kc.colour, kc.finish);
      await laminateMat(IM.kOver, kc.colour, kc.finish);
      await laminateMat(IM.kIsland, !kc.island || kc.island.id === 'ki-same' ? kc.colour : kc.island, kc.finish);
    }
    if (S['k-handles']?.handle) setFinish(IM.handle, S['k-handles'].handle.finish);
    const sk = S['k-sink']?.sink;
    if (sk) {
      const metal = { stainless: 'stainless', gunmetal: 'gunmetal', nickel: 'brushed-nickel', gold: 'brushed-gold' }[sk.mat];
      if (metal) setFinish(IM.sink, metal);
      else {
        IM.sink.albedoColor = lin(sk.mat === 'granite-black' ? '#1d1d1d' : '#fbfbfa');
        IM.sink.metallic = 0;
        IM.sink.roughness = 0.3;
      }
    }
    setFinish(IM.mixer, S['k-sink']?.mixerFinish?.finish || S['k-sink']?.mixer?.finish || 'chrome');
    if (S['k-cooking']?.cooker?.colour) IM.cooker.albedoColor = lin(S['k-cooking'].cooker.colour);

    // bathroom + laundry
    const bb = S['b-benchtop']?.colour;
    if (bb) await stoneMat(IM.vStone, bb);
    const vb = S['b-vanity'];
    if (vb?.colour) {
      await laminateMat(IM.vCab, vb.colour, vb.finish);
      await laminateMat(IM.lCab, vb.colour, vb.finish);
    }
    setFinish(IM.tap, S['b-basin']?.finish?.finish || 'chrome');
    setFinish(IM.shower, S['b-shower']?.finish?.finish || 'chrome');
    setFinish(IM.acc, S['b-accessories']?.finish?.finish || 'chrome');
    setFinish(IM.screenFrame, S['b-shower']?.screen?.frame || 'chrome');
    if (S['b-basin']?.basin) IM.basin.albedoColor = lin(S['b-basin'].basin.colour || '#ffffff');
    if (S.laundry?.bench?.top === 'stone' && bb) {
      await stoneMat(IM.lStone, bb);
    } else {
      IM.lStone.albedoTexture = null;
      IM.lStone.albedoColor = lin('#e8e5df');
      IM.lStone.roughness = 0.4;
    }

    // robes + window furnishings
    if (S.robes?.door?.style === 'painted') {
      IM.robeDoor.albedoColor = lin(S.paint?.woodwork?.hex || '#f2f0ec');
      IM.robeDoor.metallic = 0;
      IM.robeDoor.roughness = 0.5;
    } else {
      IM.robeDoor.albedoColor = lin('#d5dee1');
      IM.robeDoor.metallic = 0.5;
      IM.robeDoor.roughness = 0.08;
    }
    const wf = S['window-furnishings'];
    if (wf?.fabric) {
      const target = wf.type?.kind === 'roller' ? IM.blind : IM.curtain;
      const canvas = await guideCanvas(wf.fabric.tex || wf.fabric.img, 512);
      target.albedoTexture?.dispose();
      if (canvas) {
        target.albedoTexture = dynTex('wf', canvas, 0.9);
        target.albedoColor = lin('#ffffff');
      } else {
        target.albedoTexture = null;
        target.albedoColor = lin(wf.fabric.hex || '#efece6');
      }
    }
    if (wf?.type?.kind === 'sheer') {
      IM.curtain.alpha = 0.5;
      IM.curtain.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
      IM.curtain.backFaceCulling = false;
    } else {
      IM.curtain.alpha = 1;
      IM.curtain.transparencyMode = null;
    }
  }

  // =================================================================
  // public API
  // =================================================================
  const REBUILD = {
    flooring: [], carpet: [], paint: ['trims'], feature: ['trims'], trims: ['trims'],
    doors: ['doors'], handles: ['doors'], robes: ['robes'],
    'window-furnishings': ['winfurn'],
    'k-benchtop': ['kitchen'], 'k-cabinets': ['kitchen'], 'k-handles': ['kitchen'], 'k-sink': ['kitchen'],
    'k-cooking': ['kitchen'], 'k-appliances': ['kitchen'],
    'b-benchtop': ['bath', 'laundry'], 'b-vanity': ['bath', 'laundry'], 'b-basin': ['bath'],
    'b-shower': ['bath'], 'b-bath': ['bath'], 'b-toilet': ['bath'], 'b-accessories': ['bath'],
    laundry: ['laundry'],
  };
  const BUILDERS = {
    lining: buildLining,
    trims: buildTrims, doors: buildDoors, robes: buildRobes, kitchen: buildKitchen,
    bath: buildBath, laundry: buildLaundry, winfurn: buildWindowFurnishings,
    furniture: buildFurniture, ceilings: buildCeilings,
  };

  // Resolve a category, falling back to the guide's standard inclusions.
  function resolveCat(catKey, sel) {
    const cat = INTERIOR_CATEGORIES.find((c) => c.key === catKey);
    if (!cat) return {};
    return resolveAll(catKey, { ...interiorDefaults(cat), ...(sel || {}) });
  }

  async function apply(catKey, sel, { rebuild = true } = {}) {
    if (!(catKey in REBUILD)) return;
    S[catKey] = resolveCat(catKey, sel);
    await applyMaterials();
    if (rebuild) for (const grp of REBUILD[catKey]) BUILDERS[grp]?.();
  }

  async function buildAll(state = {}) {
    for (const key of Object.keys(REBUILD)) S[key] = resolveCat(key, state[key]);
    await applyMaterials();
    for (const name of Object.keys(BUILDERS)) BUILDERS[name]();
  }

  // lift the ceilings (flat plane + bulkheads) when the house is opened up
  function setTransparent(on) {
    for (const m of groups.ceilings?.meshes || []) m.visibility = on ? 0 : 1;
    for (const key of ['interiorCeil', 'soffit']) {
      const m = house.meshes[key];
      if (m) m.visibility = on ? 0 : 1;
    }
    for (const l of lights) l.intensity = on ? inLight * 1.6 : inLight;
  }

  function dispose() {
    for (const g of Object.values(groups)) g.dispose();
    for (const l of lights) l.dispose();
  }

  return { apply, buildAll, setMood, setTransparent, dispose, materials: IM };
}
