import { Mesh, VertexData } from './babylon.js';

// Accumulates quads/triangles for one material, then emits a single mesh.
// UVs are in metres (world-planar) unless given explicitly.
export class Geo {
  constructor() {
    this.p = [];
    this.n = [];
    this.uv = [];
    this.i = [];
  }

  get count() {
    return this.p.length / 3;
  }

  // Polygon (3 or 4 verts) with outward normal `nrm`; winding fixed automatically.
  poly(verts, nrm, uvs) {
    const [a, b, c] = verts;
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const dot = cr[0] * nrm[0] + cr[1] * nrm[1] + cr[2] * nrm[2];
    let vs = verts;
    let us = uvs;
    if (dot > 0) {
      vs = [...verts].reverse();
      us = uvs && [...uvs].reverse();
    }
    const base = this.count;
    vs.forEach((v, k) => {
      this.p.push(v[0], v[1], v[2]);
      this.n.push(nrm[0], nrm[1], nrm[2]);
      const uv = us ? us[k] : planarUV(v, nrm);
      this.uv.push(uv[0], uv[1]);
    });
    this.i.push(base, base + 1, base + 2);
    if (vs.length === 4) this.i.push(base, base + 2, base + 3);
  }

  // Axis-aligned box. opts.skip: set of faces to omit ('px','nx','py','ny','pz','nz').
  // opts.uv: 'world' (default) | 'vertical' (swap u/v for vertical grain) | 'unit'
  box(x0, y0, z0, x1, y1, z1, opts = {}) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (y0 > y1) [y0, y1] = [y1, y0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    const skip = opts.skip || new Set();
    const mode = opts.uv || 'world';
    const faces = {
      px: [[[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], [1, 0, 0]],
      nx: [[[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]], [-1, 0, 0]],
      py: [[[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0]],
      ny: [[[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]], [0, -1, 0]],
      pz: [[[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]], [0, 0, 1]],
      nz: [[[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], [0, 0, -1]],
    };
    for (const [k, [vs, nrm]] of Object.entries(faces)) {
      if (skip.has(k)) continue;
      let uvs;
      if (mode === 'vertical') uvs = vs.map((v) => planarUV(v, nrm)).map(([u, v]) => [v, u]);
      else if (mode === 'unit') uvs = [[0, 0], [1, 0], [1, 1], [0, 1]];
      this.poly(vs, nrm, uvs);
    }
  }

  toMesh(name, scene, material) {
    const mesh = new Mesh(name, scene);
    if (this.count) {
      const vd = new VertexData();
      vd.positions = this.p;
      vd.normals = this.n;
      vd.uvs = this.uv;
      vd.indices = this.i;
      vd.applyToMesh(mesh);
    }
    mesh.material = material || null;
    return mesh;
  }
}

export function planarUV(v, n) {
  const ax = Math.abs(n[0]);
  const ay = Math.abs(n[1]);
  const az = Math.abs(n[2]);
  if (ay >= ax && ay >= az) return [v[0], v[2]];
  if (ax >= az) return [n[0] > 0 ? v[2] : -v[2], v[1]];
  return [n[2] > 0 ? -v[0] : v[0], v[1]];
}

// A wall in local coordinates: s runs along the wall, y is up, d is outward.
// origin is the outer-face start point; dir is ±x or ±z unit; out is outward normal.
export class Wall {
  constructor({ origin, dir, out }) {
    this.o = origin;
    this.u = dir;
    this.n = out;
  }

  world(s, y, d) {
    return [
      this.o[0] + this.u[0] * s + this.n[0] * d,
      this.o[1] + y,
      this.o[2] + this.u[2] * s + this.n[2] * d,
    ];
  }

  // Box spanning local ranges → world AABB box on a Geo.
  box(geo, s0, s1, y0, y1, d0, d1, opts) {
    const a = this.world(s0, y0, d0);
    const b = this.world(s1, y1, d1);
    geo.box(a[0], a[1], a[2], b[0], b[1], b[2], opts);
  }

  // Solid wall from s0..s1, y0..y1, thickness t (inwards), with rectangular openings.
  solid(geo, s0, s1, y0, y1, t, openings = [], opts) {
    const xs = new Set([s0, s1]);
    const ys = new Set([y0, y1]);
    for (const o of openings) {
      xs.add(Math.max(s0, Math.min(s1, o.s0)));
      xs.add(Math.max(s0, Math.min(s1, o.s1)));
      ys.add(Math.max(y0, Math.min(y1, o.y0)));
      ys.add(Math.max(y0, Math.min(y1, o.y1)));
    }
    const X = [...xs].sort((a, b) => a - b);
    const Y = [...ys].sort((a, b) => a - b);
    const inside = (sx, sy) => openings.some((o) => sx > o.s0 && sx < o.s1 && sy > o.y0 && sy < o.y1);
    // merge cells column-wise to reduce geometry
    for (let i = 0; i < X.length - 1; i++) {
      let start = null;
      for (let j = 0; j < Y.length - 1; j++) {
        const cx = (X[i] + X[i + 1]) / 2;
        const cy = (Y[j] + Y[j + 1]) / 2;
        const solidCell = !inside(cx, cy) && X[i + 1] - X[i] > 1e-4 && Y[j + 1] - Y[j] > 1e-4;
        if (solidCell && start === null) start = Y[j];
        if ((!solidCell || j === Y.length - 2) && start !== null) {
          const end = solidCell ? Y[j + 1] : Y[j];
          this.box(geo, X[i], X[i + 1], start, end, 0, -t, opts);
          start = null;
        }
      }
    }
  }
}

