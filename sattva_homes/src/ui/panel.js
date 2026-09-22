import { CATEGORIES, NOTES } from '../catalog.js';
import { INTERIOR_CATEGORIES, INTERIOR_SECTIONS, INTERIOR_NOTES } from '../interiorCatalog.js';
import { describe, describeInterior } from '../describe.js';
import { concreteAlbedo } from '../scene/textures.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ICON = {
  check: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chev: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bolt: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11.5 2L4 11h5l-1 7 7.5-9h-5z" fill="currentColor"/></svg>',
  info: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 9v5M10 6.2v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  download: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v10m-4-4 4 4 4-4M4 16h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrow: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4-4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
export { ICON };

const drivePreview = new Map();
function drivewayThumb(opt) {
  if (!drivePreview.has(opt.id)) drivePreview.set(opt.id, concreteAlbedo(160, { ...opt, tile: 1 }).toDataURL('image/jpeg', 0.85));
  return drivePreview.get(opt.id);
}

function tierClass(tier = '') {
  if (/POA/i.test(tier)) return 'tier tier-poa';
  if (/upgrade/i.test(tier)) return 'tier tier-up';
  if (/standard|included/i.test(tier)) return 'tier tier-std';
  return 'tier';
}

const TABS = [
  { key: 'ext', name: 'External', title: 'External Selections', lede: 'Choose each item <b>A–M</b>. Your home updates as you go.' },
  { key: 'int', name: 'Internal', title: 'Internal Selections', lede: 'Flooring, paint, kitchen, bathrooms and more — see inside as you choose.' },
];

