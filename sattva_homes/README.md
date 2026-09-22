# Sattva Homes — External Selections 3D

An interactive website where a customer designs the outside of their home in real-time 3D.
The home starts plain white; the customer chooses each of the 12 external items listed on
page 3 of the *Pre-Selection Guide* (A–L) and watches the house update. When all 12 are
chosen, **Done** photographs the home from four angles and shows a summary, which can be
downloaded or printed as a PDF.

| | Item | Options (from the guide) |
|---|---|---|
| A | Roof covering | Designer / Classic / Prestige concrete tiles, Colorbond® sheet roof + colours |
| B | Gutter | Colorbond® range |
| C | Fascia | Colorbond® range |
| D | Downpipe | Colorbond® range *(not detailed in guide)* |
| E | Cladding | 133mm Axon, 405mm Stria, 180mm Linea + Dulux paint |
| F | Flashing Cap | Colorbond® range *(not detailed in guide)* |
| G | Feature Render | Acratex finish + Dulux white/deep base paint |
| H | Bricks | PGH & Austral ranges per build region, mortar colour, laying pattern |
| I | Window Trim | Timber look / Colorbond® / painted *(not detailed in guide)* |
| J | Window Frame | 8 frame colours + glazing |
| K | Garage door | Ranch, Slimline, Heritage, Flatline, Vertical Battens + colours |
| L | Driveway | Plain, exposed aggregate, coloured concrete, pavers *(not detailed in guide)* |

## Run it

Requires Node.js 18+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production files in dist/
npm run preview    # serve the production build
```

`dist/` is a static site — upload it to any static host (Netlify, Vercel, S3, cPanel…).

## How it works

- **Babylon.js** (`@babylonjs/core`, imported per-module via `src/scene/babylon.js`) renders the
  scene with PBR materials, sun shadows, ambient occlusion (SSAO), tone mapping and a painted
  sky that also lights the scene. Day / Dusk modes switch the lighting and turn on the
  wall and interior lights.
- **The house is built in code** (`src/scene/house.js`) — every selectable part is its own mesh,
  so a choice only changes that part. Colours fade in; textures (bricks, timber, driveway)
  cross-fade.
- **Textures are generated in the browser** (`src/scene/textures.js`): bricks use colour palettes
  sampled from the guide's brick photos; roof tiles, cladding, garage doors and render get
  procedural relief (normal) maps.
- **Selections are saved** in the browser (localStorage), so a refresh keeps the customer's work.
- **PDF** is created in the browser with jsPDF (loaded only when needed).

```
src/
  catalog.js            all options, tiers (Standard/Upgrade), notes and rules
  data/pdf-swatches.json colours, names and image paths extracted from the guide
  state.js              selections store (+ validation when region/type changes)
  describe.js           human-readable summary of each selection
  main.js               wiring: scene, UI, day/dusk, camera views, Done capture
  scene/                Babylon setup, materials, house, landscape, textures
  ui/                   selection panel, A–L pins & hover, summary + PDF
public/swatches/        swatch images cropped from the guide
```

## Editing options

- Add or change colours/options in `src/catalog.js`. Each category lists its `fields`;
  `primary` fields must be chosen before the item counts as done.
- Guide data lives in `src/data/pdf-swatches.json` (`colorbond`, `roofTiles`, `bricks`, …).
  Swatch images are in `public/swatches/`.
- Brick region availability comes from the guide's pages: QLD & Northern NSW,
  NSW Port Macquarie–Central Coast, and NSW Sydney (Austral Port Macquarie–Sydney range
  appears in both NSW regions). Bricks marked **U** in the guide automatically switch to the
  off-white mortar upgrade.

## Assumptions to confirm

- Driveway, downpipe, flashing cap and window trim options are **not** in the guide; sensible
  defaults are used and labelled as indicative.
- Standard Dulux white names (Vivid White, Lexicon Quarter, …) and all on-screen colours are
  approximations — the app and PDF say so and ask customers to confirm with physical samples.
- The 3D house is a representative double-storey facade inspired by the Rochester 33 photo on
  page 3, not an exact plan of any specific design.
