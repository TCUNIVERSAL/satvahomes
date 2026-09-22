// Selection catalogue for the external items: A–L are the twelve listed on
// page 3 of the Sattva Homes Pre-Selection Guide, M is the Front Entry Door
// section (guide p.40-47). Colours/images come from the guide itself
// (extracted into data/pdf-swatches.json); items the guide does not detail
// (driveway, downpipe, flashing cap, window trim) use sensible defaults.
import pdf from './data/pdf-swatches.json';

// Sattva Homes builds in the Queensland & Northern NSW area, so the region is
// fixed. The NSW brick ranges stay in the data file for the day that changes.
export const BUILD_REGION = 'qld';
export const REGIONS = [
  { id: 'qld', name: 'Queensland & Northern NSW', detail: 'Hervey Bay south to Nambucca Heads' },
];

const ENERGY_NOTE =
  'Sattva Recommended (⚡): solar absorptance of 0.40 or less. In Hervey Bay, Sunshine Coast, Brisbane, Gold Coast, Tweed, Ballina and Coffs Harbour the builder recommends light colours — additional costs may apply for medium or dark colours.';
const SCREEN_NOTE = 'On-screen colours are indicative only. Please confirm with physical samples at your selection appointment.';

// ---------- shared colour ranges ----------
const HEX_FIX = { 'night-sky': '#161616' };
export const COLORBOND = pdf.colorbond.map((c) => ({
  id: `cb-${c.id}`,
  name: c.name,
  hex: HEX_FIX[c.id] || c.hex,
  tone: c.tone,
  rec: c.rec,
  note: c.note || undefined,
  tier: 'Standard',
  group: `${c.tone} colours`,
  brand: 'Colorbond®',
}));

export const TIMBER = pdf.stains.map((s) => ({
  id: `tb-${s.id}`,
  name: `Timber look – ${s.name}`,
  short: s.name,
  hex: s.hex,
  img: s.img,
  tex: s.tex,
  timber: true,
  tier: 'Upgrade',
  group: 'Timber look finishes',
}));

const WHITES = [
  { id: 'vivid-white', name: 'Vivid White', hex: '#f3f3ef' },
  { id: 'lexicon-quarter', name: 'Lexicon Quarter', hex: '#eaece9' },
  { id: 'natural-white', name: 'Natural White', hex: '#f0ece2' },
  { id: 'white-on-white', name: 'White on White', hex: '#eeece3' },
  { id: 'antique-white', name: 'Antique White U.S.A.', hex: '#ece5d5' },
];
export const PAINTS = [
  ...WHITES.map((w) => ({ ...w, id: `dx-${w.id}`, tier: 'Standard', tone: 'Light', rec: true, group: 'White base paint (standard)', brand: 'Dulux' })),
  ...pdf.deepPaints
    .filter((p) => !/mm/.test(p.name))
    .map((p) => ({ id: `dx-${p.id}`, name: p.name, hex: p.hex, tier: 'Upgrade', tone: 'Dark', group: 'Deep base paint (upgrade)', brand: 'Dulux' })),
];

const FRAMES = [
  { id: 'fr-white', name: 'White', hex: '#f4f4f1', tone: 'Light', rec: true },
  ...pdf.frames.map((f) => ({
    id: `fr-${f.id}`, name: f.name, hex: f.hex, tone: f.tone, rec: f.rec, qldOnly: f.qldOnly,
    metallic: f.name === 'Silver',
  })),
].map((f) => ({ ...f, tier: 'Standard', group: 'Frame colour options' }));

// Guide p.16-17. Satinlite is the standard obscure glass for wet areas; the
// three tinted/obscure options above it are upgrades.
const GLAZING = [
  { id: 'gl-clear', name: 'Clear', tier: 'Standard', sub: 'Standard glazing', tint: '#1d2527', alpha: 0.3, rough: 0.03 },
  { id: 'gl-satinlite', name: 'Satinlite', tier: 'Standard', sub: 'Standard for wet areas', tint: '#dfe3e1', alpha: 0.9, rough: 0.42, obscure: true },
  { id: 'gl-translucent', name: 'Translucent', tier: 'Upgrade', sub: 'Obscure glazing', tint: '#dedcd8', alpha: 0.92, rough: 0.5, obscure: true },
  { id: 'gl-grey-tint', name: 'Grey Tint', tier: 'Upgrade', sub: 'Tinted glazing', tint: '#151919', alpha: 0.58, rough: 0.03 },
  { id: 'gl-ultra-grey', name: 'Ultra Grey', tier: 'Upgrade', sub: 'Tinted glazing', tint: '#0b0d0e', alpha: 0.8, rough: 0.03 },
].map((g) => ({ ...g, img: pdf.glazing.find((p) => g.name === p.name)?.img }));

