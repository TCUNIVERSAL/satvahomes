// Procedural canvas textures: albedo / height / normal / AO maps for every
// building material. All maps tile seamlessly so they can repeat over walls.

export function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Deterministic PRNG so textures look the same every visit.
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbStr = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
export function shade(hex, f, jitter = 0, rand = Math.random) {
  const [r, g, b] = hexToRgb(hex);
  const j = () => 1 + (rand() - 0.5) * jitter;
  const k = f * j();
  return rgbStr(Math.min(255, r * k * j()), Math.min(255, g * k * j()), Math.min(255, b * k * j()));
}

// Tileable value noise, built from upscaled random grids (fast: GPU canvas scaling).
export function noiseCanvas(size, { octaves = 5, base = 4, seed = 7, persistence = 0.55, w = size, h = size } = {}) {
  const out = makeCanvas(w, h);
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);
  const rand = rng(seed);
  let amp = 1;
  let total = 0;
  const layers = [];
  for (let o = 0; o < octaves; o++) {
    const n = base * 2 ** o;
    const nh = Math.max(2, Math.round((n * h) / w));
    total += amp;
    layers.push({ n, nh, amp });
    amp *= persistence;
  }
  for (const { n, nh, amp: a } of layers) {
    // padded grid with wrapped border -> seamless bilinear upscale
    const g = makeCanvas(n + 2, nh + 2);
    const gc = g.getContext('2d');
    const img = gc.createImageData(n + 2, nh + 2);
    const vals = [];
    for (let y = 0; y < nh; y++) for (let x = 0; x < n; x++) vals.push(rand() * 255);
    for (let y = 0; y < nh + 2; y++) {
      for (let x = 0; x < n + 2; x++) {
        const v = vals[((y - 1 + nh) % nh) * n + ((x - 1 + n) % n)];
        const i = (y * (n + 2) + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    gc.putImageData(img, 0, 0);
    ctx.globalAlpha = a / total * 1.6;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const sx = w / n;
    const sy = h / nh;
    ctx.drawImage(g, 0, 0, n + 2, nh + 2, -sx * 0.5 - sx * 0.5, -sy, w + sx * 2, h + sy * 2);
  }
  ctx.globalAlpha = 1;
  return out;
}

// Height map (grey canvas) -> tangent-space normal map canvas.
export function heightToNormal(hc, strength = 2) {
  const w = hc.width;
  const h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = makeCanvas(w, h);
  const octx = out.getContext('2d');
  const img = octx.createImageData(w, h);
  const H = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) H[i] = src[i * 4] / 255;
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const yu = ((y - 1 + h) % h) * w;
    const yd = ((y + 1) % h) * w;
    const yc = y * w;
    for (let x = 0; x < w; x++) {
      const xl = (x - 1 + w) % w;
      const xr = (x + 1) % w;
      const dx = (H[yc + xr] - H[yc + xl]) * strength;
      const dy = (H[yd + x] - H[yu + x]) * strength;
      const nx = -dx;
      const ny = dy;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const i = (yc + x) * 4;
      d[i] = (nx * inv * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * inv * 0.5 + 0.5) * 255;
      d[i + 2] = (inv * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

// ---------------------------------------------------------------- bricks
// World tile covers BRICK_TILE metres. Brick 230 × 76 (+10 mortar) → 240 × 86 mm.
export const BRICK_TILE = { w: 1.68, h: 1.72 }; // 7 bricks × 20 courses

// The joint is always 10 mm wide. Tooling changes its profile, not the brick
// dimensions. Shading comes from the normal and AO maps, not black albedo lines.
export const BRICK_JOINTS = {
  ironed: { depth: 1, shadow: 0.14, arris: 0.10, width: 1 },
  flush: { depth: 0.13, shadow: 0.025, arris: 0.025, width: 1 },
};
const brickSurfaceCache = new Map();
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth01 = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const mod = (v, n) => ((v % n) + n) % n;

// Periodic value noise evaluated at texel centres. Unlike cropped canvas
// noise, interpolation wraps the lattice itself, including its derivatives.
function brickNoise(size, nx, ny, seed) {
  const random = rng(seed);
  const grid = Float32Array.from({ length: nx * ny }, () => random() * 2 - 1);
  const field = new Float32Array(size * size);
  const x0 = new Uint16Array(size);
  const x1 = new Uint16Array(size);
  const tx = new Float32Array(size);
  for (let x = 0; x < size; x++) {
    const u = (x + 0.5) / size * nx;
    x0[x] = Math.floor(u) % nx;
    x1[x] = (x0[x] + 1) % nx;
    tx[x] = smooth01(u - Math.floor(u));
  }
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size * ny;
    const y0 = Math.floor(v) % ny;
    const y1 = (y0 + 1) % ny;
    const ty = smooth01(v - Math.floor(v));
    for (let x = 0; x < size; x++) {
      const a = grid[y0 * nx + x0[x]];
      const b = grid[y0 * nx + x1[x]];
      const c = grid[y1 * nx + x0[x]];
      const d = grid[y1 * nx + x1[x]];
      field[y * size + x] = (a + (b - a) * tx[x]) * (1 - ty) + (c + (d - c) * tx[x]) * ty;
    }
  }
  return field;
}

function brickSurface(size, bond, doubleHeight, joint, seed) {
  const jointKind = joint === 'flush' ? 'flush' : 'ironed';
  const key = `${size}-${bond === 'stack'}-${!!doubleHeight}-${jointKind}-${seed}`;
  if (brickSurfaceCache.has(key)) return brickSurfaceCache.get(key);
  const rows = doubleHeight ? 10 : 20;
  const cols = 7;
  const pitchX = BRICK_TILE.w / cols;
  const pitchY = BRICK_TILE.h / rows;
  const halfJoint = 0.005;
  const pixelX = BRICK_TILE.w / size;
  const pixelY = BRICK_TILE.h / size;
  const aa = Math.max(pixelX, pixelY);
  const jointDepth = 0.0035 * BRICK_JOINTS[jointKind].depth;
  const broad = brickNoise(size, 35, 40, seed + 101);
  const sand = brickNoise(size, 168, 172, seed + 307);
  const grain = brickNoise(size, 560, 574, seed + 503);
  const fine = brickNoise(size, 1008, 1032, seed + 709);
  const height = new Float32Array(size * size);
  const coverage = new Uint8Array(size * size);
  const tone = new Int8Array(size * size);
  const brickIds = new Uint8Array(size * size);
  const normal = makeCanvas(size);
  const ao = makeCanvas(size);
  const roughness = makeCanvas(size);
  const normalCtx = normal.getContext('2d');
  const aoCtx = ao.getContext('2d');
  const roughCtx = roughness.getContext('2d');
  const normalImage = normalCtx.createImageData(size, size);
  const aoImage = aoCtx.createImageData(size, size);
  const roughImage = roughCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    const worldY = (y + 0.5) * pixelY;
    const row = Math.min(rows - 1, Math.floor(worldY / pitchY));
    const localY = worldY - row * pitchY;
    const offset = bond !== 'stack' && row % 2 ? pitchX * 0.5 : 0;
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      const worldX = mod((x + 0.5) * pixelX - offset, BRICK_TILE.w);
      const col = Math.min(cols - 1, Math.floor(worldX / pitchX));
      const localX = worldX - col * pitchX;
      const corner = 0.0015;
      const qx = Math.abs(localX - pitchX * 0.5) - (pitchX * 0.5 - halfJoint - corner);
      const qy = Math.abs(localY - pitchY * 0.5) - (pitchY * 0.5 - halfJoint - corner);
      // Signed distance gives slightly eased corners and irregular clay arrises
      // without changing the course alignment or clipping a wrapped brick.
      let edge = corner - Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - Math.min(Math.max(qx, qy), 0);
      edge += sand[p] * 0.00065 + grain[p] * 0.0003;
      const face = smooth01(edge / aa + 0.5);
      const bevel = smooth01(edge / 0.002);
      const bowl = Math.sqrt(Math.max(0, 1 - clamp01(1 + edge / halfJoint) ** 2));
      const pore = Math.max(0, (grain[p] - 0.42) / 0.58) ** 2;
      const clayRelief = broad[p] * 0.00016 + sand[p] * 0.00014 + grain[p] * 0.00010 - pore * 0.00035;
      const clayHeight = clayRelief - (1 - bevel) * 0.00045;
      const mortarHeight = -jointDepth * (0.55 + 0.45 * bowl) + fine[p] * 0.00008;
      height[p] = clayHeight * face + mortarHeight * (1 - face);
      coverage[p] = face * 255;
      brickIds[p] = row * cols + col;
      // Colour grain stays neutral: lighting and directional shadows are left
      // to PBR. The same pores also alter relief, occlusion, and roughness.
      const clayTone = broad[p] * 0.035 + sand[p] * 0.025 + grain[p] * 0.028 + fine[p] * 0.015 - pore * 0.10;
      const mortarTone = sand[p] * 0.018 + grain[p] * 0.03 + fine[p] * 0.024;
      tone[p] = Math.max(-127, Math.min(127, (clayTone * face + mortarTone * (1 - face)) * 1024));
      const occ = (1 - pore * 0.06) * face + (1 - BRICK_JOINTS[jointKind].depth * (0.09 + 0.08 * bowl)) * (1 - face);
      const rough = (0.84 + sand[p] * 0.04 + grain[p] * 0.035 + pore * 0.05) * face + (0.95 + fine[p] * 0.025) * (1 - face);
      const i = p * 4;
      aoImage.data[i] = aoImage.data[i + 1] = aoImage.data[i + 2] = occ * 255;
      roughImage.data[i] = roughImage.data[i + 1] = roughImage.data[i + 2] = rough * 255;
      aoImage.data[i + 3] = roughImage.data[i + 3] = 255;
    }
  }
  // Heights are metres, so their gradients remain the same when texture
  // resolution changes. Central differences wrap on both tile boundaries.
  for (let y = 0; y < size; y++) {
    const up = mod(y - 1, size) * size;
    const down = (y + 1) % size * size;
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      const dx = (height[y * size + (x + 1) % size] - height[y * size + mod(x - 1, size)]) / (2 * pixelX);
      const dy = (height[down + x] - height[up + x]) / (2 * pixelY);
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = p * 4;
      normalImage.data[i] = (0.5 - dx * inv * 0.5) * 255;
      normalImage.data[i + 1] = (0.5 + dy * inv * 0.5) * 255;
      normalImage.data[i + 2] = (0.5 + inv * 0.5) * 255;
      normalImage.data[i + 3] = 255;
    }
  }
  normalCtx.putImageData(normalImage, 0, 0);
  aoCtx.putImageData(aoImage, 0, 0);
  roughCtx.putImageData(roughImage, 0, 0);
  const result = { maps: { normal, ao, roughness }, coverage, tone, brickIds, count: rows * cols };
  // Keep CPU memory bounded while switching combinations in the configurator.
  if (brickSurfaceCache.size >= 4) brickSurfaceCache.delete(brickSurfaceCache.keys().next().value);
  brickSurfaceCache.set(key, result);
  return result;
}

