import { CATEGORIES, findOption, REGIONS, isComplete } from './catalog.js';
import { INTERIOR_CATEGORIES, resolveInterior, interiorComplete } from './interiorCatalog.js';

const isUpgrade = (tier) => !!tier && /upgrade/i.test(tier);

// Human-readable summary of one category's selection.
export function describe(cat, sel, region) {
  const parts = [];
  let primary = null;
  let upgrade = false;
  for (const f of cat.fields) {
    const id = sel?.[f.key];
    if (!id) continue;
    let opt = findOption(id);
    if (!opt) continue;
    if (f.key === 'mortar') {
      const live = f.options({ region, sel }).find((o) => o.id === id);
      if (live) opt = live;
    }
    if (isUpgrade(opt.tier)) upgrade = true;
    if (f.primary) primary = opt;
    const name = f.key === 'mortar' ? `${opt.name} mortar` : optName(opt);
    parts.push({ field: f.label, name, tier: opt.tier || '', opt });
  }
  const done = isComplete(cat, sel);
  const main = primary ? optName(primary) : null;
  // secondary choices, minus ones the main name already says (e.g. "Timber look")
  const detail = parts.filter((p) => p.opt !== primary && !(main && main.includes(p.name))).map((p) => p.name);
  return {
    done,
    main,
    detail,
    parts,
    upgrade,
    swatch: primary ? { hex: primary.hex || primary.base, img: primary.img } : null,
    text: done ? [main, ...detail].join(' · ') : 'Not selected yet',
  };
}

export function optName(opt) {
  if (!opt) return '';
  if (opt.supplier) return `${opt.name} (${opt.supplier})`;
  if (opt.brand && opt.brand !== 'Dulux') return `${opt.brand.replace('®', '')} ${opt.name}`;
  if (opt.brand === 'Dulux') return `Dulux ${opt.name}`;
  return opt.name;
}

export function summaryRows(state) {
  return CATEGORIES.map((cat) => ({ cat, ...describe(cat, state.sel[cat.key], state.region) }));
}

export const regionName = (id) => REGIONS.find((r) => r.id === id)?.name || '—';

// ---------------------------------------------------------------- internal
export function describeInterior(cat, sel = {}, confirmed = false) {
  const parts = [];
  let primary = null;
  let upgrade = false;
  for (const f of cat.fields) {
    if (f.when && !f.when(sel)) continue;
    const opt = resolveInterior(cat.key, f.key, sel);
    if (!opt) continue;
    if (/upgrade/i.test(opt.tier || '')) upgrade = true;
    if (f.primary && !primary) primary = opt;
    parts.push({ field: f.label, name: opt.name, tier: opt.tier || '', opt });
  }
  const main = primary?.name || parts[0]?.name || null;
  const detail = parts.filter((p) => p.opt !== primary).map((p) => p.name);
  return {
    done: confirmed && interiorComplete(cat, sel),
    main,
    detail,
    parts,
    upgrade,
    swatch: primary ? { hex: primary.hex, img: primary.img } : null,
    text: main ? [main, ...detail.slice(0, 2)].join(' · ') : 'Standard inclusion',
  };
}

export function interiorRows(state) {
  return INTERIOR_CATEGORIES.map((cat) => ({
    cat,
    ...describeInterior(cat, state.int?.[cat.key], (state.intDone || []).includes(cat.key)),
  }));
}
