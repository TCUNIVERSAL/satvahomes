// Interior materials and the textures that back them.
import { PBRMaterial, DynamicTexture, Texture } from '../babylon.js';
import { makeCanvas, noiseCanvas, loadImage, rng } from '../textures.js';
import { FINISHES } from '../../interiorCatalog.js';
import { lin } from './layout.js';

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

export function createMaterials(scene, M) {
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
  return IM;
}

export function createTextures(scene) {
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
  return { dynTex, guideCanvas, plankCanvas, tileCanvas, carpetCanvas };
}

export function createApply(ctx) {
  const { IM, S, dynTex, guideCanvas, plankCanvas, tileCanvas, carpetCanvas } = ctx;
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
  return { applyMaterials };
}
