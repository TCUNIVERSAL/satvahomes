// Studio ground plane. The house is the subject, so there is no lawn, street or
// planting here — just a flat shadow-catching floor with a measured grid on it.
// The driveway stays because it is a selectable part (category L).
import { MeshBuilder, PBRMaterial, StandardMaterial, Color3, DynamicTexture, Texture } from './babylon.js';
import { Geo } from './geometry.js';
import { gridCanvas } from './textures.js';

const lin = (hex) => Color3.FromHexString(hex).toLinearSpace();

// Grid plane width in metres. Kept tight so 2048px still gives crisp rules —
// they fade to nothing by the halfway mark, well before the plane's own edge.
const GRID_SPAN = 80;

export function buildLandscape(scene, M, shadows) {
  const meshes = {};

  // ------------------------------------------------ shadow-catching floor
  const floorMat = new PBRMaterial('floor', scene);
  floorMat.albedoColor = lin('#959ba3');
  floorMat.metallic = 0;
  floorMat.roughness = 0.95;
  floorMat.specularIntensity = 0.15;
  floorMat.environmentIntensity = 0.8;
  floorMat.maxSimultaneousLights = 8;
  // Wide enough that its edge never crosses the horizon at any camera angle.
  const floor = MeshBuilder.CreateGround('floor', { width: 420, height: 420, subdivisions: 1 }, scene);
  floor.material = floorMat;
  floor.receiveShadows = true;
  floor.position.y = -0.02;

  // ------------------------------------------------ grid overlay
  // Unlit decal a couple of centimetres above the floor: it reads the same in
  // sun and in shade, and the sun shadow still shows through from below.
  const gridMat = new StandardMaterial('gridMat', scene);
  gridMat.disableLighting = true;
  gridMat.diffuseColor = Color3.Black();
  gridMat.specularColor = Color3.Black();
  gridMat.emissiveColor = Color3.White();
  const gridTex = new DynamicTexture('gridTex', gridCanvas(2048, GRID_SPAN), scene, true, Texture.TRILINEAR_SAMPLINGMODE);
  gridTex.update(true);
  gridTex.hasAlpha = true;
  gridTex.anisotropicFilteringLevel = 16;
  gridMat.emissiveTexture = gridTex;
  gridMat.opacityTexture = gridTex;
  const grid = MeshBuilder.CreateGround('grid', { width: GRID_SPAN, height: GRID_SPAN, subdivisions: 1 }, scene);
  grid.material = gridMat;
  grid.position.y = 0;

  // ------------------------------------------------ driveway (selectable part L)
  const dg = new Geo();
  const dy = 0.035;
  // Driveway connects the double garage (-X) to the front boundary
  const drive = [
    [-5.48, -9.735],
    [-0.20, -9.735],
    [-0.10, -15.75],
    [0.10, -17.25],
    [-5.85, -17.25],
    [-5.60, -15.75],
  ];
  // top surface as a fan from the centre
  const cx = -2.85;
  const cz = -13.5;
  for (let i = 0; i < drive.length; i++) {
    const a = drive[i];
    const b = drive[(i + 1) % drive.length];
    dg.poly([[cx, dy, cz], [a[0], dy, a[1]], [b[0], dy, b[1]]], [0, 1, 0]);
    // side skirt
    dg.poly([[a[0], -0.02, a[1]], [b[0], -0.02, b[1]], [b[0], dy, b[1]], [a[0], dy, a[1]]], outward(a, b, [cx, cz]));
  }
  const driveway = dg.toMesh('driveway', scene, M.driveway);
  driveway.metadata = { part: 'driveway' };
  driveway.receiveShadows = true;
  meshes.driveway = driveway;

  // Dusk dims the floor through the sun, but the unlit grid has to be told —
  // left alone it stays mid-grey and burns a hole in the dark plate.
  meshes.setMood = (dusk) => {
    floorMat.albedoColor = lin(dusk ? '#7c828b' : '#959ba3');
    gridMat.emissiveColor = dusk ? new Color3(0.17, 0.19, 0.24) : Color3.White();
  };

  for (const m of scene.meshes) if (!m.metadata?.part && m.name !== 'skybox') m.isPickable = false;
  return meshes;
}

function outward(a, b, c) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  let nx = dz;
  let nz = -dx;
  const mx = (a[0] + b[0]) / 2 - c[0];
  const mz = (a[1] + b[1]) / 2 - c[1];
  if (nx * mx + nz * mz < 0) {
    nx = -nx;
    nz = -nz;
  }
  const l = Math.hypot(nx, nz);
  return [nx / l, 0, nz / l];
}
