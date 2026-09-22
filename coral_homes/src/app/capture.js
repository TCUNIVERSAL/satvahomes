import { setView } from '../scene/setup.js';

// Snapshots for the summary and the PDF: render at a fixed landscape size so the
// images match on phones and desktops, then put the camera back where it was.
export function createCapture({ engine, canvas, camera, lighting, rotate }) {
  // crop the canvas to 16:10 and export as JPEG
  function grab() {
    const W = canvas.width;
    const H = canvas.height;
    const ratio = 1.6;
    let cw = W;
    let ch = W / ratio;
    if (ch > H) {
      ch = H;
      cw = H * ratio;
    }
    const out = document.createElement('canvas');
    out.width = 1600;
    out.height = 1000;
    out.getContext('2d').drawImage(canvas, (W - cw) / 2, (H - ch) / 2, cw, ch, 0, 0, 1600, 1000);
    return out.toDataURL('image/jpeg', 0.9);
  }

  return async function capture(views, { inside = false } = {}) {
    const saved = { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, target: camera.target.clone() };
    const wasRotating = rotate.isOn();
    const wasInside = lighting.isInside();
    rotate.stop();
    if (inside !== wasInside) lighting.setInside(inside);
    const shots = [];
    engine.setSize(1600, 1000, true);
    for (const v of views) {
      setView(camera, v);
      for (let i = 0; i < 4; i++) await new Promise((r) => engine.onEndFrameObservable.addOnce(r));
      shots.push(grab());
    }
    engine.resize(true);
    if (inside !== wasInside) lighting.setInside(wasInside);
    camera.alpha = saved.alpha;
    camera.beta = saved.beta;
    camera.radius = saved.radius;
    camera.target.copyFrom(saved.target);
    if (wasRotating) rotate.toggle();
    return shots;
  };
}
