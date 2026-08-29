/**
 * Standalone pure-JS smoke test for template generation (no TS compile needed).
 * Mirrors the core pipeline: setbacks → template → scale → validate bedrooms.
 */

const REF_W = 28;
const REF_H = 36;
const r = (id, label, x, y, w, h) => ({
  id,
  label,
  x: x / REF_W,
  y: y / REF_H,
  w: w / REF_W,
  h: h / REF_H,
});

// Minimal North 1–3 from layoutFactory
const NORTH = {
  1: [
    r("living", "Living Room", 1, 1, 14, 11),
    r("kitchen", "Kitchen", 15, 1, 12, 9),
    r("dining", "Dining", 1, 12, 10, 7),
    r("corridor", "Passage", 11, 12, 4, 7),
    r("bedroom-master", "Master Bedroom", 1, 19, 16, 15),
    r("bathroom-common", "Bathroom", 17, 19, 5, 7),
    r("utility", "Utility", 22, 19, 5, 7),
  ],
  2: [
    r("bedroom-2", "Bedroom", 1, 1, 10, 11),
    r("living", "Living Room", 11, 1, 12, 11),
    r("pooja", "Pooja Room", 23, 1, 4, 6),
    r("bathroom-common", "Common Bathroom", 1, 12, 5, 7),
    r("dining", "Dining", 6, 12, 10, 8),
    r("kitchen", "Kitchen", 16, 12, 11, 8),
    r("bedroom-master", "Master Bedroom", 1, 20, 18, 13),
    r("bathroom-master", "Master Bath", 19, 20, 5, 7),
    r("corridor", "Passage", 19, 27, 8, 6),
  ],
  3: [
    r("bedroom-2", "Bedroom 2", 1, 1, 9, 10),
    r("living", "Living Room", 10, 1, 12, 10),
    r("pooja", "Pooja Room", 22, 1, 5, 6),
    r("bedroom-3", "Bedroom 3", 1, 11, 9, 9),
    r("dining", "Dining", 10, 11, 10, 9),
    r("kitchen", "Kitchen", 20, 11, 7, 9),
    r("bedroom-master", "Master Bedroom", 1, 20, 12, 14),
    r("bathroom-master", "Master Bath", 13, 20, 5, 7),
    r("bathroom-common", "Common Bathroom", 18, 20, 5, 7),
    r("corridor", "Passage", 23, 20, 4, 14),
  ],
};

function scale(rooms, bx, by, bw, bh) {
  const snap = (v) => Math.round(v / 0.5) * 0.5;
  return rooms.map((rm) => ({
    id: rm.id,
    label: rm.label,
    x: snap(bx + rm.x * bw),
    y: snap(by + rm.y * bh),
    width: Math.max(0.5, snap(rm.w * bw)),
    height: Math.max(0.5, snap(rm.h * bh)),
  }));
}

function overlaps(a, b, eps = 0.05) {
  return (
    a.x < b.x + b.width - eps &&
    a.x + a.width > b.x + eps &&
    a.y < b.y + b.height - eps &&
    a.y + a.height > b.y + eps
  );
}

function findOverlaps(rooms) {
  const out = [];
  for (let i = 0; i < rooms.length; i++)
    for (let j = i + 1; j < rooms.length; j++)
      if (overlaps(rooms[i], rooms[j])) out.push([rooms[i].id, rooms[j].id]);
  return out;
}

function test(bhk, L, B, facing = "North") {
  const sb = { west: 1, east: 1, north: 3, south: 1 }; // North road default
  const buildUp = {
    x: sb.west,
    y: sb.north,
    width: L - sb.west - sb.east,
    height: B - sb.north - sb.south,
  };
  const template = NORTH[bhk];
  if (!template) return { ok: false, error: "no template" };
  const rooms = scale(template, buildUp.x, buildUp.y, buildUp.width, buildUp.height);
  const beds = rooms.filter((r) => r.id === "bedroom-master" || /^bedroom-\d+$/.test(r.id));
  const ov = findOverlaps(rooms);
  const outside = rooms.filter(
    (r) =>
      r.x < buildUp.x - 0.1 ||
      r.y < buildUp.y - 0.1 ||
      r.x + r.width > buildUp.x + buildUp.width + 0.1 ||
      r.y + r.height > buildUp.y + buildUp.height + 0.1
  );
  const ok = beds.length === bhk && ov.length === 0 && outside.length === 0;
  return {
    ok,
    bhk,
    beds: beds.map((b) => b.id),
    bedCount: beds.length,
    overlaps: ov,
    outside: outside.map((r) => r.id),
    buildUp: `${buildUp.width.toFixed(1)}x${buildUp.height.toFixed(1)}`,
    roomCount: rooms.length,
  };
}

const cases = [
  [1, 30, 40],
  [2, 30, 40],
  [3, 30, 40],
  [2, 20, 30],
  [1, 20, 30],
  [3, 40, 50],
];

let pass = 0;
for (const [bhk, L, B] of cases) {
  const res = test(bhk, L, B);
  console.log(
    `${res.ok ? "PASS" : "FAIL"} ${bhk}BHK ${L}x${B} beds=${res.bedCount} ov=${res.overlaps.length} out=${res.outside.length} build=${res.buildUp}`
  );
  if (res.ok) pass++;
  else console.log("  detail", res);
}
console.log(`\n${pass}/${cases.length} passed`);
