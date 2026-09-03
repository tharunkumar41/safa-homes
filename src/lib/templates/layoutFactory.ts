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
  // Strict 1BHK tile. Road North (y=0). Living on north edge.
  r("bathroom-common", "Bathroom", 0, 0, 7, 20, 4, 6),
  r("living", "Living Room", 7, 0, 21, 20, 10, 12),
  r("bedroom-master", "Bedroom", 0, 20, 16, 16, 10, 12),
  r("kitchen", "Kitchen", 16, 20, 12, 16, 7, 8),
];

const ONE_BHK_SOUTH: TemplateRoom[] = [
  // Strict 1BHK tile. Road South (y=max). Living on south edge so main door is at bottom of diagram.
  // Kitchen SE, Bath NW, Bedroom north of living.
  r("bathroom-common", "Bathroom", 0, 0, 7, 16, 4, 6),
  r("bedroom-master", "Bedroom", 7, 0, 21, 16, 10, 12),
  r("living", "Living Room", 0, 16, 16, 20, 10, 12),
  r("kitchen", "Kitchen", 16, 16, 12, 20, 7, 8),
];

const ONE_BHK_EAST: TemplateRoom[] = [
  // Strict 1BHK tile: every shared edge lands on the same grid line.
  // Road East (x=max). Living owns the north/east frontage; Kitchen stays SE.
  // Row 1: Bathroom | Living
  // Row 2: Bedroom  | Living
  // Row 3: Bedroom  | Kitchen
  r("bathroom-common", "Bathroom", 0, 0, 16, 10, 4, 6),
  r("living", "Living Room", 16, 0, 12, 20, 10, 12),
  r("bedroom-master", "Bedroom", 0, 10, 16, 26, 10, 12),
  r("kitchen", "Kitchen", 16, 20, 12, 16, 7, 8),
];

const ONE_BHK_WEST: TemplateRoom[] = [
  // Strict 1BHK tile: no overlap and no unnamed internal gap.
  // Road West (x=0). Living stays on the west frontage; Kitchen stays SE.
  // The horizontal and vertical room boundaries are shared exactly.
  r("living", "Living Room", 0, 0, 12, 14, 10, 12),
  r("bathroom-common", "Bathroom", 12, 0, 16, 14, 4, 6),
  r("bedroom-master", "Bedroom", 0, 14, 16, 22, 10, 12),
  r("kitchen", "Kitchen", 16, 14, 12, 22, 7, 8),
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
    // Strict 2BHK tile: full 28×36 coverage, shared boundaries only.
    r("bedroom-2", "Bedroom 2", 0, 0, 10, 14, 9, 10),
    r("living", "Living Room", 10, 0, 18, 14, 12, 12),
    r("bathroom-common", "Bathroom", 0, 14, 6, 8, 4, 6),
    r("dining", "Dining", 6, 14, 10, 8, 8, 8),
    r("kitchen", "Kitchen", 16, 14, 12, 22, 7, 8),
    r("bedroom-master", "Master Bedroom", 0, 22, 16, 14, 10, 12),
  ],
  3: [
    // Kitchen is kept in the south-east corner; attached bath is still carved
    // from the master bedroom by generateFromTemplate.ts.
    r("bedroom-2", "Bedroom 2", 0, 0, 9, 12, 9, 10),
    r("living", "Living Room", 9, 0, 19, 12, 12, 11),
    r("bedroom-3", "Bedroom 3", 0, 12, 10, 10, 9, 9),
    r("bathroom-common", "Bathroom", 19, 12, 9, 10, 4, 6),
    r("dining", "Dining", 10, 12, 10, 10, 6, 8),
    r("bedroom-master", "Master Bedroom", 0, 22, 20, 14, 10, 12),
    r("kitchen", "Kitchen", 20, 22, 8, 14, 7, 8),
  ],
  4: [
    // 4BHK based on the PDF room schedule: practical bedrooms, 8x10 kitchen,
    // 10x12 dining, 14x14 master, and a modest fourth bedroom.
    r("living", "Living Room", 0, 0, 14, 12, 14, 16),
    r("bedroom-2", "Bedroom 2", 14, 0, 14, 12, 12, 12),
    r("bedroom-3", "Bedroom 3", 0, 12, 14, 12, 12, 12),
    r("bedroom-4", "Bedroom 4", 14, 12, 10, 12, 10, 10),
    r("bathroom-common", "Bathroom", 24, 12, 4, 12, 5, 7),
    r("bedroom-master", "Master Bedroom", 0, 24, 14, 12, 14, 14),
    r("kitchen", "Kitchen", 14, 24, 8, 12, 8, 10),
    r("dining", "Dining", 22, 24, 6, 12, 10, 12),
  ],
  5: [
    // 5BHK: balanced rooms based on the PDF; no narrow vertical strips.
    r("bedroom-2", "Bedroom 2", 0, 0, 9, 12, 12, 12),
    r("living", "Living Room", 9, 0, 10, 12, 16, 18),
    r("bedroom-4", "Bedroom 4", 19, 0, 9, 12, 10, 10),
    r("bedroom-3", "Bedroom 3", 0, 12, 9, 12, 12, 14),
    r("kitchen", "Kitchen", 9, 12, 10, 12, 10, 12),
    r("bedroom-5", "Bedroom 5", 19, 12, 9, 12, 12, 14),
    r("bedroom-master", "Master Bedroom", 0, 24, 14, 12, 14, 16),
    r("dining", "Dining", 14, 24, 8, 12, 12, 14),
    r("bathroom-common", "Bathroom", 22, 24, 6, 12, 5, 7),
  ],
  6: [
    // 6BHK: balanced three-row grid; living is compact and does not have rooms beneath it.
    r("bedroom-2", "Bedroom 2", 0, 0, 9, 12, 12, 12),
    r("living", "Living Room", 9, 0, 10, 12, 14, 16),
    r("bedroom-3", "Bedroom 3", 19, 0, 9, 12, 12, 12),
    r("bedroom-4", "Bedroom 4", 0, 12, 9, 12, 10, 10),
    r("kitchen", "Kitchen", 9, 12, 10, 12, 8, 10),
    r("bedroom-5", "Bedroom 5", 19, 12, 9, 12, 10, 10),
    r("bedroom-master", "Master Bedroom", 0, 24, 12, 12, 14, 16),
    r("bathroom-common", "Bathroom", 12, 24, 4, 12, 5, 7),
    r("bedroom-6", "Bedroom 6", 16, 24, 12, 12, 12, 12),
  ]
};

