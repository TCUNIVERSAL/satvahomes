import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  ShadowGenerator,
  EquiRectangularCubeTexture,
  DefaultRenderingPipeline,
  SSAO2RenderingPipeline,
  ImageProcessingConfiguration,
  Camera,
} from './babylon.js';
import { skyCanvas } from './textures.js';

export const SUN_DAY = new Vector3(0.66, -0.6, 0.46).normalize();
export const SUN_DUSK = new Vector3(0.9, -0.26, 0.35).normalize();

// Flat studio backdrop behind the house, tuned to sit just off the lit floor so
// the ground plane runs out of sight without showing an edge.
const BACKDROP = {
  day: new Color4(0.827, 0.851, 0.878, 1),
  dusk: new Color4(0.098, 0.109, 0.133, 1),
};

export const MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820);

export function createEngine(canvas) {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 2));
  return engine;
}

export const VIEWS = {
  home: { alpha: -Math.PI / 2 - 0.45, beta: 1.38, radius: 26, target: [-0.2, 1.8, -8.5] },
  front: { alpha: -Math.PI / 2, beta: 1.42, radius: 22, target: [-0.15, 1.8, -9.5] },
  left: { alpha: -Math.PI / 2 - 1.05, beta: 1.35, radius: 26, target: [-5.0, 1.8, 0.0] },
  right: { alpha: -Math.PI / 2 + 0.95, beta: 1.35, radius: 26, target: [4.5, 1.8, 0.0] },
  aerial: { alpha: -Math.PI / 2 - 0.55, beta: 0.72, radius: 34, target: [-0.15, 1.5, 0.0] },
  back: { alpha: Math.PI / 2 + 0.35, beta: 1.35, radius: 24, target: [-0.15, 1.8, 9.5] },
  // per-category focus views
  roof: { alpha: -Math.PI / 2 - 0.5, beta: 1.05, radius: 24, target: [-0.15, 3.2, -4.0] },
  // Gutter and fascia are a 100 mm band under the roof edge, so they get their
  // own close views looking up at the eave rather than one wide elevation.
  eaves: { alpha: 0.16, beta: 1.44, radius: 2.6, target: [5.92, 2.80, -7.2] },
  fascia: { alpha: 0.16, beta: 1.58, radius: 1.8, target: [5.92, 2.70, -7.2] },
  downpipe: { alpha: -Math.PI / 2 - 0.3, beta: 1.40, radius: 8, target: [-5.6, 1.6, -9.7] },
  cladding: { alpha: -Math.PI / 2 - 0.25, beta: 1.40, radius: 9, target: [1.2, 1.8, -11.5] },
  flashing: { alpha: -Math.PI / 2 - 0.2, beta: 1.40, radius: 7.5, target: [1.2, 2.8, -11.5] },
  entry: { alpha: -Math.PI / 2 - 0.25, beta: 1.42, radius: 9.5, target: [1.2, 1.7, -11.5] },
  entrydoor: { alpha: -Math.PI / 2 - 0.02, beta: 1.47, radius: 2.9, target: [0.75, 1.30, -9.62] },
  bricks: { alpha: -Math.PI / 2 + 0.55, beta: 1.38, radius: 12, target: [5.2, 1.7, -6.5] },
  trim: { alpha: -Math.PI / 2 - 0.15, beta: 1.42, radius: 9, target: [4.0, 1.6, -9.6] },
  windows: { alpha: -Math.PI / 2 - 0.06, beta: 1.47, radius: 3.1, target: [4.05, 1.42, -9.62] },
  garage: { alpha: -Math.PI / 2 - 0.35, beta: 1.42, radius: 14, target: [-2.9, 1.4, -9.7] },
  driveway: { alpha: -Math.PI / 2 - 0.35, beta: 1.15, radius: 20, target: [-2.9, 0.2, -15.0] },
  // Interior view presets & dollhouse cutaway
  dollhouse: { alpha: -Math.PI / 2 - 0.45, beta: 0.65, radius: 24, target: [-0.2, 1.2, 0.0] },
  living: { alpha: 0.245, beta: 1.34, radius: 4.4, target: [-4.4, 1.30, 4.85] },
  kitchen: { alpha: 1.14, beta: 1.30, radius: 4.3, target: [-2.3, 1.25, 0.30] },
  pantry: { alpha: 0.75, beta: 1.34, radius: 1.2, target: [-5.2, 1.15, -2.70] },
  master: { alpha: 0.69, beta: 1.30, radius: 3.1, target: [2.6, 1.10, -8.30] },
  media: { alpha: Math.PI, beta: 1.40, radius: 3.15, target: [5.1, 1.15, 0.20] },
  bathroom: { alpha: 2.415, beta: 1.30, radius: 1.24, target: [4.70, 1.10, 5.90] },
  vanity: { alpha: -2.01, beta: 1.30, radius: 1.31, target: [3.54, 1.20, 8.20] },
  wc: { alpha: -2.064, beta: 1.15, radius: 0.95, target: [4.83, 0.45, 7.95] },
  ensuite: { alpha: -1.18, beta: 1.32, radius: 1.62, target: [3.4, 1.10, -4.40] },
  laundry: { alpha: 0, beta: 1.32, radius: 3.0, target: [2.2, 1.15, -3.40] },
  hall: { alpha: 1.545, beta: 1.42, radius: 4.2, target: [0.9, 1.35, -5.60] },
  alfresco: { alpha: Math.PI / 2 + 0.3, beta: 1.35, radius: 4.5, target: [-4.0, 1.35, 10.0] },
};

