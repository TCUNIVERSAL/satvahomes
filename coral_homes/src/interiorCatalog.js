// Internal (interior) selections, taken from pages 27–69 of the Coral Homes
// Pre-Selection Guide. Images/colours are extracted from the guide itself
// (src/data/pdf-interior.json). Every option carries the data the 3D scene
// needs (shape, finish, size) so the model updates when a choice is made.
import INT from './data/pdf-interior.json';

// ---------------------------------------------------------------- guide data
const page = (p) => INT[`p${p}`] || [];
const hit = (p, label) => {
  const l = label.toLowerCase();
  const list = page(p);
  return (
    list.find((e) => e.label.toLowerCase() === l) ||
    list.find((e) => e.label.toLowerCase().startsWith(l)) ||
    list.find((e) => e.label.toLowerCase().includes(l)) ||
    {}
  );
};
// option from the guide: o(id, page, label, extra)
const o = (id, p, label, extra = {}) => {
  const e = hit(p, label);
  return { id, name: extra.name || e.label || label, img: e.img, hex: extra.hex || e.hex, tex: e.tex, ...extra };
};

export const TIERS = { STD: 'Standard', DES: 'Included · Designer', ELE: 'Included · Elegance', UP: 'Upgrade', OPT: 'Optional' };

// ---------------------------------------------------------------- finishes
export const FINISHES = {
  chrome: { name: 'Chrome', hex: '#e6eaec', metal: 0.95, rough: 0.1 },
  'matte-black': { name: 'Matte Black', hex: '#1d1d1d', metal: 0.5, rough: 0.5 },
  'brushed-nickel': { name: 'Brushed Nickel', hex: '#c9cac4', metal: 0.9, rough: 0.32 },
  'brushed-gold': { name: 'Brushed Gold', hex: '#c8a566', metal: 0.9, rough: 0.3 },
  'brushed-brass': { name: 'Brushed Brass', hex: '#c3a267', metal: 0.9, rough: 0.34 },
  gunmetal: { name: 'Gunmetal', hex: '#4b4d52', metal: 0.85, rough: 0.38 },
  'brushed-carbon': { name: 'Brushed Carbon', hex: '#3b3e41', metal: 0.85, rough: 0.4 },
  'satin-chrome': { name: 'Satin Chrome', hex: '#d6dade', metal: 0.9, rough: 0.28 },
  'satin-brass': { name: 'Satin Brass', hex: '#c4a45f', metal: 0.85, rough: 0.35 },
  'satin-graphite': { name: 'Satin Graphite', hex: '#3a3835', metal: 0.7, rough: 0.45 },
  stainless: { name: 'Stainless Steel', hex: '#d2d5d7', metal: 0.85, rough: 0.28 },
  bronze: { name: 'Antique Bronze', hex: '#6f5844', metal: 0.8, rough: 0.42 },
  white: { name: 'White', hex: '#f2f1ee', metal: 0, rough: 0.4 },
};
const fin = (keys, tierOf = () => TIERS.UP) =>
  keys.map((k) => ({ id: `fin-${k}`, finish: k, name: FINISHES[k].name, hex: FINISHES[k].hex, tier: tierOf(k) }));

// ---------------------------------------------------------------- Laminex colours (kitchen + vanity)
const LAM_SOLID = [
  'Super White', 'Polar White', 'Calm White', 'Chalk White', 'White Linen', 'White', 'Ghostgum', 'Alabaster', 'Surf',
  'Aries', 'Pearl Grey', 'Oyster Grey', 'Seed', 'Baye', 'Spinifex', 'Fox', 'Pewter', 'Tornado', 'Lava Grey',
  'Green Slate', 'Winter Sky', 'Fossil', 'Battalion', 'Possum', 'Gunmetal', 'Stormcloud', 'Charcoal', 'French Navy',
  'Terril', 'Black',
];
const LAM_WOOD = [
  'Bleached Elm', 'Classic Oak', 'Delana Oak', 'Fox Teakwood', 'Rural Oak', 'Elegant Oak', 'Planked Urban Oak',
  'Natural Walnut', 'Lustrous Elm', 'Oiled Legno', 'Aged Walnut', 'Milano Walnut', 'Jarrah Legno', 'Blackened Legno',
  'Burnished Wood',
];
const laminexColours = (pSolid, pWood, prefix) => [
  ...LAM_SOLID.map((n) => o(`${prefix}-${slug(n)}`, pSolid, n, { tier: TIERS.STD, group: 'Solid colours (one included as standard)' })),
  ...LAM_WOOD.map((n) => o(`${prefix}-${slug(n)}`, pWood, n, { tier: TIERS.UP, group: 'Woodgrain colours (upgrade)', wood: true })),
];
function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------- Caesarstone
const STONE = [
  ...['Intense White', 'Osprey', 'Ocean Foam', 'Snow', 'Oyster', 'Raven'].map((n) => o(`cs-${slug(n)}`, 39, n, { tier: TIERS.STD, group: 'Standard' })),
  ...['Pure White', 'Organic White', 'Fresh Concrete', 'Alpine Mist', 'Raw Concrete', 'Georgian Bluffs'].map((n) => o(`cs-${slug(n)}`, 39, n, { tier: 'Upgrade M1', group: 'Upgrade M1' })),
  ...['Aterra Blanca', 'Frosty Carina', 'White Attica', 'Bianco Drift'].map((n) => o(`cs-${slug(n)}`, 40, n, { tier: 'Upgrade M2', group: 'Upgrade M2' })),
  ...['Statuario Maximus', 'Calacatta Nuvo', 'Arabetto'].map((n) => o(`cs-${slug(n)}`, 40, n, { tier: 'Upgrade M3', group: 'Upgrade M3' })),
  o('cs-empira-white', 40, 'Empira White', { tier: 'Upgrade M4', group: 'Upgrade M4' }),
];

// ---------------------------------------------------------------- handles
// shape drives the 3D model: bar pull, knob, cup/shell, square bar, finger pull
const HANDLES = [
  o('h-baldone-102', 45, 'Baldone 102mm', { tier: TIERS.STD, group: 'Standard range', shape: 'bar', len: 0.102, finish: 'satin-chrome' }),
  o('h-balmo-149', 45, 'Balmo 149mm', { tier: TIERS.STD, group: 'Standard range', shape: 'bow', len: 0.149, finish: 'satin-chrome' }),
  o('h-hale', 45, 'Hale 156/188mm', { tier: TIERS.STD, group: 'Standard range', shape: 'bar', len: 0.188, finish: 'satin-chrome' }),
  o('h-matane-black', 45, 'Matane Matte Black', { tier: TIERS.STD, group: 'Standard range', shape: 'cup', len: 0.1, finish: 'matte-black' }),
  o('h-empoli', 45, 'Empoli 38mm', { tier: TIERS.STD, group: 'Standard range', shape: 'cup', len: 0.05, finish: 'chrome' }),
  o('h-baldone-black-102', 45, 'Baldone Matte Black 102mm', { tier: TIERS.STD, group: 'Standard range', shape: 'bar', len: 0.102, finish: 'matte-black' }),
  o('h-armento', 45, 'Armento Matte Black', { tier: TIERS.STD, group: 'Standard range', shape: 'knob', len: 0.04, finish: 'matte-black' }),
  o('h-bell', 45, 'Bell Knob', { tier: TIERS.STD, group: 'Standard range', shape: 'knob', len: 0.035, finish: 'satin-chrome' }),
  o('h-botha', 45, 'Botha Knob', { tier: TIERS.UP, group: 'Bronze range', shape: 'knob', len: 0.04, finish: 'bronze' }),
  o('h-teall', 45, 'Teall Handle', { tier: TIERS.UP, group: 'Bronze range', shape: 'bow', len: 0.16, finish: 'bronze' }),
  o('h-traditional-shell', 45, 'Traditional Shell', { tier: TIERS.UP, group: 'Bronze range', shape: 'cup', len: 0.1, finish: 'satin-chrome' }),
  o('h-esbo', 45, 'Esbo', { tier: TIERS.UP, group: 'Bronze range', shape: 'knob', len: 0.035, finish: 'bronze' }),
  o('h-matane', 45, 'Matane', { tier: TIERS.UP, group: 'Bronze range', shape: 'cup', len: 0.1, finish: 'brushed-nickel' }),
  o('h-baldone-134', 45, 'Baldone 134', { tier: TIERS.UP, group: 'Bronze range', shape: 'bar', len: 0.134, finish: 'satin-chrome' }),
  o('h-baldone-black-134', 45, 'Baldone Matte Black 134', { tier: TIERS.UP, group: 'Bronze range', shape: 'bar', len: 0.134, finish: 'matte-black' }),
  o('h-clare-pull-128', 46, 'Clare Pull 16-128mm', { tier: TIERS.UP, group: 'Silver range', shape: 'flat', len: 0.128, finish: 'satin-chrome' }),
  o('h-clare-knob', 46, 'Clare Knob', { tier: TIERS.UP, group: 'Silver range', shape: 'knob', len: 0.035, finish: 'satin-brass' }),
  o('h-binda', 46, 'Binda 128-192mm', { tier: TIERS.UP, group: 'Silver range', shape: 'square', len: 0.192, finish: 'matte-black' }),
  o('h-ribe', 46, 'Ribe Knob', { tier: TIERS.UP, group: 'Silver range', shape: 'knob', len: 0.04, finish: 'matte-black' }),
  o('h-bargo', 46, 'Bargo Knob', { tier: TIERS.UP, group: 'Silver range', shape: 'knob', len: 0.04, finish: 'satin-brass' }),
  o('h-lounge-black', 46, 'Lounge Matte Black', { tier: TIERS.UP, group: 'Gold range', shape: 'bow', len: 0.19, finish: 'matte-black' }),
  o('h-lounge-ss', 46, 'Lounge Stainless Steel', { tier: TIERS.UP, group: 'Gold range', shape: 'bow', len: 0.19, finish: 'stainless' }),
  o('h-clare-pull-224', 46, 'Clare Pull 224mm', { tier: TIERS.UP, group: 'Gold range', shape: 'flat', len: 0.224, finish: 'satin-brass' }),
  { id: 'h-archive-copper', name: 'Archive (copper)', img: page(46)[8]?.img, tier: TIERS.UP, group: 'Gold range', shape: 'flat', len: 0.2, finish: 'bronze' },
  { id: 'h-archive-black', name: 'Archive (black)', img: page(46)[9]?.img, tier: TIERS.UP, group: 'Gold range', shape: 'flat', len: 0.2, finish: 'matte-black' },
  { id: 'h-finger-pull', name: 'L shaped finger pull', tier: TIERS.UP, group: 'Handleless', shape: 'finger', len: 0, finish: 'matte-black', hex: '#3a3a3a' },
];