export function brickSurfaceMaps(size, bond, doubleHeight, joint = 'ironed', seed = 3) {
  return brickSurface(size, bond, doubleHeight, joint, seed).maps;
}

export function brickAlbedo(size, brick, mortarHex, bond, seed = 3, joint = 'ironed') {
  const surface = brickSurface(size, bond, !!brick?.doubleHeight, joint, seed);
  const palette = brick?.palette?.length ? brick.palette : [{ c: brick?.hex || '#f2f0ea', w: 1 }];
  const colours = palette.map((p) => ({ rgb: hexToRgb(p.c), weight: Math.max(0, p.w ?? 1) }));
  const total = colours.reduce((sum, p) => sum + p.weight, 0) || 1;
  const mean = [0, 1, 2].map((channel) => colours.reduce((sum, p) => sum + p.rgb[channel] * p.weight, 0) / total);
  const rand = rng(seed);
  const blended = /blend|brooklyn|chelsea|tribeca|hampton|elkhorn|leura|blackheath|sea fossil|ocean mist/i.test(brick?.name || '');
  const variation = blended ? 0.88 : 0.72;
  const brickColours = Array.from({ length: surface.count }, () => {
    let choice = rand() * total;
    const selected = colours.find((p) => (choice -= p.weight) <= 0) || colours[0];
    const tone = 0.98 + rand() * 0.04;
    return selected.rgb.map((v, channel) => (v * variation + mean[channel] * (1 - variation)) * tone);
  });
  const mortar = hexToRgb(mortarHex || '#ddd8ce');
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const pixels = ctx.createImageData(size, size);
  for (let p = 0; p < size * size; p++) {
    const colour = brickColours[surface.brickIds[p]];
    const face = surface.coverage[p] / 255;
    const grain = 1 + surface.tone[p] / 1024;
    const i = p * 4;
    for (let channel = 0; channel < 3; channel++) {
      pixels.data[i + channel] = (colour[channel] * face + mortar[channel] * (1 - face)) * grain;
    }
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

// Backward-compatible name: this function has always returned a normal map.
export function brickHeight(size, bond, doubleHeight, joint = 'ironed') {
  return brickSurfaceMaps(size, bond, doubleHeight, joint).normal;
}

// Small preview tile for the mortar-joint option cards.
export function jointSwatch(joint, w = 220, h = 120) {
  const J = BRICK_JOINTS[joint] || BRICK_JOINTS.ironed;
  const c = makeCanvas(w, h);
  const x = c.getContext('2d');
  const rows = 3;
  const cols = 2;
  const bh = h / rows;
  const bw = w / cols;
  const m = Math.max(3, bh * 0.14 * J.width);
  x.fillStyle = '#cfc9bd';
  x.fillRect(0, 0, w, h);
  for (let r = 0; r < rows; r++) {
    for (let k = -1; k <= cols; k++) {
      const px = (k + (r % 2 ? 0.5 : 0)) * bw + m / 2;
      const py = r * bh + m / 2;
      const pw = bw - m;
      const ph = bh - m;
      x.fillStyle = '#b4674a';
      x.fillRect(px, py, pw, ph);
      x.fillStyle = `rgba(0,0,0,${J.shadow})`;
      x.fillRect(px - m / 2, py - m / 2, pw + m, m * 0.62);
      x.fillStyle = `rgba(255,255,255,${J.arris})`;
      x.fillRect(px, py, pw, m * 0.38);
    }
  }
  return c;
}

// ---------------------------------------------------------------- roof
// Concrete tiles are 300 mm cover x 320 mm gauge, so one texture spans four
// tiles across and four courses down.
export const ROOF_TILE_SIZE = { w: 1.2, h: 1.28 };
const ROOF_COLS = 4;
const ROOF_ROWS = 4;

// Cross-section of one tile, u = 0..1 across its cover width.
// Returns { h: 0..1 relief, s: -1..1 shading bias (+ crown, - valley) }.
const ROOF_PROFILE = {
  // Marseille-style pan tile: one bold barrel roll then a flat pan.
  designer(u) {
    if (u < 0.42) {
      const k = u / 0.42; // 0..1 across the roll
      const h = Math.sin(k * Math.PI) ** 0.7;
      return { h: 0.28 + 0.72 * h, s: Math.cos((k - 0.42) * Math.PI) * 0.9 };
    }
    const k = (u - 0.42) / 0.58;
    return { h: 0.34 + 0.1 * Math.sin(k * Math.PI), s: -0.25 + 0.2 * Math.sin(k * Math.PI) };
  },
  // Low-profile tile: a narrow roll at the side lap, the rest a flat pan.
  classic(u) {
    if (u < 0.2) {
      const k = u / 0.2;
      const h = Math.sin(k * Math.PI) ** 0.6;
      return { h: 0.3 + 0.7 * h, s: Math.cos((k - 0.4) * Math.PI) * 0.8 };
    }
    const k = (u - 0.2) / 0.8;
    return { h: 0.36 + 0.07 * Math.sin(k * Math.PI), s: -0.18 + 0.14 * Math.sin(k * Math.PI) };
  },
  // Flat slate-look tile: square butt, a fine groove at each side lap.
  prestige(u) {
    if (u < 0.035) return { h: 0.04, s: -1 };
    if (u > 0.975) return { h: 0.3, s: 0.35 };
    return { h: 0.62, s: -0.05 };
  },
};

// Where the course line sits across one tile. Rolled tiles ride up over the
// roll below them, so the shadow line is scalloped, not straight.
const ROOF_COURSE = {
  designer: (u) => (u < 0.42 ? 0.055 + 0.075 * Math.sin((u / 0.42) * Math.PI) : 0.05),
  classic: (u) => (u < 0.2 ? 0.05 + 0.055 * Math.sin((u / 0.2) * Math.PI) : 0.045),
  prestige: () => 0.05,
};

export function roofMaps(profile, size = 1024) {
  const W = size;
  const H = size;
  const alb = makeCanvas(W, H);
  const bx = alb.getContext('2d');
  const hc = makeCanvas(W, H);
  const ao = makeCanvas(W, H);

  if (profile === 'colorbond') return corrugatedMaps(W, H, alb, bx, hc, ao);

  const prof = ROOF_PROFILE[profile] || ROOF_PROFILE.designer;
  const course = ROOF_COURSE[profile] || ROOF_COURSE.designer;
  const tw = W / ROOF_COLS;
  const th = H / ROOF_ROWS;
  const rand = rng(profile.length * 131 + 7);

  // Per-tile tone variation, the way a real concrete roof never sits flat.
  const tone = [];
  for (let r = 0; r < ROOF_ROWS; r++) {
    tone[r] = [];
    for (let c = 0; c < ROOF_COLS; c++) tone[r][c] = 1 + (rand() - 0.5) * 0.17;
  }

  const albImg = bx.createImageData(W, H);
  const hImg = hc.getContext('2d').createImageData(W, H);
  const aoCtx = ao.getContext('2d');
  const aoImg = aoCtx.createImageData(W, H);
  const stagger = profile === 'prestige';

  for (let y = 0; y < H; y++) {
    const row = Math.floor(y / th);
    const t = (y - row * th) / th; // 0 at the head (covered), 1 at the exposed butt
    const off = stagger && row % 2 ? tw / 2 : 0;
    for (let x = 0; x < W; x++) {
      const col = Math.floor((((x + off) % W) + W) % W / tw);
      const u = ((((x + off) % tw) + tw) % tw) / tw;
      const p = prof(u);
      const head = course(u);

      // Head of the course: the tile above laps over it — a hard, dark step.
      const lap = t < head ? t / head : 1;
      const stepped = t < head;
      const relief = stepped ? p.h * 0.18 : p.h;

      // Side lap between neighbouring tiles reads as a fine dark line.
      const sideLap = u < 0.02 || u > 0.985;

      // --- albedo: tone + baked course shadow + roll shading
      let k = tone[row][col];
      k *= stepped ? 0.30 + 0.45 * lap : 1;        // shadow under the overlap
      k *= 1 + p.s * 0.13;                          // crown lighter, valley darker
      if (sideLap) k *= 0.62;
      if (!stepped && t < head + 0.07) k *= 0.80 + 0.2 * ((t - head) / 0.07); // contact shade
      k *= 0.97 + rand() * 0.06;                    // fine grain
      const v = Math.max(0, Math.min(255, 238 * k));
      const i = (y * W + x) * 4;
      albImg.data[i] = albImg.data[i + 1] = albImg.data[i + 2] = v;
      albImg.data[i + 3] = 255;

      // --- height
      hImg.data[i] = hImg.data[i + 1] = hImg.data[i + 2] = Math.round(
        (sideLap ? relief * 0.35 : relief) * 255,
      );
      hImg.data[i + 3] = 255;

      // --- ambient occlusion
      let occ = 1;
      if (stepped) occ = 0.18 + 0.5 * lap;
      else if (t < head + 0.1) occ = 0.68 + 0.32 * ((t - head) / 0.1);
      if (sideLap) occ *= 0.55;
      occ *= 0.82 + 0.18 * (p.h);
      const o = Math.round(Math.max(0, Math.min(1, occ)) * 255);
      aoImg.data[i] = aoImg.data[i + 1] = aoImg.data[i + 2] = o;
      aoImg.data[i + 3] = 255;
    }
  }
  bx.putImageData(albImg, 0, 0);
  hc.getContext('2d').putImageData(hImg, 0, 0);
  aoCtx.putImageData(aoImg, 0, 0);

  // soften the height a touch so the normals are not stair-stepped
  const hx = hc.getContext('2d');
  hx.filter = 'blur(1.2px)';
  hx.drawImage(hc, 0, 0);
  hx.filter = 'none';

  const grain = noiseCanvas(512, { base: 28, octaves: 3, seed: 17 });
  bx.globalAlpha = 0.1;
  bx.globalCompositeOperation = 'multiply';
  bx.drawImage(grain, 0, 0, W, H);
  bx.globalCompositeOperation = 'source-over';
  bx.globalAlpha = 1;

  return { albedo: alb, normal: heightToNormal(hc, profile === 'prestige' ? 4 : 5.5), ao };
}

// Colorbond Classic corrugated sheet: 76 mm pitch, ribs running down the slope.
function corrugatedMaps(W, H, alb, bx, hc, ao) {
  const pitch = W / Math.round(ROOF_TILE_SIZE.w / 0.076);
  const hImg = hc.getContext('2d').createImageData(W, H);
  const albImg = bx.createImageData(W, H);
  const aoCtx = ao.getContext('2d');
  const aoImg = aoCtx.createImageData(W, H);
  for (let x = 0; x < W; x++) {
    const phase = ((x / pitch) % 1) * Math.PI * 2;
    const h = 0.5 + 0.5 * Math.sin(phase);
    // baked cylinder shading so the ribs read even in flat light
    const shade = 0.86 + 0.16 * Math.sin(phase - 0.5);
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4;
      // sheets lap every 1.2 m down the slope
      const lap = y < 4 ? 0.55 + 0.11 * y : 1;
      const v = Math.max(0, Math.min(255, 240 * shade * lap));
      albImg.data[i] = albImg.data[i + 1] = albImg.data[i + 2] = v;
      albImg.data[i + 3] = 255;
      hImg.data[i] = hImg.data[i + 1] = hImg.data[i + 2] = Math.round(h * 255);
      hImg.data[i + 3] = 255;
      const o = Math.round(Math.min(1, (0.72 + 0.28 * h) * lap) * 255);
      aoImg.data[i] = aoImg.data[i + 1] = aoImg.data[i + 2] = o;
      aoImg.data[i + 3] = 255;
    }
  }
  bx.putImageData(albImg, 0, 0);
  hc.getContext('2d').putImageData(hImg, 0, 0);
  aoCtx.putImageData(aoImg, 0, 0);
  const n = noiseCanvas(256, { base: 4, octaves: 3, seed: 91 });
  bx.globalAlpha = 0.05;
  bx.globalCompositeOperation = 'multiply';
  bx.drawImage(n, 0, 0, W, H);
  bx.globalCompositeOperation = 'source-over';
  bx.globalAlpha = 1;
  return { albedo: alb, normal: heightToNormal(hc, 3), ao };
}

// ---------------------------------------------------------------- cladding
export const CLAD_TILE = { axon: 1.064, stria: 1.62, linea: 1.44 };
export function claddingMaps(kind, size = 1024) {
  const W = size;
  const H = size;
  const hc = makeCanvas(W, H);
  const hx = hc.getContext('2d');
  const ao = makeCanvas(W, H);
  const ax = ao.getContext('2d');
  hx.fillStyle = '#c0c0c0';
  hx.fillRect(0, 0, W, H);
  ax.fillStyle = '#fff';
  ax.fillRect(0, 0, W, H);
  if (kind === 'axon') {
    const n = 8;
    const p = W / n;
    for (let i = 0; i < n; i++) {
      hx.fillStyle = '#303030';
      hx.fillRect(i * p, 0, p * 0.03, H);
      ax.fillStyle = 'rgba(0,0,0,0.5)';
      ax.fillRect(i * p, 0, p * 0.035, H);
    }
  } else if (kind === 'stria') {
    const n = 4;
    const p = H / n;
    for (let i = 0; i < n; i++) {
      const g = hx.createLinearGradient(0, i * p, 0, i * p + p);
      g.addColorStop(0, '#2a2a2a');
      g.addColorStop(0.04, '#c8c8c8');
      g.addColorStop(1, '#c0c0c0');
      hx.fillStyle = g;
      hx.fillRect(0, i * p, W, p);
      ax.fillStyle = 'rgba(0,0,0,0.45)';
      ax.fillRect(0, i * p, W, p * 0.035);
    }
  } else {
    const n = 8;
    const p = H / n;
    for (let i = 0; i < n; i++) {
      // weatherboard: thin at top, thick at the bottom edge, shadow below
      const g = hx.createLinearGradient(0, i * p, 0, i * p + p);
      g.addColorStop(0, '#303030');
      g.addColorStop(0.9, '#e8e8e8');
      g.addColorStop(1, '#f0f0f0');
      hx.fillStyle = g;
      hx.fillRect(0, i * p, W, p);
      const s = ax.createLinearGradient(0, i * p, 0, i * p + p * 0.3);
      s.addColorStop(0, 'rgba(0,0,0,0.55)');
      s.addColorStop(1, 'rgba(0,0,0,0)');
      ax.fillStyle = s;
      ax.fillRect(0, i * p, W, p * 0.3);
    }
  }
  const nz = noiseCanvas(512, { base: 48, octaves: 2, seed: 3 });
  hx.globalAlpha = 0.05;
  hx.drawImage(nz, 0, 0, W, H);
  hx.globalAlpha = 1;
  return { normal: heightToNormal(hc, kind === 'axon' ? 5 : 3), ao };
}

// ---------------------------------------------------------------- render (Acratex)
export function renderMaps(photo, size = 1024) {
  const hc = makeCanvas(size, size);
  const hx = hc.getContext('2d');
  // mirror-tile the swatch photo so it is seamless
  const half = size / 2;
  hx.filter = 'grayscale(1) contrast(1.4)';
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    hx.save();
    hx.translate(half, half);
    hx.scale(sx, sy);
    hx.drawImage(photo, 0, 0, half, half);
    hx.restore();
  }
  hx.filter = 'none';
  const alb = makeCanvas(512, 512);
  const bx = alb.getContext('2d');
  bx.fillStyle = '#fff';
  bx.fillRect(0, 0, 512, 512);
  const n = noiseCanvas(256, { base: 3, octaves: 4, seed: 41 });
  bx.globalAlpha = 0.07;
  bx.globalCompositeOperation = 'multiply';
  bx.drawImage(n, 0, 0, 512, 512);
  return { normal: heightToNormal(hc, 1.6), albedo: alb };
}

