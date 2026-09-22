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

// Wrap-aware rectangle drawing helper for tileable patterns.
function wrapRect(ctx, W, H, x, y, w, h, draw) {
  for (const ox of [0, -W, W]) {
    for (const oy of [0, -H, H]) {
      if (x + ox + w < 0 || x + ox > W || y + oy + h < 0 || y + oy > H) continue;
      draw(x + ox, y + oy, w, h);
    }
  }
}

// ---------------------------------------------------------------- bricks
// World tile covers BRICK_TILE metres. Brick 230 × 76 (+10 mortar) → 240 × 86 mm.
export const BRICK_TILE = { w: 1.68, h: 1.72 }; // 7 bricks × 20 courses

// Guide p.20. A round (ironed) joint is tooled concave so it throws a shadow
// line along every course; a flush joint is struck level with the brick face
// and almost disappears.
export const BRICK_JOINTS = {
  ironed: { depth: 1.0, shadow: 0.42, arris: 0.30, width: 1.0 },
  flush: { depth: 0.18, shadow: 0.10, arris: 0.08, width: 0.92 },
};
function brickLayout(bond, doubleHeight) {
  const cols = 7;
  const rows = doubleHeight ? 10 : 20;
  const rowsOut = [];
  for (let r = 0; r < rows; r++) {
    const offset = bond === 'stack' ? 0 : r % 2 ? 0.5 : 0;
    rowsOut.push({ r, offset });
  }
  return { cols, rows, rowsOut };
}

export function brickAlbedo(size, brick, mortarHex, bond, seed = 3, joint = 'ironed') {
  const J = BRICK_JOINTS[joint] || BRICK_JOINTS.ironed;
  const W = size;
  const H = size;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const rand = rng(seed);
  const { cols, rows, rowsOut } = brickLayout(bond, brick?.doubleHeight);
  const bw = W / cols;
  const bh = H / rows;
  const mortar = Math.max(2, Math.round(bh * (brick?.doubleHeight ? 0.06 : 0.12) * J.width));
  // mortar bed
  ctx.fillStyle = mortarHex;
  ctx.fillRect(0, 0, W, H);
  const grain = noiseCanvas(256, { base: 16, octaves: 3, seed: 11 });
  ctx.globalAlpha = 0.35;
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(grain, 0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  const pal = brick?.palette?.length ? brick.palette : [{ c: '#f2f0ea', w: 1 }];
  const pick = () => {
    let t = rand() * pal.reduce((s, p) => s + p.w, 0);
    for (const p of pal) if ((t -= p.w) <= 0) return p.c;
    return pal[0].c;
  };
  const fine = noiseCanvas(512, { base: 32, octaves: 3, seed: 23 });
  const blend = pal.length > 3 && /blend|brooklyn|chelsea|tribeca|hampton|elkhorn|leura|blackheath|sea fossil|ocean mist/i.test(brick?.name || '');
  for (const { r, offset } of rowsOut) {
    for (let k = 0; k < cols; k++) {
      const x = (k + offset) * bw + mortar / 2;
      const y = r * bh + mortar / 2;
      const w = bw - mortar;
      const h = bh - mortar;
      const base = pick();
      const f = 0.9 + rand() * 0.18;
      wrapRect(ctx, W, H, x, y, w, h, (px, py, pw, ph) => {
        ctx.fillStyle = shade(base, f, 0.05, rand);
        ctx.fillRect(px, py, pw, ph);
        // surface grain
        ctx.globalAlpha = 0.16;
        ctx.globalCompositeOperation = 'overlay';
        const sx = rand() * 400;
        const sy = rand() * 400;
        ctx.drawImage(fine, sx, sy, 100, 100 * (ph / pw), px, py, pw, ph);
        ctx.globalCompositeOperation = 'source-over';
        // mottled / blended bricks get patches of the other palette colours
        const patches = blend ? 4 : 1;
        for (let s = 0; s < patches; s++) {
          ctx.globalAlpha = blend ? 0.38 : 0.1;
          ctx.fillStyle = shade(pick(), 1, 0.1, rand);
          const rw = pw * (0.15 + rand() * 0.45);
          const rh = ph * (0.3 + rand() * 0.7);
          ctx.beginPath();
          ctx.ellipse(px + rand() * pw, py + rand() * ph, rw / 2, rh / 2, 0, 0, Math.PI * 2);
          ctx.save();
          ctx.clip(new Path2D(`M${px} ${py}h${pw}v${ph}h${-pw}z`));
          ctx.fill();
          ctx.restore();
        }
        // speckles
        ctx.globalAlpha = 0.32;
        const spots = 4 + (rand() * 8) | 0;
        for (let s = 0; s < spots; s++) {
          ctx.fillStyle = shade(pick(), rand() < 0.5 ? 0.7 : 1.15, 0.1, rand);
          ctx.fillRect(px + rand() * pw, py + rand() * ph, 1 + rand() * 2, 1 + rand() * 2);
        }
        // soft edge darkening
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 0.75, py + 0.75, pw - 1.5, ph - 1.5);
        ctx.globalAlpha = 1;
      });
    }
  }

  // --- baked joint shading
  // The tooled joint sits below the brick face, so the head of each bed course
  // is in shadow and the arris under it catches the light. Baking it here is
  // what keeps the coursing readable from the street, where the normal map has
  // already mipped away to a flat wall.
  const shadeBand = Math.max(1, Math.round(mortar * 0.62));
  for (const { r, offset } of rowsOut) {
    for (let k = 0; k < cols; k++) {
      const x = (k + offset) * bw + mortar / 2;
      const y = r * bh + mortar / 2;
      const w = bw - mortar;
      const h = bh - mortar;
      wrapRect(ctx, W, H, x - mortar / 2, y - mortar / 2, w + mortar, h + mortar, (px, py, pw, ph) => {
        // shadow across the top of the perpend + bed joint
        ctx.fillStyle = `rgba(0,0,0,${J.shadow})`;
        ctx.fillRect(px, py, pw, shadeBand);
        ctx.fillRect(px, py, shadeBand, ph);
        // light catching the brick arris below the joint
        ctx.fillStyle = `rgba(255,255,255,${J.arris})`;
        ctx.fillRect(px, py + mortar - shadeBand * 0.5, pw, shadeBand * 0.6);
      });
    }
  }
  return c;
}