const SOUTH: Partial<Record<BhkLevel, TemplateRoom[]>> = {
  // Road at South (y=max). Living on south (road) edge.
  1: ONE_BHK_SOUTH,
  2: [
    // Strict 2BHK tile: full 28×36 coverage, living on the south road edge.
    r("bedroom-2", "Bedroom 2", 0, 0, 14, 14, 9, 10),
    r("bathroom-common", "Bathroom", 14, 0, 6, 14, 4, 6),
    r("dining", "Dining", 20, 0, 8, 14, 8, 8),
    r("bedroom-master", "Master Bedroom", 0, 14, 14, 10, 10, 12),
    r("kitchen", "Kitchen", 14, 14, 14, 10, 7, 8),
    r("living", "Living Room", 0, 24, 28, 12, 12, 10),
  ],
  3: [
    // Kitchen stays in the south-east zone; attached bath remains carved from master.
    r("bedroom-2", "Bedroom 2", 0, 0, 14, 12, 9, 10),
    r("bedroom-3", "Bedroom 3", 14, 0, 14, 12, 9, 9),
    r("bathroom-common", "Bathroom", 0, 12, 6, 10, 4, 6),
    r("bedroom-master", "Master Bedroom", 6, 12, 14, 10, 10, 9),
    r("kitchen", "Kitchen", 20, 12, 8, 10, 7, 8),
    r("living", "Living Room", 0, 22, 28, 14, 12, 10),
  ],
  4: [
    // South-facing 4BHK based on the PDF room schedule; living stays on south.
    r("bedroom-2", "Bedroom 2", 0, 0, 10, 12, 12, 12),
    r("bedroom-3", "Bedroom 3", 10, 0, 10, 12, 12, 12),
    r("bedroom-4", "Bedroom 4", 20, 0, 8, 12, 10, 10),
    r("bathroom-common", "Bathroom", 0, 12, 6, 12, 5, 7),
    r("kitchen", "Kitchen", 6, 12, 8, 12, 8, 10),
    r("dining", "Dining", 14, 12, 14, 12, 10, 12),
    r("bedroom-master", "Master Bedroom", 0, 24, 14, 12, 14, 14),
    r("living", "Living Room", 14, 24, 14, 12, 14, 16),
  ],
  5: [
    // 5BHK: living remains on the south frontage; rooms use balanced widths.
    r("bedroom-2", "Bedroom 2", 0, 0, 9, 12, 12, 12),
    r("bedroom-3", "Bedroom 3", 9, 0, 10, 12, 12, 14),
    r("bedroom-4", "Bedroom 4", 19, 0, 9, 12, 10, 10),
    r("bedroom-5", "Bedroom 5", 0, 12, 9, 12, 12, 14),
    r("kitchen", "Kitchen", 9, 12, 10, 12, 10, 12),
    r("bathroom-common", "Bathroom", 19, 12, 9, 12, 5, 7),
    r("bedroom-master", "Master Bedroom", 0, 24, 9, 12, 14, 16),
    r("dining", "Dining", 9, 24, 9, 12, 12, 14),
    r("living", "Living Room", 18, 24, 10, 12, 16, 18),
  ],
  6: [
    // 6BHK: living is compact on the south/road edge; bathroom is not oversized.
    r("bedroom-2", "Bedroom 2", 0, 0, 9, 12, 12, 12),
    r("bedroom-3", "Bedroom 3", 9, 0, 10, 12, 12, 12),
    r("bedroom-4", "Bedroom 4", 19, 0, 9, 12, 10, 10),
    r("bedroom-5", "Bedroom 5", 0, 12, 9, 12, 10, 10),
    r("kitchen", "Kitchen", 9, 12, 10, 12, 8, 10),
    r("bathroom-common", "Bathroom", 19, 12, 4, 12, 5, 7),
    r("bedroom-6", "Bedroom 6", 23, 12, 5, 12, 10, 10),
    r("bedroom-master", "Master Bedroom", 0, 24, 12, 12, 14, 16),
    r("living", "Living Room", 12, 24, 16, 12, 14, 16),
  ]
};