export function createScene(engine, canvas) {
  const scene = new Scene(engine);
  scene.clearColor = BACKDROP.day.clone();
  scene.ambientColor = new Color3(0.2, 0.2, 0.2);
  scene.environmentIntensity = 0.65;
  scene.skipPointerMovePicking = true;

  const v = VIEWS.home;
  const camera = new ArcRotateCamera('cam', v.alpha, v.beta, v.radius, new Vector3(...v.target), scene);
  camera.lowerBetaLimit = 0.05; // allows steep dollhouse overhead look
  camera.upperBetaLimit = 1.62; // a little past level, so you can look up into the eaves
  camera.lowerRadiusLimit = 0.2; // allows scrolling directly inside rooms
  camera.upperRadiusLimit = 65;
  camera.wheelDeltaPercentage = 0.012;
  camera.pinchDeltaPercentage = 0.005;
  camera.panningSensibility = 90;
  camera.panningDistanceLimit = 40;
  camera.panningOriginTarget = new Vector3(0, 2, 0);
  camera.inertia = 0.88;
  camera.angularSensibilityX = 2600;
  camera.angularSensibilityY = 2600;
  camera.minZ = 0.04; // close near-clipping plane for room interiors
  camera.maxZ = 1200;
  camera.fov = 0.72;
  camera.attachControl(canvas, true);
  // keep the whole house in frame on portrait screens
  const fitFov = () => {
    const portrait = engine.getRenderWidth() < engine.getRenderHeight() * 0.95;
    camera.fovMode = portrait ? Camera.FOVMODE_HORIZONTAL_FIXED : Camera.FOVMODE_VERTICAL_FIXED;
    camera.fov = portrait ? 1.05 : 0.72;
  };
  fitFov();
  engine.onResizeObservable.add(fitFov);

  const sun = new DirectionalLight('sun', SUN_DAY.clone(), scene);
  sun.position = SUN_DAY.scale(-70);
  sun.intensity = 8.5;
  sun.diffuse = new Color3(1, 0.96, 0.9);
  sun.shadowMinZ = 1;
  sun.shadowMaxZ = 140;

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0;
  hemi.diffuse = new Color3(0.85, 0.9, 1);
  hemi.groundColor = new Color3(0.34, 0.35, 0.37); // neutral: no lawn to bounce green
  hemi.specular = Color3.Black();

  const shadows = new ShadowGenerator(MOBILE ? 2048 : 4096, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = ShadowGenerator.QUALITY_HIGH;
  shadows.bias = 0.0006;
  shadows.normalBias = 0.012;
  shadows.darkness = 0.0;
  shadows.transparencyShadow = false;
  sun.autoUpdateExtends = false;
  sun.orthoLeft = -26;
  sun.orthoRight = 26;
  sun.orthoTop = 26;
  sun.orthoBottom = -26;

  // The painted sky is kept for image-based lighting only — it is never drawn.
  // The backdrop is a flat studio sweep so nothing competes with the house.
  const env = { day: null, dusk: null };
  const loadEnv = (mode) =>
    new Promise((resolve) => {
      if (env[mode]) return resolve(env[mode]);
      const url = skyCanvas(mode).toDataURL('image/jpeg', 0.92);
      const tex = new EquiRectangularCubeTexture(url, scene, 512, false, true, () => {
        env[mode] = tex;
        resolve(tex);
      }, () => resolve(null));
    });

  async function setSky(mode) {
    scene.clearColor = mode === 'dusk' ? BACKDROP.dusk.clone() : BACKDROP.day.clone();
    const tex = await loadEnv(mode);
    if (!tex) return;
    scene.environmentTexture = tex;
  }

  // Post processing: SSAO for contact shadows, then tone mapping / AA.
  let ssao = null;
  if (!MOBILE && engine.webGLVersion >= 2) {
    ssao = new SSAO2RenderingPipeline('ssao', scene, { ssaoRatio: 0.5, blurRatio: 1 }, [camera], true);
    ssao.radius = 1.6;
    ssao.totalStrength = 1.25;
    ssao.base = 0.15;
    ssao.samples = 24;
    ssao.maxZ = 120;
    ssao.minZAspect = 0.4;
    ssao.expensiveBlur = true;
    ssao.bilateralSamples = 16;
  }
  const pipeline = new DefaultRenderingPipeline('post', true, scene, [camera]);
  pipeline.samples = engine.webGLVersion >= 2 ? 4 : 1;
  pipeline.fxaaEnabled = engine.webGLVersion < 2;
  pipeline.imageProcessingEnabled = true;
  const ip = pipeline.imageProcessing;
  ip.toneMappingEnabled = true;
  ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure = 1.0;
  ip.contrast = 1.15;
  ip.vignetteEnabled = true;
  ip.vignetteWeight = 1.1;
  ip.vignetteColor = new Color4(0.08, 0.08, 0.10, 0);
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.94;
  pipeline.bloomWeight = 0.15;
  pipeline.bloomKernel = 48;
  pipeline.bloomScale = 0.5;
  pipeline.sharpenEnabled = true;
  pipeline.sharpen.edgeAmount = 0.24;

  return { scene, camera, sun, hemi, shadows, pipeline, ssao, setSky };
}

// Smoothly glide the orbit camera to a named view. The target vector is
// mutated in place: ArcRotateCamera.setTarget() would re-derive alpha/beta.
let flight = null;
export function flyTo(camera, view, duration = 1150) {
  const v = typeof view === 'string' ? VIEWS[view] : view;
  if (!v) return Promise.resolve();
  const scene = camera.getScene();
  cancelFlight(camera);
  let alpha = v.alpha;
  const twoPi = Math.PI * 2;
  while (alpha - camera.alpha > Math.PI) alpha -= twoPi;
  while (camera.alpha - alpha > Math.PI) alpha += twoPi;
  const from = { a: camera.alpha, b: camera.beta, r: camera.radius, t: camera.target.clone() };
  const toT = new Vector3(...v.target);
  const start = performance.now();
  return new Promise((resolve) => {
    const obs = scene.onBeforeRenderObservable.add(() => {
      const k = Math.min(1, (performance.now() - start) / duration);
      const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      camera.alpha = from.a + (alpha - from.a) * e;
      camera.beta = from.b + (v.beta - from.b) * e;
      camera.radius = from.r + (v.radius - from.r) * e;
      Vector3.LerpToRef(from.t, toT, e, camera.target);
      if (k === 1) {
        cancelFlight(camera);
        resolve();
      }
    });
    flight = { obs, scene, resolve };
  });
}

// Glide the orbit pivot to a point the customer double-tapped.
export function focusPoint(camera, point, duration = 420) {
  const scene = camera.getScene();
  cancelFlight(camera);
  const from = camera.target.clone();
  const to = point.clone ? point.clone() : new Vector3(point[0], point[1], point[2]);
  const start = performance.now();
  return new Promise((resolve) => {
    const obs = scene.onBeforeRenderObservable.add(() => {
      const k = Math.min(1, (performance.now() - start) / duration);
      const e = 1 - (1 - k) ** 3;
      Vector3.LerpToRef(from, to, e, camera.target);
      if (k === 1) {
        cancelFlight(camera);
        resolve();
      }
    });
    flight = { obs, scene, resolve };
  });
}

export function cancelFlight() {
  if (!flight) return;
  flight.scene.onBeforeRenderObservable.remove(flight.obs);
  flight.resolve();
  flight = null;
}

export const isFlying = () => !!flight;

export function setView(camera, name) {
  const v = VIEWS[name];
  cancelFlight(camera);
  camera.alpha = v.alpha;
  camera.beta = v.beta;
  camera.radius = v.radius;
  camera.target.set(...v.target);
}