const heightCache = new Map();
export function brickHeight(size, bond, doubleHeight, joint = 'ironed') {
  const J = BRICK_JOINTS[joint] || BRICK_JOINTS.ironed;
  const key = `${size}-${bond}-${doubleHeight}-${joint}`;
  if (heightCache.has(key)) return heightCache.get(key);
  const W = size;
  const H = size;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const { cols, rows, rowsOut } = brickLayout(bond, doubleHeight);
  const bw = W / cols;
  const bh = H / rows;
  const mortar = Math.max(2, Math.round(bh * (doubleHeight ? 0.06 : 0.12) * J.width));
  // how far the joint is recessed below the brick face
  const bed = Math.round(224 - 190 * J.depth);
  ctx.fillStyle = `rgb(${bed},${bed},${bed})`;
  ctx.fillRect(0, 0, W, H);
  ctx.filter = `blur(${(1.2 * (0.4 + J.depth)).toFixed(2)}px)`;
  for (const { r, offset } of rowsOut) {
    for (let k = 0; k < cols; k++) {
      wrapRect(ctx, W, H, (k + offset) * bw + mortar / 2, r * bh + mortar / 2, bw - mortar, bh - mortar, (x, y, w, h) => {
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(x, y, w, h);
      });
    }
  }
  ctx.filter = 'none';
  const n = noiseCanvas(512, { base: 64, octaves: 2, seed: 5 });
  ctx.globalAlpha = 0.18;
  ctx.drawImage(n, 0, 0, W, H);
  ctx.globalAlpha = 1;
  const normal = heightToNormal(c, 3.2);
  heightCache.set(key, normal);
  return normal;
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