// ---------------------------------------------------------------- garage door
export function garageMaps(kind, W = 1024, H = 512) {
  const hc = makeCanvas(W, H);
  const hx = hc.getContext('2d');
  const ao = makeCanvas(W, H);
  const ax = ao.getContext('2d');
  // Baked shading: multiplied over whatever colour the door is painted, so the
  // profile still reads on Monument as clearly as it does on Surfmist.
  const sh = makeCanvas(W, H);
  const sx = sh.getContext('2d');
  hx.fillStyle = '#909090';
  hx.fillRect(0, 0, W, H);
  ax.fillStyle = '#fff';
  ax.fillRect(0, 0, W, H);
  sx.fillStyle = '#fff';
  sx.fillRect(0, 0, W, H);

  // A raised panel: light along its top/left arris, dark along bottom/right.
  const emboss = (x, y, w, h, depth = 1) => {
    sx.lineWidth = Math.max(2, W * 0.004);
    sx.strokeStyle = `rgba(0,0,0,${0.30 * depth})`;
    sx.beginPath();
    sx.moveTo(x, y + h);
    sx.lineTo(x + w, y + h);
    sx.lineTo(x + w, y);
    sx.stroke();
    sx.strokeStyle = `rgba(255,255,255,${0.42 * depth})`;
    sx.beginPath();
    sx.moveTo(x, y + h);
    sx.lineTo(x, y);
    sx.lineTo(x + w, y);
    sx.stroke();
    // slight dish inside the panel
    const g = sx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, `rgba(0,0,0,${0.10 * depth})`);
    g.addColorStop(1, 'rgba(255,255,255,0.05)');
    sx.fillStyle = g;
    sx.fillRect(x, y, w, h);
  };

  const sections = 4;
  const sh_ = H / sections;
  const joint = (y) => {
    hx.fillStyle = '#202020';
    hx.fillRect(0, y - 2, W, 4);
    ax.fillStyle = 'rgba(0,0,0,0.55)';
    ax.fillRect(0, y - 2, W, 5);
    // hard shadow line under each section, with a highlight on the lip below
    sx.fillStyle = 'rgba(0,0,0,0.42)';
    sx.fillRect(0, y - 3, W, 6);
    sx.fillStyle = 'rgba(255,255,255,0.22)';
    sx.fillRect(0, y + 3, W, 3);
  };

  if (kind === 'battens') {
    const n = 60;
    const p = W / n;
    for (let i = 0; i < n; i++) {
      hx.fillStyle = '#202020';
      hx.fillRect(i * p, 0, p * 0.28, H);
      ax.fillStyle = 'rgba(0,0,0,0.5)';
      ax.fillRect(i * p, 0, p * 0.3, H);
      sx.fillStyle = 'rgba(0,0,0,0.45)';
      sx.fillRect(i * p, 0, p * 0.28, H);
      sx.fillStyle = 'rgba(255,255,255,0.20)';
      sx.fillRect(i * p + p * 0.28, 0, p * 0.16, H);
    }
  } else {
    for (let s2 = 0; s2 < sections; s2++) {
      const y0 = s2 * sh_;
      if (s2) joint(y0);
      if (kind === 'slimline') {
        for (let k = 1; k < 5; k++) {
          const y = y0 + (sh_ * k) / 5;
          hx.fillStyle = '#6a6a6a';
          hx.fillRect(0, y - 1, W, 2);
          ax.fillStyle = 'rgba(0,0,0,0.15)';
          ax.fillRect(0, y, W, 2);
          sx.fillStyle = 'rgba(0,0,0,0.26)';
          sx.fillRect(0, y - 1, W, 2);
          sx.fillStyle = 'rgba(255,255,255,0.16)';
          sx.fillRect(0, y + 1, W, 2);
        }
      } else if (kind === 'ranch' || kind === 'heritage') {
        const n = kind === 'ranch' ? 2 : 6;
        const mx = W * 0.02;
        const gap = W * 0.015;
        const pw = (W - mx * 2 - gap * (n - 1)) / n;
        for (let k = 0; k < n; k++) {
          const x = mx + k * (pw + gap);
          const y = y0 + sh_ * 0.18;
          const h = sh_ * 0.64;
          hx.fillStyle = '#5a5a5a';
          hx.fillRect(x, y, pw, h);
          hx.fillStyle = '#b8b8b8';
          hx.fillRect(x + 6, y + 6, pw - 12, h - 12);
          ax.strokeStyle = 'rgba(0,0,0,0.25)';
          ax.lineWidth = 3;
          ax.strokeRect(x + 1.5, y + 1.5, pw - 3, h - 3);
          emboss(x, y, pw, h);
        }
      }
      // Flatline is a plain pan — the section joints alone carry it.
    }
  }
  const nz = noiseCanvas(256, { base: 32, octaves: 2, seed: 8, w: 512, h: 256 });
  hx.globalAlpha = 0.04;
  hx.drawImage(nz, 0, 0, W, H);
  hx.globalAlpha = 1;
  return { normal: heightToNormal(hc, kind === 'battens' ? 4 : 3), ao, shade: sh };
}

