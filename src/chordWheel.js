const TWO_PI = Math.PI * 2;

// Raw canvas space gets mirrored for display (see style.css), which reverses
// apparent rotation direction, so wedge index increases counter-clockwise in
// raw angle terms to read clockwise (C, D, E, ...) on screen. Wedge 0 is "up".
export function wedgeCenterAngle(index, wedgeCount) {
  return -Math.PI / 2 - index * (TWO_PI / wedgeCount);
}

function angleDelta(a, b) {
  let delta = (a - b) % TWO_PI;
  if (delta > Math.PI) delta -= TWO_PI;
  if (delta < -Math.PI) delta += TWO_PI;
  return delta;
}

// point/wheel.center must be in the same space as landmarks and the skeleton overlay: raw, un-mirrored canvas pixels.
export function pickWedge(point, wheel) {
  const dx = point.x - wheel.center.x;
  const dy = point.y - wheel.center.y;
  const dist = Math.hypot(dx, dy);
  if (dist < wheel.innerRadius || dist > wheel.outerRadius) return null;

  const angle = Math.atan2(dy, dx);
  let closest = 0;
  let closestDiff = Infinity;
  for (let i = 0; i < wheel.wedgeCount; i += 1) {
    const diff = Math.abs(angleDelta(angle, wedgeCenterAngle(i, wheel.wedgeCount)));
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = i;
    }
  }
  return closest;
}
