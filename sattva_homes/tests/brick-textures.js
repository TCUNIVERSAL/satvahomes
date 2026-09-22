import { brickAlbedo, brickSurfaceMaps } from '../src/scene/textures.js';

const SIZE = 512;
const white = { name: 'White test brick', palette: [{ c: '#f4f2ee', w: 1 }] };
const charcoal = { name: 'Charcoal test brick', palette: [{ c: '#333638', w: 1 }] };
const results = [];
const output = document.querySelector('#results');
const pixels = (canvas) => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const meanBrightness = (data) => {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  return sum / (data.length / 4);
};
const identical = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);
const test = (name, action) => {
  try { results.push({ name, passed: true, detail: action() || '' }); }
  catch (error) { results.push({ name, passed: false, detail: error.message }); }
};

// Count complete dark horizontal bands on the periodic AO image. This reads
// the output rather than reproducing the generator's brick placement math.
function countCourses(data) {
  const rows = Array.from({ length: SIZE }, (_, y) => {
    let sum = 0;
    for (let x = 0; x < SIZE; x++) sum += data[(y * SIZE + x) * 4];
    return sum / SIZE;
  });
  const threshold = (Math.min(...rows) + Math.max(...rows)) / 2;
  return rows.filter((value, y) => value < threshold && rows[(y + SIZE - 1) % SIZE] >= threshold).length;
}

function adjacentCourseMismatch(data) {
  let different = 0;
  let samples = 0;
  for (let row = 0; row < 19; row++) {
    const y1 = Math.floor((row + 0.5) * SIZE / 20);
    const y2 = Math.floor((row + 1.5) * SIZE / 20);
    for (let x = 0; x < SIZE; x++) {
      different += (data[(y1 * SIZE + x) * 4] < 240) !== (data[(y2 * SIZE + x) * 4] < 240);
      samples++;
    }
  }
  return different / samples;
}

function lateralNormalEnergy(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum += ((data[i] / 255 * 2 - 1) ** 2 + (data[i + 1] / 255 * 2 - 1) ** 2);
  return sum / (data.length / 4);
}

// Opposite edge texels sample different positions, so they need not be equal.
// Compare each wrap gradient with the strongest interior gradient in that
// direction. This permits real mortar edges but rejects an exceptional seam.
function seamGradients(data, axis) {
  const lines = [];
  for (let line = 0; line < SIZE; line++) {
    let sum = 0;
    const previous = (line + SIZE - 1) % SIZE;
    for (let offset = 0; offset < SIZE; offset++) {
      const a = (axis === 'x' ? offset * SIZE + line : line * SIZE + offset) * 4;
      const b = (axis === 'x' ? offset * SIZE + previous : previous * SIZE + offset) * 4;
      for (let channel = 0; channel < 3; channel++) sum += Math.abs(data[a + channel] - data[b + channel]);
    }
    lines.push(sum / (SIZE * 3));
  }
  return { seam: lines[0], interior: Math.max(...lines.slice(1)) };
}

function show(canvas, label) {
  const figure = document.createElement('figure');
  const caption = document.createElement('figcaption');
  caption.textContent = label;
  figure.append(canvas, caption);
  document.querySelector('#gallery').append(figure);
}

