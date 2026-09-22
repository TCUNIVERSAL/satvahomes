import { Color3 } from '../scene/babylon.js';

// Babylon's renderOverlay pass does not show through this scene's post pipeline,
// so hover highlighting lifts the material's emissive instead and puts it back
// when the pointer leaves. Meshes that share a material light up together, which
// is what we want: "these are all your cabinetry".
const TINT = new Color3(0.34, 0.13, 0.05);

export function createTinter(color = TINT) {
  let lit = []; // [{ mat, emissive }]

  const restore = () => {
    for (const { mat, em } of lit) mat.emissiveColor = em;
    lit = [];
  };

  return {
    set(meshes) {
      const list = meshes ? (Array.isArray(meshes) ? meshes : [meshes]) : [];
      const mats = [];
      const seen = new Set();
      for (const m of list) {
        const mat = m?.material;
        if (!mat || seen.has(mat)) continue;
        seen.add(mat);
        mats.push(mat);
      }
      if (mats.length === lit.length && mats.every((m, i) => m === lit[i].mat)) return;
      restore();
      for (const mat of mats) {
        lit.push({ mat, em: mat.emissiveColor.clone() });
        mat.emissiveColor = color;
      }
    },
    clear: restore,
  };
}