const EAST: Partial<Record<BhkLevel, TemplateRoom[]>> = {
  1: ONE_BHK_EAST,
  2: [
    // Strict 2BHK tile: full 28×36 coverage, living on the east road edge.
    r("bedroom-2", "Bedroom 2", 0, 0, 16, 14, 9, 10),
    r("dining", "Dining", 16, 0, 12, 8, 8, 8),
    r("bathroom-common", "Bathroom", 0, 14, 6, 8, 4, 6),
    r("kitchen", "Kitchen", 6, 14, 10, 8, 7, 8),
    r("bedroom-master", "Master Bedroom", 0, 22, 16, 14, 10, 12),
    r("living", "Living Room", 16, 8, 12, 28, 10, 12),
  ],
  3: [
    // Kitchen is moved to the south-east corner; attached bath is still carved from master.
    r("bedroom-2", "Bedroom 2", 0, 0, 10, 12, 9, 10),
    r("bedroom-3", "Bedroom 3", 10, 0, 10, 12, 9, 9),
    r("living", "Living Room", 20, 0, 8, 22, 8, 10),
    r("bathroom-common", "Bathroom", 0, 12, 6, 10, 4, 6),
    r("dining", "Dining", 6, 12, 14, 10, 6, 8),
    r("bedroom-master", "Master Bedroom", 0, 22, 20, 14, 10, 12),
    r("kitchen", "Kitchen", 20, 22, 8, 14, 7, 8),
  ],
  4: [
    // East-facing 4BHK: living is a compact east-side room, not a full-height strip.
    // East-facing 4BHK: swap Bedroom 2 and Kitchen footprints only.
    r("bedroom-2", "Bedroom 2", 0, 0, 10, 12, 12, 12),
    r("bathroom-common", "Bathroom", 10, 0, 10, 8, 5, 7),
    r("living", "Living Room", 20, 0, 8, 18, 14, 16),
    r("bedroom-3", "Bedroom 3", 0, 12, 10, 12, 12, 12),
    r("kitchen", "Kitchen", 10, 8, 10, 10, 8, 10),
    r("bedroom-4", "Bedroom 4", 20, 18, 8, 18, 10, 10),
    r("bedroom-master", "Master Bedroom", 0, 24, 14, 12, 14, 14),
    r("dining", "Dining", 14, 24, 6, 12, 10, 12),
  ],
  5: [
    // 5BHK: compact east-side living frontage, with balanced room blocks.
    r("bedroom-2", "Bedroom 2", 0, 0, 9, 12, 12, 12),
    r("bedroom-3", "Bedroom 3", 9, 0, 10, 12, 12, 14),
    r("living", "Living Room", 19, 0, 9, 12, 16, 18),
    r("bedroom-4", "Bedroom 4", 0, 12, 9, 12, 10, 10),
    r("kitchen", "Kitchen", 9, 12, 10, 12, 10, 12),
    r("bedroom-5", "Bedroom 5", 19, 12, 9, 12, 12, 14),
    r("bedroom-master", "Master Bedroom", 0, 24, 14, 12, 14, 16),
    r("dining", "Dining", 14, 24, 8, 12, 12, 14),
    r("bathroom-common", "Bathroom", 22, 24, 6, 12, 5, 7),
  ],
  6: [
    // 6BHK East-facing: living room is on the bottom/front side.
    // Upper rows remain available for bedrooms, kitchen, Pooja and Store.
    r("bedroom-2", "Bedroom 2", 0, 0, 8, 12, 12, 12),
    r("bedroom-3", "Bedroom 3", 8, 0, 8, 12, 12, 12),
    r("bedroom-4", "Bedroom 4", 16, 0, 8, 12, 10, 10),
    r("bathroom-common", "Bathroom", 24, 0, 4, 12, 4, 6),
    r("bedroom-5", "Bedroom 5", 0, 12, 8, 12, 10, 10),
    r("kitchen", "Kitchen", 8, 12, 8, 12, 8, 10),
    r("bedroom-6", "Bedroom 6", 16, 12, 12, 12, 10, 10),
    r("bedroom-master", "Master Bedroom", 0, 24, 12, 12, 12, 14),
    r("living", "Living Room", 12, 24, 16, 12, 14, 16),
  ]};

