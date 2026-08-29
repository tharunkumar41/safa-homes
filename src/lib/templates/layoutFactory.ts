import { Cardinal, FloorTemplate, TemplateRoom, BhkLevel } from "./types";

/**
 * Reference build-up grid (ft). Templates are authored to TILE this grid
 * completely — no internal holes. Gaps only exist as named corridor rooms.
 * x = West→East, y = North→South.
 *
 * V6: essential rooms only (no dining, pooja, utility, store, or corridors).
 * Every BHK gets exactly: Living Room, N Bedroom(s), Kitchen, and Bathroom(s) —
 * matching the standard "essential rooms" list for each BHK size.
 *
 * Every template carries exactly ONE explicit bathroom placeholder
 * ("bathroom-common"). Any additional attached/ensuite bathrooms needed for
 * larger BHKs are carved automatically out of the bedroom footprints by
 * generateFromTemplate.ts — so the template itself never needs more than
 * one bathroom room to end up with the right final bathroom count.
 *
 * Room placement follows the classical Vastu direction chart:
 *   North (Kubera): Living          | avoid: Kitchen
 *   NE (Eshanya):   (open)          | avoid: Toilet, Staircase
 *   East (Indra):   Entrance/Living | avoid: heavy storage
 *   SE (Agni):      Kitchen         | avoid: Bedroom
 *   South (Yama):   Storage         | avoid: Main Entrance
 *   SW (Nairuthi):  Master Bedroom  | avoid: Kitchen
 *   West (Varuna):  Dining/Kids     | avoid: Main Entrance (not preferred)
 *   NW (Vayu):      Guest/Toilet    | avoid: Pooja
 *   Center (Brahmasthan): keep open | avoid: Toilet, Staircase, Pillars
 */
const REF_W = 28;
const REF_H = 36;

const r = (
  id: string,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  minW?: number,
  minH?: number
): TemplateRoom => ({
  id,
  label,
  x: x / REF_W,
  y: y / REF_H,
  w: w / REF_W,
  h: h / REF_H,
  minW,
  minH,
});

/**
 * 1BHK — from Plot Size.pdf (Very Small ~660 sq ft, 20×33, North road):
 *
 *   Room            Size      Zone
 *   Bathroom        4×6       North-West
 *   Living/Dining   12×14     North-East to East
 *   Bedroom         10×12     South-West
 *   Kitchen         7×8       South-East
 *   Parking         9×16      North (outdoor, placed by generator)
 *   Pooja           niche only (no separate room)
 *
 * Template tiles a 16×20 ft reference grid with PDF proportions so that
 * when scaled to build-up, rooms keep Vastu zones and relative sizes.
 * Entrance sits on the Living Room wall facing the road.
 */
/**
 * 1BHK templates — Living + Main door ALWAYS on the road-facing edge.
 * UI draws the road at the bottom of the diagram for every facing.
 * Vastu: Kitchen SE, Bath NW, Bedroom SW where possible without moving living off the road.
 */
const ONE_BHK_NORTH: TemplateRoom[] = [
  // Road North (y=0). Living on north edge.
  r("bathroom-common", "Bathroom", 0, 0, 7, 20, 4, 6),
  r("living", "Living Room", 7, 0, 21, 20, 10, 12),
  r("bedroom-master", "Bedroom", 0, 20, 16, 16, 10, 12),
  r("kitchen", "Kitchen", 16, 20, 12, 16, 7, 8),
];

const ONE_BHK_SOUTH: TemplateRoom[] = [
  // Road South (y=max). Living on south edge so main door is at bottom of diagram.
  // Kitchen SE, Bath NW, Bedroom north of living.
  r("bathroom-common", "Bathroom", 0, 0, 7, 16, 4, 6),
  r("bedroom-master", "Bedroom", 7, 0, 21, 16, 10, 12),
  r("living", "Living Room", 0, 16, 16, 20, 10, 12),
  r("kitchen", "Kitchen", 16, 16, 12, 20, 7, 8),
];

const ONE_BHK_EAST: TemplateRoom[] = [
  // Road East (x=max). Living on east edge so main door faces road (bottom after rotate).
  r("bathroom-common", "Bathroom", 0, 0, 12, 10, 4, 6),
  r("bedroom-master", "Bedroom", 0, 10, 16, 26, 10, 12),
  r("kitchen", "Kitchen", 12, 0, 16, 14, 7, 8),
  r("living", "Living Room", 16, 14, 12, 22, 10, 12),
];

