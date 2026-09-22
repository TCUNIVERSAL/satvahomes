import { PBRMaterial, Color3, DynamicTexture, Texture } from './babylon.js';
import {
  makeCanvas,
  screenCanvas,
  screenTile,
  barrierCanvas,
  BARRIER_TILE,
  brickAlbedo,
  brickSurfaceMaps,
  BRICK_TILE,
  roofMaps,
  roofCapMaps,
  ROOF_TILE_SIZE,
  ROOF_CAP_TILE,
  claddingMaps,
  CLAD_TILE,
  renderMaps,
  garageMaps,
  concreteAlbedo,
  loadImage,
} from './textures.js';
import { findOption, BRICKS } from '../catalog.js';

const WHITE = '#f1efea';
const toLinear = (hex) => Color3.FromHexString(hex).toLinearSpace();

function dyn(name, canvas, scene, { wrap = true, aniso = 8, alpha = false, data = false } = {}) {
  const t = new DynamicTexture(name, canvas, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
  t.update(true);
  t.hasAlpha = alpha;
  t.gammaSpace = !data;
  t.anisotropicFilteringLevel = aniso;
  if (wrap) {
    t.wrapU = Texture.WRAP_ADDRESSMODE;
    t.wrapV = Texture.WRAP_ADDRESSMODE;
  }
  return t;
}

// A DynamicTexture that can cross-fade to new canvas content.
class FadeTexture {
  constructor(name, size, scene, first) {
    this.scene = scene;
    this.w = size[0];
    this.h = size[1];
    this.canvas = makeCanvas(this.w, this.h);
    this.ctx = this.canvas.getContext('2d');
    this.prev = makeCanvas(this.w, this.h);
    this.texture = new DynamicTexture(name, this.canvas, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
    this.texture.anisotropicFilteringLevel = 8;
    this.texture.wrapU = this.texture.wrapV = Texture.WRAP_ADDRESSMODE;
    this.set(first, 0);
  }

  set(source, duration = 650) {
    const pctx = this.prev.getContext('2d');
    pctx.clearRect(0, 0, this.w, this.h);
    pctx.drawImage(this.canvas, 0, 0);
    if (this._obs) this.scene.onBeforeRenderObservable.remove(this._obs);
    const draw = (t) => {
      this.ctx.globalAlpha = 1;
      this.ctx.drawImage(this.prev, 0, 0);
      this.ctx.globalAlpha = t;
      this.ctx.drawImage(source, 0, 0, this.w, this.h);
      this.ctx.globalAlpha = 1;
      this.texture.update(true);
    };
    if (!duration) return draw(1);
    const start = performance.now();
    let last = -1;
    this._obs = this.scene.onBeforeRenderObservable.add(() => {
      const t = Math.min(1, (performance.now() - start) / duration);
      const e = t * t * (3 - 2 * t);
      if (e - last > 0.06 || t === 1) {
        draw(e);
        last = e;
      }
      if (t === 1) {
        this.scene.onBeforeRenderObservable.remove(this._obs);
        this._obs = null;
      }
    });
  }
}

function tweenColor(scene, mat, prop, hex, duration = 600) {
  const to = toLinear(hex);
  const from = mat[prop].clone();
  const start = performance.now();
  if (mat.__tw?.[prop]) scene.onBeforeRenderObservable.remove(mat.__tw[prop]);
  mat.__tw = mat.__tw || {};
  mat.__tw[prop] = scene.onBeforeRenderObservable.add(() => {
    const t = Math.min(1, (performance.now() - start) / duration);
    const e = t * t * (3 - 2 * t);
    Color3.LerpToRef(from, to, e, mat[prop]);
    if (t === 1) {
      scene.onBeforeRenderObservable.remove(mat.__tw[prop]);
      mat.__tw[prop] = null;
    }
  });
}

function pulse(scene, mats, strength = 0.35, duration = 900) {
  const start = performance.now();
  const obs = scene.onBeforeRenderObservable.add(() => {
    const t = Math.min(1, (performance.now() - start) / duration);
    const k = Math.sin(t * Math.PI) * strength;
    for (const m of mats) m.emissiveColor.set(k * 0.9, k * 0.85, k * 0.7);
    if (t === 1) {
      for (const m of mats) m.emissiveColor.set(0, 0, 0);
      scene.onBeforeRenderObservable.remove(obs);
    }
  });
}

function pbr(name, scene, { color = WHITE, rough = 0.8, metal = 0, twoSided = false } = {}) {
  const m = new PBRMaterial(name, scene);
  m.albedoColor = toLinear(color);
  m.metallic = metal;
  m.roughness = rough;
  m.maxSimultaneousLights = 8;
  m.environmentIntensity = 0.9;
  if (twoSided) {
    m.backFaceCulling = false;
    m.twoSidedLighting = true;
  }
  return m;
}

function tile(tex, w, h, ang = 0) {
  tex.uScale = 1 / w;
  tex.vScale = 1 / h;
  tex.wAng = ang;
  return tex;
}

export async function createMaterials(scene) {
  const M = {};
  const size = 1024;
  const timberCache = new Map();

  // ---------------- bricks
  // The catalogue colour is already in the albedo map; keep its multiplier neutral.
  M.bricks = pbr('bricks', scene, { color: '#ffffff', rough: 1 });
  const brickFade = new FadeTexture('brickAlb', [size, size], scene, brickAlbedo(size, { palette: [{ c: '#f4f2ee', w: 1 }], name: 'white' }, '#e6e3de', 'stretcher', 3, 'ironed'));
  M.bricks.albedoTexture = tile(brickFade.texture, BRICK_TILE.w, BRICK_TILE.h);
  brickFade.texture.anisotropicFilteringLevel = 16;
  const brickSurfaces = new Map();
  const setBrickSurface = (bond, dh, joint) => {
    const k = `${bond}-${dh}-${joint}`;
    if (!brickSurfaces.has(k)) {
      const maps = brickSurfaceMaps(size, bond, dh, joint);
      const textures = {};
      for (const [name, canvas] of Object.entries(maps)) {
        textures[name] = tile(dyn(`brick-${name}-${k}`, canvas, scene, { data: true, aniso: 16 }), BRICK_TILE.w, BRICK_TILE.h);
      }
      if (brickSurfaces.size >= 4) {
        const oldest = brickSurfaces.keys().next().value;
        for (const texture of Object.values(brickSurfaces.get(oldest))) texture.dispose();
        brickSurfaces.delete(oldest);
      }
      brickSurfaces.set(k, textures);
    }
    const maps = brickSurfaces.get(k);
    brickSurfaces.delete(k);
    brickSurfaces.set(k, maps);
    M.bricks.bumpTexture = maps.normal;
    M.bricks.bumpTexture.level = 0.8;
    M.bricks.ambientTexture = maps.ao;
    M.bricks.ambientTextureStrength = 0.6;
    M.bricks.metallicTexture = maps.roughness;
  };
  M.bricks.useRoughnessFromMetallicTextureAlpha = false;
  M.bricks.useRoughnessFromMetallicTextureGreen = true;
  M.bricks.useMetallnessFromMetallicTextureBlue = false;
  setBrickSurface('stretcher', false, 'ironed');
  let brickLayoutKey = 'stretcher-false-ironed';

  // ---------------- cladding (paint colour × profile relief)
  M.cladding = pbr('cladding', scene, { rough: 0.62 });
  const cladCache = new Map();
  const cladMaps = (kind) => {
    if (!cladCache.has(kind)) {
      const m = claddingMaps(kind, size);
      const w = CLAD_TILE[kind];
      cladCache.set(kind, { normal: tile(dyn(`cladN-${kind}`, m.normal, scene), w, w), ao: tile(dyn(`cladAO-${kind}`, m.ao, scene), w, w) });
    }
    return cladCache.get(kind);
  };
  const setClad = (kind) => {
    const c = cladMaps(kind);
    M.cladding.bumpTexture = c.normal;
    M.cladding.ambientTexture = c.ao;
    M.cladding.ambientTextureStrength = 0.9;
  };
  setClad('axon');

  // ---------------- feature render (Acratex)
  M.render = pbr('render', scene, { rough: 0.95 });
  try {
    const photo = await loadImage('swatches/acratex.webp');
    const rm = renderMaps(photo, size);
    M.render.bumpTexture = tile(dyn('renderN', rm.normal, scene), 0.9, 0.9);
    M.render.bumpTexture.level = 0.8;
    M.render.albedoTexture = tile(dyn('renderA', rm.albedo, scene), 3.5, 3.5);
  } catch (e) {
    console.warn('render texture missing', e);
  }

  // ---------------- roof (colour × profile)
  M.roof = pbr('roof', scene, { rough: 0.72 });
  M.roofCap = pbr('roofCap', scene, { rough: 0.72 });
  // Roughness now comes from a map rather than a single scalar, so tell the
  // PBR material to read it off the green channel (and ignore the rest).
  for (const m of [M.roof, M.roofCap]) {
    m.useRoughnessFromMetallicTextureAlpha = false;
    m.useRoughnessFromMetallicTextureGreen = true;
    m.useMetallnessFromMetallicTextureBlue = false;
  }

  const roofCache = new Map();
  const roofTex = (profile) => {
    if (!roofCache.has(profile)) {
      const m = roofMaps(profile, size);
      const { w, h } = ROOF_TILE_SIZE;
      const c = roofCapMaps(profile, size / 2);
      const { w: cw, h: ch } = ROOF_CAP_TILE;
      roofCache.set(profile, {
        albedo: tile(dyn(`roofA-${profile}`, m.albedo, scene), w, h),
        normal: tile(dyn(`roofN-${profile}`, m.normal, scene, { data: true }), w, h),
        ao: tile(dyn(`roofAO-${profile}`, m.ao, scene, { data: true }), w, h),
        roughness: tile(dyn(`roofR-${profile}`, m.roughness, scene, { data: true }), w, h),
        capAlbedo: tile(dyn(`roofCapA-${profile}`, c.albedo, scene), cw, ch),
        capNormal: tile(dyn(`roofCapN-${profile}`, c.normal, scene, { data: true }), cw, ch),
        capAo: tile(dyn(`roofCapAO-${profile}`, c.ao, scene, { data: true }), cw, ch),
        capRoughness: tile(dyn(`roofCapR-${profile}`, c.roughness, scene, { data: true }), cw, ch),
      });
    }
    return roofCache.get(profile);
  };
  const setRoofProfile = (profile) => {
    const t = roofTex(profile);
    const metal = profile === 'colorbond';

    M.roof.albedoTexture = t.albedo;
    M.roof.bumpTexture = t.normal;
    M.roof.bumpTexture.level = metal ? 1.0 : 1.5;
    M.roof.ambientTexture = t.ao;
    M.roof.ambientTextureStrength = 1;
    M.roof.metallicTexture = t.roughness;

    // The capping used to be an untextured cylinder — same concrete surface as
    // the field tiles, so hips and ridges stop reading as bare pipe.
    M.roofCap.albedoTexture = t.capAlbedo;
    M.roofCap.bumpTexture = t.capNormal;
    M.roofCap.bumpTexture.level = metal ? 0.7 : 1.1;
    M.roofCap.ambientTexture = t.capAo;
    M.roofCap.ambientTextureStrength = 1;
    M.roofCap.metallicTexture = t.capRoughness;

    for (const m of [M.roof, M.roofCap]) {
      m.metallic = metal ? 0.35 : 0;
      // scalar roughness is the fallback; the green channel of metallicTexture wins
      m.roughness = metal ? 0.42 : 0.82;
    }
  };
  setRoofProfile('designer');

  // ---------------- colorbond parts
  M.gutter = pbr('gutter', scene, { rough: 0.4, metal: 0.25, twoSided: true });
  M.fascia = pbr('fascia', scene, { rough: 0.45, metal: 0.2 });
  M.downpipe = pbr('downpipe', scene, { rough: 0.42, metal: 0.2 });
  M.flashing = pbr('flashing', scene, { rough: 0.4, metal: 0.25 });

  // ---------------- window trim (timber look / colorbond / paint)
  M.trim = pbr('trim', scene, { rough: 0.6 });
  const trimFade = new FadeTexture('trimAlb', [512, 512], scene, solid(WHITE));
  M.trim.albedoTexture = tile(trimFade.texture, 2.2, 1.1);

  // ---------------- window frames + glass
  M.frame = pbr('frame', scene, { rough: 0.38, metal: 0.15 });
  M.glass = new PBRMaterial('glass', scene);
  Object.assign(M.glass, { metallic: 0, roughness: 0.03, alpha: 0.3, backFaceCulling: false, maxSimultaneousLights: 8 });
  M.glass.albedoColor = toLinear('#1d2527');
  M.glass.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  M.glass.useRadianceOverAlpha = true;
  M.glass.useSpecularOverAlpha = true;
  M.glass.environmentIntensity = 1.4;
  M.glass.needDepthPrePass = false;
  M.glassFrosted = pbr('glassFrosted', scene, { color: '#e8ecec', rough: 0.35 });
  M.glassFrosted.alpha = 0.93;
  M.glassFrosted.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  M.glassFrosted.emissiveColor = new Color3(0, 0, 0);

  // ---------------- flyscreens & barrier screens (guide p.18-19)
  // The weave is drawn at its real pitch and the gaps are genuinely
  // transparent, so the screen darkens the glass behind it the way it does on
  // site instead of reading as a flat grey panel.
  const screenTex = new Map();
  M.flyscreen = pbr('flyscreen', scene, { color: '#ffffff', rough: 0.68, twoSided: true });
  M.flyscreen.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  M.flyscreen.useAlphaFromAlbedoTexture = true;
  M.flyscreen.environmentIntensity = 0.5;
  M.flyscreen.specularIntensity = 0.35;
  const setScreenMesh = (kind) => {
    if (!screenTex.has(kind)) {
      screenTex.set(kind, tile(dyn(`screen-${kind}`, screenCanvas(kind), scene, { aniso: 16, alpha: true }), screenTile(kind), screenTile(kind)));
    }
    M.flyscreen.albedoTexture = screenTex.get(kind);
    M.flyscreen.opacityTexture = screenTex.get(kind);
  };
  setScreenMesh('fibreglass');

  M.barrier = pbr('barrier', scene, { color: '#ffffff', rough: 0.5, metal: 0.25, twoSided: true });
  M.barrier.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  M.barrier.useAlphaFromAlbedoTexture = true;
  M.barrier.environmentIntensity = 0.7;
  const barrierTex = {
    diamond: tile(dyn('barrier-diamond', barrierCanvas(), scene, { aniso: 16, alpha: true }), BARRIER_TILE, BARRIER_TILE),
    homestyle: tile(dyn('barrier-homestyle', screenCanvas('homestyle'), scene, { aniso: 16, alpha: true }), screenTile('homestyle'), screenTile('homestyle')),
  };
  const setBarrier = (kind) => {
    const t = barrierTex[kind] || barrierTex.diamond;
    M.barrier.albedoTexture = t;
    M.barrier.opacityTexture = t;
  };
  setBarrier('diamond');

  // ---------------- garage door
  M.garage = pbr('garage', scene, { rough: 0.45, metal: 0.1 });
  const garageFade = new FadeTexture('garageAlb', [1024, 512], scene, solid(WHITE, 1024, 512));
  M.garage.albedoTexture = garageFade.texture;
  const garageCache = new Map();
  let garageProfile = 'flatline';
  const setGarageProfile = (kind) => {
    if (!garageCache.has(kind)) {
      const m = garageMaps(kind);
      garageCache.set(kind, {
        normal: dyn(`garN-${kind}`, m.normal, scene, { wrap: false }),
        ao: dyn(`garAO-${kind}`, m.ao, scene, { wrap: false }),
        shade: m.shade,
      });
    }
    const g = garageCache.get(kind);
    garageProfile = kind;
    M.garage.bumpTexture = g.normal;
    M.garage.bumpTexture.level = 1.4;
    M.garage.ambientTexture = g.ao;
    M.garage.ambientTextureStrength = 1;
  };
  // Multiply the profile's baked shading over the door colour so the panels read
  // on dark colours, where the normal map alone disappears into the shade.
  const garageSkin = (src) => {
    const c = makeCanvas(1024, 512);
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0, 1024, 512);
    const g = garageCache.get(garageProfile);
    if (g?.shade) {
      x.globalCompositeOperation = 'multiply';
      x.drawImage(g.shade, 0, 0, 1024, 512);
      x.globalCompositeOperation = 'source-over';
    }
    return c;
  };
  setGarageProfile('flatline');

  // ---------------- driveway
  M.driveway = pbr('driveway', scene, { rough: 0.9 });
  const drivePlain = { id: 'white', kind: 'plain', base: '#dedbd5' };
  const driveFade = new FadeTexture('driveAlb', [1024, 1024], scene, concreteAlbedo(1024, drivePlain));
  M.driveway.albedoTexture = tile(driveFade.texture, 4, 4);
  M.driveway.albedoTexture.uOffset = 0.3;
  M.driveway.albedoTexture.vOffset = 0.4;

  // ---------------- fixed materials
  M.soffit = pbr('soffit', scene, { color: '#f2f1ec', rough: 0.85 });
  M.interiorWall = pbr('interiorWall', scene, { color: '#eae5dc', rough: 0.92 });
  M.interiorCeil = pbr('interiorCeil', scene, { color: '#f8f6f2', rough: 0.95 });
  M.interiorFloor = pbr('interiorFloor', scene, { color: '#c4a887', rough: 0.45 });
  M.carpet = pbr('carpet', scene, { color: '#a89f92', rough: 0.98 });
  M.door = pbr('door', scene, { color: '#e8e4dc', rough: 0.5 });
  M.metalDark = pbr('metalDark', scene, { color: '#1b1b1b', rough: 0.35, metal: 0.6 });
  // galvanised steel lintel angle over brick openings (guide p.21)
  M.metalGalv = pbr('metalGalv', scene, { color: '#9aa0a3', rough: 0.52, metal: 0.75 });
  // front entry door: leaf, its groove shadows, and the handle hardware
  M.entryDoor = pbr('entryDoor', scene, { color: '#f1efea', rough: 0.62 });
  M.entryDoorShade = pbr('entryDoorShade', scene, { color: '#c9c5bd', rough: 0.62 });
  M.entryHardware = pbr('entryHardware', scene, { color: '#d8dce0', rough: 0.12, metal: 0.95 });
  M.porchTile = pbr('porchTile', scene, { color: '#9c978f', rough: 0.6 });
  M.backing = pbr('backing', scene, { color: '#262626', rough: 0.9 });

  // ---------------- interior architecture & joinery materials
  M.cabinetry = pbr('cabinetry', scene, { color: '#282b30', rough: 0.38, metal: 0.05 });
  M.cabinetryWood = pbr('cabinetryWood', scene, { color: '#a6855b', rough: 0.55 });
  M.stoneBench = pbr('stoneBench', scene, { color: '#fcfbfa', rough: 0.16, metal: 0.02 });
  M.tileWet = pbr('tileWet', scene, { color: '#c5c1b8', rough: 0.4 });
  M.porcelainWhite = pbr('porcelainWhite', scene, { color: '#ffffff', rough: 0.12 });
  M.chrome = pbr('chrome', scene, { color: '#e8ecef', rough: 0.15, metal: 0.95 });
  M.glassScreen = pbr('glassScreen', scene, { color: '#d8e8ea', rough: 0.04, metal: 0 });
  M.glassScreen.alpha = 0.25;
  M.glassScreen.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  M.glassScreen.backFaceCulling = false;
  M.ledStrip = pbr('ledStrip', scene, { color: '#fff2d6', rough: 0.2 });
  M.ledStrip.emissiveColor = toLinear('#ffe1a0');
  M.fabricSofa = pbr('fabricSofa', scene, { color: '#3c4046', rough: 0.95 });
  M.bedLinen = pbr('bedLinen', scene, { color: '#ece8e1', rough: 0.9 });
  M.tvScreen = pbr('tvScreen', scene, { color: '#0f1012', rough: 0.08, metal: 0.3 });

  // Procedural 600x600 tile texture for wet areas
  const tileWetCanvas = makeCanvas(512, 512);
  const twCtx = tileWetCanvas.getContext('2d');
  twCtx.fillStyle = '#b8b4ab';
  twCtx.fillRect(0, 0, 512, 512);
  twCtx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
  twCtx.lineWidth = 4;
  twCtx.strokeRect(2, 2, 508, 508);
  M.tileWet.albedoTexture = tile(dyn('tileWetTex', tileWetCanvas, scene), 0.6, 0.6);

  for (const k of ['interiorWall', 'interiorCeil', 'interiorFloor', 'carpet', 'cabinetry', 'tileWet', 'fabricSofa']) {
    if (M[k]) M[k].environmentIntensity = 0.6;
  }
  try {
    const t = await timber('swatches/timber-merbau-full.webp');
    M.door.albedoTexture = tile(dyn('doorTex', t, scene), 0.9, 1.6, Math.PI / 2);
    const f = await timber('swatches/timber-light-oak-full.webp');
    M.interiorFloor.albedoTexture = tile(dyn('floorTex', f, scene), 2.4, 1.2);
    M.interiorFloor.albedoColor = toLinear('#d9cbb8');
    M.cabinetryWood.albedoTexture = tile(dyn('cabWoodTex', f, scene), 1.2, 0.8);
  } catch (e) {
    console.warn(e);
  }

  async function timber(src) {
    if (timberCache.has(src)) return timberCache.get(src);
    const img = await loadImage(src);
    // mirror the photo into a seamless 512² tile
    const c = makeCanvas(512, 512);
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, 512, 256);
    x.save();
    x.translate(0, 512);
    x.scale(1, -1);
    x.drawImage(img, 0, 0, 512, 256);
    x.restore();
    timberCache.set(src, c);
    return c;
  }

  function solid(hex, w = 512, h = 512) {
    const c = makeCanvas(w, h);
    const x = c.getContext('2d');
    x.fillStyle = hex;
    x.fillRect(0, 0, w, h);
    return c;
  }

  // =============================================================== apply
  const brickCanvasCache = new Map();
  async function apply(key, sel, animate = true) {
    const d = animate ? 650 : 0;
    const colour = (mat, opt, prop = 'albedoColor') => {
      if (!opt) return;
      if (animate) tweenColor(scene, mat, prop, opt.hex);
      else mat[prop] = toLinear(opt.hex);
    };
    const flash = (...mats) => animate && pulse(scene, mats);
    switch (key) {
      case 'roof': {
        const profile = sel.type || 'designer';
        setRoofProfile(profile);
        const opt = findOption(sel.colour);
        colour(M.roof, opt || { hex: WHITE });
        colour(M.roofCap, opt || { hex: WHITE });
        flash(M.roof, M.roofCap);
        break;
      }
      case 'gutter':
      case 'fascia':
      case 'downpipe':
      case 'flashing': {
        colour(M[key], findOption(sel.colour) || { hex: WHITE });
        flash(M[key]);
        break;
      }
      case 'cladding': {
        setClad(findOption(sel.profile)?.key || 'axon');
        colour(M.cladding, findOption(sel.colour) || { hex: WHITE });
        flash(M.cladding);
        break;
      }
      case 'render': {
        colour(M.render, findOption(sel.colour) || { hex: WHITE });
        flash(M.render);
        break;
      }
      case 'bricks': {
        const brick = BRICKS.find((b) => b.id === sel.brick);
        const mortar = findOption(sel.mortar) || findOption('mo-natural');
        const bond = sel.bond === 'bond-stack' ? 'stack' : 'stretcher';
        const joint = sel.joint === 'mj-flush' ? 'flush' : 'ironed';
        const k = `${sel.brick}|${mortar.id}|${bond}|${joint}`;
        let canvas = brickCanvasCache.get(k);
        if (!canvas) {
          canvas = brickAlbedo(size, brick || { palette: [{ c: '#f4f2ee', w: 1 }], name: 'white' }, brick ? mortar.hex : '#e6e3de', bond, 3, joint);
          // Bound retained canvases while browsing the full catalogue.
          if (brickCanvasCache.size >= 12) brickCanvasCache.delete(brickCanvasCache.keys().next().value);
          brickCanvasCache.set(k, canvas);
        }
        const layout = `${bond}-${!!brick?.doubleHeight}-${joint}`;
        // Switch coursing and its relief together; fading between bonds creates
        // ghost joints. Colour-only changes can still blend without flashing.
        brickFade.set(canvas, layout === brickLayoutKey ? Math.min(d, 280) : 0);
        setBrickSurface(bond, !!brick?.doubleHeight, joint);
        brickLayoutKey = layout;
        break;
      }
      case 'trim': {
        const opt = findOption(sel.colour);
        let src;
        if (opt?.timber) src = await timber(opt.tex);
        else src = solid(opt?.hex || WHITE);
        trimFade.set(src, d);
        const isTimber = !!opt?.timber;
        M.trim.roughness = isTimber ? 0.55 : opt?.brand === 'Colorbond®' ? 0.4 : 0.7;
        M.trim.metallic = opt?.brand === 'Colorbond®' ? 0.2 : 0;
        flash(M.trim);
        break;
      }
      case 'frame': {
        const opt = findOption(sel.colour);
        colour(M.frame, opt || { hex: '#f4f4f1' });
        M.frame.metallic = opt?.metallic ? 0.85 : 0.15;
        M.frame.roughness = opt?.metallic ? 0.3 : 0.38;
        const g = findOption(sel.glazing) || findOption('gl-clear');
        if (animate) tweenColor(scene, M.glass, 'albedoColor', g.tint);
        else M.glass.albedoColor = toLinear(g.tint);
        M.glass.alpha = g.alpha;
        M.glass.roughness = g.rough;
        // obscure glass scatters instead of mirroring the sky
        M.glass.environmentIntensity = g.obscure ? 0.35 : 1.4;
        const fs = findOption(sel.flyscreen);
        if (fs?.mesh) setScreenMesh(fs.mesh);
        const bs = findOption(sel.barrier);
        if (bs?.barrier) setBarrier(bs.barrier);
        M.barrier.metallic = bs?.barrier === 'homestyle' ? 0.45 : 0.25;
        flash(M.frame);
        break;
      }
      case 'garage': {
        const opt = findOption(sel.colour);
        const prof = findOption(sel.profile)?.key || 'flatline';
        setGarageProfile(prof);
        let src;
        if (opt?.timber) {
          // lay the timber photo in offset boards (no mirrored tiling, so no visible repeat)
          const img = await loadImage(opt.tex);
          src = makeCanvas(1024, 512);
          const x = src.getContext('2d');
          const sw = img.width * 0.55;
          const offset = (k) => ((k * 0.37) % 1) * (img.width - sw);
          if (prof === 'battens') {
            x.save();
            x.translate(1024, 0);
            x.rotate(Math.PI / 2);
            for (let k = 0; k < 12; k++) x.drawImage(img, offset(k), 0, sw, img.height, 0, (k * 1024) / 12, 512, 1024 / 12 + 1);
            x.restore();
          } else {
            for (let k = 0; k < 8; k++) x.drawImage(img, offset(k), 0, sw, img.height, 0, k * 64, 1024, 65);
          }
        } else src = solid(opt?.hex || WHITE, 1024, 512);
        garageFade.set(garageSkin(src), d);
        M.garage.roughness = opt?.timber ? 0.55 : 0.42;
        M.garage.metallic = opt?.timber ? 0 : 0.15;
        flash(M.garage);
        break;
      }
      case 'driveway': {
        const opt = findOption(sel.finish);
        const src = concreteAlbedo(1024, opt || drivePlain);
        driveFade.set(src, d);
        const t = opt?.tile || 4;
        tile(M.driveway.albedoTexture, t, t);
        M.driveway.roughness = opt?.kind === 'aggregate' ? 0.75 : 0.9;
        flash(M.driveway);
        break;
      }
      default:
    }
  }

  return { M, apply };
}
