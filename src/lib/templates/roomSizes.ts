/**
 * Room sizes from Indian Residential Floor Plan Reference Set (Plot Size.pdf).
 *
 * Targets by BHK tier (absolute ft). Generator aims for these; extra build-up
 * goes to Living → Master → Dining → Kitchen → Other beds → Family/Study →
 * Baths → Utility → Pooja/Store → Balcony → Passage.
 *
 * PDF reference examples:
 *  1BHK ~660:  Living 12×14, Bed 10×12, Kit 7×8, Bath 4×6, Park 9×16
 *  2BHK ~800:  Living 12×14, Master 10×12, Bed2 9×10, Kit 7×8, Dining 8×10, Bath 4×6
 *  2BHK ~1050: Living 12×14, Master 12×14, Bed2 10×10, Kit 8×10, Dining 8×10
 *  3BHK ~1350: Living 14×16, Master 12×14, Bed 10×12/10×10, Kit 8×10, Dining 10×12, Pooja 4×5
 *  3BHK ~2000: Living 16×18, Master 14×14, Bed 12×12/10×12, Kit 8×10, Dining 10×12
 *  4BHK ~2350: Living 16×18, Master 14×14, Beds 12×12/10×12/10×10
 *  4BHK ~2750: Living 16×18, Master 14×16, Beds 12×14/12×12/10×12, Kit 10×12
 *  5–6BHK:     Living 16×18, Master 14×16, Family 12–14×14–16, Kit 10×12, Dining 10–12×12–14
 */

export type SizeSpec = { w: number; h: number; area: number; minW: number; minH: number };

/** Standard / comfortable defaults (mid-tier ~3BHK). */
export const STANDARD_SIZES: Record<string, SizeSpec> = {
  living:              { w: 14, h: 16, area: 224, minW: 12, minH: 14 },
  "bedroom-master":    { w: 12, h: 14, area: 168, minW: 10, minH: 12 },
  "bedroom-2":         { w: 10, h: 12, area: 120, minW: 9,  minH: 10 },
  "bedroom-3":         { w: 10, h: 10, area: 100, minW: 9,  minH: 10 },
  "bedroom-4":         { w: 10, h: 10, area: 100, minW: 9,  minH: 10 },
  "bedroom-5":         { w: 10, h: 12, area: 120, minW: 9,  minH: 10 },
  "bedroom-6":         { w: 10, h: 12, area: 120, minW: 9,  minH: 10 },
  kitchen:             { w: 8,  h: 10, area: 80,  minW: 7,  minH: 8 },
  dining:              { w: 10, h: 12, area: 120, minW: 8,  minH: 10 },
  family:              { w: 12, h: 14, area: 168, minW: 10, minH: 12 },
  study:               { w: 10, h: 12, area: 120, minW: 9,  minH: 10 },
  "bathroom-common":   { w: 5,  h: 7,  area: 35,  minW: 4,  minH: 6 },
  "bathroom-master":   { w: 5,  h: 8,  area: 40,  minW: 4,  minH: 6 },
  "bathroom-attached": { w: 5,  h: 8,  area: 40,  minW: 4,  minH: 6 },
  pooja:               { w: 4,  h: 5,  area: 20,  minW: 4,  minH: 4 },
  utility:             { w: 6,  h: 8,  area: 48,  minW: 5,  minH: 6 },
  store:               { w: 6,  h: 8,  area: 48,  minW: 5,  minH: 6 },
  parking:             { w: 10, h: 18, area: 180, minW: 9,  minH: 15 },
  staircase:           { w: 7,  h: 14, area: 98,  minW: 6,  minH: 10 },
  servant:             { w: 8,  h: 10, area: 80,  minW: 7,  minH: 8 },
};

/**
 * BHK-tier overrides from the PDF reference set.
 * Used as preferred targets when generating for that BHK.
 */
export const BHK_SIZE_TARGETS: Record<
  number,
  Partial<Record<string, SizeSpec>>