// ---------- windows & sliding door extras (guide p.18-19) ----------
const SCREEN_UPGRADE = 'Upgrades are only available within existing window and sliding door sizes.';
const FLYSCREENS = [
  { id: 'fs-standard', name: 'As specified', sub: 'Standard flyscreens — hidden here so you can see the glazing', tier: 'Standard', mesh: null },
  { id: 'fs-fibreglass', name: 'Fibreglass Mesh', tier: 'Upgrade', img: 'swatches/screen-fibreglass.webp', mesh: 'fibreglass' },
  { id: 'fs-aluminium', name: 'Aluminium Mesh', tier: 'Upgrade', img: 'swatches/screen-aluminium.webp', mesh: 'aluminium' },
  { id: 'fs-stainless', name: 'Stainless Steel Mesh', tier: 'Upgrade', img: 'swatches/screen-stainless.webp', mesh: 'stainless' },
  { id: 'fs-midge', name: 'Mirco – Midge Mesh', sub: 'QLD only', tier: 'Upgrade', img: 'swatches/screen-midge.webp', mesh: 'midge', qldOnly: true },
  { id: 'fs-pet', name: 'Pet Mesh', tier: 'Upgrade', img: 'swatches/screen-pet.webp', mesh: 'pet' },
  { id: 'fs-fibre-door', name: 'Fly Screen Fibre Mesh', sub: 'Sliding door screen', tier: 'Upgrade', img: 'swatches/screen-fibre-door.webp', mesh: 'fibreglass' },
];
const BARRIER_SCREENS = [
  { id: 'bs-none', name: 'Not included', sub: 'No barrier screens', tier: 'Standard', barrier: null },
  { id: 'bs-diamond', name: 'Home Classic / Diamond Grille', tier: 'Upgrade', img: 'swatches/barrier-diamond.webp', barrier: 'diamond' },
  { id: 'bs-homestyle', name: 'Home Style', sub: 'Marine grade stainless steel mesh · QLD only', tier: 'Upgrade', img: 'swatches/barrier-homestyle.webp', barrier: 'homestyle', qldOnly: true },
];
const BOUTIQUE = [
  { id: 'bq-none', name: 'Standard windows & doors', sub: 'As per your specification', tier: 'Standard', boutique: null },
  { id: 'bq-window', name: 'Boutique Window', tier: 'Upgrade', img: 'swatches/boutique-window.webp', boutique: 'window' },
  { id: 'bq-slider', name: 'Boutique Sliding Door', tier: 'Upgrade', img: 'swatches/boutique-sliding-door.webp', boutique: 'slider' },
  { id: 'bq-both', name: 'Boutique Window & Sliding Door', tier: 'Upgrade', img: 'swatches/boutique-sliding-door.webp', boutique: 'both' },
];

// ---------- roof covering extras (guide p.6-7) ----------
const ROOF_EXTRAS = [
  { id: 'rx-none', name: 'As per your specification', sub: 'No additional roof insulation', tier: 'Standard' },
  { id: 'rx-sarking', name: 'Roof Sarking', sub: 'For roof tiles', tier: 'Upgrade Option', img: 'swatches/roof-sarking.webp', roof: 'tiles' },
  { id: 'rx-anticon', name: 'Anticon Blanket', sub: 'For sheet metal roof', tier: 'Upgrade Option', img: 'swatches/roof-anticon.webp', roof: 'sheet' },
];
const roofExtrasFor = (type) =>
  ROOF_EXTRAS.filter((e) => !e.roof || e.roof === (type === 'colorbond' ? 'sheet' : 'tiles'));

// ---------- roof ----------
const ROOF_TYPES = [
  { id: 'designer', name: 'Designer profile tiles', sub: 'Concrete roof tiles', tier: 'Standard', img: 'swatches/roof-designer-late-mist.webp', note: 'Narrow Lot & Traditional Lot homes only. Excludes Hervey Bay.' },
  { id: 'classic', name: 'Classic profile tiles', sub: 'Concrete roof tiles', tier: 'Upgrade', img: 'swatches/roof-classic-late-mist.webp' },
  { id: 'prestige', name: 'Prestige range tiles', sub: 'Concrete roof tiles', tier: 'Upgrade', img: 'swatches/roof-prestige-storm-grey.webp' },
  { id: 'colorbond', name: 'Colorbond® sheet roof', sub: 'Classic finish', tier: 'Standard', swatch: '#6d6d70', note: 'Acreage & Two Storey homes (standard for all homes in the Hervey Bay build area).' },
];
const ROOF_TILES = pdf.roofTiles.map((t) => ({
  id: `rt-${t.id}`, name: t.name, profile: t.profile, hex: t.hex, img: t.img, tone: t.tone, rec: t.rec,
  tier: t.profile === 'designer' ? 'Standard' : 'Upgrade',
}));