const ONE_BHK_WEST: TemplateRoom[] = [
  // Road West (x=0). Living on west edge so main door faces road (bottom after rotate).
  r("living", "Living Room", 0, 0, 12, 22, 10, 12),
  r("kitchen", "Kitchen", 12, 0, 16, 14, 7, 8),
  r("bathroom-common", "Bathroom", 0, 22, 8, 14, 4, 6),
  r("bedroom-master", "Bedroom", 8, 14, 20, 22, 10, 12),
];

/*
 * Independent layouts per facing for 2–6 BHK. NOT rotations of each other.
 * Each keeps only essential rooms: Living, Kitchen, Bedrooms, and a single
 * Bathroom placeholder (extra bathrooms for bigger BHKs are auto-carved
 * from bedrooms — see generateFromTemplate.ts).
 */

const NORTH: Partial<Record<BhkLevel, TemplateRoom[]>> = {
  1: ONE_BHK_NORTH,
  2: [
    // PDF 2BHK — Small 800 (20×40) & Compact 1050 (30×35), North road:
    //   Bed2 9×10 NW | Living 12×14 NE | Common bath 4×6 NW
    //   Dining 8×10 E | Kitchen 7–8×8–10 SE | Master 10–12×12–14 SW (+attached carved)
    //   Parking outdoor north (generator). Pooja = niche only.
    r("bedroom-2", "Bedroom 2", 0, 0, 10, 14, 9, 10),
    r("living", "Living Room", 10, 0, 18, 14, 12, 12),
    r("bathroom-common", "Bathroom", 0, 14, 6, 8, 4, 6),
    r("dining", "Dining", 6, 14, 10, 8, 8, 8),
    r("kitchen", "Kitchen", 16, 14, 12, 22, 7, 8),
    r("bedroom-master", "Master Bedroom", 0, 22, 16, 14, 10, 12),
  ],
  3: [
    r("bedroom-2", "Bedroom 2", 0, 0, 9, 12, 9, 10),
    r("living", "Living Room", 9, 0, 13, 12, 12, 11),
    r("bedroom-3", "Bedroom 3", 0, 12, 9, 8, 9, 8),
    r("kitchen", "Kitchen", 19, 12, 9, 8, 7, 8),
    r("bedroom-master", "Master Bedroom", 0, 20, 12, 16, 10, 12),
    r("bathroom-common", "Bathroom", 12, 20, 6, 8, 4, 6),
  ],
  4: [
    r("bedroom-2", "Bedroom 2", 0, 0, 8, 10, 8, 9),
    r("living", "Living Room", 8, 0, 12, 10, 10, 9),
    r("bedroom-4", "Bedroom 4", 24, 0, 4, 10, 4, 9),
    r("bedroom-3", "Bedroom 3", 0, 10, 8, 10, 8, 9),
    r("kitchen", "Kitchen", 18, 10, 10, 10, 7, 8),
    r("bedroom-master", "Master Bedroom", 0, 20, 11, 16, 10, 12),
    r("bathroom-common", "Bathroom", 11, 20, 5, 8, 4, 6),
  ],
  5: [
    r("bedroom-2", "Bedroom 2", 0, 0, 7, 9, 8, 8),
    r("living", "Living Room", 7, 0, 11, 9, 10, 9),
    r("bedroom-4", "Bedroom 4", 22, 0, 6, 9, 8, 8),
    r("bedroom-3", "Bedroom 3", 0, 9, 7, 9, 8, 8),
    r("kitchen", "Kitchen", 16, 9, 6, 9, 7, 8),
    r("bedroom-5", "Bedroom 5", 22, 9, 6, 9, 8, 8),
    r("bedroom-master", "Master Bedroom", 0, 18, 10, 18, 10, 12),
    r("bathroom-common", "Bathroom", 20, 18, 8, 8, 4, 6),
  ],
  6: [
    r("bedroom-2", "Bedroom 2", 0, 0, 7, 8, 8, 8),
    r("living", "Living Room", 7, 0, 10, 8, 9, 8),
    r("bedroom-4", "Bedroom 4", 21, 0, 7, 8, 8, 8),
    r("bedroom-3", "Bedroom 3", 0, 8, 7, 8, 8, 8),
    r("kitchen", "Kitchen", 16, 8, 5, 8, 7, 8),
    r("bedroom-5", "Bedroom 5", 21, 8, 7, 8, 8, 8),
    r("bedroom-master", "Master Bedroom", 0, 16, 10, 20, 10, 12),
    r("bedroom-6", "Bedroom 6", 20, 16, 8, 10, 8, 8),
    r("bathroom-common", "Bathroom", 20, 26, 5, 10, 4, 6),
  ],
};