// ---------------------------------------------------------------- shared lists
const FLOOR_TYPES = [
  { id: 'fl-tile', name: 'Ceramic floor tiles', sub: 'Builder standard range', tier: TIERS.STD, kind: 'tile', size: 0.45 },
  o('fl-tile-600', 33, 'Ceramic Floor Tiling Option', { name: '600 × 600 ceramic tiles', sub: 'Elegance option', tier: TIERS.ELE, kind: 'tile', size: 0.6 }),
  o('fl-laminate', 33, 'Laminate', { name: 'Laminate', sub: 'Scratch & stain resistant', tier: TIERS.UP, kind: 'timber', plank: [1.2, 0.19] }),
  o('fl-hybrid', 33, 'Vinyl Hybrid', { name: 'Vinyl hybrid', sub: 'Waterproof, hard wearing', tier: TIERS.UP, kind: 'timber', plank: [1.2, 0.18] }),
  o('fl-engineered', 33, 'Engineered Timber', { name: 'Engineered timber', sub: '3-ply real timber veneer', tier: TIERS.UP, kind: 'timber', plank: [1.8, 0.19] }),
  o('fl-timberlook', 33, 'Timber-Look Flooring Option', { name: 'Timber-look laminate', sub: 'Elegance option', tier: TIERS.ELE, kind: 'timber', plank: [1.5, 0.19] }),
];
const TILE_COLOURS = [
  { id: 'flc-pearl', name: 'Pearl', hex: '#d9d6cf', tone: 'Light' },
  { id: 'flc-limestone', name: 'Limestone', hex: '#c7c1b4', tone: 'Light' },
  { id: 'flc-concrete', name: 'Concrete', hex: '#a9a8a4', tone: 'Medium' },
  { id: 'flc-basalt', name: 'Basalt', hex: '#6f6f6e', tone: 'Dark' },
];
const TIMBER_COLOURS = [
  o('flc-bleached', 43, 'Bleached Elm', { name: 'Bleached', tone: 'Light' }),
  o('flc-natural-oak', 43, 'Classic Oak', { name: 'Natural Oak', tone: 'Light' }),
  o('flc-coastal', 43, 'Delana Oak', { name: 'Coastal Grey', tone: 'Medium' }),
  o('flc-rural-oak', 43, 'Rural Oak', { name: 'Warm Oak', tone: 'Medium' }),
  o('flc-walnut', 43, 'Natural Walnut', { name: 'Walnut', tone: 'Dark' }),
  o('flc-smoked', 43, 'Blackened Legno', { name: 'Smoked', tone: 'Dark' }),
];

// resolve a sink mixer by id (used by the mixer-finish field guard)
const mixerOption = (id) =>
  INTERIOR_CATEGORIES.find((c) => c.key === 'k-sink').fields.find((f) => f.key === 'mixer').options({}).find((x) => x.id === id);

// ---------------------------------------------------------------- categories
export const INTERIOR_SECTIONS = [
  { key: 'general', name: 'Internal' },
  { key: 'kitchen', name: 'Kitchen' },
  { key: 'bathroom', name: 'Bathroom, Ensuite & Laundry' },
];

const SCREEN = 'On-screen colours and finishes are indicative only — confirm with samples at your selection appointment.';