// ---------- bricks ----------
const RANGE_ORDER = ['Standard', 'Range A', 'Range B', 'Range C', 'Range D', 'POA'];
export const BRICKS = pdf.bricks
  .map((b) => ({
    ...b,
    name: b.name === 'Scandalwood' ? 'Sandalwood' : b.name,
    id: `br-${b.id}`,
    tier: b.range === 'Standard' ? 'Standard' : b.range === 'POA' ? 'Upgrade POA' : `Upgrade · ${b.range}`,
    group: `${b.supplier} Bricks · ${b.range === 'POA' ? 'Price on application' : b.range}`,
  }))
  .sort((a, b) => (a.supplier === b.supplier ? 0 : a.supplier === 'PGH' ? -1 : 1) || RANGE_ORDER.indexOf(a.range) - RANGE_ORDER.indexOf(b.range));

const MORTARS = [
  { id: 'mo-natural', name: 'Natural (Grey)', hex: '#a7a59e' },
  { id: 'mo-offwhite', name: 'Off White', hex: '#e2ddd2' },
];
const BONDS = [
  { id: 'bond-stretcher', name: 'Stretcher Bond', tier: 'Standard' },
  { id: 'bond-stack', name: 'Stack Bond', tier: 'Upgrade', note: 'Home specific' },
];
// Guide p.20 — mortar joint profile, standard to all face/feature brick.
const JOINTS = [
  { id: 'mj-ironed', name: 'Round (Ironed)', tier: 'Standard', joint: 'ironed' },
  { id: 'mj-flush', name: 'Flush', tier: 'Upgrade', note: 'To render areas only', joint: 'flush' },
];
// Guide p.21 — Bricks & Lintels.
const INFILLS = [
  {
    id: 'inf-brick', name: 'Brick Infill with Steel Lintel', sub: 'Brickwork carried over a galvanised lintel',
    tier: 'Standard', img: 'swatches/infill-brick-lintel.webp', infill: 'brick',
  },
  {
    id: 'inf-fc', name: 'Fibre Cement Infill', sub: 'Sheeted infill above the opening',
    tier: 'Upgrade', img: 'swatches/infill-fibre-cement.webp', infill: 'fc',
  },
];

// ---------- cladding / garage / driveway ----------
const CLADDING = [
  { id: 'cl-axon', key: 'axon', name: '133mm Axon Smooth', sub: 'Vertical groove panel' },
  { id: 'cl-stria', key: 'stria', name: '405mm Stria', sub: 'Horizontal board' },
  { id: 'cl-linea', key: 'linea', name: '180mm Linea Weatherboard', sub: 'Weatherboard' },
].map((c) => ({ ...c, tier: 'Home specific', img: pdf.claddingProfiles.find((p) => p.name === c.name)?.img }));

const GARAGE = [
  { id: 'gd-ranch', key: 'ranch', name: 'Ranch', tier: 'Standard' },
  { id: 'gd-slimline', key: 'slimline', name: 'Slimline', tier: 'Standard' },
  { id: 'gd-heritage', key: 'heritage', name: 'Heritage', tier: 'Standard' },
  { id: 'gd-flatline', key: 'flatline', name: 'Flatline', tier: 'Standard' },
  { id: 'gd-battens', key: 'battens', name: 'Vertical Battens', tier: 'Upgrade', note: 'Available in select timber look finishes' },
].map((g) => ({ ...g, img: pdf.garageProfiles.find((p) => p.name === g.name)?.img }));

export const DRIVEWAYS = [
  { id: 'dw-plain', name: 'Plain concrete', sub: 'Broom finish', tier: 'Standard', kind: 'plain', base: '#c9c6bf', tile: 4 },
  { id: 'dw-agg-natural', name: 'Exposed aggregate – Natural', sub: 'Mixed river pebble', tier: 'Upgrade', kind: 'aggregate', base: '#b8b1a6', stones: ['#8d8173', '#c9bfb1', '#6f675e', '#a89a88', '#e2dbd0'], tile: 1.6 },
  { id: 'dw-agg-charcoal', name: 'Exposed aggregate – Charcoal', sub: 'Dark basalt blend', tier: 'Upgrade', kind: 'aggregate', base: '#6d6c69', stones: ['#3c3b3a', '#57534f', '#86827c', '#2a2a2a', '#9c968e'], tile: 1.6 },
  { id: 'dw-col-charcoal', name: 'Coloured concrete – Charcoal', sub: 'Oxide through-colour', tier: 'Upgrade', kind: 'plain', base: '#5d5c5a', tile: 4 },
  { id: 'dw-col-sandstone', name: 'Coloured concrete – Sandstone', sub: 'Oxide through-colour', tier: 'Upgrade', kind: 'plain', base: '#cdb89a', tile: 4 },
  { id: 'dw-pav-charcoal', name: 'Pavers – Charcoal', sub: '400 × 200 stretcher', tier: 'Upgrade', kind: 'pavers', base: '#4f4e4c', tile: 1.6 },
  { id: 'dw-pav-sandstone', name: 'Pavers – Sandstone', sub: '400 × 200 stretcher', tier: 'Upgrade', kind: 'pavers', base: '#c8b394', tile: 1.6 },
];

