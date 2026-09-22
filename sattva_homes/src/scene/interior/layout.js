// Room and joinery coordinates for the fit-out, all in metres and all taken from
// the Ground Floor Plan. Everything else in this folder builds against these.
import { Color3 } from '../babylon.js';

export const lin = (hex) => Color3.FromHexString(hex || '#ffffff').toLinearSpace();

export const CEIL = 2.70;
export const BENCH_H = 0.9;
export const BENCH_D = 0.6;
export const KICK_H = 0.12;
export const KICK_IN = 0.055;
export const OVER_Y0 = 1.75;
export const OVER_Y1 = 2.45;
export const OVER_D = 0.35;

// Kitchen 2810 x 4850, island 3237 x 1000, 1010 & 1300 aisles (Ground Floor Plan)
export const K = {
  wall: -5.54, // kitchen side wall, inner face
  benchFront: -4.94, // 600 deep bench
  benchZ0: -1.865, // between the two nib walls
  benchZ1: 0.945,
  pantryZ0: -3.455, // walk-in pantry, 1500 deep
  pantryZ1: -1.955,
  islandX0: -3.925,
  islandX1: -0.692,
  islandZ0: 0.035,
  islandZ1: 1.035,
  colX1: -0.045, // tall run: fridge -> oven tower -> tall cupboards
  colZ0: -1.865,
  colZ1: -1.265,
  ovenX: [-2.801, -2.202],
  fridgeX: [-3.817, -2.818],
  cooktopZ: -0.563,
  winKitchen: [-1.51, 0.59], // Afw 2100 x 600 splashback window
  sink: { x: -3.508, z: 0.366 },
  pantrySink: { x: -5.24, z: -2.70 },
  pantryDiv: -2.18, // storage / pantry divider, pantry face
  storageX: [-2.09, -0.045],
  storageZ: [-3.455, -1.955],
};

// Rooms (inner wall faces)
export const ENS = { x0: 1.785, x1: 5.23, z0: -6.01, z1: -4.10 };
export const BATH = { x0: 2.390, x1: 5.23, z0: 5.305, z1: 6.805 };
export const WC = { x0: 4.279, x1: 5.23, z0: 6.895, z1: 8.295 };
// Vanity bench in the passage between the bathroom and Bed 3 (plan: 1296 x 500)
export const VANITY = { x0: 2.892, x1: 4.188, zWall: 8.295 };
export const LDRY = { x0: 1.785, x1: 5.23, z0: -4.01, z1: -2.30 };
export const MEDIA = { x0: 1.785, x1: 5.23, z0: -2.21, z1: 2.10 };

// Wall faces that receive skirting + cornice: [axis, position, from, to, side].
// axis 'z' -> the wall runs along Z at x = pos; axis 'x' -> runs along X at z = pos.
// side +1 -> the room is on the positive side of that face.
export const WALL_LINES = [
  ['z', -5.54, -3.50, 8.245, +1, 'ext'], // kitchen / family side wall
  ['x', 8.245, -5.50, -2.70, -1, 'ext'], // family rear wall beside the alfresco
  ['z', -1.64, 8.29, 8.54, +1, 'ext'], // alfresco return
  ['x', 8.54, -1.60, 1.695, -1], // family / Bed 4 front wall
  ['z', 1.695, -9.305, 8.045, -1], // hall wall, entry & family side
  ['z', 1.785, -9.305, 11.585, +1], // hall wall, bedroom side
  ['z', 5.23, -9.305, 11.585, -1, 'ext'], // bedroom wing outer wall
  ['x', -9.305, 0.045, 5.23, +1, 'ext'], // front wall
  ['x', 11.585, -1.60, 5.23, -1, 'ext'], // rear wall
  ['z', 0.045, -9.305, -1.216, +1], // entry passage / garage wall
  ['x', -1.865, -3.838, -0.045, +1], // kitchen side of the pantry wall
  ...[-6.055, -4.055, -2.255, 2.145, 5.26, 6.85, 8.34].flatMap((z) => [
    ['x', z - 0.045, 1.785, 5.23, -1],
    ['x', z + 0.045, 1.785, 5.23, +1],
  ]),
];
// Floor-level openings that are not in the window list (the entry door).
export const EXTRA_GAPS = [['x', -9.305, 0.15, 1.35]];

// Which Internal category a hovered mesh belongs to, by group and material.
// A '#category' suffix on a material key overrides this per item.
export const PICK = {
  kitchen: {
    kStone: 'k-benchtop', splash: 'k-benchtop',
    kCab: 'k-cabinets', kIsland: 'k-cabinets', kOver: 'k-cabinets', kick: 'k-cabinets', mel: 'k-cabinets', oak: 'k-cabinets',
    handle: 'k-handles',
    sink: 'k-sink', mixer: 'k-sink',
    appSS: 'k-cooking', appBlack: 'k-cooking', appGlass: 'k-cooking', cooker: 'k-cooking',
  },
  bath: {
    vStone: 'b-benchtop',
    vCab: 'b-vanity', mel: 'b-vanity', handle: 'b-vanity',
    basin: 'b-basin', tap: 'b-basin', mixer: 'b-basin',
    shower: 'b-shower', screenFrame: 'b-shower', screenGlass: 'b-shower', wetTile: 'b-shower',
    bath: 'b-bath',
    porcelain: 'b-toilet',
    acc: 'b-accessories', towel: 'b-accessories', mirror: 'b-accessories',
  },
  laundry: { '*': 'laundry' },
  doors: { handle: 'handles', '*': 'doors' },
  robes: { '*': 'robes' },
  trims: { feature: 'feature', '*': 'trims' },
  winfurn: { '*': 'window-furnishings' },
  lining: { wall: 'paint' },
};
export const pickCat = (group, mat) => PICK[group]?.[mat] ?? PICK[group]?.['*'] ?? null;
