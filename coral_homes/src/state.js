import { CATEGORIES, defaultSelection, isComplete } from './catalog.js';
import { INTERIOR_CATEGORIES, interiorDefaults, interiorComplete } from './interiorCatalog.js';

const KEY = 'coral-homes.external-selections.v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Drop or remap choices that are no longer offered (e.g. roof colour after a
// roof type change, bricks after a region change), then apply category rules.
function validate(cat, sel, region, changedField) {
  for (const f of cat.fields) {
    if (f.key === changedField || !sel[f.key]) continue;
    const opts = f.options({ region, sel });
    if (opts.some((o) => o.id === sel[f.key])) continue;
    const mapped = f.remap ? f.remap(sel[f.key], sel, region) : null;
    sel[f.key] = mapped && opts.some((o) => o.id === mapped) ? mapped : f.default || null;
  }
  cat.normalize?.(sel, region);
  return sel;
}

// Internal categories: fields can depend on each other (`when`) and their option
// lists can change, so drop anything that no longer applies and fall back to the
// guide's standard inclusion.
function validateInt(cat, sel) {
  for (const f of cat.fields) {
    if (f.when && !f.when(sel)) {
      delete sel[f.key];
      continue;
    }
    let opts = [];
    try {
      opts = f.options({ sel }) || [];
    } catch {
      opts = [];
    }
    if (!opts.length) continue;
    if (!sel[f.key] || !opts.some((o) => o.id === sel[f.key])) {
      sel[f.key] = opts.some((o) => o.id === f.default) ? f.default : opts[0].id;
    }
  }
  return sel;
}

export function createStore() {
  const saved = load();
  const state = {
    region: saved?.region || null,
    sel: {},
    int: {}, // internal (interior) selections
    intDone: Array.isArray(saved?.intDone) ? saved.intDone.slice() : [], // confirmed by the customer
  };
  for (const c of CATEGORIES) {
    const sel = { ...defaultSelection(c), ...(saved?.sel?.[c.key] || {}) };
    state.sel[c.key] = state.region ? validate(c, sel, state.region) : sel;
  }
  for (const c of INTERIOR_CATEGORIES) {
    state.int[c.key] = validateInt(c, { ...interiorDefaults(c), ...(saved?.int?.[c.key] || {}) });
  }

  const listeners = new Set();
  const persist = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable (private mode) — selections just won't persist */
    }
  };
  const emit = (change) => {
    persist();
    for (const fn of listeners) fn(state, change);
  };

  return {
    state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setRegion(region) {
      state.region = region;
      for (const c of CATEGORIES) state.sel[c.key] = validate(c, { ...state.sel[c.key] }, region);
      emit({ type: 'region' });
    },
    set(catKey, fieldKey, value) {
      const cat = CATEGORIES.find((c) => c.key === catKey);
      state.sel[catKey] = validate(cat, { ...state.sel[catKey], [fieldKey]: value }, state.region, fieldKey);
      emit({ type: 'select', cat: catKey, field: fieldKey });
    },
    setInt(catKey, fieldKey, value) {
      const cat = INTERIOR_CATEGORIES.find((c) => c.key === catKey);
      state.int[catKey] = validateInt(cat, { ...state.int[catKey], [fieldKey]: value });
      if (!state.intDone.includes(catKey)) state.intDone.push(catKey);
      emit({ type: 'interior', cat: catKey, field: fieldKey });
    },
    // "keep the standard inclusion" — ticks the item off without changing it
    confirmInt(catKey) {
      if (state.intDone.includes(catKey)) return;
      state.intDone.push(catKey);
      emit({ type: 'interior', cat: catKey });
    },
    completedInt() {
      return INTERIOR_CATEGORIES.filter((c) => state.intDone.includes(c.key) && interiorComplete(c, state.int[c.key]));
    },
    replace(catKey, sel) {
      state.sel[catKey] = sel;
      emit({ type: 'select', cat: catKey });
    },
    reset() {
      for (const c of CATEGORIES) state.sel[c.key] = defaultSelection(c);
      for (const c of INTERIOR_CATEGORIES) state.int[c.key] = validateInt(c, interiorDefaults(c));
      state.intDone.length = 0;
      emit({ type: 'reset' });
    },
    completed() {
      return CATEGORIES.filter((c) => isComplete(c, state.sel[c.key]));
    },
  };
}