const TRIM_TYPES = [
  { id: 'tt-timber', name: 'Timber look', tier: 'Upgrade' },
  { id: 'tt-colorbond', name: 'Colorbond®', tier: 'Standard' },
  { id: 'tt-paint', name: 'Painted', tier: 'Standard' },
];

// ---------- front entry door (guide p.40-47) ----------
// Each profile carries the glazed openings as fractions of the door leaf, so
// the 3D door is cut to match the product photo on its card.
const DOOR_PROFILES = [
  { id: 'dp-xs24', name: 'XS24', rows: 4, cut: 'hSlots', std: ['qld', 'nsw'] },
  { id: 'dp-xs26', name: 'XS26', rows: 6, cut: 'hSlots', std: ['qld', 'nsw'] },
  { id: 'dp-xs45', name: 'XS45', rows: 5, cut: 'vSlots', std: ['qld', 'nsw'] },
  { id: 'dp-xlr150', name: 'XLR150', cut: 'solid', groove: 'h', std: ['qld', 'nsw'] },
  { id: 'dp-xlr160', name: 'XLR160', cut: 'slot', groove: 'h', std: ['qld', 'nsw'] },
  { id: 'dp-jst1', name: 'JST1', cut: 'full', std: ['qld'] },
  { id: 'dp-xlr500', name: 'XLR500', cut: 'solid', groove: 'v', up: ['nsw'] },
  { id: 'dp-xvp12', name: 'XVP12', rows: 2, cut: 'panelled', up: ['nsw'] },
  { id: 'dp-xvp22', name: 'XVP22', rows: 1, cut: 'panelled', up: ['nsw'] },
  { id: 'dp-hav66', name: 'HAV66', grid: [2, 3], cut: 'grid', up: ['nsw'] },
  { id: 'dp-hav88', name: 'HAV88', grid: [2, 4], cut: 'grid', up: ['nsw'] },
  { id: 'dp-hav99', name: 'HAV99', grid: [3, 3], cut: 'grid', up: ['nsw'] },
  { id: 'dp-hav100', name: 'HAV100', grid: [1, 1], cut: 'grid', up: ['nsw'] },
].map((p) => ({
  ...p,
  sub: '1200mm wide timber',
  img: `swatches/door-${p.name.toLowerCase()}.webp`,
}));
const doorProfilesFor = (region) => {
  const r = region === 'qld' ? 'qld' : 'nsw';
  return DOOR_PROFILES.filter((p) => p.std?.includes(r) || p.up?.includes(r)).map((p) => ({
    ...p,
    tier: p.std?.includes(r) ? 'Standard' : 'Upgrade',
    group: p.std?.includes(r) ? 'Standard profiles' : 'Upgrade profiles',
  }));
};

const DOOR_FINISHES = [
  { id: 'dh-bright-chrome', name: 'Bright Chrome', hex: '#d8dce0', metal: 0.95, rough: 0.12 },
  { id: 'dh-satin-chrome', name: 'Satin Chrome', hex: '#b9bec3', metal: 0.9, rough: 0.34 },
  { id: 'dh-matte-black', name: 'Matte Black', hex: '#1d1d1f', metal: 0.4, rough: 0.62 },
  { id: 'dh-stainless', name: 'Stainless Steel', hex: '#a9aeb2', metal: 0.88, rough: 0.38 },
  { id: 'dh-polished-stainless', name: 'Polished Stainless', hex: '#c9ced2', metal: 0.95, rough: 0.16 },
  { id: 'dh-satin-brass', name: 'Satin Brass', hex: '#b08d4d', metal: 0.9, rough: 0.35 },
];
const finishes = (...ids) => ids.map((i) => DOOR_FINISHES.find((f) => f.id === i));

