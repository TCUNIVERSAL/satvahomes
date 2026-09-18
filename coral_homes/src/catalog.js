// Selection catalogue for the 12 external items (A–L) on page 3 of the
// Coral Homes Pre-Selection Guide. Colours/images come from the guide itself
// (extracted into data/pdf-swatches.json); items the guide does not detail
// (driveway, downpipe, flashing cap, window trim) use sensible defaults.
import pdf from './data/pdf-swatches.json';

export const REGIONS = [
  { id: 'qld', name: 'Queensland & Northern NSW', detail: 'Hervey Bay south to Nambucca Heads' },
  { id: 'nsw-cc', name: 'NSW – Port Macquarie to Central Coast', detail: 'Off-white mortar is standard' },
  { id: 'nsw-syd', name: 'NSW – Sydney', detail: 'Off-white mortar is standard' },
];

const ENERGY_NOTE =
  'Coral Recommended (⚡): solar absorptance of 0.40 or less. In Hervey Bay, Sunshine Coast, Brisbane, Gold Coast, Tweed, Ballina and Coffs Harbour the builder recommends light colours — additional costs may apply for medium or dark colours.';
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

const GLAZING = [
  { id: 'gl-clear', name: 'Clear', tier: 'Standard', tint: '#1d2527', alpha: 0.3, rough: 0.03 },
  { id: 'gl-grey-tint', name: 'Grey Tint', tier: 'Upgrade', tint: '#151919', alpha: 0.58, rough: 0.03 },
  { id: 'gl-ultra-grey', name: 'Ultra Grey', tier: 'Upgrade', tint: '#0b0d0e', alpha: 0.8, rough: 0.03 },
  { id: 'gl-translucent', name: 'Translucent', tier: 'Upgrade', tint: '#dedcd8', alpha: 0.92, rough: 0.5 },
].map((g) => ({ ...g, img: pdf.glazing.find((p) => g.name.startsWith(p.name))?.img }));

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

// ---------- categories ----------
// Each category has fields; `primary` fields must be chosen before the item counts as done.
// options(ctx) receives { region, sel } where sel is this category's current selection.
export const CATEGORIES = [
  {
    key: 'roof', letter: 'A', name: 'Roof covering', view: 'roof', notes: [ENERGY_NOTE],
    fields: [
      { key: 'type', label: 'Roof type', kind: 'cards', default: 'designer', options: () => ROOF_TYPES },
      {
        key: 'colour', label: 'Colour', kind: 'swatches', primary: true,
        options: ({ sel }) => (sel.type === 'colorbond' ? COLORBOND : ROOF_TILES.filter((t) => t.profile === sel.type)),
        filters: ['tone'],
        remap: (value, sel) => {
          // keep the colour by name when switching roof type if it exists there
          const all = [...COLORBOND, ...ROOF_TILES];
          const cur = all.find((o) => o.id === value);
          if (!cur) return null;
          const list = sel.type === 'colorbond' ? COLORBOND : ROOF_TILES.filter((t) => t.profile === sel.type);
          return list.find((o) => o.name === cur.name)?.id || null;
        },
      },
    ],
  },
  {
    key: 'gutter', letter: 'B', name: 'Gutter', view: 'eaves', notes: ['One colour included to all gutters.', ENERGY_NOTE],
    fields: [{ key: 'colour', label: 'Colorbond® colour', kind: 'swatches', primary: true, options: () => COLORBOND, filters: ['tone'] }],
  },
  {
    key: 'fascia', letter: 'C', name: 'Fascia', view: 'eaves', notes: ['One colour included to fascia.', 'Fascia and gutter colours have a lesser impact on energy efficiency outcomes.'],
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
    notes: ['We recommend attending your nearest brick selection centre to view full panels of brickwork before finalising brick and mortar selection.', 'Mortar joint: Round (Ironed) — standard to all face/feature brick.', ENERGY_NOTE],
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
      { key: 'bond', label: 'Laying pattern', kind: 'chips', default: 'bond-stretcher', options: () => BONDS },
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
        remap: () => null,
      },
    ],
  },
  {
    key: 'frame', letter: 'J', name: 'Window Frame', view: 'windows',
    notes: ['Satinlite obscure glazing is standard for wet areas (the bathroom windows on this model).', 'Upgrades are only available within existing window and sliding door sizes.', ENERGY_NOTE],
    fields: [
      { key: 'colour', label: 'Frame colour', kind: 'swatches', primary: true, options: ({ region }) => FRAMES.filter((f) => !f.qldOnly || region === 'qld') },
      { key: 'glazing', label: 'Window glazing', kind: 'cards', default: 'gl-clear', options: () => GLAZING },
    ],
  },
  {
    key: 'garage', letter: 'K', name: 'Garage door', view: 'garage', notes: [ENERGY_NOTE, 'Timber look finishes: please discuss at your selection appointment.'],
    fields: [
      { key: 'profile', label: 'Profile', kind: 'cards', default: 'gd-flatline', options: () => GARAGE },
      {
        key: 'colour', label: 'Colour', kind: 'swatches', primary: true,
        options: ({ sel }) => (sel.profile === 'gd-battens' ? TIMBER : [...COLORBOND, ...TIMBER]),
        filters: ['tone'],
        remap: (value, sel) => (sel.profile === 'gd-battens' && !value?.startsWith('tb-') ? null : value),
      },
    ],
  },
  {
    key: 'driveway', letter: 'L', name: 'Driveway', view: 'driveway',
    notes: ['Driveway finishes are not detailed in the guide — options shown are typical and indicative. Confirm at your appointment.'],
    fields: [{ key: 'finish', label: 'Driveway finish', kind: 'cards', primary: true, options: () => DRIVEWAYS }],
  },
];

export const NOTES = { ENERGY_NOTE, SCREEN_NOTE };

const ALL = new Map();
for (const list of [COLORBOND, TIMBER, PAINTS, FRAMES, GLAZING, ROOF_TYPES, ROOF_TILES, BRICKS, MORTARS, BONDS, CLADDING, GARAGE, DRIVEWAYS, TRIM_TYPES]) {
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