// ---------------------------------------------------------------- ground surfaces
export function concreteAlbedo(size, opt) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const rand = rng(opt.id?.length * 13 || 5);
  ctx.fillStyle = opt.base;
  ctx.fillRect(0, 0, size, size);
  const n = noiseCanvas(512, { base: 4, octaves: 6, seed: 61 });
  ctx.globalAlpha = 0.22;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(n, 0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  if (opt.kind === 'aggregate') {
    for (let i = 0; i < size * size * 0.05; i++) {
      const r = 0.6 + rand() * 2.2;
      ctx.fillStyle = shade(opt.stones[(rand() * opt.stones.length) | 0], 0.9 + rand() * 0.25, 0.1, rand);
      ctx.beginPath();
      ctx.ellipse(rand() * size, rand() * size, r, r * (0.6 + rand() * 0.4), rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (opt.kind === 'pavers') {
    const cols = 4;
    const rows = 8;
    const pw = size / cols;
    const ph = size / rows;
    for (let r = 0; r < rows; r++) {
      for (let k = -1; k < cols + 1; k++) {
        const x = k * pw + (r % 2 ? pw / 2 : 0);
        ctx.fillStyle = shade(opt.base, 0.9 + rand() * 0.2, 0.05, rand);
        ctx.fillRect(x + 2, r * ph + 2, pw - 4, ph - 4);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, r * ph, size, 2);
    }
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k <= cols; k++) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(k * pw + (r % 2 ? pw / 2 : 0) - 1, r * ph, 2, ph);
      }
    }
    ctx.globalAlpha = 0.18;
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(n, 0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  } else {
    // broom finish streaks + saw-cut joint at the tile edge
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rand() < 0.5 ? '#000' : '#fff';
      ctx.fillRect(rand() * size, 0, 1, size);
    }
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, 2);
    ctx.fillRect(0, 0, 2, size);
    ctx.globalAlpha = 1;
  }
  return c;
}

