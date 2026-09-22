// Small reusable geometry helpers for the interior: rounded boxes, lathes,
// tubes and a group builder that merges everything per material.
import { Mesh, MeshBuilder, VertexData, Vector3, Quaternion } from './babylon.js';
import { Geo } from './geometry.js';

// ---------------------------------------------------------------- group
// Collects Geo per material key plus standalone meshes, then emits meshes that
// can be disposed and rebuilt when a selection changes.
// A material key may carry the Internal category it belongs to: 'appSS#k-appliances'.
const matOf = (k) => (k.includes('#') ? k.slice(0, k.indexOf('#')) : k);
const catOf = (k) => (k.includes('#') ? k.slice(k.indexOf('#') + 1) : null);

export class Group {
  constructor(scene, materials, shadows, name, pickCat = null) {
    this.scene = scene;
    this.M = materials;
    this.shadows = shadows;
    this.name = name;
    this.pickCat = pickCat; // (group, material) -> Internal category key
    this.G = {};
    this.extra = [];
    this.meshes = [];
  }

  geo(key) {
    this.G[key] = this.G[key] || new Geo();
    return this.G[key];
  }

  box(key, x0, y0, z0, x1, y1, z1, opts) {
    this.geo(key).box(x0, y0, z0, x1, y1, z1, opts);
  }

  // add a standalone mesh (lathe, tube, rounded box…)
  add(mesh, key) {
    mesh.material = this.M[matOf(key)] || this.M.woodwork;
    mesh.metadata = { key };
    this.extra.push(mesh);
    return mesh;
  }

  finish({ shadowCast = false } = {}) {
    for (const [k, g] of Object.entries(this.G)) {
      if (!g.count) continue;
      const m = g.toMesh(`${this.name}-${k}`, this.scene, this.M[matOf(k)] || this.M.woodwork);
      m.metadata = { key: k };
      this.meshes.push(m);
    }
    this.meshes.push(...this.extra);
    for (const m of this.meshes) {
      const key = m.metadata?.key || '';
      const mat = matOf(key);
      const int = catOf(key) || this.pickCat?.(this.name, mat) || null;
      m.metadata = { interior: true, group: this.name, mat, int };
      m.isPickable = !!int; // only configurable items answer the hover/tap picker
      m.receiveShadows = true;
      if (shadowCast && this.shadows) this.shadows.addShadowCaster(m, false);
      m.freezeWorldMatrix();
    }
    return this.meshes;
  }

  dispose() {
    for (const m of this.meshes) m.dispose(false, false);
    this.meshes = [];
    this.extra = [];
    this.G = {};
  }
}

// ---------------------------------------------------------------- shapes
// Rounded box (sphere-projected cube) — cushions, mattresses, bench seats.
export function roundedBox(scene, w, h, d, r = 0.05, seg = 5) {
  const HX = w / 2;
  const HY = h / 2;
  const HZ = d / 2;
  r = Math.max(0.001, Math.min(r, HX * 0.99, HY * 0.99, HZ * 0.99));
  const hx = HX - r;
  const hy = HY - r;
  const hz = HZ - r;
  const P = [];
  const N = [];
  const U = [];
  const I = [];
  const faces = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
    [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
    [[0, -1, 0], [0, 0, -1], [1, 0, 0]],
    [[0, 0, 1], [0, 1, 0], [-1, 0, 0]],
    [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  ];
  for (const [n, u, v] of faces) {
    const base = P.length / 3;
    for (let i = 0; i <= seg; i++) {
      for (let j = 0; j <= seg; j++) {
        const a = (i / seg) * 2 - 1;
        const b = (j / seg) * 2 - 1;
        const dir = [n[0] + u[0] * a + v[0] * b, n[1] + u[1] * a + v[1] * b, n[2] + u[2] * a + v[2] * b];
        // point on the full box, clamped back to the inner box, then pushed out by r
        const q = [dir[0] * HX, dir[1] * HY, dir[2] * HZ];
        const c = [
          Math.max(-hx, Math.min(hx, q[0])),
          Math.max(-hy, Math.min(hy, q[1])),
          Math.max(-hz, Math.min(hz, q[2])),
        ];
        const off = [q[0] - c[0], q[1] - c[1], q[2] - c[2]];
        const l = Math.hypot(...off);
        const nx = l > 1e-9 ? off[0] / l : n[0];
        const ny = l > 1e-9 ? off[1] / l : n[1];
        const nz = l > 1e-9 ? off[2] / l : n[2];
        P.push(c[0] + nx * r, c[1] + ny * r, c[2] + nz * r);
        N.push(nx, ny, nz);
        U.push(i / seg, j / seg);
      }
    }
    for (let i = 0; i < seg; i++) {
      for (let j = 0; j < seg; j++) {
        const a = base + i * (seg + 1) + j;
        const b = a + seg + 1;
        I.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const mesh = new Mesh('rbox', scene);
  const vd = new VertexData();
  vd.positions = P;
  vd.normals = N;
  vd.uvs = U;
  vd.indices = I;
  // fix winding for Babylon's front faces
  for (let i = 0; i < vd.indices.length; i += 3) {
    const t = vd.indices[i + 1];
    vd.indices[i + 1] = vd.indices[i + 2];
    vd.indices[i + 2] = t;
  }
  vd.applyToMesh(mesh);
  return mesh;
}

// Lathe from a 2D profile [[r, y], …] — basins, baths, toilet pans, vases.
export function lathe(scene, profile, { tess = 28, sx = 1, sz = 1, closed = false } = {}) {
  const shape = profile.map(([r, y]) => new Vector3(r, y, 0));
  const m = MeshBuilder.CreateLathe('lathe', { shape, tessellation: tess, sideOrientation: Mesh.DOUBLESIDE, closed }, scene);
  m.scaling.set(sx, 1, sz);
  m.bakeCurrentTransformIntoVertices();
  return m;
}

// Tube along a path — tap spouts, shower rails, towel rails, chair legs.
export function tube(scene, points, radius, tess = 12) {
  return MeshBuilder.CreateTube('tube', { path: points.map((p) => new Vector3(...p)), radius, tessellation: tess, cap: Mesh.CAP_ALL }, scene);
}

export function cylinder(scene, h, dTop, dBottom, { x = 0, y = 0, z = 0, tess = 18, rot = null } = {}) {
  const m = MeshBuilder.CreateCylinder('cyl', { height: h, diameterTop: dTop, diameterBottom: dBottom ?? dTop, tessellation: tess }, scene);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(...rot);
  return m;
}

export function sphere(scene, d, { x = 0, y = 0, z = 0, seg = 16, sy = 1 } = {}) {
  const m = MeshBuilder.CreateSphere('sph', { diameter: d, segments: seg }, scene);
  m.scaling.y = sy;
  m.position.set(x, y, z);
  return m;
}

export function plane(scene, w, h, { x = 0, y = 0, z = 0, ry = 0, rx = 0 } = {}) {
  const m = MeshBuilder.CreatePlane('pl', { width: w, height: h, sideOrientation: Mesh.DOUBLESIDE }, scene);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  return m;
}

// Rotate/position helper for standalone meshes.
export function place(mesh, x, y, z, ry = 0) {
  mesh.position.set(x, y, z);
  if (ry) mesh.rotation.y = ry;
  return mesh;
}

export function mergeInto(group, meshes, key) {
  const merged = Mesh.MergeMeshes(meshes, true, true);
  if (merged) group.add(merged, key);
  return merged;
}

export { Quaternion };
