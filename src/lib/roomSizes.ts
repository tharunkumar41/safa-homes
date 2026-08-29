// /**
//  * Standard recommended room sizes (ft) for the fixed-size layout generator.
//  *
//  * Base table (Indian residential standards):
//  *
//  *   Master Bedroom      12 × 14   168
//  *   Regular Bedroom     10 × 12   120
//  *   Children's Bedroom  10 × 10   100
//  *   Living Room         14 × 16   224
//  *   Hall (Compact)      12 × 14   168
//  *   Kitchen             10 × 10   100
//  *   Dining              10 × 12   120
//  *   Common Bathroom      5 ×  8    40
//  *   Attached Bathroom    6 ×  8    48
//  *   Pooja Room           5 ×  6    30
//  *   Utility              5 ×  8    40
//  *   Store Room           5 ×  6    30
//  *   Car Parking         10 × 18   180
//  *   Staircase            7 × 14    98
//  *
//  * Note: full-coverage layout may stretch rooms to fill the build-up;
//  * these values are the preferred targets / packing seeds.
//  */

// export type RoomSize = { width: number; height: number };
// //Added By Me
// export interface RoomRule {
//   minWidth: number;
//   minHeight: number;
//   maxWidth: number;
//   maxHeight: number;
//   minArea: number;
//   priority: number;
//   preferredAspectRatio: number;
//   droppable?: boolean;
//   fixed?: boolean;
// }

// export const ROOM_SIZES: Record<string, RoomSize> = {
//   living: { width: 14, height: 16 },
//   "bedroom-master": { width: 12, height: 14 },
//   "bedroom-2": { width: 10, height: 12 },
//   "bedroom-3": { width: 10, height: 10 },
//   "bedroom-4": { width: 10, height: 10 },
//   "bedroom-5": { width: 10, height: 10 },
//   kitchen: { width: 10, height: 10 },
//   dining: { width: 10, height: 12 },
//   "bathroom-attached": { width: 6, height: 8 },
//   "bathroom-common": { width: 5, height: 8 },
//   bathroom: { width: 5, height: 8 },
//   pooja: { width: 5, height: 6 },
//   staircase: { width: 7, height: 14 },
//   parking: { width: 10, height: 18 },
//   utility: { width: 5, height: 8 },
//   store: { width: 5, height: 6 },
//   corridor: { width: 4, height: 8 },
// };
// /* -------------------------------------------------------------------------- */
// /* Room Rules (used by future optimizer)                                      */
// /* -------------------------------------------------------------------------- */

// export const ROOM_RULES: Record<string, RoomRule> = {
//   living: {
//     minWidth: 12,
//     minHeight: 12,
//     maxWidth: 18,
//     maxHeight: 20,
//     minArea: 160,
//     priority: 100,
//     preferredAspectRatio: 1.15,
//   },

//   "bedroom-master": {
//     minWidth: 11,
//     minHeight: 12,
//     maxWidth: 16,
//     maxHeight: 16,
//     minArea: 168,
//     priority: 95,
//     preferredAspectRatio: 1.15,
//   },

//   "bedroom-2": {
//     minWidth: 10,
//     minHeight: 10,
//     maxWidth: 13,
//     maxHeight: 13,
//     minArea: 120,
//     priority: 85,
//     preferredAspectRatio: 1.2,
//   },

//   "bedroom-3": {
//     minWidth: 10,
//     minHeight: 10,
//     maxWidth: 11,
//     maxHeight: 11,
//     minArea: 100,
//     priority: 75,
//     preferredAspectRatio: 1.0,
//   },

//   kitchen: {
//     minWidth: 8,
//     minHeight: 10,
//     maxWidth: 12,
//     maxHeight: 12,
//     minArea: 90,
//     priority: 90,
//     preferredAspectRatio: 1.0,
//   },

//   dining: {
//     minWidth: 9,
//     minHeight: 10,
//     maxWidth: 13,
//     maxHeight: 14,
//     minArea: 120,
//     priority: 70,
//     preferredAspectRatio: 1.2,
//     droppable: true,
//   },