try {
  const standard = brickSurfaceMaps(SIZE, 'stretcher', false);
  const stack = brickSurfaceMaps(SIZE, 'stack', false);
  const double = brickSurfaceMaps(SIZE, 'stretcher', true);
  const flush = brickSurfaceMaps(SIZE, 'stretcher', false, 'flush');
  const lightAlbedo = brickAlbedo(SIZE, white, '#ddd8ce', 'stretcher');
  const darkAlbedo = brickAlbedo(SIZE, charcoal, '#ddd8ce', 'stretcher');
  const lightPixels = pixels(lightAlbedo);
  const standardAO = pixels(standard.ao);

  test('Selected white and charcoal palettes remain distinct in albedo', () => {
    const light = meanBrightness(lightPixels);
    const dark = meanBrightness(pixels(darkAlbedo));
    assert(light > 210 && dark < 110 && light - dark > 110, `White ${light.toFixed(1)}, charcoal ${dark.toFixed(1)} / 255`);
    return `White ${light.toFixed(1)}, charcoal ${dark.toFixed(1)} / 255`;
  });

  test('Standard and double-height bricks produce 20 and 10 courses', () => {
    const counts = [countCourses(standardAO), countCourses(pixels(double.ao))];
    assert(counts[0] === 20 && counts[1] === 10, `Observed ${counts.join(' and ')} courses`);
    return `${counts.join(' and ')} courses`;
  });

  test('Stack joints align while stretcher joints alternate between courses', () => {
    const aligned = adjacentCourseMismatch(pixels(stack.ao));
    const staggered = adjacentCourseMismatch(standardAO);
    assert(aligned < 0.04 && staggered > aligned + 0.03, `Stack ${aligned.toFixed(3)}, stretcher ${staggered.toFixed(3)}`);
    return `Adjacent-course mismatch: stack ${aligned.toFixed(3)}, stretcher ${staggered.toFixed(3)}`;
  });

  test('Ironed joints have stronger relief and occlusion than flush joints', () => {
    const ironedEnergy = lateralNormalEnergy(pixels(standard.normal));
    const flushEnergy = lateralNormalEnergy(pixels(flush.normal));
    const aoDifference = meanBrightness(pixels(flush.ao)) - meanBrightness(standardAO);
    assert(ironedEnergy > flushEnergy * 1.2 && aoDifference > 1, `Relief ${ironedEnergy.toFixed(5)} vs ${flushEnergy.toFixed(5)}; AO difference ${aoDifference.toFixed(2)}`);
    return `Normal energy ratio ${(ironedEnergy / flushEnergy).toFixed(2)}; AO difference ${aoDifference.toFixed(2)}`;
  });

  test('All variants contain opaque, unit-length, forward-facing normals', () => {
    let worstError = 0;
    for (const maps of [standard, stack, double, flush]) {
      for (const [kind, canvas] of Object.entries(maps)) {
        assert(canvas.width === SIZE && canvas.height === SIZE, `${kind} dimensions`);
        const data = pixels(canvas);
        for (let i = 0; i < data.length; i += 4) {
          assert(data[i + 3] === 255, `${kind} has a transparent texel`);
          if (kind !== 'normal') continue;
          const x = data[i] / 255 * 2 - 1;
          const y = data[i + 1] / 255 * 2 - 1;
          const z = data[i + 2] / 255 * 2 - 1;
          worstError = Math.max(worstError, Math.abs(Math.hypot(x, y, z) - 1));
          assert(z > 0, 'A normal points behind the wall');
        }
      }
    }
    assert(worstError < 0.012, `Normal length error ${worstError}`);
    return `Maximum length error ${worstError.toFixed(5)} (8-bit encoding)`;
  });

  test('Tile seams have gradients comparable to interior mortar and grain', () => {
    const canvases = { 'white albedo': lightAlbedo, 'charcoal albedo': darkAlbedo };
    for (const [variant, maps] of Object.entries({ standard, stack, double, flush })) {
      for (const [kind, canvas] of Object.entries(maps)) canvases[`${variant} ${kind}`] = canvas;
    }
    let worstRatio = 0;
    for (const [label, canvas] of Object.entries(canvases)) {
      const data = pixels(canvas);
      for (const axis of ['x', 'y']) {
        const { seam, interior } = seamGradients(data, axis);
        assert(seam <= interior * 1.5 + 1, `${label} ${axis}: seam ${seam.toFixed(2)}, interior ${interior.toFixed(2)}`);
        worstRatio = Math.max(worstRatio, seam / Math.max(1, interior));
      }
    }
    return `Maximum seam/interior ratio ${worstRatio.toFixed(2)}`;
  });

  test('Albedo and every surface map are deterministic after cache eviction', () => {
    // More than the retained surface-cache capacity: this tests regeneration,
    // not merely retrieving the same canvas instance a second time.
    for (let seed = 101; seed < 107; seed++) brickSurfaceMaps(32, 'stack', false, 'ironed', seed);
    const regenerated = brickSurfaceMaps(SIZE, 'stretcher', false);
    assert(regenerated.normal !== standard.normal, 'Expected an independently regenerated surface');
    for (const kind of ['normal', 'ao', 'roughness']) assert(identical(pixels(standard[kind]), pixels(regenerated[kind])), `${kind} changed`);
    assert(identical(lightPixels, pixels(brickAlbedo(SIZE, white, '#ddd8ce', 'stretcher'))), 'Albedo changed');
    const otherSeed = brickAlbedo(SIZE, white, '#ddd8ce', 'stretcher', 17);
    assert(!identical(lightPixels, pixels(otherSeed)), 'Changing the seed should change fine detail');
  });

  show(lightAlbedo, 'White · stretcher albedo');
  show(darkAlbedo, 'Charcoal · stretcher albedo');
  show(standard.normal, 'Ironed joint · normal');
  show(flush.normal, 'Flush joint · normal');
  show(stack.ao, 'Stack bond · AO');
  show(double.ao, 'Double-height · AO');
} catch (error) {
  results.push({ name: 'Harness setup', passed: false, detail: error.stack || error.message });
}

const failed = results.filter((result) => !result.passed).length;
const summary = `${results.length - failed}/${results.length} checks passed`;
output.textContent = `${summary}\n\n${results.map((result) => `${result.passed ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? `\n      ${result.detail}` : ''}`).join('\n\n')}`;
output.dataset.status = failed ? 'failed' : 'passed';
document.title = `${failed ? 'FAIL' : 'PASS'} · ${summary} · Brick textures`;
window.brickTextureTestResults = { passed: failed === 0, results };