const WEST: Partial<Record<BhkLevel, TemplateRoom[]>> = {
  1: ONE_BHK_WEST,
  2: [
    // Strict 2BHK tile: full 28×36 coverage, living on the west road edge.
    r("living", "Living Room", 0, 0, 14, 20, 10, 12),
    r("bedroom-2", "Bedroom 2", 14, 0, 14, 12, 9, 10),
    r("bathroom-common", "Bathroom", 14, 12, 6, 8, 4, 6),
    r("dining", "Dining", 20, 12, 8, 8, 8, 8),
    r("bedroom-master", "Master Bedroom", 0, 20, 14, 16, 10, 12),
    r("kitchen", "Kitchen", 14, 20, 14, 16, 7, 8),
  ],
  3: [
    // Kitchen is moved to the south-east corner; attached bath is still carved from master.
    r("living", "Living Room", 0, 0, 10, 22, 10, 10),
    r("bedroom-2", "Bedroom 2", 10, 0, 9, 12, 9, 10),
    r("bedroom-3", "Bedroom 3", 19, 0, 9, 12, 9, 9),
    r("bathroom-common", "Bathroom", 10, 12, 6, 10, 4, 6),
    r("dining", "Dining", 16, 12, 12, 10, 6, 8),
    r("bedroom-master", "Master Bedroom", 0, 22, 20, 14, 10, 12),
    r("kitchen", "Kitchen", 20, 22, 8, 14, 7, 8),
  ],
  4: [
    // West-facing 4BHK: living is a compact west-side room, not a full-height strip.
    r("living", "Living Room", 0, 0, 8, 18, 14, 16),
    r("bedroom-2", "Bedroom 2", 8, 0, 10, 12, 12, 12),
    r("bathroom-common", "Bathroom", 18, 0, 10, 8, 5, 7),
    r("bedroom-3", "Bedroom 3", 8, 12, 10, 12, 12, 12),
    r("kitchen", "Kitchen", 18, 8, 10, 10, 8, 10),
    r("bedroom-4", "Bedroom 4", 0, 18, 8, 18, 10, 10),
    r("bedroom-master", "Master Bedroom", 8, 24, 14, 12, 14, 14),
    r("dining", "Dining", 22, 24, 6, 12, 10, 12),
  ],
  5: [
    // 5BHK: compact west-side living frontage, with balanced room blocks.
    r("living", "Living Room", 0, 0, 9, 12, 16, 18),
    r("bedroom-2", "Bedroom 2", 9, 0, 10, 12, 12, 12),
    r("bedroom-3", "Bedroom 3", 19, 0, 9, 12, 12, 14),
    r("bedroom-4", "Bedroom 4", 0, 12, 9, 12, 10, 10),
    r("kitchen", "Kitchen", 9, 12, 10, 12, 10, 12),
    r("bedroom-5", "Bedroom 5", 19, 12, 9, 12, 12, 14),
    r("dining", "Dining", 0, 24, 8, 12, 12, 14),
    r("bedroom-master", "Master Bedroom", 8, 24, 14, 12, 14, 16),
    r("bathroom-common", "Bathroom", 22, 24, 6, 12, 5, 7),
  ],
  6: [
    // 6BHK: compact west-side living room; no bedrooms are placed below it.
    r("bedroom-2", "Bedroom 2", 0, 0, 9, 12, 12, 12),
    r("bedroom-3", "Bedroom 3", 9, 0, 10, 12, 12, 12),
    r("bedroom-4", "Bedroom 4", 19, 0, 9, 12, 10, 10),
    r("living", "Living Room", 0, 12, 9, 12, 14, 16),
    r("kitchen", "Kitchen", 9, 12, 10, 12, 8, 10),
    r("bedroom-5", "Bedroom 5", 19, 12, 9, 12, 10, 10),
    r("bedroom-master", "Master Bedroom", 0, 24, 12, 12, 14, 16),
    r("bathroom-common", "Bathroom", 12, 24, 4, 12, 5, 7),
    r("bedroom-6", "Bedroom 6", 16, 24, 12, 12, 12, 12),
  ]
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