> = {
  1: {
    living:            { w: 12, h: 14, area: 168, minW: 10, minH: 12 },
    "bedroom-master":  { w: 10, h: 12, area: 120, minW: 10, minH: 12 },
    kitchen:           { w: 7,  h: 8,  area: 56,  minW: 7,  minH: 8 },
    "bathroom-common": { w: 4,  h: 6,  area: 24,  minW: 4,  minH: 6 },
    parking:           { w: 9,  h: 16, area: 144, minW: 9,  minH: 14 },
  },
  2: {
    // PDF Small 800 + Compact 1050
    living:            { w: 12, h: 14, area: 168, minW: 12, minH: 12 },
    "bedroom-master":  { w: 12, h: 14, area: 168, minW: 10, minH: 12 },
    "bedroom-2":       { w: 10, h: 10, area: 100, minW: 9,  minH: 10 },
    kitchen:           { w: 8,  h: 10, area: 80,  minW: 7,  minH: 8 },
    dining:            { w: 8,  h: 10, area: 80,  minW: 8,  minH: 8 },
    "bathroom-common": { w: 4,  h: 6,  area: 24,  minW: 4,  minH: 6 },
    "bathroom-master": { w: 4,  h: 6,  area: 24,  minW: 4,  minH: 6 },
    parking:           { w: 10, h: 16, area: 160, minW: 9,  minH: 14 },
  },
  3: {
    living:            { w: 14, h: 16, area: 224, minW: 12, minH: 14 },
    "bedroom-master":  { w: 12, h: 14, area: 168, minW: 12, minH: 14 },
    "bedroom-2":       { w: 10, h: 12, area: 120, minW: 10, minH: 12 },
    "bedroom-3":       { w: 10, h: 10, area: 100, minW: 9,  minH: 10 },
    kitchen:           { w: 8,  h: 10, area: 80,  minW: 8,  minH: 10 },
    dining:            { w: 10, h: 12, area: 120, minW: 8,  minH: 10 },
    "bathroom-common": { w: 5,  h: 7,  area: 35,  minW: 4,  minH: 6 },
    "bathroom-master": { w: 5,  h: 8,  area: 40,  minW: 4,  minH: 6 },
    pooja:             { w: 4,  h: 5,  area: 20,  minW: 4,  minH: 4 },
    utility:           { w: 6,  h: 8,  area: 48,  minW: 5,  minH: 6 },
    parking:           { w: 10, h: 18, area: 180, minW: 9,  minH: 15 },
  },
  4: {
    living:            { w: 16, h: 18, area: 288, minW: 14, minH: 16 },
    "bedroom-master":  { w: 14, h: 16, area: 224, minW: 12, minH: 14 },
    "bedroom-2":       { w: 12, h: 14, area: 168, minW: 10, minH: 12 },
    "bedroom-3":       { w: 12, h: 12, area: 144, minW: 10, minH: 12 },
    "bedroom-4":       { w: 10, h: 12, area: 120, minW: 10, minH: 10 },
    kitchen:           { w: 10, h: 12, area: 120, minW: 8,  minH: 10 },
    dining:            { w: 10, h: 12, area: 120, minW: 10, minH: 12 },
    "bathroom-common": { w: 5,  h: 7,  area: 35,  minW: 4,  minH: 6 },
    "bathroom-master": { w: 5,  h: 8,  area: 40,  minW: 5,  minH: 7 },
    pooja:             { w: 4,  h: 5,  area: 20,  minW: 4,  minH: 4 },
    utility:           { w: 6,  h: 8,  area: 48,  minW: 5,  minH: 6 },
    store:             { w: 6,  h: 8,  area: 48,  minW: 5,  minH: 6 },
    parking:           { w: 10, h: 18, area: 180, minW: 9,  minH: 15 },
  },
  5: {
    living:            { w: 16, h: 18, area: 288, minW: 14, minH: 16 },
    "bedroom-master":  { w: 14, h: 16, area: 224, minW: 12, minH: 14 },
    "bedroom-2":       { w: 12, h: 14, area: 168, minW: 12, minH: 12 },
    "bedroom-3":       { w: 12, h: 14, area: 168, minW: 10, minH: 12 },
    "bedroom-4":       { w: 12, h: 12, area: 144, minW: 10, minH: 12 },
    "bedroom-5":       { w: 12, h: 12, area: 144, minW: 10, minH: 12 },
    kitchen:           { w: 10, h: 12, area: 120, minW: 10, minH: 12 },
    dining:            { w: 12, h: 14, area: 168, minW: 10, minH: 12 },
    family:            { w: 12, h: 14, area: 168, minW: 12, minH: 14 },
    "bathroom-common": { w: 5,  h: 7,  area: 35,  minW: 4,  minH: 6 },
    "bathroom-master": { w: 5,  h: 8,  area: 40,  minW: 5,  minH: 7 },
    pooja:             { w: 4,  h: 5,  area: 20,  minW: 4,  minH: 4 },
    utility:           { w: 6,  h: 8,  area: 48,  minW: 5,  minH: 6 },
    store:             { w: 6,  h: 8,  area: 48,  minW: 5,  minH: 6 },
    servant:           { w: 8,  h: 10, area: 80,  minW: 7,  minH: 8 },
    parking:           { w: 10, h: 18, area: 180, minW: 9,  minH: 15 },
  },
  6: {
    living:            { w: 16, h: 18, area: 288, minW: 14, minH: 16 },
    "bedroom-master":  { w: 14, h: 16, area: 224, minW: 12, minH: 14 },
    "bedroom-2":       { w: 12, h: 14, area: 168, minW: 12, minH: 12 },
    "bedroom-3":       { w: 12, h: 14, area: 168, minW: 10, minH: 12 },
    "bedroom-4":       { w: 12, h: 14, area: 168, minW: 10, minH: 12 },
    "bedroom-5":       { w: 12, h: 12, area: 144, minW: 10, minH: 12 },
    "bedroom-6":       { w: 10, h: 12, area: 120, minW: 10, minH: 12 },
    kitchen:           { w: 10, h: 12, area: 120, minW: 10, minH: 12 },
    dining:            { w: 12, h: 14, area: 168, minW: 10, minH: 12 },
    family:            { w: 14, h: 16, area: 224, minW: 12, minH: 14 },
    "bathroom-common": { w: 5,  h: 7,  area: 35,  minW: 4,  minH: 6 },
    "bathroom-master": { w: 5,  h: 8,  area: 40,  minW: 5,  minH: 7 },
    pooja:             { w: 4,  h: 5,  area: 20,  minW: 4,  minH: 4 },
    utility:           { w: 6,  h: 8,  area: 48,  minW: 5,  minH: 6 },
    store:             { w: 6,  h: 8,  area: 48,  minW: 5,  minH: 6 },
    servant:           { w: 8,  h: 10, area: 80,  minW: 7,  minH: 8 },
    parking:           { w: 10, h: 18, area: 180, minW: 9,  minH: 15 },
  },
};