const SOUTH: Partial<Record<BhkLevel, TemplateRoom[]>> = {
  // Road at South (y=max). Living on south (road) edge.
  1: ONE_BHK_SOUTH,
  2: [
    // Road South (y=max). Living on south edge → main door at bottom of diagram.
    // Bed2 NW, Bath N, Dining NE, Master W, Kitchen E, Living S.
    r("bedroom-2", "Bedroom 2", 0, 0, 14, 14, 9, 10),
    r("bathroom-common", "Bathroom", 14, 0, 6, 14, 4, 6),
    r("dining", "Dining", 20, 0, 8, 14, 8, 8),
    r("bedroom-master", "Master Bedroom", 0, 14, 14, 10, 10, 12),
    r("kitchen", "Kitchen", 14, 14, 14, 10, 7, 8),
    r("living", "Living Room", 0, 24, 28, 12, 12, 10),
  ],
  3: [
    r("bedroom-2", "Bedroom 2", 0, 0, 9, 11, 9, 10),
    r("bedroom-3", "Bedroom 3", 9, 0, 9, 11, 9, 9),
    r("kitchen", "Kitchen", 18, 11, 10, 9, 7, 8),
    r("bathroom-common", "Bathroom", 0, 11, 6, 9, 4, 6),
    r("bedroom-master", "Master Bedroom", 0, 20, 12, 16, 10, 12),
    r("living", "Living Room", 12, 28, 16, 8, 12, 8),
  ],
  4: [
    r("bedroom-2", "Bedroom 2", 0, 0, 8, 10, 8, 9),
    r("bedroom-3", "Bedroom 3", 8, 0, 8, 10, 8, 9),
    r("bedroom-4", "Bedroom 4", 20, 0, 8, 10, 8, 9),
    r("bathroom-common", "Bathroom", 16, 5, 4, 5, 4, 6),
    r("kitchen", "Kitchen", 18, 10, 10, 10, 7, 8),
    r("bedroom-master", "Master Bedroom", 0, 20, 12, 16, 10, 12),
    r("living", "Living Room", 12, 20, 16, 16, 10, 10),
  ],
  5: [
    r("bedroom-2", "Bedroom 2", 0, 0, 7, 9, 8, 8),
    r("bedroom-3", "Bedroom 3", 7, 0, 7, 9, 8, 8),
    r("bedroom-4", "Bedroom 4", 18, 0, 10, 9, 8, 8),
    r("bathroom-common", "Bathroom", 14, 5, 4, 4, 4, 6),
    r("kitchen", "Kitchen", 9, 9, 9, 9, 7, 8),
    r("bedroom-5", "Bedroom 5", 18, 9, 10, 9, 8, 8),
    r("bedroom-master", "Master Bedroom", 0, 18, 11, 18, 10, 12),
    r("living", "Living Room", 21, 18, 7, 18, 7, 10),
  ],
  6: [
    r("bedroom-2", "Bedroom 2", 0, 0, 7, 8, 8, 7),
    r("bedroom-3", "Bedroom 3", 7, 0, 7, 8, 8, 7),
    r("bedroom-4", "Bedroom 4", 18, 0, 10, 8, 8, 7),
    r("bathroom-common", "Bathroom", 14, 5, 4, 3, 4, 6),
    r("kitchen", "Kitchen", 9, 8, 9, 8, 7, 8),
    r("bedroom-5", "Bedroom 5", 18, 8, 10, 8, 8, 7),
    r("bedroom-6", "Bedroom 6", 0, 16, 8, 8, 8, 7),
    r("bedroom-master", "Master Bedroom", 8, 16, 12, 12, 10, 12),
    r("living", "Living Room", 20, 22, 8, 14, 8, 10),
  ],
};