// Studio floor grid — transparent, with the rules faded out radially so the
// plane dissolves into the backdrop instead of ending on a hard edge. `span` is
// the width of the ground in metres the canvas is stretched across (no tiling,
// so the fade can be baked straight in).
export function gridCanvas(size, span, { minor = 1, major = 5, colour = '#5d6773' } = {}) {
  const px = size / span;
  // One set of rules, masked to fade out `reach` metres from the middle.
  const rules = (step, width, reach) => {
    const c = makeCanvas(size, size);
    const ctx = c.getContext('2d');
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let w = -span / 2; w <= span / 2 + 1e-6; w += step) {
      const p = Math.round((w + span / 2) * px) + 0.5;
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
    }
    ctx.stroke();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, reach * px);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return c;
  };
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  // minors drop away first, so the far field reads as clean 5m rules
  ctx.globalAlpha = 0.5;
  ctx.drawImage(rules(minor, Math.max(1.25, px * 0.055), span * 0.28), 0, 0);
  ctx.globalAlpha = 1;
  ctx.drawImage(rules(major, Math.max(2, px * 0.11), span * 0.5), 0, 0);
  return c;
}

// Equirectangular sky (top half) + soft ground (bottom half) for lighting & backdrop.
export function skyCanvas(mode = 'day', W = 2048, H = 1024) {
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H / 2);
  if (mode === 'dusk') {
    g.addColorStop(0, '#1d2b4f');
    g.addColorStop(0.45, '#4a5a86');
    g.addColorStop(0.8, '#b58ea0');
    g.addColorStop(1, '#f0b98e');
  } else {
    g.addColorStop(0, '#2c64ad');
    g.addColorStop(0.4, '#4f86c8');
    g.addColorStop(0.78, '#86b0df');
    g.addColorStop(0.94, '#b3cde8');
    g.addColorStop(1, '#d3e0ea');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H / 2 + 2);
  // soft clouds
  const n = noiseCanvas(512, { base: 6, octaves: 6, seed: 202, w: 1024, h: 256 });
  const cl = makeCanvas(1024, 256);
  const cx = cl.getContext('2d');
  cx.drawImage(n, 0, 0);
  const id = cx.getImageData(0, 0, 1024, 256);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = id.data[i] / 255;
    const a = Math.max(0, Math.min(1, (v - 0.6) * 2.4));
    id.data[i] = id.data[i + 1] = id.data[i + 2] = mode === 'dusk' ? 225 : 255;
    id.data[i + 3] = a * (mode === 'dusk' ? 80 : 120);
  }
  cx.putImageData(id, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = mode === 'dusk' ? 'soft-light' : 'source-over';
  ctx.drawImage(cl, 0, H * 0.12, W, H * 0.34);
  ctx.restore();
  // sun glow
  if (mode === 'day') {
    const sg = ctx.createRadialGradient(W * 0.62, H * 0.2, 0, W * 0.62, H * 0.2, H * 0.3);
    sg.addColorStop(0, 'rgba(255,250,235,0.9)');
    sg.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H / 2);
  } else {
    const sg = ctx.createRadialGradient(W * 0.25, H * 0.5, 0, W * 0.25, H * 0.5, H * 0.35);
    sg.addColorStop(0, 'rgba(255,190,130,0.8)');
    sg.addColorStop(1, 'rgba(255,190,130,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H / 2);
  }
  // distant tree line on the horizon
  const rand = rng(5);
  ctx.fillStyle = mode === 'dusk' ? '#1f2a26' : '#8a9c95';
  ctx.globalAlpha = mode === 'dusk' ? 0.85 : 0.5;
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  for (let x = 0; x <= W; x += 6) ctx.lineTo(x, H / 2 - 2 - rand() * 6 - Math.max(0, Math.sin(x * 0.013)) * 5);
  ctx.lineTo(W, H / 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // ground hemisphere
  const gg = ctx.createLinearGradient(0, H / 2, 0, H);
  gg.addColorStop(0, mode === 'dusk' ? '#2d3528' : '#7d8f6a');
  gg.addColorStop(1, mode === 'dusk' ? '#151a14' : '#4a5a3a');
  ctx.fillStyle = gg;
  ctx.fillRect(0, H / 2, W, H / 2);
  return c;
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ---------------------------------------------------------------- window screens
// Flyscreen and barrier screen weaves (guide p.18-19). Threads are drawn at
// their real pitch and the gaps stay transparent, so the screen reads as a fine
// veil at street distance and as a weave close up.
export const SCREEN_MESH = {
  fibreglass: { pitch: 0.0022, thread: 0.34, hex: '#2f2f2f', alpha: 1 },
  aluminium: { pitch: 0.0024, thread: 0.32, hex: '#9d9d9d', alpha: 1 },
  stainless: { pitch: 0.0022, thread: 0.38, hex: '#8b8b8b', alpha: 1 },
  midge: { pitch: 0.0013, thread: 0.46, hex: '#4a4a4a', alpha: 1 },
  pet: { pitch: 0.0035, thread: 0.5, hex: '#262626', alpha: 1 },
  homestyle: { pitch: 0.0021, thread: 0.52, hex: '#6f6f6f', alpha: 1 },
};
const SCREEN_THREADS = 24; // threads across one texture tile

export const screenTile = (kind) => (SCREEN_MESH[kind] || SCREEN_MESH.fibreglass).pitch * SCREEN_THREADS;

export function screenCanvas(kind, size = 256) {
  const m = SCREEN_MESH[kind] || SCREEN_MESH.fibreglass;
  const c = makeCanvas(size, size);
  const x = c.getContext('2d');
  x.clearRect(0, 0, size, size);
  const p = size / SCREEN_THREADS;
  const t = p * m.thread;
  // warp then weft, the weft slightly darker where it passes under
  x.fillStyle = m.hex;
  for (let i = 0; i < SCREEN_THREADS; i++) x.fillRect(i * p, 0, t, size);
  x.fillStyle = shade(m.hex, 0.82);
  for (let i = 0; i < SCREEN_THREADS; i++) x.fillRect(0, i * p, size, t);
  // a soft highlight along each warp thread so the weave catches the light
  x.globalAlpha = 0.35;
  x.fillStyle = shade(m.hex, 1.7);
  for (let i = 0; i < SCREEN_THREADS; i++) x.fillRect(i * p, 0, Math.max(1, t * 0.3), size);
  x.globalAlpha = 1;
  return c;
}

// Diamond grille: 8 mm apertures in a powdercoated lattice, drawn as a repeat.
export const BARRIER_TILE = 0.076;
export function barrierCanvas(size = 256) {
  const c = makeCanvas(size, size);
  const x = c.getContext('2d');
  x.clearRect(0, 0, size, size);
  const n = 6; // diamonds per tile
  const p = size / n;
  x.lineWidth = Math.max(2, p * 0.22);
  x.lineCap = 'square';
  for (const [dir, hex] of [[1, '#7e7e7e'], [-1, '#5f5f5f']]) {
    x.strokeStyle = hex;
    x.beginPath();
    for (let k = -n; k <= n * 2; k++) {
      const off = k * p;
      x.moveTo(dir > 0 ? off : off, 0);
      x.lineTo(dir > 0 ? off + size : off - size, size);
    }
    x.stroke();
  }
  return c;
}