/** Resolve preferred size for a room id at a given BHK. */
export function getTargetSize(roomId: string, bhk: number): SizeSpec {
  const tier = BHK_SIZE_TARGETS[bhk] ?? BHK_SIZE_TARGETS[3];
  const baseId = roomId.replace(/-\d+$/, "").replace(/^bedroom-master.*/, "bedroom-master");
  // map bathroom-master-1 → bathroom-master, bedroom-3 → bedroom-3
  const keys = [roomId, baseId];
  if (roomId.startsWith("bathroom") && roomId !== "bathroom-common") {
    keys.push("bathroom-master", "bathroom-attached");
  }
  if (roomId.startsWith("bedroom-") && roomId !== "bedroom-master") {
    const n = parseInt(roomId.split("-")[1] || "2", 10);
    if (n >= 4) keys.push("bedroom-4", "bedroom-3", "bedroom-2");
    else if (n === 3) keys.push("bedroom-3", "bedroom-2");
    else keys.push("bedroom-2");
  }
  for (const k of keys) {
    if (tier[k]) return tier[k]!;
    if (STANDARD_SIZES[k]) return STANDARD_SIZES[k];
  }
  return STANDARD_SIZES.living;
}

/**
 * Extra area priority (lower number expands first / gets more leftover space):
 * Living → Master Bedroom → Dining → Kitchen → Other Bedrooms →
 * Family Lounge / Study → Bathrooms → Utility → Pooja / Store →
 * Balcony → Passage / Corridor
 */
export const EXTRA_AREA_PRIORITY: Record<string, number> = {
  living: 1,
  "bedroom-master": 2,
  dining: 3,
  kitchen: 4,
  "bedroom-2": 5,
  "bedroom-3": 5,
  "bedroom-4": 5,
  "bedroom-5": 5,
  "bedroom-6": 5,
  family: 6,
  study: 6,
  lounge: 6,
  "bathroom-common": 7,
  "bathroom-master": 7,
  "bathroom-attached": 7,
  bathroom: 7,
  utility: 8,
  pooja: 9,
  "pooja-space": 9,
  store: 9,
  balcony: 10,
  corridor: 11,
  passage: 11,
  servant: 12,
  staircase: 12,
  parking: 99,
};

/** PDF summary: suggested parking bay count by plot area. */
export function parkingCountForArea(plotArea: number): number {
  if (plotArea < 1800) return 1;
  if (plotArea < 4000) return 2;
  return 3;
}

/**
 * Parking size from PDF.
 * Very small plots (<900): compact 9×14 (fits 20×33 with usable house depth).
 * Medium: 10×16, large: 10×18.
 */
/**
 * Parking footprint.
 * - Narrow plots (handled in reserveParkingStrip): parallel to road → ~18×8
 * - Wider / larger area: perpendicular bay
 */
export function parkingSizeForArea(plotArea: number): { w: number; h: number } {
  if (plotArea < 900) return { w: 8, h: 12 };
  if (plotArea < 1200) return { w: 9, h: 14 };
  if (plotArea < 1800) return { w: 10, h: 16 };
  return { w: 10, h: 18 };
}
