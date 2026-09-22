import { summaryRows, interiorRows, regionName } from '../describe.js';
import { NOTES } from '../catalog.js';
import { ICON } from './panel.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const SECTION_NAMES = { general: 'Internal', kitchen: 'Kitchen', bathroom: 'Bathroom, Ensuite & Laundry' };

const DISCLAIMER =
  'Due to the continuing development of our product and subject to supplier availability, Sattva Homes reserves the right to change product specifications and suppliers at any time and without notice. The 3D visualisation is indicative only — colours and textures on screen may differ from actual products. Please confirm all selections with physical samples at your selection appointment.';

const SHOTS = [
  { view: 'home', label: 'Street view' },
  { view: 'right', label: 'Front right' },
  { view: 'left', label: 'Front left' },
  { view: 'aerial', label: 'Aerial' },
];
const INT_SHOTS = [
  { view: 'kitchen', label: 'Kitchen' },
  { view: 'living', label: 'Family room' },
  { view: 'bathroom', label: 'Main bathroom' },
  { view: 'master', label: 'Master bedroom' },
];

export function createSummary({ root, store, capture, scene }) {
  let shots = [];
  let intShots = [];
  let ref = '';

  async function show() {
    ref = `CH-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    root.hidden = false;
    document.body.classList.add('modal-open');
    root.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="sumTitle">
      <div class="capturing"><div class="spinner"></div><p>Photographing your home…</p></div></div>`;
    shots = await capture(SHOTS.map((s) => s.view));
    intShots = await capture(INT_SHOTS.map((s) => s.view), { inside: true });
    render();
  }

  function hide() {
    root.hidden = true;
    root.innerHTML = '';
    document.body.classList.remove('modal-open');
  }

  function render() {
    const rows = summaryRows(store.state);
    const irows = interiorRows(store.state);
    const upgrades = rows.filter((r) => r.upgrade).length + irows.filter((r) => r.upgrade).length;
    const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    root.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="sumTitle">
      <header class="sum-head">
        <div>
          <p class="eyebrow">Your home · ${esc(date)} · Ref ${esc(ref)}</p>
          <h2 id="sumTitle">Your Selections Summary</h2>
          <p class="lede">${esc(regionName(store.state.region))} · ${rows.length} external &amp; ${irows.length} internal items${upgrades ? ` · <b>${upgrades}</b> include upgrade options` : ' · all standard inclusions'}</p>
        </div>
        <button class="icon-btn" data-act="close" aria-label="Close summary">✕</button>
      </header>
      <div class="sum-body">
        <div class="sum-visuals">
          <div class="gallery">
            <figure class="hero"><img src="${shots[0]}" alt="Your home — street view"><figcaption>${SHOTS[0].label}</figcaption></figure>
            ${shots.slice(1).map((s, i) => `<figure><img src="${s}" alt="Your home — ${SHOTS[i + 1].label}"><figcaption>${SHOTS[i + 1].label}</figcaption></figure>`).join('')}
          </div>
          <div class="gallery gallery-int">
            ${intShots.map((s, i) => `<figure><img src="${s}" alt="Your home — ${INT_SHOTS[i].label}"><figcaption>${INT_SHOTS[i].label}</figcaption></figure>`).join('')}
          </div>
        </div>
        <div class="sum-lists">
        <h3 class="sum-sec">External</h3>
        <table class="sum-table">
          <thead><tr><th></th><th>Item</th><th>Your selection</th><th>Option</th></tr></thead>
          <tbody>
          ${rows
            .map(
              (r) => `<tr>
              <td><span class="badge">${r.cat.letter}</span></td>
              <td class="item">${esc(r.cat.name)}</td>
              <td><div class="sel">
                ${r.swatch ? (r.swatch.img ? `<img src="${esc(r.swatch.img)}" alt="">` : `<i style="background:${esc(r.swatch.hex)}"></i>`) : ''}
                <div><b>${esc(r.main)}</b>${r.detail.length ? `<small>${esc(r.detail.join(' · '))}</small>` : ''}</div>
              </div></td>
              <td>${r.upgrade ? '<span class="tier tier-up">Includes upgrade</span>' : '<span class="tier tier-std">Standard</span>'}</td>
            </tr>`,
            )
            .join('')}
          </tbody>
        </table>
        <h3 class="sum-sec">Internal</h3>
        <table class="sum-table">
          <thead><tr><th></th><th>Item</th><th>Your selection</th><th>Option</th></tr></thead>
          <tbody>
          ${irows
            .map(
              (r) => `<tr>
              <td><span class="badge">${r.cat.letter}</span></td>
              <td class="item">${esc(r.cat.name)}</td>
              <td><div class="sel">
                ${r.swatch && (r.swatch.img || r.swatch.hex) ? (r.swatch.img ? `<img src="${esc(r.swatch.img)}" alt="">` : `<i style="background:${esc(r.swatch.hex)}"></i>`) : ''}
                <div><b>${esc(r.main || '—')}</b>${r.detail.length ? `<small>${esc(r.detail.join(' · '))}</small>` : ''}</div>
              </div></td>
              <td>${r.upgrade ? '<span class="tier tier-up">Includes upgrade</span>' : '<span class="tier tier-std">Standard</span>'}</td>
            </tr>`,
            )
            .join('')}
          </tbody>
        </table>
        <p class="fine">${esc(DISCLAIMER)}</p>
        </div>
      </div>
      <footer class="sum-foot">
        <button class="btn btn-ghost" data-act="close">Keep editing</button>
        <button class="btn btn-ghost" data-act="print">Print</button>
        <button class="btn btn-ghost" data-act="stl">${ICON.download} Download 3D model (STL)</button>
        <button class="btn btn-primary" data-act="pdf">${ICON.download} Download PDF</button>
      </footer>
    </div>`;
  }

  root.addEventListener('click', async (e) => {
    if (e.target === root || e.target.closest('[data-act="close"]')) return hide();
    const pdfBtn = e.target.closest('[data-act="pdf"]');
    const printBtn = e.target.closest('[data-act="print"]');
    const stlBtn = e.target.closest('[data-act="stl"]');
    if (!pdfBtn && !printBtn && !stlBtn) return;
    const btn = pdfBtn || printBtn || stlBtn;
    // open the print window synchronously so popup blockers allow it
    const win = printBtn ? window.open('', '_blank') : null;
    btn.disabled = true;
    const label = btn.innerHTML;
    btn.textContent = 'Preparing…';
    try {
      if (stlBtn) {
        await downloadStl();
      } else {
        const doc = await buildPdf();
        if (pdfBtn) doc.save(`Sattva-Homes-Selections-${ref}.pdf`);
        else {
          doc.autoPrint();
          const url = doc.output('bloburl');
          if (win) win.location.href = url;
          else window.open(url, '_blank');
        }
      }
    } catch (err) {
      console.error(err);
      if (win) win.close();
      alert(stlBtn ? 'Sorry — the 3D model could not be exported. Please try again.'
                   : 'Sorry — the PDF could not be created. Please try again.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !root.hidden) hide();
  });

  async function buildPdf() {
    const rows = summaryRows(store.state);
    const irows = interiorRows(store.state);
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const H = 297;
    const M = 14;
    const ink = [31, 29, 26];
    const muted = [111, 106, 98];
    const accent = [194, 86, 47];
    const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

    const header = () => {
      doc.setFillColor(239, 236, 230);
      doc.rect(0, 0, W, 18, 'F');
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...ink);
      doc.text('SELECTION', M, 8.5);
      doc.text('SHOWROOM', M, 12.8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text(`Sattva Homes · Pre-Start Selection Guide · Ref ${ref}`, W - M, 11, { align: 'right' });
    };
    const footer = (n, total) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...muted);
      const lines = doc.splitTextToSize(DISCLAIMER, W - M * 2 - 14);
      doc.text(lines, M, H - 12);
      doc.text(`${n} / ${total}`, W - M, H - 12, { align: 'right' });
    };

    // ---- page 1: images
    header();
    doc.setFont('times', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(...ink);
    doc.text('Your Selections Summary', M, 34);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...muted);
    const upgrades = rows.filter((r) => r.upgrade).length;
    doc.text(`${date}   ·   Build region: ${regionName(store.state.region)}   ·   ${upgrades ? `${upgrades} item(s) include upgrade options` : 'All standard inclusions'}`, M, 41);
    const heroW = W - M * 2;
    const heroH = heroW * 0.625;
    doc.addImage(shots[0], 'JPEG', M, 47, heroW, heroH, undefined, 'MEDIUM');
    const tw = (heroW - 8) / 3;
    const th = tw * 0.625;
    const ty = 47 + heroH + 4;
    shots.slice(1).forEach((s, i) => doc.addImage(s, 'JPEG', M + i * (tw + 4), ty, tw, th, undefined, 'MEDIUM'));
    doc.setFontSize(7.5);
    SHOTS.slice(1).forEach((s, i) => doc.text(s.label, M + i * (tw + 4), ty + th + 4));
    // quick legend of the headline colours
    let ly = ty + th + 13;
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...ink);
    doc.text('Your palette', M, ly);
    ly += 4;
    const keyRows = rows.filter((r) => r.swatch);
    const cw = (heroW - 5 * 3) / 6;
    for (let i = 0; i < keyRows.length; i++) {
      const r = keyRows[i];
      const x = M + (i % 6) * (cw + 3);
      const y = ly + Math.floor(i / 6) * 25;
      await drawSwatch(doc, r.swatch, x, y, cw, 11);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...accent);
      doc.text(`${r.cat.letter}  ${r.cat.name}`, x, y + 14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...ink);
      doc.text(doc.splitTextToSize(r.main || '', cw).slice(0, 2), x, y + 17.5);
    }

    // ---- page 2: table
    doc.addPage();
    header();
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...ink);
    doc.text('Your selections', M, 32);
    let y = 40;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text('ITEM', M + 9, y);
    doc.text('SELECTION', M + 70, y);
    doc.text('OPTION', W - M, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(226, 221, 212);
    doc.line(M, y, W - M, y);
    y += 3;
    for (const r of rows) {
      const detail = doc.splitTextToSize(r.detail.join('  ·  '), 78);
      const rowH = Math.max(16, 10 + detail.length * 3.6);
      doc.setFillColor(...accent);
      doc.circle(M + 3, y + 5, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(r.cat.letter, M + 3, y + 6.1, { align: 'center' });
      doc.setTextColor(...ink);
      doc.setFontSize(10);
      doc.text(r.cat.name, M + 9, y + 6.2);
      if (r.swatch) await drawSwatch(doc, r.swatch, M + 48, y + 1, 18, 11);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(doc.splitTextToSize(r.main || '—', 80)[0], M + 70, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text(detail, M + 70, y + 9.5);
      doc.setFontSize(8);
      if (r.upgrade) doc.setTextColor(138, 90, 30);
      else doc.setTextColor(63, 122, 58);
      doc.text(r.upgrade ? 'Includes upgrade' : 'Standard', W - M, y + 5, { align: 'right' });
      y += rowH;
      doc.setDrawColor(236, 232, 225);
      doc.line(M, y - 2, W - M, y - 2);
    }
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(doc.splitTextToSize(`${NOTES.ENERGY_NOTE.replace(" (⚡)", "")} Mortar joint: Round (Ironed), standard to all face/feature brick.`, W - M * 2), M, y);
    y += 14;
    doc.setDrawColor(...ink);
    doc.text('Client signature', M, y + 10);
    doc.line(M + 24, y + 10, M + 90, y + 10);
    doc.text('Date', M + 100, y + 10);
    doc.line(M + 108, y + 10, W - M, y + 10);

    // ---- page 3+: internal selections
    doc.addPage();
    header();
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...ink);
    doc.text('Internal selections', M, 32);
    const iw = (W - M * 2 - 6) / 2;
    const ih = iw * 0.625;
    for (let i = 0; i < intShots.length; i++) {
      const x = M + (i % 2) * (iw + 6);
      const yy = 38 + Math.floor(i / 2) * (ih + 9);
      doc.addImage(intShots[i], 'JPEG', x, yy, iw, ih, undefined, 'MEDIUM');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      doc.text(INT_SHOTS[i].label, x, yy + ih + 4);
    }
    let iy = 38 + Math.ceil(intShots.length / 2) * (ih + 9) + 4;
    let section = null;
    for (const r of irows) {
      if (iy > H - 34) {
        doc.addPage();
        header();
        iy = 30;
        section = null;
      }
      if (r.cat.section !== section) {
        section = r.cat.section;
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...ink);
        doc.text(SECTION_NAMES[section] || section, M, iy + 4);
        iy += 7;
      }
      const detail = doc.splitTextToSize(r.detail.join('  ·  '), 76);
      const rowH = Math.max(14, 8 + detail.length * 3.4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...accent);
      doc.text(r.cat.letter, M, iy + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...ink);
      doc.text(r.cat.name, M + 8, iy + 5);
      if (r.swatch && (r.swatch.img || r.swatch.hex)) await drawSwatch(doc, r.swatch, M + 52, iy + 0.5, 15, 9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(doc.splitTextToSize(r.main || '—', 78)[0], M + 70, iy + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      doc.text(detail, M + 70, iy + 8.5);
      doc.setFontSize(7.5);
      doc.setTextColor(...(r.upgrade ? [138, 90, 30] : [63, 122, 58]));
      doc.text(r.upgrade ? 'Includes upgrade' : 'Standard', W - M, iy + 4.5, { align: 'right' });
      iy += rowH;
      doc.setDrawColor(236, 232, 225);
      doc.line(M, iy - 2, W - M, iy - 2);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(doc.splitTextToSize('Wall and floor tiles, tile layouts and any structural options are confirmed separately at your tile and colour appointments.', W - M * 2), M, iy + 4);

    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      footer(i, total);
    }
    return doc;
  }

  const imgCache = new Map();
  async function toDataUrl(src) {
    if (imgCache.has(src)) return imgCache.get(src);
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    const url = c.toDataURL('image/jpeg', 0.9);
    imgCache.set(src, url);
    return url;
  }
  async function drawSwatch(doc, sw, x, y, w, h) {
    if (sw.img) {
      try {
        doc.addImage(await toDataUrl(sw.img), 'JPEG', x, y, w, h);
      } catch {
        /* fall through to colour block */
      }
    } else if (sw.hex) {
      const n = parseInt(sw.hex.slice(1), 16);
      doc.setFillColor((n >> 16) & 255, (n >> 8) & 255, n & 255);
      doc.rect(x, y, w, h, 'F');
    }
    doc.setDrawColor(210, 205, 196);
    doc.rect(x, y, w, h, 'S');
  }

  // Exports a binary STL of every exterior part (metadata.part is set on the
  // house, entry door and driveway). Interior fit-out and the studio ground
  // are excluded — a 3D-printable model of what the customer picked.
  async function downloadStl() {
    if (!scene) throw new Error('scene not wired into summary');
    const meshes = scene.meshes.filter(
      (m) => m.metadata?.part && typeof m.getTotalVertices === 'function' && m.getTotalVertices() > 0,
    );
    if (!meshes.length) throw new Error('no exportable meshes found');
    const { STLExport } = await import('@babylonjs/serializers/stl/stlSerializer.js');
    // download=true triggers the save directly; binary keeps the file small.
    STLExport.CreateSTL(meshes, true, `Sattva-Homes-Model-${ref}`, true, true, false, false, false);
  }

  return { show, hide };
}