export const INTERIOR_CATEGORIES = [
  // ============================================================== INTERNAL
  {
    key: 'flooring', letter: 'F1', section: 'general', name: 'Main flooring', view: 'living',
    notes: ['Floor coverings are shown with indicative looks — the guide lists flooring types, colours are chosen at your appointment.'],
    fields: [
      {
        key: 'type', label: 'Flooring type', kind: 'cards', default: 'fl-tile', primary: true,
        options: () => FLOOR_TYPES,
      },
      {
        key: 'colour', label: 'Floor colour', kind: 'swatches', primary: true, default: 'flc-natural-oak',
        options: ({ sel }) =>
          (FLOOR_TYPES.find((x) => x.id === sel.type)?.kind === 'tile' ? TILE_COLOURS : TIMBER_COLOURS),
      },
    ],
  },
  {
    key: 'carpet', letter: 'F2', section: 'general', name: 'Carpet', view: 'master',
    notes: ['Carpet colours shown are indicative. Ask your Interior Designer about underlay upgrade options for extra comfort.'],
    fields: [
      {
        key: 'grade', label: 'Carpet', kind: 'cards', default: 'cp-standard', primary: true,
        options: () => [
          { id: 'cp-standard', name: 'Carpet', sub: 'Builder standard range', tier: TIERS.STD },
          o('cp-underlay', 33, 'Upgraded Carpet with 10mm Foam Underlay', { name: 'Upgraded carpet + 10mm underlay', sub: 'Elegance option', tier: TIERS.ELE }),
        ],
      },
      {
        key: 'colour', label: 'Carpet colour', kind: 'swatches', primary: true, default: 'cc-oatmeal',
        options: () => [
          { id: 'cc-oatmeal', name: 'Oatmeal', hex: '#cfc4b2', tone: 'Light' },
          { id: 'cc-pebble', name: 'Pebble', hex: '#b6afa4', tone: 'Light' },
          { id: 'cc-driftwood', name: 'Driftwood', hex: '#9b9287', tone: 'Medium' },
          { id: 'cc-storm', name: 'Storm', hex: '#7c7a78', tone: 'Medium' },
          { id: 'cc-charcoal', name: 'Charcoal', hex: '#4f4e4d', tone: 'Dark' },
        ],
      },
    ],
  },
  {
    key: 'paint', letter: 'F3', section: 'general', name: 'Internal paint', view: 'living',
    notes: ['Includes one white based paint colour to all walls and one white based colour to all woodwork (internal doors, skirting and architraves) as standard.'],
    fields: [
      {
        key: 'walls', label: 'Wall colour (Dulux)', kind: 'swatches', primary: true, default: 'pw-natural-white',
        options: () => [
          ...['Natural White', 'Snowy Mountains Half', 'Whisper White'].map((n) => o(`pw-${slug(n)}`, 32, n, { tier: TIERS.STD, group: 'Most loved warm whites' })),
          ...['Lexicon Quarter', 'Lexicon', 'Terrace White'].map((n) => o(`pw-${slug(n)}`, 32, n, { tier: TIERS.STD, group: 'Most loved cool whites' })),
          ...['Rottnest Island', 'Silver Tea Set', 'Winter Terrace'].map((n) => o(`pw-${slug(n)}`, 32, n, { tier: TIERS.STD, group: 'Popular greys & neutrals' })),
        ],
      },
      {
        key: 'woodwork', label: 'Woodwork colour', kind: 'swatches', default: 'pk-natural-white',
        options: () => ['Natural White', 'Whisper White', 'Lexicon Quarter', 'Lexicon'].map((n) => o(`pk-${slug(n)}`, 32, n, { tier: TIERS.STD })),
      },
      {
        key: 'finish', label: 'Paint finish', kind: 'chips', default: 'pf-standard',
        options: () => [
          { id: 'pf-standard', name: 'Standard finish', tier: TIERS.STD },
          o('pf-washwear', 32, 'Wash & Wear Matt Finish', { tier: TIERS.ELE }),
          o('pf-enviro2', 32, 'envirO2', { tier: TIERS.UP }),
        ],
      },
    ],
  },
  {
    key: 'feature', letter: 'F4', section: 'general', name: 'Feature wall', view: 'living',
    notes: ['Internal feature wall cladding is an optional upgrade. Shown here on the family room feature wall.'],
    fields: [
      {
        key: 'type', label: 'Feature wall', kind: 'cards', default: 'fw-none', primary: true,
        options: () => [
          { id: 'fw-none', name: 'None', sub: 'Painted walls throughout', tier: TIERS.STD },
          o('fw-hardigroove', 31, 'Hardigroove Cladding', { name: 'Hardigroove cladding', sub: 'Vertical grooved lining', tier: TIERS.UP }),
          o('fw-dado', 31, 'Dado Rails', { name: 'Dado rails', sub: 'Panelled lower wall', tier: TIERS.UP }),
        ],
      },
      {
        key: 'colour', label: 'Feature colour', kind: 'swatches', default: 'fc-silver-tea-set', when: (sel) => sel.type !== 'fw-none',
        options: () => [
          ...['Rottnest Island', 'Silver Tea Set', 'Winter Terrace', 'Terrace White'].map((n) => o(`fc-${slug(n)}`, 32, n, { tier: TIERS.STD })),
          { id: 'fc-deep-blue', name: 'Deep Blue (indicative)', hex: '#43505c', tier: TIERS.UP },
          { id: 'fc-charcoal', name: 'Charcoal (indicative)', hex: '#4a4b4a', tier: TIERS.UP },
        ],
      },
    ],
  },
  {
    key: 'trims', letter: 'F5', section: 'general', name: 'Skirting, architraves & cornice', view: 'living',
    fields: [
      {
        key: 'skirting', label: 'Skirting & architraves', kind: 'cards', default: 'sk-half-splayed', primary: true,
        options: () => [
          o('sk-half-splayed', 31, 'Half Splayed', { tier: TIERS.STD, profile: 'splay' }),
          o('sk-pencil-round', 31, 'Pencil Round', { tier: TIERS.STD, profile: 'round' }),
          o('sk-single-bevel', 31, 'Single Bevel', { tier: TIERS.STD, profile: 'bevel' }),
        ],
      },
      {
        key: 'cornice', label: 'Cornice', kind: 'cards', default: 'cn-cove', primary: true,
        options: () => [
          o('cn-cove', 31, '75mm Cove', { tier: TIERS.STD, profile: 'cove', size: 0.075 }),
          o('cn-cairo', 31, 'Cairo 3 Step', { tier: TIERS.UP, profile: 'step', size: 0.09 }),
          o('cn-manly', 31, '75mm Manly', { tier: TIERS.UP, profile: 'manly', size: 0.075 }),
          o('cn-newyork', 31, '90mm New York', { tier: TIERS.UP, profile: 'newyork', size: 0.09 }),
          o('cn-square', 31, 'Square Set', { tier: TIERS.UP, profile: 'square', size: 0 }),
        ],
      },
    ],
  },
  {
    key: 'doors', letter: 'F6', section: 'general', name: 'Internal doors', view: 'hall',
    notes: ['Designer Inclusions: 2040mm high. Elegance Inclusions: 2340mm high (lower floors only). This home is drawn with 2340mm doors.'],
    fields: [
      {
        key: 'style', label: 'Door style', kind: 'cards', default: 'dr-flush', primary: true, large: true,
        options: () => [
          o('dr-flush', 29, 'Flush Panel', { tier: TIERS.STD, panels: 'flush' }),
          ...['HA4', 'HA5', 'HA40', 'HAG6', 'HAG9', 'HAG11', 'HAG12', 'HAG14', 'HAG18'].map((n) =>
            o(`dr-${slug(n)}`, 29, n, { tier: TIERS.UP, group: 'Accent range', panels: n.startsWith('HAG') ? 'groove' : 'panel' })),
          ...['HAM1', 'HAM1 - Frost Glass', 'HAM4', 'HAM4 - Frost Glass', 'HAM5', 'HAM5 - Frost Glass'].map((n) =>
            o(`dr-${slug(n)}`, 29, n, { tier: TIERS.UP, group: 'Hamptons range', panels: 'shaker', glass: /frost/i.test(n) })),
          ...['LIN1 - Clear Glass', 'LIN1 - Translucent Glass', 'LIN10 - Clear Glass', 'LIN10 - Translucent Glass'].map((n) =>
            o(`dr-${slug(n)}`, 30, n, { tier: TIERS.UP, group: 'Joinery range', panels: 'glazed', glass: true })),
          o('dr-fbdu4', 30, 'FBDU4', { name: 'FBDU4 barn door', tier: TIERS.UP, group: 'Barn door', panels: 'barn' }),
        ],
      },
      {
        key: 'stop', label: 'Door stops', kind: 'chips', default: 'ds-cushion',
        options: () => [
          { id: 'ds-cushion', name: 'White cushion stop', tier: TIERS.STD },
          o('ds-magnetic', 29, 'Magnetic Door Stop', { tier: TIERS.UP }),
          o('ds-tube', 29, 'Tube Wall Door Stop', { tier: TIERS.UP }),
        ],
      },
    ],
  },
  {
    key: 'handles', letter: 'F7', section: 'general', name: 'Door handles', view: 'hall',
    fields: [
      {
        key: 'lever', label: 'Handle', kind: 'swatches', primary: true, default: 'dh-amelia',
        options: () => [
          ...['Amelia', 'Bailey', 'Carla', 'Florence', 'Lianna', 'Olive'].map((n) => o(`dh-${slug(n)}`, 28, n, { tier: TIERS.STD, group: 'Standard (bright or satin chrome)' })),
          ...['Sierra', 'Rivera', 'Alba'].map((n) => o(`dh-${slug(n)}`, 28, n, { tier: TIERS.UP, group: 'Upgrade range' })),
        ],
      },
      {
        key: 'finish', label: 'Handle finish', kind: 'chips', default: 'fin-satin-chrome',
        options: ({ sel }) =>
          sel.lever && ['dh-sierra', 'dh-rivera', 'dh-alba'].includes(sel.lever)
            ? fin(['chrome', 'satin-chrome', 'matte-black', 'satin-brass', 'satin-graphite'])
            : fin(['chrome', 'satin-chrome'], () => TIERS.STD),
      },
    ],
  },
  {
    key: 'robes', letter: 'F8', section: 'general', name: 'Robe doors & fit-out', view: 'master',
    fields: [
      {
        key: 'door', label: 'Robe doors', kind: 'cards', default: 'rb-mirror', primary: true,
        options: () => [
          o('rb-mirror', 30, 'Mirror Sliding Doors', { tier: TIERS.STD, style: 'mirror' }),
          { id: 'rb-painted', name: 'Painted sliding doors', sub: 'Woodwork colour', tier: TIERS.STD, style: 'painted' },
        ],
      },
      {
        key: 'fitout', label: 'Robe fit-out', kind: 'cards', default: 'rf-standard',
        options: () => [
          { id: 'rf-standard', name: 'Standard shelf & rail', tier: TIERS.STD, fitout: 'standard' },
          o('rf-melamine', 30, 'White Melamine Towers', { tier: TIERS.UP, fitout: 'towers' }),
          o('rf-laminate', 30, 'Custom Laminate Cabinetry', { tier: TIERS.UP, fitout: 'custom' }),
        ],
      },
    ],
  },
  {
    key: 'window-furnishings', letter: 'F9', section: 'general', name: 'Window furnishings', view: 'living',
    notes: ['Window furnishings are an optional upgrade supplied by Lovelight.'],
    fields: [
      {
        key: 'type', label: 'Type', kind: 'cards', default: 'wf-none', primary: true,
        options: () => [
          { id: 'wf-none', name: 'None', sub: 'No window furnishings', tier: TIERS.STD },
          o('wf-shutters', 35, 'Cat 1 - Pure White', { name: 'Plantation shutters', sub: 'Cat 1 – Pure White', tier: TIERS.UP, kind: 'shutter' }),
          { id: 'wf-sheer', name: 'S Fold sheer curtains', sub: 'Sheer range', tier: TIERS.UP, kind: 'sheer' },
          { id: 'wf-blockout', name: 'S Fold blockout curtains', sub: 'Blockout range', tier: TIERS.UP, kind: 'blockout' },
          { id: 'wf-roller', name: 'Blockout roller blinds', sub: 'Zen range / Cat 1', tier: TIERS.UP, kind: 'roller' },
        ],
      },
      {
        key: 'fabric', label: 'Fabric', kind: 'swatches', default: 'wfb-moonlight', when: (sel) => ['wf-sheer', 'wf-blockout', 'wf-roller'].includes(sel.type),
        options: ({ sel }) =>
          sel.type === 'wf-roller'
            ? ['Bounty', 'Cluster', 'Cashmere', 'Martini', 'Greyshee', 'Illusion', 'Mario', 'Oxide', 'Stonehenge', 'Element', 'Zelda', 'Metalcon', 'Gravity', 'Yen'].map((n) => o(`wfb-${slug(n)}`, 37, n, { tier: TIERS.UP }))
            : sel.type === 'wf-blockout'
              ? ['Snow', 'Tahini', 'Frost', 'Harbour', 'Pepper', 'Slate', 'Coal'].map((n) => o(`wfb-${slug(n)}`, 36, n, { tier: TIERS.UP }))
              : ['Moonlight', 'Mist', 'Linen', 'Quartz', 'Smoke', 'Sable'].map((n) => o(`wfb-${slug(n)}`, 36, n, { tier: TIERS.UP })),
      },
      {
        key: 'track', label: 'Track', kind: 'chips', default: 'wt-white', when: (sel) => ['wf-sheer', 'wf-blockout'].includes(sel.type),
        options: () => [
          { id: 'wt-white', name: 'White', hex: '#f1f0ec' },
          { id: 'wt-black', name: 'Black', hex: '#232323' },
          { id: 'wt-satin', name: 'Matte Satin', hex: '#b9bcbd' },
        ],
      },
      {
        key: 'fitting', label: 'Blind fitting', kind: 'cards', default: 'wr-reveal', when: (sel) => sel.type === 'wf-roller',
        options: () => [
          o('wr-face', 37, 'Face Fit - Back Roll', { tier: TIERS.UP }),
          o('wr-reveal', 37, 'Reveal Fit - Front Roll', { tier: TIERS.UP }),
        ],
      },
    ],
  },

  // ============================================================== KITCHEN
  {
    key: 'k-benchtop', letter: 'K1', section: 'kitchen', name: 'Kitchen benchtop', view: 'kitchen',
    notes: ['Caesarstone® Crystalline Silica-Free benchtops.'],
    fields: [
      { key: 'colour', label: 'Caesarstone® colour', kind: 'swatches', primary: true, default: 'cs-intense-white', options: () => STONE },
      {
        key: 'style', label: 'Benchtop style', kind: 'cards', default: 'bs-20', primary: true,
        options: () => [
          { id: 'bs-20', name: '20mm benchtop', sub: 'Standard', tier: TIERS.DES, thick: 0.02, waterfall: false },
          { id: 'bs-20-wf', name: '20mm with waterfall ends', sub: 'Laminated ends / shadowline', tier: TIERS.DES, thick: 0.02, waterfall: true },
          o('bs-40', 41, '40mm benchtop', { tier: TIERS.ELE, thick: 0.04, waterfall: false }),
          o('bs-20-wfe', 41, '20mm Waterfall ends', { tier: TIERS.ELE, thick: 0.02, waterfall: true }),
          o('bs-80', 41, '80mm benchtop', { tier: TIERS.UP, thick: 0.08, waterfall: false }),
          o('bs-40-wfe', 41, '40mm Waterfall ends', { tier: TIERS.UP, thick: 0.04, waterfall: true }),
          o('bs-curved', 41, 'Curved benchtop', { tier: TIERS.UP, thick: 0.04, waterfall: true, curved: true }),
        ],
      },
    ],
  },
  {
    key: 'k-cabinets', letter: 'K2', section: 'kitchen', name: 'Kitchen cabinetry', view: 'kitchen',
    notes: ['One cabinet colour is included as standard. Woodgrain colours and vertical woodgrain to overhead cupboards are upgrades.'],
    fields: [
      { key: 'colour', label: 'Cupboard doors & drawers', kind: 'swatches', primary: true, default: 'kc-polar-white', options: () => laminexColours(42, 43, 'kc') },
      { key: 'island', label: 'Island colour', kind: 'swatches', default: 'ki-same', options: () => [{ id: 'ki-same', name: 'Same as cabinets', hex: '#e9e7e2', tier: TIERS.STD }, ...laminexColours(42, 43, 'ki').map((x) => ({ ...x, tier: TIERS.UP, group: 'Second colour (upgrade)' }))] },
      {
        key: 'finish', label: 'Finish', kind: 'cards', default: 'kf-natural',
        options: () => [
          { id: 'kf-natural', name: 'Natural', sub: 'Standard finish', tier: TIERS.STD, rough: 0.55 },
          { id: 'kf-flint', name: 'Flint', sub: 'Standard finish', tier: TIERS.STD, rough: 0.62 },
          o('kf-silk', 44, 'Silk Finish', { tier: TIERS.UP, rough: 0.25 }),
          o('kf-absolutematte', 44, 'AbsoluteMatte Finish', { tier: TIERS.UP, rough: 0.78 }),
          o('kf-chalk', 44, 'Chalk Finish', { tier: TIERS.UP, rough: 0.68 }),
          o('kf-nuance', 44, 'Nuance Finish', { tier: TIERS.UP, rough: 0.6, textured: true }),
        ],
      },
      {
        key: 'profile', label: 'Door profile', kind: 'cards', default: 'kp-flat',
        options: () => [
          { id: 'kp-flat', name: 'Flat panel', sub: 'Standard', tier: TIERS.STD, profile: 'flat' },
          o('kp-classic', 44, 'Classic Square Edge', { tier: TIERS.UP, profile: 'square' }),
          o('kp-country', 44, 'Country V', { tier: TIERS.UP, profile: 'vgroove' }),
          o('kp-settler', 44, 'Settler', { tier: TIERS.UP, profile: 'settler' }),
          o('kp-shaker', 44, 'Shaker', { tier: TIERS.UP, profile: 'shaker' }),
        ],
      },
      {
        key: 'drawers', label: 'Drawer layout', kind: 'cards', default: 'kd-set',
        options: () => [
          o('kd-set', 44, 'Drawer Set', { tier: TIERS.UP, layout: 'set' }),
          o('kd-bank', 44, 'Drawer Bank', { tier: TIERS.UP, layout: 'bank' }),
        ],
      },
      {
        key: 'overheads', label: 'Overhead cupboards', kind: 'cards', default: 'ko-full',
        options: () => [
          o('ko-full', 45, 'Full Width', { name: 'Full width overheads', tier: TIERS.DES, kind: 'full' }),
          o('ko-two', 45, 'Two Door', { name: 'Two door overheads', tier: TIERS.DES, kind: 'two' }),
          { id: 'ko-open', name: 'Open shelves', sub: 'Upgrade option', tier: TIERS.UP, kind: 'open' },
        ],
      },
    ],
  },
  { key: 'k-handles', letter: 'K3', section: 'kitchen', name: 'Kitchen handles', view: 'kitchen',
    fields: [{ key: 'handle', label: 'Handle', kind: 'swatches', primary: true, default: 'h-baldone-102', options: () => HANDLES }] },
  {
    key: 'k-sink', letter: 'K4', section: 'kitchen', name: 'Sink & mixer', view: 'kitchen',
    notes: ['The selected sink is shown in the island bench. The walk-in pantry keeps the standard 1¾ bowl inset sink drawn on the plan.'],
    fields: [
      {
        key: 'sink', label: 'Kitchen sink', kind: 'swatches', primary: true, default: 'sk-clark-punch', large: true,
        options: () => [
          o('sk-clark-punch', 47, 'Clark Punch 1.75 Inset', { tier: TIERS.DES, group: 'Standard', bowls: 1.75, mount: 'inset', mat: 'stainless', drainer: true }),
          o('sk-clark-polar-over', 47, 'Clark Polar - Overmount', { tier: TIERS.DES, group: 'Standard', bowls: 2, mount: 'over', mat: 'stainless' }),
          o('sk-clark-polar-under', 47, 'Clark Polar - Undermount', { tier: TIERS.ELE, group: 'Elegance', bowls: 2, mount: 'under', mat: 'stainless' }),
          o('sk-franke-city-black', 47, 'Franke City - Black', { tier: TIERS.UP, group: 'Granite', bowls: 2, mount: 'over', mat: 'granite-black', drainer: true }),
          { id: 'sk-franke-city-under-black', name: 'Franke City – Undermount (black)', img: page(47)[4]?.img, tier: TIERS.UP, group: 'Granite', bowls: 2, mount: 'under', mat: 'granite-black' },
          { id: 'sk-franke-city-under-white', name: 'Franke City – Undermount (white)', img: page(47)[5]?.img, tier: TIERS.UP, group: 'Granite', bowls: 2, mount: 'under', mat: 'granite-white' },
          o('sk-bow-360', 47, 'Franke Bow Single 360mm', { tier: TIERS.UP, group: 'Stainless', bowls: 1, mount: 'under', mat: 'stainless', w: 0.36 }),
          o('sk-bow-500', 47, 'Franke Bow Single 500mm', { tier: TIERS.UP, group: 'Stainless', bowls: 1, mount: 'under', mat: 'stainless', w: 0.5 }),
          o('sk-bow-680', 47, 'Franke Bow Single 680mm', { tier: TIERS.UP, group: 'Stainless', bowls: 1, mount: 'under', mat: 'stainless', w: 0.68 }),
          o('sk-zenna-ss', 47, 'Memo Zenna - Stainless Steel', { tier: TIERS.UP, group: 'Memo Zenna', bowls: 1, mount: 'under', mat: 'stainless' }),
          o('sk-zenna-gun', 47, 'Memo Zenna - Gunmetal', { tier: TIERS.UP, group: 'Memo Zenna', bowls: 1, mount: 'under', mat: 'gunmetal' }),
          o('sk-zenna-nickel', 47, 'Memo Zenna - Nickel', { tier: TIERS.UP, group: 'Memo Zenna', bowls: 1, mount: 'under', mat: 'nickel' }),
          o('sk-zenna-gold', 47, 'Memo Zenna - Gold', { tier: TIERS.UP, group: 'Memo Zenna', bowls: 1, mount: 'under', mat: 'gold' }),
          o('sk-harper-462', 47, 'Memo Harper 462mm', { tier: TIERS.UP, group: 'Ceramic / butler', bowls: 1, mount: 'butler', mat: 'ceramic', w: 0.462 }),
          o('sk-harper-598', 47, 'Memo Harper 598mm', { tier: TIERS.UP, group: 'Ceramic / butler', bowls: 1, mount: 'butler', mat: 'ceramic', w: 0.598 }),
          o('sk-harper-single', 47, 'Memo Harper Single Bowl', { tier: TIERS.UP, group: 'Farmhouse / Butler', bowls: 1, mount: 'farmhouse', mat: 'ceramic' }),
          o('sk-harper-175', 47, 'Memo Harper 1 3/4 Bowl', { tier: TIERS.UP, group: 'Farmhouse / Butler', bowls: 1.75, mount: 'farmhouse', mat: 'ceramic' }),
        ],
      },
      {
        key: 'accessory', label: 'Sink accessory', kind: 'chips', default: 'sa-none',
        options: () => [
          { id: 'sa-none', name: 'None', tier: TIERS.STD },
          o('sa-board', 47, 'Chopping Board', { tier: TIERS.OPT }),
          o('sa-basket', 47, 'Draining Basket', { tier: TIERS.OPT }),
          o('sa-tray', 47, 'Draining Tray', { tier: TIERS.OPT }),
        ],
      },
      {
        key: 'mixer', label: 'Sink mixer', kind: 'swatches', primary: true, default: 'mx-arlo-chrome', large: true,
        options: () => [
          o('mx-arlo-chrome', 48, 'Phoenix Arlo - Chrome', { tier: TIERS.DES, group: 'Standard inclusion', shape: 'gooseneck', finish: 'chrome' }),
          o('mx-cirrus', 48, 'Caroma Cirrus - Chrome', { tier: TIERS.DES, group: 'Standard inclusion', shape: 'gooseneck', finish: 'chrome' }),
          o('mx-arlo-black', 48, 'Phoenix Arlo - Matte Black', { tier: TIERS.ELE, group: 'Elegance', shape: 'gooseneck', finish: 'matte-black' }),
          o('mx-basis', 48, 'Caroma Basis - Chrome', { tier: TIERS.ELE, group: 'Elegance', shape: 'square', finish: 'chrome' }),
          o('mx-kado-era', 48, 'Kado Era', { tier: TIERS.UP, group: 'Upgrade', shape: 'gooseneck', finish: 'chrome' }),
          o('mx-nobili', 48, 'Nobili Flag - Flexible Hose', { tier: TIERS.UP, group: 'Upgrade', shape: 'spring', finish: 'chrome' }),
          o('mx-drift-goose', 48, 'Mizu Drift MKII Gooseneck', { tier: TIERS.UP, group: 'Mizu Drift MKII', shape: 'gooseneck', finish: 'brushed-brass', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-brass'] }),
          o('mx-drift-pull', 48, 'Mizu Drift MKII Pull Out', { tier: TIERS.UP, group: 'Mizu Drift MKII', shape: 'pullout', finish: 'brushed-brass', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-brass'] }),
          o('mx-urbane', 48, 'Urbane II', { tier: TIERS.UP, group: 'Caroma Liano & Urbane', shape: 'gooseneck', finish: 'chrome', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-brass', 'gunmetal'] }),
          o('mx-urbane-pull', 48, 'Urbane II Pull Out', { tier: TIERS.UP, group: 'Caroma Liano & Urbane', shape: 'pullout', finish: 'matte-black', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-brass', 'gunmetal'] }),
          o('mx-liano', 48, 'Liano II Pull Down Dual Mixer', { tier: TIERS.UP, group: 'Caroma Liano & Urbane', shape: 'spring', finish: 'matte-black', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-brass', 'gunmetal'] }),
          o('mx-vivid-220', 48, 'Vivid Slimline 220mm', { tier: TIERS.UP, group: 'Phoenix Vivid Slimline', shape: 'gooseneck', finish: 'chrome', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-gold', 'brushed-carbon'] }),
          o('mx-vivid-pull', 48, 'Vivid Slimline Pull Out', { tier: TIERS.UP, group: 'Phoenix Vivid Slimline', shape: 'pullout', finish: 'matte-black', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-gold', 'brushed-carbon'] }),
          o('mx-blix', 48, 'Blix Flexible Hose', { tier: TIERS.UP, group: 'Upgrade', shape: 'spring', finish: 'chrome' }),
          o('mx-blix-black', 48, 'Blix Flexible Hose Matte Black', { tier: TIERS.UP, group: 'Upgrade', shape: 'spring', finish: 'matte-black' }),
          o('mx-sia', 48, 'Sia Sensor', { tier: TIERS.UP, group: 'Memo Sia sensor tap', shape: 'gooseneck', finish: 'chrome', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-gold'] }),
        ],
      },
      {
        key: 'mixerFinish',
        label: 'Mixer finish',
        kind: 'chips',
        when: (sel) => !!mixerOption(sel.mixer)?.finishes?.length,
        options: ({ sel }) => {
          const m = INTERIOR_CATEGORIES.find((c) => c.key === 'k-sink').fields.find((f) => f.key === 'mixer').options({}).find((x) => x.id === sel.mixer);
          return fin(m?.finishes || []);
        },
      },
    ],
  },
  {
    key: 'k-cooking', letter: 'K5', section: 'kitchen', name: 'Cooking appliances', view: 'kitchen',
    fields: [
      {
        key: 'setup', label: 'Setup', kind: 'chips', default: 'cs-builtin',
        options: () => [
          { id: 'cs-builtin', name: 'Cooktop + built-in oven', tier: TIERS.STD },
          { id: 'cs-freestanding', name: 'Freestanding cooker', tier: TIERS.UP },
        ],
      },
      {
        key: 'cooktop', label: 'Cooktop', kind: 'swatches', primary: true, default: 'ct-600-ceramic', large: true, when: (sel) => sel.setup !== 'cs-freestanding',
        options: () => [
          o('ct-600-ceramic', 50, '600mm Ceramic Glass - CFE641-5', { tier: TIERS.DES, w: 0.6, kind: 'ceramic' }),
          o('ct-900-ceramic', 50, '900mm Ceramic Glass - 95HTSS-5', { tier: TIERS.ELE, w: 0.9, kind: 'ceramic' }),
          o('ct-600-induction', 50, '600mm Induction - TGC6IND-5', { tier: TIERS.UP, w: 0.6, kind: 'induction' }),
          o('ct-900-induction', 50, '900mm Induction - TGC9IND-5', { tier: TIERS.UP, w: 0.9, kind: 'induction' }),
          o('ct-900-gas', 50, '900mm Black Glass Gas Cooktop - TGC9GLBK', { tier: TIERS.UP, w: 0.9, kind: 'gas' }),
          o('ct-900-gas-pro', 50, '900mm Black Glass Gas Cooktop - H950STBGFPRO', { tier: TIERS.UP, w: 0.9, kind: 'gas' }),
        ],
      },
      {
        key: 'oven', label: 'Oven', kind: 'swatches', primary: true, default: 'ov-600-bellissimo', large: true, when: (sel) => sel.setup !== 'cs-freestanding',
        options: () => [
          o('ov-600-bellissimo', 50, '600mm Bellissmo Oven - TB60FDTSS-5', { tier: TIERS.DES, w: 0.6, face: 'stainless' }),
          o('ov-900-builtin', 50, '900mm Built-in Oven - T948SS-6', { tier: TIERS.ELE, w: 0.9, face: 'black' }),
          o('ov-600-10f', 50, '600mm 10 Function Built-in Oven - T0610TBX', { tier: TIERS.UP, w: 0.6, face: 'black' }),
          o('ov-600-15f', 50, '600mm 15 Function Built-in Oven with Air Fry - T0615AFBX', { tier: TIERS.UP, w: 0.6, face: 'black' }),
          o('ov-900-10f', 50, '900mm 10 Function Built-in Oven - TTDT910-6', { tier: TIERS.UP, w: 0.9, face: 'black' }),
          o('ov-belling-900', 50, 'Belling 900mm 11 Function Built-in Oven - BDO9611BK', { tier: TIERS.UP, w: 0.9, face: 'black' }),
        ],
      },
      {
        key: 'cooker', label: 'Freestanding cooker', kind: 'swatches', large: true, default: 'fc-tu950', when: (sel) => sel.setup === 'cs-freestanding',
        options: () => [
          o('fc-tu950', 51, '900mm Freestanding Dual Fuel Gas Cooker - TU950TME8', { tier: TIERS.ELE, colour: '#c9ccce' }),
          o('fc-teg95', 51, '900mm Freestanding Dual Fuel Gas Cooker Matte Black - TEG95TBK', { tier: TIERS.UP, colour: '#1e1e1e' }),
          o('fc-belling-black', 51, 'Belling Richmond Deluxe 900mm Freestanding Dual Fuel Gas Cooker Black', { name: 'Belling Richmond Deluxe – Black', tier: TIERS.UP, colour: '#1b1b1b' }),
          o('fc-belling-white', 51, 'Belling Richmond Deluxe 900mm Freestanding Dual Fuel Gas Cooker White', { name: 'Belling Richmond Deluxe – White', tier: TIERS.UP, colour: '#f0efe9' }),
          o('fc-belling-red', 51, 'Belling Richmond Deluxe 900mm Freestanding Dual Fuel Gas Cooker Red', { name: 'Belling Richmond Deluxe – Red', tier: TIERS.UP, colour: '#a3231f' }),
          o('fc-belling-cream', 51, 'Belling Richmond Deluxe 900mm Freestanding Dual Fuel Gas Cooker Cream', { name: 'Belling Richmond Deluxe – Cream', tier: TIERS.UP, colour: '#e8dfc6' }),
        ],
      },
      {
        key: 'rangehood', label: 'Rangehood', kind: 'swatches', primary: true, default: 'rh-600-ss', large: true,
        options: () => [
          o('rh-600-ss', 49, '600mm Stainless Steel', { tier: TIERS.DES, w: 0.6, kind: 'canopy' }),
          o('rh-600-slide', 49, '600mm Slideout', { tier: TIERS.DES, w: 0.6, kind: 'slideout' }),
          o('rh-900-slide', 49, '900mm Slideout', { tier: TIERS.UP, w: 0.9, kind: 'slideout' }),
          o('rh-900-sensor', 49, '900mm Deluxe Sensor Touch Canopy', { tier: TIERS.UP, w: 0.9, kind: 'canopy', dark: true }),
          o('rh-900-push', 49, '900mm Push Button Canopy', { tier: TIERS.UP, w: 0.9, kind: 'canopy' }),
          o('rh-700-concealed', 49, '700mm Concealed Undermount', { tier: TIERS.ELE, w: 0.7, kind: 'concealed' }),
          o('rh-900-concealed', 49, '900mm Concealed Undermount', { tier: TIERS.UP, w: 0.9, kind: 'concealed' }),
          o('rh-520-concealed', 49, '520mm Concealed Undermount', { tier: TIERS.UP, w: 0.52, kind: 'concealed' }),
        ],
      },
    ],
  },
  {
    key: 'k-appliances', letter: 'K6', section: 'kitchen', name: 'Dishwasher, microwave & fridge', view: 'kitchen',
    fields: [
      {
        key: 'dishwasher', label: 'Dishwasher', kind: 'cards', default: 'dw-space', primary: true,
        options: () => [
          { id: 'dw-space', name: 'Dishwasher space only', sub: 'Standard', tier: TIERS.STD, kind: 'none' },
          o('dw-free', 51, '600mm Freestanding Diswasher', { name: '600mm freestanding dishwasher', tier: TIERS.ELE, kind: 'stainless' }),
          o('dw-integrated', 51, '600mm Fully Intergrated - TDX8SS-6', { name: '600mm fully integrated', tier: TIERS.UP, kind: 'integrated' }),
          o('dw-black', 51, '600mm Freestanding Matte Black', { tier: TIERS.UP, kind: 'black' }),
        ],
      },
      {
        key: 'microwave', label: 'Microwave', kind: 'cards', default: 'mw-none',
        options: () => [
          { id: 'mw-none', name: 'No built-in microwave', tier: TIERS.STD, kind: 'none' },
          o('mw-28l', 51, '28L Built-in Microwave Oven with Trim Kit', { tier: TIERS.UP, kind: 'builtin' }),
        ],
      },
      {
        key: 'fridge', label: 'Fridge', kind: 'cards', default: 'fr-space',
        options: () => [
          { id: 'fr-space', name: 'Fridge space (freestanding)', sub: 'Standard', tier: TIERS.STD, kind: 'freestanding' },
          o('fr-smeg', 51, 'Smeg Integrated Fridge', { tier: TIERS.UP, kind: 'integrated' }),
        ],
      },
    ],
  },

  // ============================================================== BATHROOM
  {
    key: 'b-benchtop', letter: 'B1', section: 'bathroom', name: 'Bathroom benchtop', view: 'vanity',
    notes: ['Applies to the main bathroom and ensuite vanities. The Caesarstone® colour selected here is also used in the laundry if the benchtop upgrade is chosen.'],
    fields: [
      { key: 'colour', label: 'Caesarstone® colour', kind: 'swatches', primary: true, default: 'cs-snow', options: () => STONE },
      {
        key: 'edge', label: 'Edge thickness', kind: 'chips', default: 'be-20',
        options: () => [
          { id: 'be-20', name: '20mm', tier: TIERS.STD, thick: 0.02 },
          { id: 'be-40', name: '40mm', tier: TIERS.UP, thick: 0.04 },
        ],
      },
    ],
  },
  {
    key: 'b-vanity', letter: 'B2', section: 'bathroom', name: 'Vanity units', view: 'vanity',
    fields: [
      {
        key: 'style', label: 'Vanity style', kind: 'cards', default: 'vs-wall-hung', primary: true, large: true,
        options: () => [
          o('vs-wall-hung', 58, 'Wall Hung Vanity', { tier: TIERS.DES, style: 'wall' }),
          o('vs-full-height', 58, 'Full Height Vanity with Recessed Kick', { tier: TIERS.DES, style: 'kick' }),
          { id: 'vs-floating-drawers', name: 'Floating drawer vanity', sub: 'Upgrade option', img: page(58)[0]?.img, tier: TIERS.UP, style: 'drawers' },
          { id: 'vs-open-shelf', name: 'Vanity with open shelving', sub: 'Upgrade option', img: page(58)[1]?.img, tier: TIERS.UP, style: 'shelf' },
        ],
      },
      { key: 'colour', label: 'Vanity colour', kind: 'swatches', primary: true, default: 'vc-classic-oak', options: () => laminexColours(55, 56, 'vc') },
      {
        key: 'finish', label: 'Finish', kind: 'cards', default: 'vf-natural',
        options: () => [
          { id: 'vf-natural', name: 'Natural', sub: 'Standard finish', tier: TIERS.STD, rough: 0.55 },
          { id: 'vf-flint', name: 'Flint', sub: 'Standard finish', tier: TIERS.STD, rough: 0.62 },
          o('vf-silk', 57, 'Silk Finish', { tier: TIERS.UP, rough: 0.25 }),
          o('vf-absolutematte', 57, 'AbsoluteMatte Finish', { tier: TIERS.UP, rough: 0.78 }),
          o('vf-chalk', 57, 'Chalk Finish', { tier: TIERS.UP, rough: 0.68 }),
          o('vf-nuance', 57, 'Nuance Finish', { tier: TIERS.UP, rough: 0.6, textured: true }),
        ],
      },
      {
        key: 'profile', label: 'Door profile', kind: 'cards', default: 'vp-flat',
        options: () => [
          { id: 'vp-flat', name: 'Flat panel', sub: 'Standard', tier: TIERS.STD, profile: 'flat' },
          o('vp-classic', 57, 'Classic Square Edge', { tier: TIERS.UP, profile: 'square' }),
          o('vp-country', 57, 'Country V', { tier: TIERS.UP, profile: 'vgroove' }),
          o('vp-settler', 57, 'Settler', { tier: TIERS.UP, profile: 'settler' }),
          o('vp-shaker', 57, 'Shaker', { tier: TIERS.UP, profile: 'shaker' }),
        ],
      },
      { key: 'handle', label: 'Vanity handles', kind: 'swatches', primary: true, default: 'h-baldone-102', options: () => HANDLES },
    ],
  },
  {
    key: 'b-basin', letter: 'B3', section: 'bathroom', name: 'Basins & tapware', view: 'vanity',
    fields: [
      {
        key: 'basin', label: 'Basin', kind: 'swatches', primary: true, default: 'bn-clark-round', large: true,
        options: () => [
          o('bn-clark-round', 60, 'Clark Inset Basin – Round', { tier: TIERS.DES, group: 'Standard', shape: 'round', mount: 'inset', colour: '#ffffff' }),
          o('bn-clark-square', 60, 'Clark Inset Basin – Square', { tier: TIERS.DES, group: 'Standard', shape: 'square', mount: 'inset', colour: '#ffffff' }),
          o('bn-caroma-luna', 60, 'Caroma Luna Inset', { tier: TIERS.DES, group: 'Standard', shape: 'oval', mount: 'inset', colour: '#ffffff' }),
          o('bn-caroma-tribute', 60, 'Caroma Tribute Inset Basin– Square', { tier: TIERS.DES, group: 'Standard', shape: 'square', mount: 'inset', colour: '#ffffff' }),
          o('bn-seima-arko', 60, 'Semia Arko basin – Matte black', { name: 'Seima Arko basin – Matte black', tier: TIERS.ELE, group: 'Elegance', shape: 'round', mount: 'above', colour: '#1c1c1c' }),
          o('bn-kado-lussi', 60, 'Kado Lussi Thin Edge Solid Surface Above Counter', { tier: TIERS.UP, group: 'Solid surface', shape: 'oval', mount: 'above', colour: '#f4f4f1' }),
          o('bn-kado-venice', 60, 'Kado Venice Solid Surface Inset', { tier: TIERS.UP, group: 'Solid surface', shape: 'oval', mount: 'inset', colour: '#fbfbf9' }),
          o('bn-roca', 60, 'Roca Diverta Undermount', { tier: TIERS.UP, group: 'Solid surface', shape: 'square', mount: 'under', colour: '#ffffff' }),
          o('bn-liano-400', 60, '400mm Round Inset Matte Black', { name: 'Caroma Liano II 400 Round – Matte Black', tier: TIERS.UP, group: 'Caroma Liano II', shape: 'round', mount: 'above', colour: '#1b1b1b' }),
          o('bn-liano-530', 60, '530mm Pill Inset Matte Black', { name: 'Caroma Liano II 530 Pill – Matte Black', tier: TIERS.UP, group: 'Caroma Liano II', shape: 'pill', mount: 'above', colour: '#1b1b1b' }),
          ...['Black', 'Smokey Taupe', 'Forest', 'Rose Quartz', 'Winter Sea', 'White Silk'].map((c) =>
            o(`bn-aurora385-${slug(c)}`, 60, `Aurora 385 - ${c}`, { tier: TIERS.UP, group: 'Seima Aurora 385 above counter', shape: 'round', mount: 'above' })),
          ...['Black', 'Smokey Taupe', 'Forest', 'Rose Quartz', 'Winter Sea', 'White Silk'].map((c) =>
            o(`bn-aurora530-${slug(c)}`, 60, `Aurora 530 - ${c}`, { tier: TIERS.UP, group: 'Seima Aurora 530 above counter', shape: 'oval', mount: 'above' })),
        ],
      },
      {
        key: 'waste', label: 'Pop-up waste', kind: 'chips', default: 'pu-chrome',
        options: () => [
          o('pu-chrome', 60, 'Pop-Up Chrome', { tier: TIERS.STD, finish: 'chrome' }),
          o('pu-gold', 60, 'Pop-Up Brushed Brass/Gold', { tier: TIERS.UP, finish: 'brushed-gold' }),
          o('pu-black', 60, 'Pop-Up Black', { tier: TIERS.UP, finish: 'matte-black' }),
          o('pu-nickel', 60, 'Pop-Up Brushed Nickel', { tier: TIERS.UP, finish: 'brushed-nickel' }),
        ],
      },
      {
        key: 'range', label: 'Tapware range', kind: 'swatches', primary: true, default: 'tp-arlo', large: true,
        options: () => [
          o('tp-arlo', 61, 'Phoenix Arlo', { name: 'Phoenix Arlo', tier: TIERS.DES, style: 'round', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-gold'] }),
          o('tp-basis', 61, 'Caroma Basis', { name: 'Caroma Basis', tier: TIERS.ELE, style: 'square', finishes: ['chrome'] }),
          o('tp-vivid', 61, 'Vivid Slimline - Basin Mixer', { name: 'Phoenix Vivid Slimline', tier: TIERS.UP, style: 'slim', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-gold', 'gunmetal'] }),
          o('tp-drift', 61, 'Drift MKII - Basin Mixer', { name: 'Mizu Drift MKII', tier: TIERS.UP, style: 'slim', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-brass'] }),
          o('tp-luna', 61, 'Luna - Basin Mixer', { name: 'Caroma Luna', tier: TIERS.UP, style: 'round', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-brass'] }),
        ],
      },
      {
        key: 'tapType', label: 'Basin tap', kind: 'cards', default: 'tt-hob',
        options: ({ sel }) => [
          { id: 'tt-hob', name: 'Basin mixer (on bench)', tier: TIERS.STD, mount: 'hob', img: hit(61, sel.range === 'tp-vivid' ? 'Vivid Slimline - Basin Mixer' : sel.range === 'tp-drift' ? 'Drift MKII - Basin Mixer' : sel.range === 'tp-luna' ? 'Luna - Basin Mixer' : 'Arlo - Basin Mixer').img },
          { id: 'tt-wall', name: 'Wall basin set', tier: TIERS.ELE, mount: 'wall', img: hit(61, sel.range === 'tp-vivid' ? 'Vivid Slimline - Wall Basin Set' : sel.range === 'tp-drift' ? 'Drift MKII - Wall Basin Set' : sel.range === 'tp-luna' ? 'Luna - Wall Basin Set' : 'Arlo - Wall Basin Set').img },
        ],
      },
      {
        key: 'finish', label: 'Tapware finish', kind: 'chips', default: 'fin-chrome',
        options: ({ sel }) => {
          const r = INTERIOR_CATEGORIES.find((c) => c.key === 'b-basin').fields.find((f) => f.key === 'range').options({}).find((x) => x.id === sel.range);
          return fin(r?.finishes || ['chrome'], (k) => (k === 'chrome' ? TIERS.STD : TIERS.UP));
        },
      },
    ],
  },
  {
    key: 'b-shower', letter: 'B4', section: 'bathroom', name: 'Showers & screens', view: 'bathroom',
    fields: [
      {
        key: 'main', label: 'Main bathroom shower', kind: 'swatches', primary: true, default: 'sh-vivid-single', large: true,
        options: () => [
          o('sh-vivid-single', 62, 'Phoenix Vivid 5 Function Single Rail', { name: 'Phoenix Vivid 5 Function Single Rail', tier: TIERS.DES, kind: 'single', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-gold', 'gunmetal'] }),
          o('sh-vivid-twin', 62, 'Phoenix Vivid Twin Rail', { name: 'Phoenix Vivid Twin Rail', tier: TIERS.ELE, kind: 'twin', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-gold', 'gunmetal'] }),
          o('sh-lexi-twin', 62, 'Lexi Twin Rail', { name: 'Phoenix Lexi Twin Rail', tier: TIERS.UP, kind: 'twin', finishes: ['chrome', 'matte-black', 'brushed-nickel'] }),
          o('sh-drift-single', 62, 'Mizu Drift Single Rail', { tier: TIERS.UP, kind: 'single', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-brass'] }),
          o('sh-drift-twin', 62, 'Mizu Drift Twin Rail', { tier: TIERS.UP, kind: 'twin', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-brass'] }),
          o('sh-ceiling', 62, '300mm Ceiling Arm', { name: 'Ceiling arm + 230mm rose', tier: TIERS.UP, kind: 'ceiling', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-gold', 'gunmetal'] }),
        ],
      },
      {
        key: 'ensuite', label: 'Ensuite shower', kind: 'swatches', default: 'she-vivid-twin', large: true,
        options: () =>
          INTERIOR_CATEGORIES.find((c) => c.key === 'b-shower').fields[0].options({}).map((x) => ({ ...x, id: `she-${x.id.slice(3)}` })),
      },
      {
        key: 'finish', label: 'Shower finish', kind: 'chips', default: 'fin-chrome',
        options: ({ sel }) => {
          const m = INTERIOR_CATEGORIES.find((c) => c.key === 'b-shower').fields[0].options({}).find((x) => x.id === sel.main);
          return fin(m?.finishes || ['chrome'], (k) => (k === 'chrome' ? TIERS.STD : TIERS.UP));
        },
      },
      {
        key: 'screen', label: 'Shower screen', kind: 'cards', default: 'sc-chrome', primary: true,
        options: () => [
          o('sc-chrome', 65, 'Semi-frameless polished chrome', { tier: TIERS.DES, frame: 'chrome' }),
          o('sc-black', 65, 'Matte Black Frames (Optional Upgrade)', { name: 'Matte black frames', tier: TIERS.UP, frame: 'matte-black' }),
        ],
      },
      {
        key: 'waste', label: 'Floor waste', kind: 'cards', default: 'fwz-square',
        options: () => [
          o('fwz-square', 65, 'Standard Inclusion Square Chrome', { name: 'Square chrome', tier: TIERS.DES }),
          o('fwz-tile', 65, 'Upgrade Option Bermuda Tile Insert', { name: 'Bermuda tile insert', tier: TIERS.ELE }),
        ],
      },
    ],
  },
  {
    key: 'b-bath', letter: 'B5', section: 'bathroom', name: 'Bath tub', view: 'bathroom',
    notes: ['Bath sizes are shown to suit the main bathroom drawn on your plan.'],
    fields: [
      {
        key: 'bath', label: 'Bath', kind: 'swatches', primary: true, default: 'bt-clark-free-1600', large: true,
        options: () => [
          o('bt-clark-free-1600', 63, 'Clark Round Freestanding 1600mm', { tier: TIERS.DES, kind: 'free', len: 1.6, colour: '#ffffff' }),
          o('bt-clark-1400', 63, 'Clark Round 1400mm', { tier: TIERS.UP, kind: 'free', len: 1.4, colour: '#ffffff' }),
          o('bt-clark-btw-1400', 63, 'Clark Back to Wall - 1400mm', { tier: TIERS.UP, kind: 'btw', len: 1.4, colour: '#ffffff' }),
          o('bt-clark-btw-1600', 63, 'Clark Back to Wall - 1600mm', { tier: TIERS.UP, kind: 'btw', len: 1.6, colour: '#ffffff' }),
          o('bt-kado-lussi-1500', 63, '1500mm', { name: 'Kado Lussi Solid Surface Thin Edge 1500mm', tier: TIERS.UP, kind: 'free', len: 1.5, colour: '#f6f6f3' }),
          o('bt-kado-lussi-1700', 63, '1700mm', { name: 'Kado Lussi Solid Surface Thin Edge 1700mm', tier: TIERS.UP, kind: 'free', len: 1.7, colour: '#f6f6f3' }),
          o('bt-neue-white', 63, 'Kado Neue White 1730mm', { tier: TIERS.UP, kind: 'free', len: 1.73, colour: '#fbfbfa' }),
          o('bt-neue-black', 63, 'Kado Neue Black 1730mm', { tier: TIERS.UP, kind: 'free', len: 1.73, colour: '#232323' }),
          { id: 'bt-posh-1500', name: 'Posh Solus 1500mm', tier: TIERS.UP, kind: 'free', len: 1.5, colour: '#ffffff', img: hit(63, '1500mm').img },
        ],
      },
      {
        key: 'tap', label: 'Bath tap', kind: 'cards', default: 'bp-wall',
        options: () => [
          { id: 'bp-wall', name: 'Wall bath set', tier: TIERS.STD, mount: 'wall', img: hit(61, 'Arlo - Wall Bath Set').img },
          o('bp-floor', 61, 'Vivid Slimlime - Floor Mount Bath Set', { name: 'Floor mount bath set', tier: TIERS.UP, mount: 'floor' }),
        ],
      },
    ],
  },
  {
    key: 'b-toilet', letter: 'B6', section: 'bathroom', name: 'Toilet suites', view: 'wc',
    fields: [
      {
        key: 'suite', label: 'Toilet suite', kind: 'swatches', primary: true, default: 'tl-posh-solus', large: true,
        options: () => [
          o('tl-posh-solus', 66, 'Posh Solus Round Close Coupled Toilet Suite', { tier: TIERS.DES, kind: 'coupled' }),
          o('tl-luna', 66, 'Caroma Luna', { tier: TIERS.UP, kind: 'btw' }),
          o('tl-luna-clean', 66, "Caroma Luna 'Cleanflush'", { tier: TIERS.UP, kind: 'btw' }),
          o('tl-urbane', 66, "Caroma 'Urbane' Cleanflush Invisi II In-Wall Cistern", { tier: TIERS.UP, kind: 'inwall' }),
          o('tl-profile', 66, 'Caroma Profile II Close Coupled', { tier: TIERS.UP, kind: 'coupled' }),
          o('tl-roca', 66, 'Roca In-Wash Inspira Rimless', { name: 'Roca In-Wash Inspira Rimless (smart)', tier: TIERS.UP, kind: 'btw' }),
        ],
      },
      {
        key: 'button', label: 'Flush button / plate', kind: 'chips', default: 'tb-chrome',
        options: ({ sel }) =>
          sel.suite === 'tl-urbane'
            ? ['Chrome', 'Gunmetal', 'Gold', 'Matte Black', 'Brushed Nickel'].map((c) => o(`tb-plate-${slug(c)}`, 66, `Flush Plate - ${c}`, { tier: c === 'Chrome' ? TIERS.STD : TIERS.UP, finish: slug(c) === 'gold' ? 'brushed-gold' : slug(c) === 'matte-black' ? 'matte-black' : slug(c) }))
            : [
                o('tb-chrome', 66, 'Chrome (Standard Inclusion)', { name: 'Chrome', tier: TIERS.STD, finish: 'chrome' }),
                o('tb-nickel', 66, 'Brushed Nickel', { tier: TIERS.UP, finish: 'brushed-nickel' }),
                o('tb-brass', 66, 'Brushed Brass', { tier: TIERS.UP, finish: 'brushed-brass' }),
                o('tb-black', 66, 'Black', { tier: TIERS.UP, finish: 'matte-black' }),
              ],
      },
    ],
  },
  {
    key: 'b-accessories', letter: 'B7', section: 'bathroom', name: 'Accessories & mirrors', view: 'bathroom',
    fields: [
      {
        key: 'range', label: 'Accessories', kind: 'swatches', primary: true, default: 'ac-radii-round', large: true,
        options: () => [
          o('ac-radii-round', 63, 'Phoenix Radii Round toilet roll holder, robe hook and double towel rail - Chrome or Matte Black', { name: 'Phoenix Radii Round set', tier: TIERS.DES, style: 'round', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-gold', 'gunmetal'] }),
          o('ac-radii-square', 63, 'Phoenix Radii Square toilet roll holder, robe hook and double towel rail - Chrome or Matte Black', { name: 'Phoenix Radii Square set', tier: TIERS.ELE, style: 'square', finishes: ['chrome', 'matte-black'] }),
          o('ac-basis', 63, 'Caroma Basis Round toilet roll holder, robe hooks or double towel rail – Chrome', { name: 'Caroma Basis Round set', tier: TIERS.ELE, style: 'round', finishes: ['chrome'] }),
          o('ac-drift', 64, '700mm Double Towel Rail', { name: 'Mizu Drift set', tier: TIERS.UP, style: 'round', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-brass'] }),
          o('ac-luna', 64, 'Double Towel Rail', { name: 'Caroma Luna set', tier: TIERS.UP, style: 'square', finishes: ['chrome', 'matte-black', 'brushed-nickel', 'brushed-brass'] }),
          o('ac-ladder', 64, 'Matte Black', { name: 'Phoenix Radii Towel Ladder 550/740', tier: TIERS.UP, style: 'ladder', finishes: ['chrome', 'matte-black', 'brushed-nickel'] }),
        ],
      },
      {
        key: 'finish', label: 'Accessory finish', kind: 'chips', default: 'fin-chrome',
        options: ({ sel }) => {
          const r = INTERIOR_CATEGORIES.find((c) => c.key === 'b-accessories').fields[0].options({}).find((x) => x.id === sel.range);
          return fin(r?.finishes || ['chrome'], (k) => (k === 'chrome' ? TIERS.STD : TIERS.UP));
        },
      },
      {
        key: 'mirror', label: 'Mirror style', kind: 'cards', default: 'mr-900', primary: true,
        options: () => [
          o('mr-900', 65, '900mm High to full width of vanity - Polished edge', { name: '900mm polished edge mirror', tier: TIERS.DES, shape: 'rect' }),
          o('mr-curved', 65, 'Curved Edge', { name: 'Curved edge mirror', tier: TIERS.UP, shape: 'curved' }),
          o('mr-round', 65, 'Round', { name: 'Round mirror', tier: TIERS.UP, shape: 'round' }),
          o('mr-arch', 65, 'Arch', { name: 'Arch mirror', tier: TIERS.UP, shape: 'arch' }),
        ],
      },
    ],
  },
  {
    key: 'laundry', letter: 'L1', section: 'bathroom', name: 'Laundry', view: 'laundry',
    notes: ['Laminate colours and handles follow the bathroom vanity selections. The Caesarstone® benchtop colour is taken from the bathroom selection.'],
    fields: [
      {
        key: 'bench', label: 'Laundry bench', kind: 'cards', default: 'ld-laminate', primary: true, large: true,
        options: () => [
          o('ld-laminate', 69, 'Stainless Steel Drop-in Tub with 760mm wide Laminate cabinet', { name: 'Drop-in tub + 760mm laminate cabinet', tier: TIERS.DES, top: 'laminate' }),
          o('ld-stone', 69, 'Stainless Steel Drop-in Tub with 20mm Caesarstone® benchtop', { name: 'Drop-in tub + 20mm Caesarstone® benchtop', tier: TIERS.ELE, top: 'stone' }),
        ],
      },
      {
        key: 'extras', label: 'Overheads & shelves', kind: 'chips', default: 'lx-none',
        options: () => [
          { id: 'lx-none', name: 'None', tier: TIERS.STD, extras: 'none' },
          { id: 'lx-overhead', name: 'Overhead cupboards', tier: TIERS.UP, extras: 'overhead' },
          { id: 'lx-shelves', name: 'Open shelves', tier: TIERS.UP, extras: 'shelves' },
        ],
      },
      { key: 'mixer', label: 'Laundry mixer', kind: 'cards', default: 'lm-base', options: () => [o('lm-base', 69, 'Base MK2 Mixer', { tier: TIERS.DES, finish: 'chrome' })] },
    ],
  },
];

export const INTERIOR_NOTES = { SCREEN };

// lookup of every interior option by id
const ALL = new Map();
for (const cat of INTERIOR_CATEGORIES) {
  for (const f of cat.fields) {
    try {
      for (const opt of f.options({ region: 'qld', sel: {} }) || []) ALL.set(opt.id, opt);
    } catch {
      /* option lists that depend on another field are registered lazily below */
    }
  }
}
export function registerOptions(list) {
  for (const opt of list) if (opt?.id) ALL.set(opt.id, opt);
}
export const findInterior = (id) => ALL.get(id);

export function interiorDefaults(cat) {
  const sel = {};
  for (const f of cat.fields) if (f.default) sel[f.key] = f.default;
  return sel;
}

export function interiorComplete(cat, sel) {
  return cat.fields.every((f) => !f.primary || (f.when && !f.when(sel || {})) || (sel && sel[f.key]));
}

// Resolve the option object a selection points at (handles fields whose option
// list depends on other fields in the same category).
export function resolveInterior(catKey, fieldKey, sel = {}, region = null) {
  const cat = INTERIOR_CATEGORIES.find((c) => c.key === catKey);
  const f = cat?.fields.find((x) => x.key === fieldKey);
  if (!f) return null;
  const list = f.options({ region, sel }) || [];
  registerOptions(list);
  return list.find((x) => x.id === sel[fieldKey]) || null;
}

// All resolved options of a category, keyed by field.
export function resolveAll(catKey, sel = {}, region = null) {
  const cat = INTERIOR_CATEGORIES.find((c) => c.key === catKey);
  const out = {};
  for (const f of cat.fields) out[f.key] = resolveInterior(catKey, f.key, sel, region);
  return out;
}