// shape: how the handle is built in 3D — lever on a backplate, a knob, or a
// vertical pull bar of the given length.
const DOOR_HANDLES = [
  {
    id: 'hd-angular-trilock', name: 'Gainsborough Angular Trilock', tier: 'Standard',
    img: 'swatches/handle-angular-trilock.webp', shape: 'lever',
    finishes: finishes('dh-bright-chrome', 'dh-satin-chrome'),
  },
  {
    id: 'hd-angular-black', name: 'Angular', sub: 'Matte Black', tier: 'Upgrade',
    img: 'swatches/handle-angular-matte-black.webp', shape: 'lever',
    finishes: finishes('dh-matte-black'),
  },
  {
    id: 'hd-aurora-black', name: 'Aurora', sub: 'Matte Black', tier: 'Upgrade',
    img: 'swatches/handle-aurora-matte-black.webp', shape: 'lever',
    finishes: finishes('dh-matte-black'),
  },
  {
    id: 'hd-aurora-chrome', name: 'Aurora', sub: 'Brushed Satin Chrome', tier: 'Upgrade',
    img: 'swatches/handle-aurora-satin-chrome.webp', shape: 'lever',
    finishes: finishes('dh-satin-chrome'),
  },
  {
    id: 'hd-knobset', name: 'Traditional Knobset', tier: 'Upgrade',
    img: 'swatches/handle-traditional-knobset.webp', shape: 'knob',
    finishes: finishes('dh-bright-chrome'),
  },
  {
    id: 'hd-omni600-btb', name: '600mm Omni Back to Back', tier: 'Upgrade',
    img: 'swatches/handle-omni-600-back-to-back.webp', shape: 'bar', bar: 0.6,
    finishes: finishes('dh-stainless', 'dh-matte-black', 'dh-polished-stainless'),
  },
  {
    id: 'hd-omni600-eclipse', name: '600mm Omni Eclipse Allure', tier: 'Upgrade',
    img: 'swatches/handle-omni-600-eclipse-allure.webp', shape: 'bar', bar: 0.6,
    finishes: finishes('dh-stainless', 'dh-matte-black', 'dh-polished-stainless', 'dh-satin-brass'),
  },
  {
    id: 'hd-accent450', name: '450mm Accent Allure', tier: 'Upgrade',
    img: 'swatches/handle-accent-450-allure.webp', shape: 'bar', bar: 0.45,
    finishes: finishes('dh-stainless', 'dh-matte-black'),
  },
  {
    id: 'hd-omni450-btb', name: '450mm Omni Accent Back to Back', tier: 'Upgrade',
    img: 'swatches/handle-omni-450-accent-btb.webp', shape: 'bar', bar: 0.45,
    finishes: finishes('dh-stainless', 'dh-matte-black'),
  },
];
const handleFinishes = (sel) => {
  const h = DOOR_HANDLES.find((x) => x.id === sel?.handle) || DOOR_HANDLES[0];
  return h.finishes.map((f) => ({ ...f, tier: h.tier === 'Standard' ? 'Standard' : 'Upgrade' }));
};

const DOOR_GLAZING = [
  { id: 'dg-clear', name: 'Clear', tier: 'Standard', img: 'swatches/doorglass-clear.webp', tint: '#1d2527', alpha: 0.32, rough: 0.04 },
  { id: 'dg-translucent', name: 'Translucent', tier: 'Upgrade', img: 'swatches/doorglass-translucent.webp', tint: '#dedcd8', alpha: 0.92, rough: 0.5, obscure: true },
  { id: 'dg-grey-tint', name: 'Grey Tint', tier: 'Upgrade', img: 'swatches/doorglass-grey-tint.webp', tint: '#151919', alpha: 0.6, rough: 0.04 },
  { id: 'dg-cathedral', name: 'Cathedral', sub: 'Sydney & Newcastle only', tier: 'Upgrade', img: 'swatches/doorglass-cathedral.webp', tint: '#d8d4cc', alpha: 0.9, rough: 0.62, obscure: true, sydneyOnly: true },
];

const DOOR_FINISH_TYPES = [
  { id: 'df-paint', name: 'Painted', sub: 'One white base paint colour included', tier: 'Standard' },
  { id: 'df-stain', name: 'Stained timber', sub: 'Choose a stain colour', tier: 'Standard' },
];

// ---------- colour equivalence across ranges ----------
// When a sibling field swaps the option list out from under a chosen colour
// (roof type, trim finish, garage profile), dropping the pick sends the material
// back to its unselected white and the item back to "Not selected yet" — and
// validate() skips null fields, so switching back never restores it. Match by
// name first, then by nearest hex, so the customer keeps a colour either way.
function rgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return null;
  const n = Number.parseInt(h, 16);
  return Number.isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Weighted RGB distance — closer to perceived difference than the raw metric,
// without pulling in a colour-space library for four swatch lists.
function colourGap(a, b) {
  const x = rgb(a);
  const y = rgb(b);
  if (!x || !y) return Infinity;
  const rm = (x[0] + y[0]) / 2;
  const dr = x[0] - y[0];
  const dg = x[1] - y[1];
  const db = x[2] - y[2];
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}