//   "bathroom-attached": {
//     minWidth: 5,
//     minHeight: 7,
//     maxWidth: 7,
//     maxHeight: 9,
//     minArea: 48,
//     priority: 80,
//     preferredAspectRatio: 1.33,
//   },

//   "bathroom-common": {
//     minWidth: 5,
//     minHeight: 7,
//     maxWidth: 6,
//     maxHeight: 9,
//     minArea: 40,
//     priority: 80,
//     preferredAspectRatio: 1.6,
//   },

//   staircase: {
//     minWidth: 6,
//     minHeight: 12,
//     maxWidth: 8,
//     maxHeight: 16,
//     minArea: 98,
//     priority: 70,
//     preferredAspectRatio: 2.0,
//     fixed: true,
//   },

//   parking: {
//     minWidth: 10,
//     minHeight: 15,
//     maxWidth: 12,
//     maxHeight: 20,
//     minArea: 150,
//     priority: 40,
//     preferredAspectRatio: 1.8,
//     droppable: true,
//   },

//   utility: {
//     minWidth: 5,
//     minHeight: 6,
//     maxWidth: 7,
//     maxHeight: 9,
//     minArea: 40,
//     priority: 60,
//     preferredAspectRatio: 1.6,
//     droppable: true,
//   },

//   pooja: {
//     minWidth: 4,
//     minHeight: 5,
//     maxWidth: 6,
//     maxHeight: 7,
//     minArea: 30,
//     priority: 50,
//     preferredAspectRatio: 1.2,
//     droppable: true,
//   },
// };


// /**
//  * Secondary bedroom size by index and total bedroom count.
//  *   2 BHK  → Bedroom 2 is 11×11
//  *   3+ BHK → Bedroom 2 is 11×11, Bedroom 3+ taper to 10×10
//  */
// export function getBedroomSize(
//   bedroomIndex: number,
//   totalBedrooms: number
// ): RoomSize {
//   if (bedroomIndex <= 1) {
//     return ROOM_SIZES["bedroom-master"];
//   }
//   if (totalBedrooms <= 2 || bedroomIndex === 2) {
//     return ROOM_SIZES["bedroom-2"];
//   }
//   // 3rd+ bedrooms
//   return ROOM_SIZES["bedroom-3"];
// }

// /** Soft minimum areas (sq ft) used by drop-logic / validation. */

// /**
// export const MIN_ROOM_AREAS = {
//   living: 12 * 12, // 144
//   master: 11 * 12, // 132
//   bedroom: 10 * 10, // 100
//   kitchen: 8 * 10, // 80
//   bath: 5 * 7, // 35
//   pooja: 4 * 5, // 20
//   staircase: 6 * 10, // 60
//   parking: 10 * 15, // 150
//   utility: 5 * 5, // 25
// };
//  */

// /* -------------------------------------------------------------------------- */
// /* Global Layout Rules                                                         */
// /* -------------------------------------------------------------------------- */

// export const LAYOUT_RULES = {
//   MIN_ASPECT_RATIO: 0.70,
//   MAX_ASPECT_RATIO: 1.80,

//   MIN_SCALE: 0.85,
//   MAX_SCALE: 1.25,

//   WALL_THICKNESS: 0.5,

//   MIN_CORRIDOR_WIDTH: 4,

//   MIN_DOOR_WIDTH: 3,

//   MIN_WINDOW_WIDTH: 3,
// };

// /* -------------------------------------------------------------------------- */
// /* Priority Order                                                              */
// /* -------------------------------------------------------------------------- */

// export const ROOM_PRIORITY = [
//   "living",
//   "bedroom-master",
//   "kitchen",
//   "bedroom-2",
//   "bathroom-attached",
//   "bathroom-common",
//   "dining",
//   "staircase",
//   "utility",
//   "pooja",
//   "parking",
//   "store",
// ] as const;