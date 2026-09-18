// Procedural single-storey residence engineered directly from the
// 'actual layouts' blueprints (Lot 1422 Whitewood Avenue).
// Dimensions: 23.65m length × 11.25m width, 2.70m wall plate height,
// 25° pitch multi-hip Colorbond roof with 450mm eaves overhang.
// Units: metres. Coordinate system: Street is towards -Z, Back is +Z,
// Left is Garage (-X), Right is Bedroom wing (+X).

import {
  MeshBuilder,
  Mesh,
  Vector3,
  Quaternion,
  Color3,
  PointLight,
  StandardMaterial,
  DynamicTexture,
  Constants,
} from './babylon.js';
import { Geo, Wall } from './geometry.js';
import { makeCanvas } from './textures.js';

// --- Architectural Dimensions (metres) ---
const T = 0.24; // Wall thickness (brick veneer cavity wall)
const WALL_H = 2.70; // Finished floor to top plate / eave soffit
const SLAB_H = 0.10; // Concrete foundation slab reveal
const OVER = 0.45; // Blueprint specified 450mm eaves overhang
const ROOF_PITCH_DEG = 25.0; // Blueprint: 25° pitch
const SLOPE = Math.tan((ROOF_PITCH_DEG * Math.PI) / 180); // ~0.4663
const EAVE_Y = WALL_H; // Soffit level
const ROOF_EDGE_Y = WALL_H + 0.18; // Fascia / gutter line

// House Footprint Coordinates:
// Total Width = 11.25m: X from -5.78m (garage outer wall) to +5.47m (bed wing outer wall)
// Total Length = 23.65m: Z from -11.825m (porch front) to +11.825m (rear wall)
const X_GARAGE_OUTER = -5.78;
const X_GARAGE_INNER = 0.00;
const X_HALL = 1.74; // Bedroom wing hallway wall (leaving 3490mm room width to outer wall)
const X_ENTRY_DOOR_R = 1.35;
const X_PORTAL_R = 2.45;
const X_PORCH_R = 2.985;
const X_BED_OUTER = 5.47;

const Z_PORCH_FRONT = -11.825; // Frontmost projection (Porch & Portal)
const Z_GARAGE_FRONT = -9.735; // Garage setback 5.35m from front boundary (2.09m behind porch)
const Z_BED1_FRONT = -9.545; // Bed 1 front wall (2.28m behind porch)
const Z_GARAGE_REAR = -3.50; // Garage is 6000 deep per plan (walls 15180–15370)
const X_KITCHEN_WALL = -5.54; // inner face of the kitchen/living side wall
const Z_PANTRY_FRONT = -1.91; // kitchen / walk-in pantry wall (plan px 13690–13780)
const Z_PANTRY_BACK = -3.455; // pantry / garage wall face
const Z_STORAGE_END = -1.216; // end of the entry-passage wall (plan px 13041)
const X_PANTRY_DIV = -2.135; // storage room / walk-in pantry divider
const X_PANTRY_OPENING = -3.838; // walk-in pantry entry (from the kitchen)
const X_BENCH_PIER = -4.841; // nib wall between kitchen bench and pantry bench
const Z_ALFRESCO_START = 8.485; // Alfresco recess starts 3.34m from rear wall
const Z_REAR_WALL = 11.825; // Rear wall line (5.09m setback to rear boundary)
const X_ALFRESCO_INNER = -2.44; // Alfresco width = 3.34m from X = -5.78m

// Wall constructors
const frontWall = (z, x0) => new Wall({ origin: [x0, 0, z], dir: [1, 0, 0], out: [0, 0, -1] });
const backWall = (z, x0) => new Wall({ origin: [x0, 0, z], dir: [1, 0, 0], out: [0, 0, 1] });
const leftWall = (x, z0) => new Wall({ origin: [x, 0, z0], dir: [0, 0, 1], out: [-1, 0, 0] });
const rightWall = (x, z0) => new Wall({ origin: [x, 0, z0], dir: [0, 0, 1], out: [1, 0, 0] });

