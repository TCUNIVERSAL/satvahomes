import { Color3, Vector3, PointLight } from '../scene/babylon.js';
import { SUN_DAY, SUN_DUSK, EXTERIOR_FILL } from '../scene/setup.js';

// Day/dusk mood and the "See Inside" cutaway, which share the ambient levels:
// with the roof off the rooms need more fill than the exterior does.
export function createLighting({ scene, sun, hemi, pipeline, M, house, ground, interior, entryDoor, setSky, onInside }) {
  const duskLights = house.lightSpots.map(([x, y, z], i) => {
    const zOff = z > 0 ? 0.35 : -0.35;
    const l = new PointLight(`sconce${i}`, new Vector3(x, y - 0.1, z + zOff), scene);
    l.diffuse = new Color3(1, 0.72, 0.42);
    l.intensity = 0;
    l.range = 7;
    return l;
  });
  const interiorMats = [M.interiorWall, M.interiorCeil, M.interiorFloor, M.carpet];

  let baseEnv = 0.65;
  let baseHemi = 0.9;
  let exteriorFill = EXTERIOR_FILL.day;
  let inside = false;
  // What the sun should be outdoors for the current mood. Tracked separately so
  // going inside can dim it to 0 and coming back out can restore the right value.
  let sunIntensity = 8.5;

  // Never call sun.setEnabled() to hide the sun. Disabling a light removes it
  // from every mesh's lightSources, and re-enabling APPENDS it at the end of
  // that list. With the interior point lights and sconces present the sun lands
  // at index 11, past the materials' 8-light limit, so it gets no shader slot
  // and silently stops lighting anything while still reporting isEnabled: true.
  // Dimming keeps its original position in the list.
  const setSun = (on) => {
    sun.intensity = on ? sunIntensity : 0;
    sun.shadowEnabled = on;
  };

  async function setMood(mode) {
    const dusk = mode === 'dusk';
    await setSky(mode);
    sun.direction = (dusk ? SUN_DUSK : SUN_DAY).clone();
    sun.position = sun.direction.scale(-70);
    sun.diffuse = dusk ? new Color3(1, 0.62, 0.42) : new Color3(1, 0.96, 0.9);
    sunIntensity = dusk ? 2.2 : 8.5;
    setSun(!inside);
    baseHemi = dusk ? 0.35 : 0.9;
    exteriorFill = dusk ? EXTERIOR_FILL.dusk : EXTERIOR_FILL.day;
    hemi.intensity = inside ? baseHemi : exteriorFill;
    baseEnv = dusk ? 0.38 : 0.65;
    scene.environmentIntensity = inside ? baseEnv * 1.7 : baseEnv;
    pipeline.imageProcessing.exposure = dusk ? 1.2 : 0.95;
    for (const m of interiorMats) {
      m.emissiveColor = dusk
        ? new Color3(1.0, 0.7, 0.42).scale(m === M.interiorFloor || m === M.carpet ? 0.35 : 0.75)
        : Color3.Black();
    }
    M.glassFrosted.emissiveColor = dusk ? new Color3(0.9, 0.66, 0.4) : Color3.Black();
    M.glass.environmentIntensity = dusk ? 0.6 : 1.4;
    house.glow.setEnabled(dusk);
    ground.setMood?.(dusk);
    interior.setMood(dusk);
    for (const l of duskLights) l.intensity = dusk ? 1.6 : 0;
    document.body.dataset.mood = mode;
  }

  function setInside(on) {
    if (inside === on) return;
    inside = on;
    house.setTransparent(on);
    interior.setTransparent(on);
    entryDoor?.setTransparent(on);
    // Dimming the sun and switching its shadows off removes the harsh wall
    // shadows that rake across the fit-out, without dropping the light out of
    // the meshes' light lists (see setSun).
    setSun(!on);
    // with the roof off, lift the ambient so rooms read the way they do on site
    scene.environmentIntensity = on ? baseEnv * 1.7 : baseEnv;
    // the faded exterior walls still block the sun, so fill the rooms indoors
    hemi.intensity = on ? baseHemi : exteriorFill;
    onInside?.(on);
  }

  return { setMood, setInside, isInside: () => inside };
}