export function createPanel({ root, store, onOpen, onDone }) {
  const filters = {}; // per category field filter state
  let tab = 'ext';
  let openKey = null;

  // ---------------- tab-agnostic accessors
  const catsOf = (t) => (t === 'int' ? INTERIOR_CATEGORIES : CATEGORIES);
  const catOf = (t, key) => catsOf(t).find((c) => c.key === key);
  const selOf = (t, key) => (t === 'int' ? store.state.int[key] : store.state.sel[key]);
  const descOf = (t, cat) => (t === 'int'
    ? describeInterior(cat, store.state.int[cat.key], store.state.intDone.includes(cat.key))
    : describe(cat, store.state.sel[cat.key], store.state.region));
  const listEl = (t) => root.querySelector(`.cats[data-tab="${t}"]`);

  root.innerHTML = `
    <div class="panel-head">
      <p class="eyebrow">Pre-Start Selection Guide</p>
      <h1></h1>
      <p class="lede"></p>
      <div class="tabs" role="tablist">
        ${TABS.map((t) => `<button class="tab" role="tab" data-tab-btn="${t.key}" aria-selected="${t.key === 'ext'}">
          <span>${t.name}</span><b class="tab-count"></b></button>`).join('')}
      </div>
      <div class="progress"><div class="progress-bar"><span></span></div><span class="progress-text"></span></div>
    </div>
    <div class="cats" data-tab="ext" role="list"></div>
    <div class="cats" data-tab="int" role="list" hidden></div>
    <div class="panel-foot">
      <button class="btn btn-ghost" data-act="reset">Start over</button>
      <button class="btn btn-primary" data-act="done" disabled>Done — view my home</button>
    </div>`;

  listEl('ext').innerHTML = CATEGORIES.map((c) => catShell(c, c.letter)).join('');
  listEl('int').innerHTML = INTERIOR_SECTIONS.map((s) => `
    <h2 class="sec-head">${esc(s.name)}</h2>
    ${INTERIOR_CATEGORIES.filter((c) => c.section === s.key).map((c) => catShell(c, c.letter)).join('')}`).join('');

  function catShell(c, letter) {
    return `<section class="cat" data-cat="${c.key}" role="listitem">
      <button class="cat-head" aria-expanded="false" aria-controls="body-${c.key}">
        <span class="badge">${letter}</span>
        <span class="cat-titles"><span class="cat-name">${esc(c.name)}</span><span class="cat-choice"></span></span>
        <span class="cat-swatch"></span>
        <span class="cat-state"></span>
      </button>
      <div class="cat-body" id="body-${c.key}" hidden></div>
    </section>`;
  }

  // ---------------- rendering
  function renderHead(t, cat) {
    const el = listEl(t).querySelector(`[data-cat="${cat.key}"]`);
    if (!el) return;
    const d = descOf(t, cat);
    el.classList.toggle('is-done', d.done);
    el.querySelector('.cat-choice').textContent = t === 'int' && !d.done ? `${d.text} — to confirm` : d.text;
    const sw = el.querySelector('.cat-swatch');
    sw.innerHTML = d.swatch && (d.swatch.img || d.swatch.hex)
      ? (d.swatch.img ? `<img src="${esc(d.swatch.img)}" alt="">` : `<i style="background:${esc(d.swatch.hex)}"></i>`)
      : '';
    el.querySelector('.cat-state').innerHTML = d.done ? `<span class="done-dot">${ICON.check}</span>` : `<span class="chev">${ICON.chev}</span>`;
  }

  function renderProgress() {
    const t = TABS.find((x) => x.key === tab);
    root.querySelector('.panel-head h1').textContent = t.title;
    root.querySelector('.panel-head .lede').innerHTML = t.lede;
    const counts = {
      ext: [store.completed().length, CATEGORIES.length],
      int: [store.completedInt().length, INTERIOR_CATEGORIES.length],
    };
    for (const b of root.querySelectorAll('[data-tab-btn]')) {
      const [n, all] = counts[b.dataset.tabBtn];
      b.querySelector('.tab-count').textContent = `${n}/${all}`;
      b.classList.toggle('on', b.dataset.tabBtn === tab);
      b.classList.toggle('is-done', n === all);
      b.setAttribute('aria-selected', String(b.dataset.tabBtn === tab));
    }
    const [n, all] = counts[tab];
    root.querySelector('.progress-bar span').style.width = `${(n / all) * 100}%`;
    root.querySelector('.progress-text').textContent = `${n} of ${all} ${tab === 'int' ? 'confirmed' : 'selected'}`;
    const done = root.querySelector('[data-act="done"]');
    const left = CATEGORIES.length - counts.ext[0] + (INTERIOR_CATEGORIES.length - counts.int[0]);
    done.disabled = counts.ext[0] < CATEGORIES.length;
    done.textContent = left ? `Done — ${left} item${left > 1 ? 's' : ''} left` : 'Done — view my home';
  }

  function optionsFor(t, f, sel) {
    try {
      return f.options({ region: store.state.region, sel }) || [];
    } catch {
      return [];
    }
  }

  function renderBody(t, cat) {
    const body = listEl(t).querySelector(`#body-${cat.key}`);
    const sel = selOf(t, cat.key);
    const f0 = (filters[cat.key] = filters[cat.key] || {});
    const d = descOf(t, cat);
    const list = catsOf(t);
    const nextCat = list.find((c, i) => i > list.indexOf(cat) && !descOf(t, c).done) || list.find((c) => c !== cat && !descOf(t, c).done);

    let html = '';
    for (const f of cat.fields) {
      if (!fieldApplies(f, sel)) continue;
      const all = optionsFor(t, f, sel);
      if (!all.length) continue;
      const fs = (f0[f.key] = f0[f.key] || {});
      let opts = all;
      let filterHtml = '';
      if (f.filters?.includes('tone') && all.some((o) => o.tone)) {
        const tones = ['Light', 'Medium', 'Dark'].filter((x) => all.some((o) => o.tone === x));
        filterHtml += `<div class="seg" role="group" aria-label="Filter by tone">${['All', ...tones]
          .map((x) => `<button class="seg-btn${(fs.tone || 'All') === x ? ' on' : ''}" data-filter="tone" data-field="${f.key}" data-value="${x}">${x}</button>`)
          .join('')}</div>`;
        if (fs.tone && fs.tone !== 'All') opts = opts.filter((o) => o.tone === fs.tone);
      }
      if (f.filters?.includes('supplier')) {
        const sup = [...new Set(all.map((o) => o.supplier))];
        filterHtml += `<div class="seg" role="group" aria-label="Filter by supplier">${['All', ...sup]
          .map((x) => `<button class="seg-btn${(fs.supplier || 'All') === x ? ' on' : ''}" data-filter="supplier" data-field="${f.key}" data-value="${x}">${x}</button>`)
          .join('')}</div>`;
        if (fs.supplier && fs.supplier !== 'All') opts = opts.filter((o) => o.supplier === fs.supplier);
      }
      if (f.filters?.includes('range')) {
        const ranges = [...new Set(all.map((o) => o.range))];
        filterHtml += `<label class="select"><span class="sr-only">Range</span><select data-filter="range" data-field="${f.key}">
          ${['All ranges', ...ranges].map((r) => `<option ${fs.range === r ? 'selected' : ''}>${esc(r === 'POA' ? 'POA' : r)}</option>`).join('')}</select></label>`;
        if (fs.range && fs.range !== 'All ranges') opts = opts.filter((o) => o.range === fs.range);
      }
      if (f.filters?.includes('search')) {
        filterHtml += `<label class="search"><span class="sr-only">Search bricks</span><input type="search" placeholder="Search ${all.length} bricks" value="${esc(fs.q || '')}" data-filter="q" data-field="${f.key}"></label>`;
        if (fs.q) opts = opts.filter((o) => o.name.toLowerCase().includes(fs.q.toLowerCase()));
      }
      // large internal lists (colours, handles, tapware) collapse to the first rows
      const cap = t === 'int' && !fs.all && opts.length > 18 ? 18 : opts.length;
      const shown = opts.slice(0, cap);
      const current = sel?.[f.key];
      const currentOpt = all.find((o) => o.id === current);
      html += `<div class="field" data-field-wrap="${f.key}">
        <div class="field-head"><h3>${esc(f.label)}</h3>${currentOpt ? `<span class="field-cur">${esc(currentOpt.name)}</span>` : f.primary ? '<span class="field-cur need">Choose one</span>' : ''}</div>
        ${filterHtml ? `<div class="filters">${filterHtml}</div>` : ''}
        ${renderOptions(f, shown, current)}
        ${cap < opts.length ? `<button class="btn btn-ghost btn-more" data-more="${f.key}">Show all ${opts.length} options</button>` : ''}
      </div>`;
    }

    const notes = t === 'int' ? [...(cat.notes || []), INTERIOR_NOTES.SCREEN] : [...(cat.notes || []), NOTES.SCREEN_NOTE];
    html += `<details class="notes"><summary>${ICON.info} Good to know</summary><ul>${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></details>`;
    if (t === 'int' && !d.done) {
      html += `<button class="btn btn-confirm" data-confirm="${cat.key}">${ICON.check} Confirm — keep these selections</button>`;
    } else if (d.done && nextCat) {
      html += `<button class="btn btn-next" data-next="${nextCat.key}">Next: <b>${nextCat.letter} · ${esc(nextCat.name)}</b> ${ICON.arrow}</button>`;
    } else if (d.done && !nextCat) {
      html += `<button class="btn btn-primary btn-next" data-act="done">All ${t === 'int' ? 'confirmed' : 'selected'} — view my home ${ICON.arrow}</button>`;
    }
    body.innerHTML = html;
  }

  // a field is shown when its `when` guard passes (guards read the category's own selection)
  function fieldApplies(f, sel) {
    if (!f.when) return true;
    try {
      return !!f.when(sel || {});
    } catch {
      return true;
    }
  }

  function renderOptions(f, list, current) {
    if (!list.length) return '<p class="empty">No options match these filters.</p>';
    if (f.kind === 'chips') {
      return `<div class="chips">${list
        .map(
          (o) => `<button class="chip${o.id === current ? ' on' : ''}" data-field="${f.key}" data-id="${o.id}" ${o.disabled ? `disabled title="${esc(o.disabled)}"` : ''}>
            ${o.hex ? `<i style="background:${o.hex}"></i>` : ''}${esc(o.name)}${o.tier ? `<span class="${tierClass(o.tier)}">${esc(o.tier)}</span>` : ''}</button>`,
        )
        .join('')}</div>`;
    }
    if (f.kind === 'cards') {
      return `<div class="cards">${list
        .map((o) => {
          const img = o.kind && o.base ? drivewayThumb(o) : o.img;
          const media = img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<i style="background:${esc(o.swatch || o.tint || o.hex || '#ddd')}"></i>`;
          return `<button class="card${o.id === current ? ' on' : ''}" data-field="${f.key}" data-id="${o.id}">
            <span class="card-media">${media}${o.id === current ? `<span class="tick">${ICON.check}</span>` : ''}</span>
            <span class="card-name">${esc(o.name)}</span>
            ${o.sub ? `<span class="card-sub">${esc(o.sub)}</span>` : ''}
            ${o.tier ? `<span class="${tierClass(o.tier)}">${esc(o.tier)}</span>` : ''}
          </button>`;
        })
        .join('')}</div>`;
    }
    // swatches, grouped
    const groups = new Map();
    for (const o of list) {
      const g = o.group || '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(o);
    }
    const many = groups.size > 1;
    let out = '';
    for (const [g, opts] of groups) {
      if (many && g) out += `<h4 class="group">${esc(g)}</h4>`;
      out += `<div class="swatches${f.large ? ' large' : ''}">${opts
        .map((o) => {
          const media = o.img ? `<img src="${esc(o.img)}" alt="" loading="lazy">` : `<i style="background:${esc(o.hex)}"></i>`;
          const tierImplied = /range|upgrade|standard|timber|price|elegance|designer/i.test(g);
          const showTier = o.tier && /upgrade/i.test(o.tier) && !tierImplied;
          const meta = [o.tone, showTier ? o.tier : null].filter(Boolean).join(' · ');
          const flags = [o.offWhite ? 'Requires off-white mortar (upgrade)' : '', o.note || '', o.qldOnly ? 'QLD colour only' : ''].filter(Boolean).join('. ');
          return `<button class="sw${o.id === current ? ' on' : ''}" data-field="${f.key}" data-id="${o.id}" title="${esc(o.name + (flags ? ` — ${flags}` : ''))}">
            <span class="sw-media">${media}${o.rec ? `<span class="rec" title="Sattva Recommended — solar absorptance 0.40 or less">${ICON.bolt}</span>` : ''}${o.offWhite ? '<span class="uflag" title="Upgrade off-white mortar required">U</span>' : ''}${o.id === current ? `<span class="tick">${ICON.check}</span>` : ''}</span>
            <span class="sw-name">${esc(o.short || o.name)}</span>
            ${meta ? `<span class="sw-meta">${esc(meta)}</span>` : ''}
          </button>`;
        })
        .join('')}</div>`;
    }
    return out;
  }

  // ---------------- open / switch
  function open(key, { fly = true } = {}) {
    const t = INTERIOR_CATEGORIES.some((c) => c.key === key) ? 'int' : 'ext';
    if (t !== tab) setTab(t, { render: false });
    const same = openKey === key;
    for (const s of listEl(t).querySelectorAll('.cat')) {
      const isOpen = s.dataset.cat === key && !same;
      s.classList.toggle('is-open', isOpen);
      s.querySelector('.cat-head').setAttribute('aria-expanded', String(isOpen));
      s.querySelector('.cat-body').hidden = !isOpen;
    }
    openKey = same ? null : key;
    if (openKey) {
      const cat = catOf(t, key);
      renderBody(t, cat);
      const sec = listEl(t).querySelector(`[data-cat="${key}"]`);
      requestAnimationFrame(() => listEl(t).scrollTo({ top: sec.offsetTop - 8, behavior: 'smooth' }));
      if (fly) onOpen?.(cat, t);
    } else {
      onOpen?.(null, t);
    }
  }

  function setTab(next, { render = true } = {}) {
    if (tab === next) return;
    tab = next;
    openKey = null;
    for (const el of root.querySelectorAll('.cats')) {
      el.hidden = el.dataset.tab !== tab;
      for (const s of el.querySelectorAll('.cat')) {
        s.classList.remove('is-open');
        s.querySelector('.cat-body').hidden = true;
        s.querySelector('.cat-head').setAttribute('aria-expanded', 'false');
      }
    }
    if (render) refresh();
    onOpen?.(null, tab);
  }

  // ---------------- events
  root.addEventListener('click', (e) => {
    const tb = e.target.closest('[data-tab-btn]');
    if (tb) return setTab(tb.dataset.tabBtn);

    const list = e.target.closest('.cats');
    if (list) {
      const t = list.dataset.tab;
      const head = e.target.closest('.cat-head');
      if (head) return open(head.closest('.cat').dataset.cat);
      const seg = e.target.closest('[data-filter]');
      if (seg && seg.tagName === 'BUTTON') {
        const key = seg.closest('.cat').dataset.cat;
        filters[key][seg.dataset.field][seg.dataset.filter] = seg.dataset.value;
        return renderBody(t, catOf(t, key));
      }
      const more = e.target.closest('[data-more]');
      if (more) {
        const key = more.closest('.cat').dataset.cat;
        filters[key][more.dataset.more].all = true;
        return renderBody(t, catOf(t, key));
      }
      const confirm = e.target.closest('[data-confirm]');
      if (confirm) return store.confirmInt(confirm.dataset.confirm);
      const next = e.target.closest('[data-next]');
      if (next) return open(next.dataset.next);
      if (e.target.closest('[data-act="done"]')) return onDone?.();
      const opt = e.target.closest('[data-id]');
      if (opt && !opt.disabled) {
        const key = opt.closest('.cat').dataset.cat;
        if (t === 'int') store.setInt(key, opt.dataset.field, opt.dataset.id);
        else store.set(key, opt.dataset.field, opt.dataset.id);
      }
      return;
    }

    if (e.target.closest('[data-act="done"]')) return onDone?.();
    if (e.target.closest('[data-act="reset"]')) {
      if (window.confirm('Clear all of your selections and start again?')) store.reset();
    }
  });

  root.addEventListener('change', (e) => {
    const el = e.target.closest('select[data-filter]');
    if (!el) return;
    const t = el.closest('.cats').dataset.tab;
    const key = el.closest('.cat').dataset.cat;
    filters[key][el.dataset.field].range = el.value;
    renderBody(t, catOf(t, key));
  });

  let searchTimer;
  root.addEventListener('input', (e) => {
    const el = e.target.closest('input[data-filter="q"]');
    if (!el) return;
    const t = el.closest('.cats').dataset.tab;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const key = el.closest('.cat').dataset.cat;
      filters[key][el.dataset.field].q = el.value;
      renderBody(t, catOf(t, key));
      const inp = listEl(t).querySelector(`#body-${key} input[data-filter="q"]`);
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    }, 180);
  });

  function refresh() {
    for (const c of CATEGORIES) renderHead('ext', c);
    for (const c of INTERIOR_CATEGORIES) renderHead('int', c);
    renderProgress();
    if (openKey) {
      const el = listEl(tab);
      const body = el.querySelector(`#body-${openKey}`);
      if (body) {
        const scroll = el.scrollTop;
        renderBody(tab, catOf(tab, openKey));
        el.scrollTop = scroll;
      }
    }
  }
  store.subscribe(refresh);
  refresh();

  return {
    open,
    refresh,
    setTab,
    get openKey() { return openKey; },
    get tab() { return tab; },
  };
}
