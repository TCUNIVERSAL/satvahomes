// Interior fit-out: kitchen, walk-in pantry, bathrooms, laundry, joinery, trims,
// window furnishings and furniture, all following the Internal selections from
// the Pre-Selection Guide. This module owns the shared build context; each room
// or trade is built by its own module in this folder and can be rebuilt on its
// own when a selection changes.
import { Color3, Vector3, PointLight } from '../babylon.js';
import { Group } from '../interiorParts.js';
import { resolveAll, INTERIOR_CATEGORIES, interiorDefaults } from '../../interiorCatalog.js';
import { lin, pickCat } from './layout.js';
import { createMaterials, createTextures, createApply } from './materials.js';
import { createCabinets } from './cabinets.js';
import { createTrims } from './trims.js';
import { createDoors } from './doors.js';
import { createKitchen } from './kitchen.js';
import { createBath } from './bath.js';
import { createFurniture } from './furniture.js';
import { createCeilings } from './ceilings.js';

export async function buildInterior({ scene, M, shadows, house }) {
  const IM = createMaterials(scene, M);
  const S = {}; // resolved options per category
  const groups = {};
  const makeGroup = (name) => {
    groups[name]?.dispose();
    groups[name] = new Group(scene, IM, shadows, name, pickCat);
    return groups[name];
  };

  // shared build context — every builder reads what it needs off this
  const ctx = { scene, M, shadows, house, IM, S, groups, makeGroup, lin };
  Object.assign(ctx, createTextures(scene));
  Object.assign(ctx, createApply(ctx));
  Object.assign(ctx, createCabinets(ctx));

  const { buildTrims, buildLining } = createTrims(ctx);
  const { buildDoors, buildRobes } = createDoors(ctx);
  const { buildKitchen } = createKitchen(ctx);
  const { buildBath, buildLaundry } = createBath(ctx);
  const { buildFurniture } = createFurniture(ctx);
  const { buildCeilings, buildWindowFurnishings } = createCeilings(ctx);
  const { applyMaterials } = ctx;

  // ---------------------------------------------------------------- lighting
  const lights = [
    new PointLight('int-living', new Vector3(-2.8, 2.45, 5.0), scene),
    new PointLight('int-kitchen', new Vector3(-2.4, 2.45, -0.2), scene),
    new PointLight('int-master', new Vector3(3.4, 2.45, -7.8), scene),
    new PointLight('int-bath', new Vector3(3.8, 2.45, 6.05), scene),
    new PointLight('int-wc', new Vector3(4.2, 2.45, 7.70), scene),
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

  // ---------------------------------------------------------------- public API
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
    trims: buildTrims,
    doors: buildDoors,
    robes: buildRobes,
    kitchen: buildKitchen,
    bath: buildBath,
    laundry: buildLaundry,
    winfurn: buildWindowFurnishings,
    furniture: buildFurniture,
    ceilings: buildCeilings,
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