const EAST: Partial<Record<BhkLevel, TemplateRoom[]>> = {
  1: ONE_BHK_EAST,
  2: [
    // Road East (x=max). Living on east edge → main door faces road (bottom after rotate).
    // Bed2 NW, Bath/Dining mid-west, Master SW, Kitchen mid, Living E.
    r("bedroom-2", "Bedroom 2", 0, 0, 16, 14, 9, 10),
    r("dining", "Dining", 16, 0, 12, 8, 8, 8),
    r("bathroom-common", "Bathroom", 0, 14, 6, 8, 4, 6),
    r("kitchen", "Kitchen", 6, 14, 10, 8, 7, 8),
    r("bedroom-master", "Master Bedroom", 0, 22, 16, 14, 10, 12),
    r("living", "Living Room", 16, 8, 12, 28, 10, 12),
  ],
  3: [
    r("bedroom-2", "Bedroom 2", 0, 0, 9, 12, 9, 10),
    r("bedroom-3", "Bedroom 3", 9, 0, 9, 12, 9, 9),
    r("living", "Living Room", 18, 6, 10, 14, 8, 10),
    r("kitchen", "Kitchen", 10, 12, 8, 8, 7, 8),
    r("bathroom-common", "Bathroom", 0, 20, 5, 16, 4, 6),
    r("bedroom-master", "Master Bedroom", 5, 20, 13, 16, 10, 12),
  ],
  4: [
    r("bedroom-2", "Bedroom 2", 0, 0, 8, 10, 8, 9),
    r("bedroom-3", "Bedroom 3", 8, 0, 8, 10, 8, 9),
    r("bedroom-4", "Bedroom 4", 20, 0, 8, 10, 8, 9),
    r("kitchen", "Kitchen", 10, 10, 10, 10, 7, 8),
    r("living", "Living Room", 20, 10, 8, 18, 8, 10),
    r("bedroom-master", "Master Bedroom", 0, 20, 12, 16, 10, 12),
    r("bathroom-common", "Bathroom", 12, 20, 5, 8, 4, 6),
  ],
  5: [
    r("bedroom-2", "Bedroom 2", 0, 0, 7, 9, 8, 8),
    r("bedroom-3", "Bedroom 3", 7, 0, 7, 9, 8, 8),
    r("bedroom-4", "Bedroom 4", 18, 0, 10, 9, 8, 8),
    r("kitchen", "Kitchen", 9, 9, 9, 9, 7, 8),
    r("bedroom-5", "Bedroom 5", 18, 9, 10, 9, 8, 8),
    r("bedroom-master", "Master Bedroom", 0, 18, 11, 18, 10, 12),
    r("bathroom-common", "Bathroom", 16, 18, 5, 8, 4, 6),
    r("living", "Living Room", 21, 18, 7, 18, 7, 10),
  ],
  6: [
    r("bedroom-2", "Bedroom 2", 0, 0, 7, 8, 8, 7),
    r("bedroom-3", "Bedroom 3", 7, 0, 7, 8, 8, 7),
    r("bedroom-4", "Bedroom 4", 18, 0, 10, 8, 8, 7),
    r("kitchen", "Kitchen", 9, 8, 9, 8, 7, 8),
    r("bedroom-5", "Bedroom 5", 18, 8, 10, 8, 8, 7),
    r("bedroom-6", "Bedroom 6", 0, 16, 8, 8, 8, 7),
    r("bedroom-master", "Master Bedroom", 8, 16, 12, 12, 10, 12),
    r("bathroom-common", "Bathroom", 20, 16, 4, 6, 4, 6),
    r("living", "Living Room", 20, 22, 8, 14, 8, 10),
  ],
};