export function buildHouse(scene, M, shadows) {
  const G = {};
  const geo = (k) => (G[k] = G[k] || new Geo());
  const windows = []; // {wall, s0, s1, y0, y1, frosted, slider, awning, fixed, mullions}
  const caps = []; // Ridge and hip caps

  // Helper: solid wall with openings
  const wallAt = (w, key, a0, a1, y0, y1, openings = [], opts) => {
    const s = (a) => a - a0;
    const ops = openings.map((o) => ({ ...o, s0: s(o.a0), s1: s(o.a1) }));
    w.solid(geo(key), 0, a1 - a0, y0, y1, T, ops, opts);
    for (const o of ops) {
      if (!o.noWindow) windows.push({ wall: w, ...o });
    }
  };

  // =========================================================================
  // 1. CONCRETE FOUNDATION SLAB (High Realism Grounding)
  // =========================================================================
  const conc = geo('driveway');
  // Main foundation perimeter box reveal
  conc.box(X_GARAGE_OUTER - 0.04, -SLAB_H, Z_GARAGE_FRONT, X_BED_OUTER + 0.04, 0.01, Z_REAR_WALL + 0.04);
  // Porch foundation slab
  conc.box(X_GARAGE_INNER - 0.02, -SLAB_H, Z_PORCH_FRONT, X_PORCH_R + 0.02, 0.02, Z_BED1_FRONT);
  // Slab edge chamfer bevel
  conc.box(X_GARAGE_OUTER - 0.05, -0.04, Z_GARAGE_FRONT - 0.01, X_BED_OUTER + 0.05, 0.0, Z_REAR_WALL + 0.05);

  // Porch finished floor (tiled)
  geo('porchTile').box(X_GARAGE_INNER, 0.01, Z_PORCH_FRONT, X_PORCH_R, 0.04, Z_BED1_FRONT);
  // Alfresco finished floor (tiled)
  geo('porchTile').box(X_GARAGE_OUTER, 0.01, Z_ALFRESCO_START, X_ALFRESCO_INNER, 0.04, Z_REAR_WALL);

  // =========================================================================
  // 2. EXTERIOR WALLS (According to Blueprint Floor Plan)
  // =========================================================================

  // --- Front Facade (South-East / -Z) ---
  // A. Double Garage front wall (Render finish as specified on front elevation)
  // Auto panel lift door: 4.81m opening
  wallAt(
    frontWall(Z_GARAGE_FRONT, X_GARAGE_OUTER),
    'render',
    X_GARAGE_OUTER,
    X_GARAGE_INNER,
    0,
    WALL_H,
    [{ a0: X_GARAGE_OUTER + 0.48, a1: X_GARAGE_OUTER + 5.29, y0: 0, y1: 2.30, noWindow: true }]
  );

  // B. Porch Entry recess wall (behind the portal frame at Z_BED1_FRONT)
  // Contains Entrance Door (1.2m wide) and Entry Awning Window (0.9m x 2.1m)
  wallAt(
    frontWall(Z_BED1_FRONT, X_GARAGE_INNER),
    'render',
    X_GARAGE_INNER,
    X_PORCH_R,
    0,
    WALL_H,
    [
      { a0: 0.15, a1: 1.35, y0: 0, y1: 2.34, noWindow: true }, // Entry door
      { a0: 1.45, a1: 2.35, y0: 0.30, y1: 2.40, awning: true }, // AWN 900x2100
    ]
  );

  // C. Bedroom 1 front wall (at Z_BED1_FRONT)
  // Contains Bed 1 Awning Window (1.2m x 2.1m)
  wallAt(
    frontWall(Z_BED1_FRONT, X_PORCH_R),
    'render',
    X_PORCH_R,
    X_BED_OUTER,
    0,
    WALL_H,
    [
      { a0: 3.45, a1: 4.65, y0: 0.30, y1: 2.40, awning: true }, // AWN 1200x2100
    ]
  );

  // --- North Wall (Right Elevation / +X) ---
  // Runs along Bedroom 1, Ensuite, Laundry, Media, Bedroom 2, Bath, WC, Bedroom 3
  // Brick finish on side walls per builder standard, selectable via 'bricks'
  wallAt(
    rightWall(X_BED_OUTER, Z_BED1_FRONT),
    'bricks',
    Z_BED1_FRONT,
    Z_REAR_WALL,
    0,
    WALL_H,
    [
      { a0: -8.80, a1: -7.60, y0: 0.30, y1: 2.40, awning: true }, // Bed 1 side AWN 1200x2100
      { a0: -5.70, a1: -5.10, y0: 1.20, y1: 2.40, frosted: true }, // Ensuite ASW (OBSC) 600x1200
      { a0: -3.70, a1: -2.80, y0: 0.00, y1: 2.10, slider: true }, // Laundry glazed door
      { a0: -0.90, a1: 0.90, y0: 1.70, y1: 2.40, fixed: true }, // Media ASW 1800x700 highlight
      { a0: 2.90, a1: 4.40, y0: 0.90, y1: 2.40, slider: true }, // Bed 2 ASW 1500x1500
      { a0: 5.30, a1: 6.50, y0: 1.20, y1: 2.40, frosted: true }, // Bath ASW (OBSC) 1200x1200
      { a0: 7.00, a1: 7.60, y0: 1.20, y1: 2.40, frosted: true }, // WC ASW (OBSC) 600x1200
      { a0: 9.50, a1: 11.00, y0: 0.90, y1: 2.40, slider: true }, // Bed 3 ASW 1500x1500
    ]
  );

  // --- Rear Facade (West / +Z) ---
  // Bedroom 4 wall (X_ALFRESCO_INNER to X_BED_OUTER)
  wallAt(
    backWall(Z_REAR_WALL, X_ALFRESCO_INNER),
    'bricks',
    X_ALFRESCO_INNER,
    X_BED_OUTER,
    0,
    WALL_H,
    [
      { a0: -1.80, a1: -0.30, y0: 0.90, y1: 2.40, slider: true }, // Bed 4 ASW 1500x1500
    ]
  );

  // Alfresco recessed back wall (at Z_ALFRESCO_START)
  // Large Aluminium Sliding Stacker Door (2.4m x 2.4m, 3 panes) opening onto covered outdoor living
  wallAt(
    backWall(Z_ALFRESCO_START, X_GARAGE_OUTER),
    'bricks',
    X_GARAGE_OUTER,
    X_ALFRESCO_INNER,
    0,
    WALL_H,
    [
      { a0: -5.30, a1: -2.90, y0: 0.00, y1: 2.40, slider: true, stacker: true }, // ASD 2400x2400
    ]
  );

  // Alfresco inner return wall (X = X_ALFRESCO_INNER, Z from Z_ALFRESCO_START to Z_REAR_WALL)
  wallAt(
    rightWall(X_ALFRESCO_INNER, Z_ALFRESCO_START),
    'bricks',
    Z_ALFRESCO_START,
    Z_REAR_WALL,
    0,
    WALL_H,
    []
  );

  // Alfresco 350x350 Rendered Corner Pillar (at X_GARAGE_OUTER, Z_REAR_WALL)
  const ren = geo('render');
  ren.box(X_GARAGE_OUTER, 0, Z_REAR_WALL - 0.35, X_GARAGE_OUTER + 0.35, WALL_H, Z_REAR_WALL);
  // Alfresco overhead perimeter beam
  ren.box(X_GARAGE_OUTER, WALL_H - 0.30, Z_ALFRESCO_START, X_GARAGE_OUTER + 0.25, WALL_H, Z_REAR_WALL);
  ren.box(X_GARAGE_OUTER, WALL_H - 0.30, Z_REAR_WALL - 0.35, X_ALFRESCO_INNER, WALL_H, Z_REAR_WALL);

  // --- South Wall (Left Elevation / -X) ---
  // Runs from Garage front to Alfresco recess (Z_GARAGE_FRONT to Z_ALFRESCO_START)
  wallAt(
    leftWall(X_GARAGE_OUTER, Z_GARAGE_FRONT),
    'bricks',
    Z_GARAGE_FRONT,
    Z_ALFRESCO_START,
    0,
    WALL_H,
    [
      { a0: -3.30, a1: -2.10, y0: 1.05, y1: 1.65, slider: true, room: 'pantry' }, // Pantry ASW 1200x600 over sink
      { a0: -1.51, a1: 0.59, y0: 1.05, y1: 1.65, fixed: true, room: 'kitchen' }, // Kitchen Afw 2100x600 splashback
      { a0: 1.934, a1: 2.836, y0: 0.30, y1: 2.40, slider: true, room: 'living' }, // Family ASW 900x2100
      { a0: 6.497, a1: 7.394, y0: 0.30, y1: 2.40, slider: true, room: 'living' }, // Dining ASW 900x2100
    ]
  );

  // Porch side return wall (X = X_PORCH_R, Z from Z_PORCH_FRONT to Z_BED1_FRONT)
  wallAt(
    rightWall(X_PORCH_R, Z_PORCH_FRONT),
    'render',
    Z_PORCH_FRONT,
    Z_BED1_FRONT,
    0,
    WALL_H,
    []
  );

  // =========================================================================
  // 3. ARCHITECTURAL FEATURE PORTAL FRAME (Front Portico)
  // =========================================================================
  // As depicted prominently in the front elevation drawing:
  // A crisp, dark-accent rendered portal frame that encloses the entrance door
  // and the entry awning window, extending 0.15m forward and slightly above eave height.
  const portal = geo('render');
  const PORTAL_X0 = X_GARAGE_INNER - 0.05;
  const PORTAL_X1 = X_PORTAL_R;
  const PORTAL_Z0 = Z_PORCH_FRONT - 0.35;
  const PORTAL_Z1 = Z_PORCH_FRONT + 0.15;
  const PORTAL_TOP = WALL_H + 0.18;
  const PIER_W = 0.35;

  // Left vertical portal pier
  portal.box(PORTAL_X0, 0, PORTAL_Z0, PORTAL_X0 + PIER_W, PORTAL_TOP, PORTAL_Z1);
  // Right vertical portal pier
  portal.box(PORTAL_X1 - PIER_W, 0, PORTAL_Z0, PORTAL_X1, PORTAL_TOP, PORTAL_Z1);
  // Top horizontal portal lintel / beam
  portal.box(PORTAL_X0, WALL_H - 0.15, PORTAL_Z0, PORTAL_X1, PORTAL_TOP, PORTAL_Z1);

  // Feature Portal Parapet Flashing Capping (Colorbond)
  const fl = geo('flashing');
  fl.box(PORTAL_X0 - 0.03, PORTAL_TOP, PORTAL_Z0 - 0.03, PORTAL_X1 + 0.03, PORTAL_TOP + 0.04, PORTAL_Z1 + 0.03);

  // Porch ceiling / soffit
  const sof = geo('soffit');
  sof.poly(
    [
      [X_GARAGE_INNER, WALL_H - 0.02, Z_PORCH_FRONT],
      [X_PORCH_R, WALL_H - 0.02, Z_PORCH_FRONT],
      [X_PORCH_R, WALL_H - 0.02, Z_BED1_FRONT],
      [X_GARAGE_INNER, WALL_H - 0.02, Z_BED1_FRONT],
    ],
    [0, -1, 0]
  );
  // Alfresco ceiling / soffit
  sof.poly(
    [
      [X_GARAGE_OUTER, WALL_H - 0.02, Z_ALFRESCO_START],
      [X_ALFRESCO_INNER, WALL_H - 0.02, Z_ALFRESCO_START],
      [X_ALFRESCO_INNER, WALL_H - 0.02, Z_REAR_WALL],
      [X_GARAGE_OUTER, WALL_H - 0.02, Z_REAR_WALL],
    ],
    [0, -1, 0]
  );

  // =========================================================================
  // 4. FRONT ENTRANCE DOOR & HARDWARE
  // =========================================================================
  const doorGeo = geo('door');
  const dwall = frontWall(Z_BED1_FRONT, X_GARAGE_INNER);
  const DOOR_X0 = 0.18;
  const DOOR_X1 = 1.32;
  const DOOR_H = 2.34;

  // Modern timber/composite door slab with subtle inset relief
  dwall.box(doorGeo, DOOR_X0, DOOR_X1, 0.02, DOOR_H, -0.12, -0.18);
  // Outer door jamb / frame
  const fr = geo('frame');
  dwall.box(fr, DOOR_X0 - 0.04, DOOR_X0, 0, DOOR_H + 0.04, -0.06, -0.20);
  dwall.box(fr, DOOR_X1, DOOR_X1 + 0.04, 0, DOOR_H + 0.04, -0.06, -0.20);
  dwall.box(fr, DOOR_X0 - 0.04, DOOR_X1 + 0.04, DOOR_H, DOOR_H + 0.04, -0.06, -0.20);

  // Door vertical translucent vision glass strip
  const dg = geo('glassFrosted');
  dg.poly(
    [
      dwall.world(DOOR_X0 + 0.18, 0.20, -0.15),
      dwall.world(DOOR_X0 + 0.32, 0.20, -0.15),
      dwall.world(DOOR_X0 + 0.32, DOOR_H - 0.20, -0.15),
      dwall.world(DOOR_X0 + 0.18, DOOR_H - 0.20, -0.15),
    ],
    [0, 0, -1]
  );

  // Architectural long vertical stainless pull handle (1.2m long) + deadlock
  const metal = geo('metalDark');
  // Handle standoffs
  dwall.box(metal, DOOR_X1 - 0.16, DOOR_X1 - 0.12, 0.85, 0.88, -0.03, -0.12);
  dwall.box(metal, DOOR_X1 - 0.16, DOOR_X1 - 0.12, 1.85, 1.88, -0.03, -0.12);
  // Handle vertical bar
  dwall.box(metal, DOOR_X1 - 0.16, DOOR_X1 - 0.12, 0.75, 1.95, -0.01, -0.04);
  // Key cylinder escutcheon
  dwall.box(metal, DOOR_X1 - 0.16, DOOR_X1 - 0.12, 1.00, 1.08, -0.11, -0.12);

  // =========================================================================
  // 5. AUTOMATIC SECTIONAL GARAGE DOOR (4.81m wide)
  // =========================================================================
  const gd = new Geo();
  const GAR_X0 = X_GARAGE_OUTER + 0.48;
  const GAR_X1 = X_GARAGE_OUTER + 5.29;
  const GAR_H = 2.30;
  // Face polygon with normalized UVs [0..1] for garage embossing / texture maps
  gd.poly(
    [
      [GAR_X0, 0.01, Z_GARAGE_FRONT - 0.08],
      [GAR_X1, 0.01, Z_GARAGE_FRONT - 0.08],
      [GAR_X1, GAR_H, Z_GARAGE_FRONT - 0.08],
      [GAR_X0, GAR_H, Z_GARAGE_FRONT - 0.08],
    ],
    [0, 0, -1],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]
  );
  G.garage = gd;

  // Garage perimeter weather seal & head reveal
  geo('backing').box(GAR_X0 - 0.04, 0, Z_GARAGE_FRONT - 0.07, GAR_X0, GAR_H + 0.03, Z_GARAGE_FRONT);
  geo('backing').box(GAR_X1, 0, Z_GARAGE_FRONT - 0.07, GAR_X1 + 0.04, GAR_H + 0.03, Z_GARAGE_FRONT);
  geo('backing').box(GAR_X0 - 0.04, GAR_H, Z_GARAGE_FRONT - 0.07, GAR_X1 + 0.04, GAR_H + 0.04, Z_GARAGE_FRONT);

  // =========================================================================
  // 6. DETAILED WINDOWS & GLAZING (Powdercoated frames, sills, mullions)
  // =========================================================================
  for (const w of windows) addWindow(w);

  function addWindow(w) {
    const { wall, s0, s1, y0, y1 } = w;
    const fr = geo('frame');
    const dOuter = -0.04;
    const dInner = -0.16;
    const b = 0.055; // Outer frame thickness

    // Main frame perimeter
    wall.box(fr, s0, s1, y0, y0 + b, dOuter, dInner);
    wall.box(fr, s0, s1, y1 - b, y1, dOuter, dInner);
    wall.box(fr, s0, s0 + b, y0, y1, dOuter, dInner);
    wall.box(fr, s1 - b, s1, y0, y1, dOuter, dInner);

    // Deep architectural window sill (sloped / projecting)
    if (y0 > 0.05) {
      wall.box(fr, s0 - 0.04, s1 + 0.04, y0 - 0.04, y0 + 0.01, 0.04, dInner);
    }

    const width = s1 - s0;
    const height = y1 - y0;

    // Panes and Mullions
    if (w.stacker) {
      // 3-panel sliding stacker door
      const pW = width / 3;
      wall.box(fr, s0 + pW - 0.03, s0 + pW + 0.03, y0, y1, dOuter, dInner);
      wall.box(fr, s0 + pW * 2 - 0.03, s0 + pW * 2 + 0.03, y0, y1, dOuter, dInner);
    } else if (w.slider && width > 1.3) {
      // 2-panel slider with central interlock mullion
      const mid = s0 + width / 2;
      wall.box(fr, mid - 0.03, mid + 0.03, y0, y1, dOuter, dInner);
    } else if (w.awning && height > 1.8) {
      // Awning with lower fixed / transom bar
      const transY = y0 + height * 0.35;
      wall.box(fr, s0, s1, transY - 0.025, transY + 0.025, dOuter, dInner);
    }

    // Glass panel
    const g = geo(w.frosted ? 'glassFrosted' : 'glass');
    const a = wall.world(s0 + b * 0.8, y0 + b * 0.8, -0.11);
    const bb = wall.world(s1 - b * 0.8, y0 + b * 0.8, -0.11);
    const c = wall.world(s1 - b * 0.8, y1 - b * 0.8, -0.11);
    const dd = wall.world(s0 + b * 0.8, y1 - b * 0.8, -0.11);
    g.poly([a, bb, c, dd], wall.n);
  }

  // =========================================================================
  // 7. MULTI-HIP ROOF GEOMETRY (Exact 25° pitch per Roof Plan)
  // =========================================================================
  const roofG = geo('roof');

  // Multi-hip roof parameters:
  // Main building hip roof
  buildHipRoof(
    roofG,
    X_GARAGE_OUTER - OVER,
    X_BED_OUTER + OVER,
    Z_BED1_FRONT - OVER,
    Z_REAR_WALL + OVER,
    ROOF_EDGE_Y,
    SLOPE
  );

  // Front Porch & Bed 1 forward hipped projection
  buildHipRoof(
    roofG,
    X_GARAGE_INNER - OVER,
    X_PORCH_R + OVER,
    Z_PORCH_FRONT - OVER,
    Z_BED1_FRONT + 0.5,
    ROOF_EDGE_Y,
    SLOPE
  );

  // Garage forward hipped roof extension
  buildHipRoof(
    roofG,
    X_GARAGE_OUTER - 0.05, // Cut-off eave at boundary on south
    X_GARAGE_INNER + OVER,
    Z_GARAGE_FRONT - OVER,
    Z_BED1_FRONT + 0.5,
    ROOF_EDGE_Y,
    SLOPE
  );

  // Continuous Soffit under eaves around the entire house perimeter
  const soffitY = EAVE_Y - 0.01;
  sof.poly(
    [
      [X_GARAGE_OUTER - OVER, soffitY, Z_BED1_FRONT - OVER],
      [X_BED_OUTER + OVER, soffitY, Z_BED1_FRONT - OVER],
      [X_BED_OUTER + OVER, soffitY, Z_REAR_WALL + OVER],
      [X_GARAGE_OUTER - OVER, soffitY, Z_REAR_WALL + OVER],
    ],
    [0, -1, 0]
  );
  sof.poly(
    [
      [X_GARAGE_INNER - OVER, soffitY, Z_PORCH_FRONT - OVER],
      [X_PORCH_R + OVER, soffitY, Z_PORCH_FRONT - OVER],
      [X_PORCH_R + OVER, soffitY, Z_BED1_FRONT],
      [X_GARAGE_INNER - OVER, soffitY, Z_BED1_FRONT],
    ],
    [0, -1, 0]
  );
  sof.poly(
    [
      [X_GARAGE_OUTER - 0.05, soffitY, Z_GARAGE_FRONT - OVER],
      [X_GARAGE_INNER, soffitY, Z_GARAGE_FRONT - OVER],
      [X_GARAGE_INNER, soffitY, Z_BED1_FRONT],
      [X_GARAGE_OUTER - 0.05, soffitY, Z_BED1_FRONT],
    ],
    [0, -1, 0]
  );

  function buildHipRoof(g, x0, x1, z0, z1, yBase, slope) {
    const w = x1 - x0;
    const d = z1 - z0;
    if (w <= 0.2 || d <= 0.2) return;
    const k = Math.sqrt(1 + slope * slope);
    const alongX = w >= d;
    const half = (alongX ? d : w) / 2;
    const yr = yBase + half * slope;

    const n = (x, yy, z) => {
      const l = Math.hypot(x, yy, z);
      return [x / l, yy / l, z / l];
    };

    if (alongX) {
      const zc = (z0 + z1) / 2;
      const ra = [x0 + half, yr, zc];
      const rb = [x1 - half, yr, zc];
      const uvF = (p) => [p[0], (p[2] - z0) * k];
      const uvB = (p) => [-p[0], (z1 - p[2]) * k];
      const uvL = (p) => [-p[2], (p[0] - x0) * k];
      const uvR = (p) => [p[2], (x1 - p[0]) * k];

      const F = [[x0, yBase, z0], [x1, yBase, z0], rb, ra];
      const B = [[x1, yBase, z1], [x0, yBase, z1], ra, rb];
      const L = [[x0, yBase, z1], [x0, yBase, z0], ra];
      const R = [[x1, yBase, z0], [x1, yBase, z1], rb];

      g.poly(F, n(0, 1, -slope), F.map(uvF));
      g.poly(B, n(0, 1, slope), B.map(uvB));
      g.poly(L, n(-slope, 1, 0), L.map(uvL));
      g.poly(R, n(slope, 1, 0), R.map(uvR));

      if (rb[0] - ra[0] > 0.01) caps.push([ra, rb]);
      caps.push([[x0, yBase, z0], ra], [[x0, yBase, z1], ra], [[x1, yBase, z0], rb], [[x1, yBase, z1], rb]);
    } else {
      const xc = (x0 + x1) / 2;
      const ra = [xc, yr, z0 + half];
      const rb = [xc, yr, z1 - half];
      const uvF = (p) => [p[0], (p[2] - z0) * k];
      const uvB = (p) => [-p[0], (z1 - p[2]) * k];
      const uvL = (p) => [-p[2], (p[0] - x0) * k];
      const uvR = (p) => [p[2], (x1 - p[0]) * k];

      const F = [[x0, yBase, z0], [x1, yBase, z0], ra];
      const B = [[x1, yBase, z1], [x0, yBase, z1], rb];
      const L = [[x0, yBase, z1], [x0, yBase, z0], ra, rb];
      const R = [[x1, yBase, z0], [x1, yBase, z1], rb, ra];

      g.poly(F, n(0, 1, -slope), F.map(uvF));
      g.poly(B, n(0, 1, slope), B.map(uvB));
      g.poly(L, n(-slope, 1, 0), L.map(uvL));
      g.poly(R, n(slope, 1, 0), R.map(uvR));

      if (rb[2] - ra[2] > 0.01) caps.push([ra, rb]);
      caps.push([[x0, yBase, z0], ra], [[x1, yBase, z0], ra], [[x0, yBase, z1], rb], [[x1, yBase, z1], rb]);
    }

    // Tile edge nose along perimeter
    const e = 0.045;
    g.poly([[x0, yBase - e, z0], [x1, yBase - e, z0], [x1, yBase, z0], [x0, yBase, z0]], [0, 0, -1]);
    g.poly([[x0, yBase - e, z1], [x1, yBase - e, z1], [x1, yBase, z1], [x0, yBase, z1]], [0, 0, 1]);
    g.poly([[x0, yBase - e, z0], [x0, yBase - e, z1], [x0, yBase, z1], [x0, yBase, z0]], [-1, 0, 0]);
    g.poly([[x1, yBase - e, z0], [x1, yBase - e, z1], [x1, yBase, z1], [x1, yBase, z0]], [1, 0, 0]);
  }

  // =========================================================================
  // 8. COLORBOND FASCIA & QUAD GUTTER PROFILES
  // =========================================================================
  const gutterProfile = [
    [0.0, -0.03],
    [0.0, -0.14],
    [0.1, -0.14],
    [0.116, -0.125],
    [0.12, -0.1],
    [0.113, -0.085],
    [0.12, -0.068],
    [0.13, -0.045],
    [0.132, -0.022],
    [0.138, -0.012],
    [0.128, -0.006],
    [0.122, -0.018],
  ];
  const fasciaProfile = [
    [-0.03, 0.0],
    [0.0, 0.0],
    [0.0, -0.22],
    [-0.03, -0.22],
    [-0.03, 0.0],
  ];

  // Perimeter path for main house eaves
  const mainPerimeter = [
    [X_GARAGE_OUTER - OVER, Z_GARAGE_FRONT - OVER],
    [X_GARAGE_INNER - OVER, Z_GARAGE_FRONT - OVER],
    [X_GARAGE_INNER - OVER, Z_PORCH_FRONT - OVER],
    [X_PORCH_R + OVER, Z_PORCH_FRONT - OVER],
    [X_PORCH_R + OVER, Z_BED1_FRONT - OVER],
    [X_BED_OUTER + OVER, Z_BED1_FRONT - OVER],
    [X_BED_OUTER + OVER, Z_REAR_WALL + OVER],
    [X_GARAGE_OUTER - OVER, Z_REAR_WALL + OVER],
  ];

  sweep(geo('gutter'), gutterProfile, mainPerimeter, true, ROOF_EDGE_Y - 0.01, [0, 0]);
  sweep(geo('fascia'), fasciaProfile, mainPerimeter, true, ROOF_EDGE_Y, [0, 0]);

  function sweep(g, profile, path, closed, y0, center = [0, 0]) {
    const pts = closed ? [...path, path[0]] : path;
    const segN = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const l = Math.hypot(dx, dz) || 1;
      let nx = dz / l;
      let nz = -dx / l;
      const mx = (ax + bx) / 2 - center[0];
      const mz = (az + bz) / 2 - center[1];
      if (nx * mx + nz * mz < 0) {
        nx = -nx;
        nz = -nz;
      }
      segN.push([nx, nz]);
    }
    const miter = (i) => {
      const count = segN.length;
      let a = closed ? segN[(i - 1 + count) % count] : segN[Math.max(0, i - 1)];
      let b = closed ? segN[i % count] : segN[Math.min(count - 1, i)];
      const dot = a[0] * b[0] + a[1] * b[1];
      return [(a[0] + b[0]) / (1 + dot), (a[1] + b[1]) / (1 + dot)];
    };
    const ring = pts.map((p, i) => {
      const m = miter(i);
      return profile.map(([o, u]) => [p[0] + m[0] * o, y0 + u, p[1] + m[1] * o]);
    });
    for (let i = 0; i < ring.length - 1; i++) {
      const sn = segN[i];
      for (let j = 0; j < profile.length - 1; j++) {
        const a = ring[i][j];
        const b = ring[i + 1][j];
        const c = ring[i + 1][j + 1];
        const d = ring[i][j + 1];
        const po = profile[j + 1][0] - profile[j][0];
        const pu = profile[j + 1][1] - profile[j][1];
        let no = pu;
        let nu = -po;
        const l = Math.hypot(no, nu) || 1;
        no /= l;
        nu /= l;
        const nrm = [sn[0] * no, nu, sn[1] * no];
        g.poly([a, b, c, d], nrm, [
          [i, j * 0.05],
          [i + 1, j * 0.05],
          [i + 1, (j + 1) * 0.05],
          [i, (j + 1) * 0.05],
        ]);
      }
    }
  }

  // =========================================================================
  // 9. RECTANGULAR DOWNPIPES WITH 45° OFFSET ELBOWS & BRACKETS
  // =========================================================================
  const pipes = [];
  const addDownpipe = (wallPt, outDir, gutterOut = OVER + 0.06) => {
    const w = 0.10;
    const dd = 0.065;
    const px = wallPt[0] + outDir[0] * (dd / 2 + 0.025);
    const pz = wallPt[1] + outDir[1] * (dd / 2 + 0.025);
    const sizeFor = (len) =>
      outDir[0] !== 0
        ? { width: dd, depth: w, height: len }
        : { width: w, depth: dd, height: len };

    const yTop = WALL_H - 0.25;
    // Vertical pipe trunk
    const trunk = MeshBuilder.CreateBox('dp_trunk', sizeFor(yTop), scene);
    trunk.position.set(px, yTop / 2, pz);
    pipes.push(trunk);

    // Wall mounting standoffs / brackets (at y = 0.6m and y = 2.0m)
    for (const by of [0.6, 2.0]) {
      const bkt = MeshBuilder.CreateBox(
        'dp_bkt',
        outDir[0] !== 0
          ? { width: 0.03, depth: w + 0.02, height: 0.025 }
          : { width: w + 0.02, depth: 0.03, height: 0.025 },
        scene
      );
      bkt.position.set(wallPt[0] + outDir[0] * 0.02, by, wallPt[1] + outDir[1] * 0.02);
      pipes.push(bkt);
    }

    // Ground discharge shoe
    const shoe = MeshBuilder.CreateBox('dp_shoe', sizeFor(0.14), scene);
    shoe.position.set(px + outDir[0] * 0.04, 0.07, pz + outDir[1] * 0.04);
    shoe.rotationQuaternion = Quaternion.RotationAxis(new Vector3(-outDir[1], 0, outDir[0]), 0.65);
    pipes.push(shoe);

    // Swan-neck offset elbow from gutter drop to wall
    const gx = wallPt[0] + outDir[0] * gutterOut;
    const gz = wallPt[1] + outDir[1] * gutterOut;
    const top = new Vector3(gx, ROOF_EDGE_Y - 0.12, gz);
    const mid = new Vector3(gx, WALL_H - 0.08, gz);
    const low = new Vector3(px, yTop, pz);

    for (const [a, b] of [
      [top, mid],
      [mid, low],
    ]) {
      const len = Vector3.Distance(a, b) + 0.04;
      const seg = MeshBuilder.CreateBox('dp_elbow', { width: w * 0.95, depth: dd * 0.95, height: len }, scene);
      seg.position = Vector3.Center(a, b);
      const dir = b.subtract(a).normalize();
      seg.rotationQuaternion = new Quaternion();
      Quaternion.FromUnitVectorsToRef(Vector3.Up(), dir, seg.rotationQuaternion);
      if (outDir[0] !== 0) {
        seg.rotationQuaternion = seg.rotationQuaternion.multiply(Quaternion.RotationAxis(Vector3.Up(), Math.PI / 2));
      }
      pipes.push(seg);
    }
  };

  // Downpipe locations per plumbing and roof plans:
  // 1. Garage front corner
  addDownpipe([X_GARAGE_OUTER + 0.12, Z_GARAGE_FRONT], [0, -1]);
  // 2. Porch front corner
  addDownpipe([X_PORCH_R, Z_PORCH_FRONT + 0.20], [1, 0]);
  // 3. Bed 1 front side
  addDownpipe([X_BED_OUTER, Z_BED1_FRONT + 0.20], [1, 0]);
  // 4. North wall mid (near Laundry)
  addDownpipe([X_BED_OUTER, 0.0], [1, 0]);
  // 5. Rear North-East corner (Bed 3)
  addDownpipe([X_BED_OUTER, Z_REAR_WALL - 0.20], [1, 0]);
  // 6. South wall mid (Kitchen/Dining)
  addDownpipe([X_GARAGE_OUTER, 2.0], [-1, 0]);
  // 7. Rear Alfresco corner
  addDownpipe([X_GARAGE_OUTER + 0.20, Z_REAR_WALL], [0, 1]);

  const downpipe = Mesh.MergeMeshes(pipes, true, true);
  downpipe.name = 'downpipe';

  // =========================================================================
  // 10. REALISTIC SITE ACCESSORIES (Per Blueprints)
  // =========================================================================
  // A. 3000L Colorbond Slimline Rainwater Tank (Connected to downpipes per site plan)
  const rwt = MeshBuilder.CreateCylinder(
    'tank',
    { height: 1.85, diameter: 0.95, tessellation: 20 },
    scene
  );
  rwt.position.set(X_GARAGE_OUTER - 0.60, 1.85 / 2 + 0.02, 3.2);
  rwt.scaling.set(0.65, 1, 1.6); // Slimline oval proportion
  rwt.material = M.gutter;
  rwt.receiveShadows = true;
  shadows.addShadowCaster(rwt);

  // B. Ducted A/C External Condenser Unit + Concrete Plinth (as marked on floor plan)
  const acPlinth = MeshBuilder.CreateBox('ac_plinth', { width: 1.1, height: 0.08, depth: 0.6 }, scene);
  acPlinth.position.set(X_GARAGE_OUTER - 0.45, 0.04, 0.2);
  acPlinth.material = M.driveway;
  const acUnit = MeshBuilder.CreateBox('ac_unit', { width: 0.95, height: 0.85, depth: 0.4 }, scene);
  acUnit.position.set(X_GARAGE_OUTER - 0.45, 0.08 + 0.425, 0.2);
  acUnit.material = M.flashing;
  shadows.addShadowCaster(acUnit);

  // C. Hot Water System (HWS) per plan
  const hws = MeshBuilder.CreateCylinder('hws', { height: 1.65, diameter: 0.52, tessellation: 16 }, scene);
  hws.position.set(X_GARAGE_OUTER - 0.42, 1.65 / 2 + 0.04, -1.1);
  hws.material = M.metalDark;
  shadows.addShadowCaster(hws);

  // D. 130mm Width Retaining Wall along North Boundary (as annotated in blueprint)
  const rw = geo('render');
  rw.box(X_BED_OUTER + 0.92, 0, Z_BED1_FRONT - 1.0, X_BED_OUTER + 1.05, 0.45, Z_REAR_WALL + 1.5);
  // Retaining wall capping
  fl.box(X_BED_OUTER + 0.90, 0.45, Z_BED1_FRONT - 1.02, X_BED_OUTER + 1.07, 0.48, Z_REAR_WALL + 1.52);

  // =========================================================================
  // 11. COMPLETE INTERIOR ARCHITECTURE (Engineered from Blueprint Layout)
  // =========================================================================
  // Room dimensions and partition walls strictly following:
  // - 1500mm Entry passage
  // - Bed 1 (Master Suite: 4040 x 3490) + WIR (2000 x 1500) + Ensuite (2000 x 1900)
  // - Double Garage (6000 x 5700)
  // - Storage (1500 x 1400) + Walk-in Pantry (1500 x 3360)
  // - Kitchen (2810 x 4850) with grand 3237 x 1010 island bench
  // - Family + Dining (7260 x 6440)
  // - Laundry (1800 x 3490)
  // - Media Room (4400 x 3490) with 300mm dropped bulkhead ceiling & recessed LED cove
  // - Bed 2 (3000 x 3490) + Robe
  // - Main Bathroom (1500 x 2890) + Bathtub + Shower + Separate WC (1400 x 1000) + Linen
  // - Bed 3 (3250 x 3490) + Robe
  // - Bed 4 (3250 x 3240) + Robe

  const openings = []; // internal door openings -> leaves & architraves (interior.js)
  const T_IN = 0.09; // 90mm interior stud wall
  const IN_DOOR_H = 2.34; // Blueprint: "ALL INTERNAL DOORS TO BE 2340H U.N.O."
  const IN_DOOR_W = 0.82; // 820mm standard door

  // --- ZONED INTERIOR FLOOR FINISHES ---
  // A. Large Format Tile / Timber Flooring (Entry, Passages, Living, Dining, Kitchen, Pantry, Storage)
  const floorG = geo('interiorFloor');
  floorG.box(0.0, 0.01, -9.545, X_HALL, 0.03, -2.255); // Entry passage
  floorG.box(-2.44, 0.01, -2.255, X_HALL, 0.03, 8.585); // Family + Dining open plan
  floorG.box(X_GARAGE_OUTER, 0.01, Z_GARAGE_REAR, 0.0, 0.03, 8.485); // Kitchen, pantry, storage
  floorG.box(0.80, 0.01, 8.045, X_HALL, 0.03, 11.825); // Bed 3 & Bed 4 hallway corridor

  // B. Plush Carpet (Bedrooms & Media Room)
  const carpetG = geo('carpet');
  carpetG.box(X_HALL, 0.01, -9.545, X_BED_OUTER, 0.03, -6.055); // Master Bed 1
  carpetG.box(X_HALL, 0.01, -2.255, X_BED_OUTER, 0.03, 2.145); // Media Room
  carpetG.box(X_HALL, 0.01, 2.145, X_BED_OUTER, 0.03, 5.145); // Bed 2
  carpetG.box(X_HALL, 0.01, 8.045, X_BED_OUTER, 0.03, 11.825); // Bed 3
  carpetG.box(-2.44, 0.01, 8.585, 0.80, 0.03, 11.825); // Bed 4

  // C. Wet Area Matte Tiles (Ensuite, WIR, Laundry, Bathroom, Powder WC, Linen)
  const wetTileG = geo('tileWet');
  wetTileG.box(X_HALL, 0.01, -6.055, X_BED_OUTER, 0.03, -4.055); // WIR & Ensuite
  wetTileG.box(X_HALL, 0.01, -4.055, X_BED_OUTER, 0.03, -2.255); // Laundry
  wetTileG.box(X_HALL, 0.01, 5.145, X_BED_OUTER, 0.03, 8.045); // Main Bath, Powder WC & Linen

  // D. Garage Finished Concrete Slab
  geo('driveway').box(X_GARAGE_OUTER, 0.01, Z_GARAGE_FRONT, 0.0, 0.03, Z_GARAGE_REAR);

  // E. Finished Ceiling Plane (at wall plate height WALL_H)
  const ceilG = geo('interiorCeil');
  ceilG.box(X_GARAGE_OUTER, WALL_H, Z_GARAGE_FRONT, X_BED_OUTER, WALL_H + 0.02, Z_REAR_WALL);
  ceilG.box(X_GARAGE_INNER, WALL_H, Z_PORCH_FRONT, X_PORCH_R, WALL_H + 0.02, Z_BED1_FRONT);

  // --- INTERNAL PARTITION WALL BUILDERS (WITH REALISTIC 2340H FRAMED DOORS) ---
  const inWallX = (x0, x1, z, door = null) => {
    const wGeo = geo('interiorWall');
    const half = T_IN / 2;
    if (!door) {
      wGeo.box(x0, 0, z - half, x1, WALL_H, z + half);
      return;
    }
    const ds = Math.max(x0, door.start);
    const de = Math.min(x1, door.start + (door.width || IN_DOOR_W));
    if (ds > x0) wGeo.box(x0, 0, z - half, ds, WALL_H, z + half);
    if (x1 > de) wGeo.box(de, 0, z - half, x1, WALL_H, z + half);
    wGeo.box(ds, IN_DOOR_H, z - half, de, WALL_H, z + half);
    // jamb + door leaf are built by the interior module (style/handle selections)
    if (!door.openingOnly) openings.push({ axis: 'x', pos: z, a: ds, b: de, half, swingLeft: !!door.swingLeft });
  };

  const inWallZ = (z0, z1, x, door = null) => {
    const wGeo = geo('interiorWall');
    const half = T_IN / 2;
    if (!door) {
      wGeo.box(x - half, 0, z0, x + half, WALL_H, z1);
      return;
    }
    const ds = Math.max(z0, door.start);
    const de = Math.min(z1, door.start + (door.width || IN_DOOR_W));
    if (ds > z0) wGeo.box(x - half, 0, z0, x + half, WALL_H, ds);
    if (z1 > de) wGeo.box(x - half, 0, de, x + half, WALL_H, z1);
    wGeo.box(x - half, IN_DOOR_H, ds, x + half, WALL_H, de);
    if (!door.openingOnly) openings.push({ axis: 'z', pos: x, a: ds, b: de, half, swingLeft: !!door.swingLeft });
  };

  // --- BUILT-IN SLIDING ROBE WARDROBE BUILDER ---
  const robes = [];
  const addSlidingRobe = (x0, z0, x1, z1, faceDir = 'x') => {
    robes.push({ x0, z0, x1, z1, faceDir });
    const shelfY = 1.80;
    // Top bulkhead / pelmet box
    geo('interiorWall').box(x0, IN_DOOR_H, z0, x1, WALL_H, z1);
    // Chrome top track
    geo('chrome').box(x0, IN_DOOR_H - 0.03, z0, x1, IN_DOOR_H, z1);
    // Floor bottom guide track
    geo('chrome').box(x0, 0.01, z0, x1, 0.025, z1);
    // Interior hat shelf & hanging rail
    geo('cabinetryWood').box(x0 + 0.02, shelfY, z0 + 0.02, x1 - 0.02, shelfY + 0.02, z1 - 0.02);
  };

  // --- Garage, storage room and walk-in pantry (exactly per Ground Floor Plan) ---
  // 1. Garage / entry passage wall with the internal access door to the garage
  inWallZ(Z_GARAGE_FRONT, Z_GARAGE_REAR, 0.0, { start: -5.10, width: 0.82, swingLeft: true });
  // 2. Garage rear wall (garage 6000 deep) with the pantry access door (820)
  inWallX(X_KITCHEN_WALL, 0.0, Z_GARAGE_REAR, { start: -4.85, width: 0.82 });
  // 3. Entry passage wall past the storage room, with its 620 door
  inWallZ(Z_GARAGE_REAR, Z_STORAGE_END, 0.0, { start: -3.014, width: 0.62, swingLeft: true });
  // 4. Storage room (1500 x 1400+) / walk-in pantry divider
  inWallZ(Z_PANTRY_BACK, Z_PANTRY_FRONT + 0.045, X_PANTRY_DIV);
  // 5. Kitchen / walk-in pantry wall, with the 1000 wide walk-in opening
  inWallX(X_PANTRY_OPENING, 0.0, Z_PANTRY_FRONT);
  // 6. Nib wall between the kitchen bench and the pantry bench
  inWallX(X_KITCHEN_WALL, X_BENCH_PIER, Z_PANTRY_FRONT);
  // 7. Nib wall at the family-room end of the kitchen bench (plan px 10785–10880)
  inWallX(X_KITCHEN_WALL, X_BENCH_PIER, 0.9925);

  // 7. Master Bedroom (Bed 1) Corridor Wall with Room Entrance Door from Corridor
  inWallZ(-9.545, -6.055, X_HALL, { start: -6.95, width: 0.82 });
  // 8. Master Bedroom / Bathroom Wall (space filled with solid wall, with bathroom door)
  inWallX(X_HALL, X_BED_OUTER, -6.055, { start: 3.65, width: 0.72 });
  // 9. Bathroom Inner Wall (leveled with corridor wall at X_HALL)
  inWallZ(-6.055, -4.055, X_HALL);
  // 10. Laundry Front Wall (dividing Bathroom and Laundry)
  inWallX(X_HALL, X_BED_OUTER, -4.055);
  // 11. Laundry Rear Wall / Media Room Front Wall
  inWallX(X_HALL, X_BED_OUTER, -2.255);

  // 13. Bedroom Wing Hallway Longitudinal Wall (third door removed)
  inWallZ(-4.055, -2.255, X_HALL);
  inWallZ(-2.255, 2.145, X_HALL, { start: -0.50, width: 0.82 }); // Media Room door
  inWallZ(2.145, 5.145, X_HALL, { start: 2.25, width: 0.82 }); // Bed 2 door
  inWallZ(8.045, 11.825, X_HALL, { start: 8.15, width: 0.82 }); // Bed 3 door

  // 12. Media Room Rear Wall / Bed 2 Front Wall
  inWallX(X_HALL, X_BED_OUTER, 2.145);

  // 13. Bed 2 Robe (ROB 1900 per blueprint)
  inWallX(X_HALL, 2.34, 3.15); // Robe return partition
  addSlidingRobe(2.34, 3.15, 2.36, 5.05, 'x');

  // 14. Bed 2 Rear Wall / Main Bathroom & Linen Front Wall
  inWallX(X_HALL, X_BED_OUTER, 5.145);

  // 15. Linen Cupboard (1500 wide x 600 deep, facing hallway per blueprint)
  inWallZ(5.145, 6.645, 2.34); // Dividing wall between Linen and Bathroom
  addSlidingRobe(X_HALL, 5.15, X_HALL + 0.02, 6.65, 'x');
  for (const sy of [0.45, 0.90, 1.35, 1.80]) {
    geo('cabinetryWood').box(X_HALL + 0.05, sy, 5.20, 2.30, sy + 0.02, 6.60);
  }

  // 16. Main Bathroom Access Door from hallway
  inWallX(X_HALL, 2.34, 6.645, { start: 1.74, width: 0.72 });
  // 17. Main Bathroom / Separate Toilet (WC) Dividing Wall
  inWallX(2.34, X_BED_OUTER, 6.645, { start: 3.40, width: 0.72 }); // Main bathroom door (per plan)
  // 18. Separate Toilet (WC 1400 x 1000) Front Wall with 720 door
  inWallZ(6.645, 8.045, 4.23, { start: 6.80, width: 0.72 });
  // 19. Bathroom / Toilet / Bed 3 Dividing Wall
  inWallX(X_HALL, X_BED_OUTER, 8.045);

  // 20. Bed 3 Robe (ROB per blueprint along Bath/Toilet wall)
  inWallZ(8.045, 8.645, 3.90); // Robe return wall
  addSlidingRobe(2.00, 8.62, 3.90, 8.64, 'z');

  // 21. Bed 4 Front Wall (off Living/Hallway) with entry door (3250 x 3240 per blueprint)
  inWallX(-2.44, 0.80, 8.585, { start: -0.15, width: 0.82 });
  // 22. Bed 4 / Alfresco Dividing Wall
  inWallZ(8.585, 11.825, -2.44);
  // 23. Bed 4 / Hallway Dividing Wall
  inWallZ(8.585, 11.825, 0.80);
  // 24. Bed 4 Robe (ROB per blueprint)
  inWallZ(8.585, 9.185, -0.35); // Robe return wall
  addSlidingRobe(-2.25, 9.16, -0.35, 9.18, 'z');

  // Kitchen joinery, bathroom fixtures, laundry and all furniture are built by
  // src/scene/interior.js so they can follow the Internal selections.

  // =========================================================================
  // 12. WALL SCONCES & SOFFIT DOWNLIGHTS
  // =========================================================================
  const sconce = geo('metalDark');
  const lightSpots = [
    // Front entry portal pier sconce
    [PORTAL_X0 + PIER_W / 2, 1.85, PORTAL_Z0 - 0.02],
    // Garage pier sconce
    [X_GARAGE_OUTER + 0.24, 1.85, Z_GARAGE_FRONT - 0.02],
    // Alfresco dining sconce
    [X_ALFRESCO_INNER - 0.05, 1.95, Z_ALFRESCO_START + 0.3],
  ];
  for (const [x, y, z] of lightSpots) {
    sconce.box(x - 0.04, y - 0.10, z - 0.06, x + 0.04, y + 0.10, z);
  }

  // Sconce glow dynamic texture & mesh
  const glowTex = new DynamicTexture('glow', glowCanvas(), scene, true);
  glowTex.update(true);
  glowTex.hasAlpha = true;
  const glowMat = new StandardMaterial('glowMat', scene);
  glowMat.diffuseColor = Color3.Black();
  glowMat.specularColor = Color3.Black();
  glowMat.emissiveTexture = glowTex;
  glowMat.opacityTexture = glowTex;
  glowMat.emissiveColor = new Color3(1.0, 0.72, 0.42);
  glowMat.disableLighting = true;
  glowMat.alphaMode = Constants.ALPHA_ADD;
  glowMat.backFaceCulling = false;

  const glowGeo = new Geo();
  for (const [x, y, z] of lightSpots) {
    glowGeo.poly(
      [
        [x - 0.35, y - 1.1, z - 0.005],
        [x + 0.35, y - 1.1, z - 0.005],
        [x + 0.35, y + 1.1, z - 0.005],
        [x - 0.35, y + 1.1, z - 0.005],
      ],
      [0, 0, -1],
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ]
    );
  }
  const glow = glowGeo.toMesh('wallGlow', scene, glowMat);
  glow.isPickable = false;
  glow.setEnabled(false);

  // =========================================================================
  // 13. MESH GENERATION & METADATA BINDING
  // =========================================================================
  const PART_OF = {
    bricks: 'bricks',
    render: 'render',
    roof: 'roof',
    roofCap: 'roof',
    gutter: 'gutter',
    fascia: 'fascia',
    downpipe: 'downpipe',
    flashing: 'flashing',
    trim: 'render', // Portal frame & trims
    frame: 'frame',
    glass: 'frame',
    glassFrosted: 'frame',
    garage: 'garage',
    porchTile: 'render',
  };

  const meshes = {};
  for (const [k, g] of Object.entries(G)) {
    const m = g.toMesh(k, scene, M[k]);
    meshes[k] = m;
  }
  meshes.downpipe = downpipe;
  downpipe.material = M.downpipe;

  // Ridge and Hip capping rolls (cylinder sweeps along hip/ridge lines)
  const capMeshes = caps.map(([a, b]) => {
    const A = new Vector3(...a);
    const B = new Vector3(...b);
    const len = Vector3.Distance(A, B);
    const c = MeshBuilder.CreateCylinder(
      'roofCapSeg',
      { height: len + 0.04, diameter: 0.16, tessellation: 12 },
      scene
    );
    c.position = Vector3.Center(A, B).add(new Vector3(0, 0.02, 0));
    c.rotationQuaternion = new Quaternion();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), B.subtract(A).normalize(), c.rotationQuaternion);
    return c;
  });
  const roofCap = Mesh.MergeMeshes(capMeshes, true, true);
  roofCap.name = 'roofCap';
  roofCap.material = M.roofCap;
  meshes.roofCap = roofCap;

  for (const [k, m] of Object.entries(meshes)) {
    m.metadata = { part: PART_OF[k] || null };
    m.isPickable = true;
    const noShadow = new Set([
      'glass',
      'glassFrosted',
      'interiorWall',
      'interiorCeil',
      'interiorFloor',
      'carpet',
      'soffit',
      'tileWet',
      'cabinetry',
      'cabinetryWood',
      'stoneBench',
      'porcelainWhite',
      'chrome',
      'glassScreen',
      'ledStrip',
      'fabricSofa',
      'bedLinen',
      'tvScreen',
      'door',
    ]);
    if (!noShadow.has(k)) {
      shadows.addShadowCaster(m, false);
    }
    m.freezeWorldMatrix();
  }
  if (meshes.soffit) meshes.soffit.receiveShadows = true;

  // Transparent / Dollhouse Mode Controller
  const roofKeys = ['roof', 'roofCap', 'gutter', 'fascia', 'downpipe', 'soffit', 'interiorCeil', 'flashing'];
  const extWallKeys = ['bricks', 'render', 'cladding', 'trim', 'garage', 'frame', 'glass', 'glassFrosted'];

  const setTransparent = (isTransparent) => {
    for (const k of roofKeys) {
      const m = meshes[k];
      // isVisible (not just visibility) so the roof stops casting shade indoors
      if (m) m.isVisible = !isTransparent;
    }
    for (const k of extWallKeys) {
      const m = meshes[k];
      if (m) m.visibility = isTransparent ? 0.32 : 1.0;
    }
  };

  // Anchors for A–L overlay pin badges (updated to new single-storey coordinates)
  const anchors = {
    roof: new Vector3(0.0, ROOF_EDGE_Y + 1.85, -2.0),
    gutter: new Vector3(X_PORTAL_R + 0.3, ROOF_EDGE_Y - 0.04, Z_PORCH_FRONT - OVER - 0.04),
    fascia: new Vector3(X_PORCH_R + 0.5, ROOF_EDGE_Y - 0.1, Z_BED1_FRONT - OVER - 0.02),
    downpipe: new Vector3(X_GARAGE_OUTER + 0.12, 1.6, Z_GARAGE_FRONT - 0.1),
    cladding: new Vector3(PORTAL_X1 - PIER_W / 2, 2.2, PORTAL_Z0 - 0.08),
    flashing: new Vector3(PORTAL_X0 + PIER_W / 2, PORTAL_TOP + 0.05, PORTAL_Z0),
    render: new Vector3(PORTAL_X0 + 0.15, 1.4, PORTAL_Z0 - 0.06),
    bricks: new Vector3(X_BED_OUTER + 0.05, 1.4, Z_BED1_FRONT + 3.0),
    trim: new Vector3(X_BED_OUTER - 0.8, 1.4, Z_BED1_FRONT - 0.18),
    frame: new Vector3(3.95, 1.35, Z_BED1_FRONT - 0.14),
    garage: new Vector3(X_GARAGE_OUTER + 2.85, 1.15, Z_GARAGE_FRONT - 0.12),
    driveway: new Vector3(X_GARAGE_OUTER + 2.85, 0.04, -14.2),
  };

  return {
    meshes, anchors, glow, glowMat, lightSpots, setTransparent,
    plan: { windows, openings, robes, geoKeys: Object.keys(G) },
  };
}

function glowCanvas() {
  const c = makeCanvas(128, 512);
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 256, 4, 64, 256, 250);
  g.addColorStop(0, 'rgba(255,210,160,0.85)');
  g.addColorStop(0.18, 'rgba(255,195,135,0.35)');
  g.addColorStop(0.6, 'rgba(255,180,110,0.08)');
  g.addColorStop(1, 'rgba(255,170,100,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 512);
  return c;
}