function nearestColour(value, list) {
  const cur = findOption(value);
  if (!cur || !list?.length) return null;
  const byName = list.find((o) => o.name === cur.name || (cur.short && o.short === cur.short));
  if (byName) return byName.id;
  let best = null;
  let bestGap = Infinity;
  for (const o of list) {
    const gap = colourGap(cur.hex, o.hex);
    if (gap < bestGap) {
      bestGap = gap;
      best = o;
    }
  }
  return best?.id ?? null;
}

// ---------- categories ----------
// Each category has fields; `primary` fields must be chosen before the item counts as done.
// options(ctx) receives { region, sel } where sel is this category's current selection.
export const CATEGORIES = [
  {
    key: 'roof', letter: 'A', name: 'Roof covering', view: 'roof',
    notes: [
      'Roof covering extras: sarking is used under roof tiles and an Anticon blanket under a sheet metal roof. **Please check your Specifications for your current inclusions.**',
      ENERGY_NOTE,
    ],
    fields: [
      { key: 'type', label: 'Roof type', kind: 'cards', default: 'designer', options: () => ROOF_TYPES },
      {
        key: 'colour', label: 'Colour', kind: 'swatches', primary: true,
        options: ({ sel }) => (sel.type === 'colorbond' ? COLORBOND : ROOF_TILES.filter((t) => t.profile === sel.type)),
        filters: ['tone'],
        // Tile names and Colorbond names do not overlap, so a name-only match
        // dropped the colour on every switch to or from the sheet roof.
        remap: (value, sel) => nearestColour(
          value,
          sel.type === 'colorbond' ? COLORBOND : ROOF_TILES.filter((t) => t.profile === sel.type),
        ),
      },
      {
        key: 'extras', label: 'Roof covering extras', kind: 'cards', default: 'rx-none',
        options: ({ sel }) => roofExtrasFor(sel.type),
        // sarking and anticon do the same job for the two roof types, so keep
        // the customer's "insulated" answer when the roof type changes
        remap: (value, sel) => (value && value !== 'rx-none'
          ? roofExtrasFor(sel.type).find((e) => e.roof)?.id || 'rx-none'
          : 'rx-none'),
      },
    ],
  },
  {
    key: 'gutter', letter: 'B', name: 'Gutter', view: 'eaves', notes: ['One colour included to all gutters.', ENERGY_NOTE],
    fields: [{ key: 'colour', label: 'Colorbond® colour', kind: 'swatches', primary: true, options: () => COLORBOND, filters: ['tone'] }],
  },
  {
    key: 'fascia', letter: 'C', name: 'Fascia', view: 'fascia',
    notes: ['One colour included to fascia. The same colour is used for the barge capping where a home design has a gable — this facade is fully hipped, so no barge is shown.', 'Fascia and gutter colours have a lesser impact on energy efficiency outcomes.'],
    fields: [{ key: 'colour', label: 'Colorbond® colour', kind: 'swatches', primary: true, options: () => COLORBOND, filters: ['tone'] }],
  },
  {
    key: 'downpipe', letter: 'D', name: 'Downpipe', view: 'downpipe', notes: ['Downpipe options are not detailed in the guide — shown here in the Colorbond® range used for gutters. Confirm at your appointment.'],
    fields: [{ key: 'colour', label: 'Colorbond® colour', kind: 'swatches', primary: true, options: () => COLORBOND, filters: ['tone'] }],
  },
  {
    key: 'cladding', letter: 'E', name: 'Cladding', view: 'cladding',
    notes: ['Cladding profiles are home specific.', 'Render and cladding paint colours include one white base paint colour to each material as standard. Deep base paint colours are an upgrade.', ENERGY_NOTE],
    fields: [
      { key: 'profile', label: 'Cladding profile', kind: 'cards', default: 'cl-axon', options: () => CLADDING },
      { key: 'colour', label: 'Paint colour (Dulux)', kind: 'swatches', primary: true, options: () => PAINTS },
    ],
  },
  {
    key: 'flashing', letter: 'F', name: 'Flashing Cap', view: 'flashing', notes: ['Flashing options are not detailed in the guide — shown here in the Colorbond® range. Confirm at your appointment.'],
    fields: [{ key: 'colour', label: 'Colorbond® colour', kind: 'swatches', primary: true, options: () => COLORBOND, filters: ['tone'] }],
  },
  {
    key: 'render', letter: 'G', name: 'Feature Render', view: 'entry',
    notes: ['Acratex rendered finish — included with select facade options (home design specific / upgrade).', 'Includes one white base paint colour as standard. Deep base paint colours are an upgrade.', ENERGY_NOTE],
    fields: [{ key: 'colour', label: 'Render paint colour (Dulux)', kind: 'swatches', primary: true, options: () => PAINTS }],
  },
  {
    key: 'bricks', letter: 'H', name: 'Bricks', view: 'bricks',
    notes: [
      'We recommend attending your nearest brick selection centre to view full panels of brickwork before finalising brick and mortar selection.',
      'Round (Ironed) mortar joint is standard to all face/feature brick. A flush joint is used to render areas only.',
      'Off-white mortar is standard for the Port Macquarie to Sydney build area.',
      'Infill above openings is the band between a window or door head and the top plate — standard is brickwork carried over a galvanised steel lintel.',
      ENERGY_NOTE,
    ],
    fields: [
      {
        key: 'brick', label: 'Brick', kind: 'swatches', primary: true, large: true,
        options: ({ region }) => BRICKS.filter((b) => b.region === region),
        filters: ['supplier', 'range', 'search'],
        // same brick in another build region
        remap: (value, sel, region) => {
          const cur = BRICKS.find((b) => b.id === value);
          return cur && BRICKS.find((b) => b.region === region && b.supplier === cur.supplier && b.name === cur.name)?.id;
        },
      },
      {
        key: 'mortar', label: 'Mortar colour', kind: 'chips', default: 'mo-natural',
        options: ({ region, sel }) => {
          const nsw = region !== 'qld';
          const brick = BRICKS.find((b) => b.id === sel.brick);
          return MORTARS.map((m) => ({
            ...m,
            tier: m.id === 'mo-natural' || nsw ? 'Standard' : 'Upgrade',
            disabled: m.id === 'mo-natural' && brick?.offWhite ? 'This brick requires the off-white mortar upgrade' : false,
          }));
        },
      },
      { key: 'joint', label: 'Mortar joint', kind: 'chips', default: 'mj-ironed', options: () => JOINTS },
      { key: 'bond', label: 'Laying pattern', kind: 'chips', default: 'bond-stretcher', options: () => BONDS },
      { key: 'infill', label: 'Infill above openings', kind: 'cards', default: 'inf-brick', options: () => INFILLS },
    ],
    // bricks flagged "U" in the guide need the off-white mortar upgrade
    normalize: (sel) => {
      if (BRICKS.find((b) => b.id === sel.brick)?.offWhite) sel.mortar = 'mo-offwhite';
    },
  },
  {
    key: 'trim', letter: 'I', name: 'Window Trim', view: 'trim',
    notes: ['Window trim / feature surround finishes are not detailed in the guide — timber-look finishes shown use the guide’s stain range and are indicative. Please discuss at your selection appointment.'],
    fields: [
      { key: 'type', label: 'Finish', kind: 'chips', default: 'tt-timber', options: () => TRIM_TYPES },
      {
        key: 'colour', label: 'Colour', kind: 'swatches', primary: true,
        options: ({ sel }) => (sel.type === 'tt-colorbond' ? COLORBOND : sel.type === 'tt-paint' ? PAINTS : TIMBER),
        remap: (value, sel) => nearestColour(
          value,
          sel.type === 'tt-colorbond' ? COLORBOND : sel.type === 'tt-paint' ? PAINTS : TIMBER,
        ),
      },
    ],
  },
  {
    key: 'frame', letter: 'J', name: 'Window Frame & Extras', view: 'windows',
    notes: [
      'Satinlite obscure glazing is standard for wet areas (the bathroom and ensuite windows on this model) whichever glazing you choose here.',
      SCREEN_UPGRADE,
      'Barrier screens provide added strength against forced entry. Choosing one fits it to every window and sliding door on the home.',
      'Your standard specification already includes flyscreens; they are left off the 3D view until you choose a mesh type, so the glazing stays visible.',
      'The Boutique window and sliding door are the same openings with a slimmer sightline and a flush pull handle — look at the centre mullion to see the difference.',
      ENERGY_NOTE,
    ],
    fields: [
      { key: 'colour', label: 'Frame colour', kind: 'swatches', primary: true, options: ({ region }) => FRAMES.filter((f) => !f.qldOnly || region === 'qld') },
      { key: 'glazing', label: 'Window glazing', kind: 'cards', default: 'gl-clear', options: () => GLAZING },
      {
        key: 'flyscreen', label: 'Flyscreen mesh', kind: 'cards', default: 'fs-standard',
        options: ({ region }) => FLYSCREENS.filter((f) => !f.qldOnly || region === 'qld'),
      },
      {
        key: 'barrier', label: 'Barrier screens', kind: 'cards', default: 'bs-none',
        options: ({ region }) => BARRIER_SCREENS.filter((b) => !b.qldOnly || region === 'qld'),
      },
      { key: 'boutique', label: 'Boutique upgrades', kind: 'cards', default: 'bq-none', options: () => BOUTIQUE },
    ],
  },
  {
    key: 'garage', letter: 'K', name: 'Garage door', view: 'garage', notes: [ENERGY_NOTE, 'Timber look finishes: please discuss at your selection appointment.'],
    fields: [
      { key: 'profile', label: 'Profile', kind: 'cards', default: 'gd-flatline', options: () => GARAGE },
      {
        // the guide splits these into "Standard Colour Options" and the
        // "Timber Look Upgrade", so group them the same way here
        key: 'colour', label: 'Colour', kind: 'swatches', primary: true,
        options: ({ sel }) => (sel.profile === 'gd-battens'
          ? TIMBER.map((o) => ({ ...o, group: 'Timber look finishes · upgrade' }))
          : [
            ...COLORBOND.map((o) => ({ ...o, group: `Standard colour options · ${o.tone}` })),
            ...TIMBER.map((o) => ({ ...o, group: 'Timber look finishes · upgrade' })),
          ]),
        filters: ['tone'],
        // Battens are a timber-look-only profile, so carry a Colorbond pick
        // across to the closest stain rather than clearing the selection.
        remap: (value, sel) => {
          if (sel.profile !== 'gd-battens') return value;
          return value?.startsWith('tb-') ? value : nearestColour(value, TIMBER);
        },
      },
    ],
  },
  {
    key: 'driveway', letter: 'L', name: 'Driveway', view: 'driveway',
    notes: ['Driveway finishes are not detailed in the guide — options shown are typical and indicative. Confirm at your appointment.'],
    fields: [{ key: 'finish', label: 'Driveway finish', kind: 'cards', primary: true, options: () => DRIVEWAYS }],
  },
  {
    key: 'entry', letter: 'M', name: 'Front Entry Door', view: 'entrydoor',
    notes: [
      'Profile options are build-region specific. Standard profiles are included with Designer and Elegance Inclusions; the rest are an upgrade.',
      'Includes one white base paint colour as standard to the entry door and frame. Stain colours are shown on the guide’s stain range.',
      'Cathedral glazing is available in the Sydney & Newcastle build areas only.',
      'Satin Brass is only available on the 600mm Omni Eclipse Allure.',
      ENERGY_NOTE,
    ],
    fields: [
      {
        // no default: the door renders as the standard XS24 until the customer
        // picks, but the item stays unticked like every other selection
        key: 'profile', label: 'Door profile', kind: 'cards', primary: true,
        options: ({ region }) => doorProfilesFor(region),
        remap: (value, sel, region) => (doorProfilesFor(region).some((p) => p.id === value) ? value : 'dp-xs24'),
      },
      { key: 'glazing', label: 'Glazing', kind: 'cards', default: 'dg-clear', options: ({ region }) => DOOR_GLAZING.filter((g) => !g.sydneyOnly || region === 'nsw-syd') },
      { key: 'handle', label: 'Entry door handle', kind: 'cards', default: 'hd-angular-trilock', options: () => DOOR_HANDLES },
      { key: 'handleFinish', label: 'Handle finish', kind: 'chips', default: 'dh-bright-chrome', options: ({ sel }) => handleFinishes(sel) },
      { key: 'finishType', label: 'Door finish', kind: 'chips', default: 'df-paint', options: () => DOOR_FINISH_TYPES },
      { key: 'paint', label: 'Paint colour (Dulux)', kind: 'swatches', when: (sel) => sel.finishType !== 'df-stain', options: () => PAINTS },
      { key: 'stain', label: 'Stain colour', kind: 'swatches', when: (sel) => sel.finishType === 'df-stain', options: () => TIMBER },
    ],
    // the handle finish list changes with the handle, so keep them consistent
    normalize: (sel) => {
      const list = handleFinishes(sel);
      if (!list.some((f) => f.id === sel.handleFinish)) sel.handleFinish = list[0]?.id || null;
      if (sel.finishType === 'df-stain') sel.stain = sel.stain || TIMBER[0].id;
      else sel.paint = sel.paint || PAINTS[0].id;
    },
  },
];

export const NOTES = { ENERGY_NOTE, SCREEN_NOTE };

const ALL = new Map();
for (const list of [COLORBOND, TIMBER, PAINTS, FRAMES, GLAZING, ROOF_TYPES, ROOF_TILES, ROOF_EXTRAS, BRICKS, MORTARS, BONDS, JOINTS, INFILLS, CLADDING, GARAGE, DRIVEWAYS, TRIM_TYPES, FLYSCREENS, BARRIER_SCREENS, BOUTIQUE, DOOR_PROFILES, DOOR_HANDLES, DOOR_FINISHES, DOOR_GLAZING, DOOR_FINISH_TYPES]) {
  for (const o of list) ALL.set(o.id, o);
}
export const findOption = (id) => ALL.get(id);

export function defaultSelection(cat) {
  const sel = {};
  for (const f of cat.fields) if (f.default) sel[f.key] = f.default;
  return sel;
}

export function isComplete(cat, sel) {
  return cat.fields.every((f) => !f.primary || (sel && sel[f.key]));
}