const WEST: Partial<Record<BhkLevel, TemplateRoom[]>> = {
  1: ONE_BHK_WEST,
  2: [
    // Road West (x=0). Living on west edge → main door faces road (bottom after rotate).
    // Living W, Bed2 NE, Bath/Dining mid-east, Master SW, Kitchen SE.
    r("living", "Living Room", 0, 0, 14, 20, 10, 12),
    r("bedroom-2", "Bedroom 2", 14, 0, 14, 12, 9, 10),
    r("bathroom-common", "Bathroom", 14, 12, 6, 8, 4, 6),
    r("dining", "Dining", 20, 12, 8, 8, 8, 8),
    r("bedroom-master", "Master Bedroom", 0, 20, 14, 16, 10, 12),
    r("kitchen", "Kitchen", 14, 20, 14, 16, 7, 8),
  ],
  3: [
    r("living", "Living Room", 0, 0, 12, 16, 10, 10),
    r("bedroom-2", "Bedroom 2", 12, 0, 10, 10, 9, 10),
    r("kitchen", "Kitchen", 20, 16, 8, 8, 7, 8),
    r("bedroom-3", "Bedroom 3", 12, 16, 8, 8, 8, 8),
    r("bedroom-master", "Master Bedroom", 0, 24, 14, 12, 10, 12),
    r("bathroom-common", "Bathroom", 14, 24, 6, 12, 4, 6),
  ],
  4: [
    r("living", "Living Room", 0, 0, 12, 16, 10, 10),
    r("bedroom-2", "Bedroom 2", 12, 0, 10, 10, 8, 9),
    r("kitchen", "Kitchen", 20, 16, 8, 8, 7, 8),
    r("bedroom-3", "Bedroom 3", 12, 16, 8, 8, 8, 8),
    r("bedroom-master", "Master Bedroom", 0, 24, 12, 12, 10, 12),
    r("bathroom-common", "Bathroom", 12, 24, 6, 12, 4, 6),
    r("bedroom-4", "Bedroom 4", 18, 24, 10, 12, 8, 9),
  ],
  5: [
    r("living", "Living Room", 0, 0, 12, 12, 10, 10),
    r("bedroom-5", "Bedroom 5", 0, 12, 12, 4, 8, 8),
    r("bedroom-2", "Bedroom 2", 12, 0, 10, 10, 8, 9),
    r("kitchen", "Kitchen", 20, 16, 8, 8, 7, 8),
    r("bedroom-3", "Bedroom 3", 12, 16, 8, 8, 8, 8),
    r("bedroom-master", "Master Bedroom", 0, 24, 12, 12, 10, 12),
    r("bathroom-common", "Bathroom", 12, 24, 6, 12, 4, 6),
    r("bedroom-4", "Bedroom 4", 18, 24, 10, 12, 8, 9),
  ],
  6: [
    r("living", "Living Room", 0, 0, 12, 10, 9, 9),
    r("bedroom-5", "Bedroom 5", 0, 10, 12, 4, 8, 7),
    r("bedroom-6", "Bedroom 6", 0, 14, 12, 4, 8, 7),
    r("bedroom-2", "Bedroom 2", 12, 0, 10, 10, 8, 8),
    r("kitchen", "Kitchen", 20, 16, 8, 8, 7, 8),
    r("bedroom-3", "Bedroom 3", 12, 16, 8, 8, 8, 7),
    r("bedroom-master", "Master Bedroom", 0, 24, 12, 12, 10, 12),
    r("bathroom-common", "Bathroom", 12, 24, 6, 12, 4, 6),
    r("bedroom-4", "Bedroom 4", 18, 24, 10, 12, 8, 8),
  ],
};

export function makeTemplate(
  bhk: BhkLevel,
  facing: Cardinal,
  wantPooja = false
): FloorTemplate {
  const groups = { North: NORTH, South: SOUTH, East: EAST, West: WEST };
  const base = groups[facing][bhk];
  if (!base) {
    throw new Error(`No ${bhk}BHK ${facing} template defined`);
  }
  const rooms = base.map((room) => ({ ...room }));
  // V6 templates never include a pooja room — only essential rooms are
  // generated (Living, Bedrooms, Kitchen, Bathroom). wantPooja is kept as a
  // parameter for API compatibility but has no effect.
  void wantPooja;
  return {
    id: `${bhk}bhk-${facing.toLowerCase()}-essential-v6`,
    name: `${bhk}BHK ${facing} Facing`,
    bhk,
    roadFacing: facing,
    aspect: "square",
    hasParking: false,
    hasPooja: false,
    hasStairs: false,
    rooms,
  };
}