// import { Room, Door, Window } from "./types";
// import { ROOM_SIZES } from "./roomSizes";
// import {
//   FIXED_WALL_COMPASS,
//   getWallCompass,
//   roomQuadrant,
//   vastuTargetQuadrant,
//   vastuWindowCompassPrefs,
//   LAYOUT_WALL_GAP_FT,
//   type CompassOrientation,
// } from "./vastu";

// // Re-export Vastu helpers so existing imports from "./solver" keep working
// export {
//   FIXED_WALL_COMPASS,
//   getWallCompass,
//   roomQuadrant,
//   vastuTargetQuadrant,
//   LAYOUT_WALL_GAP_FT,
// };
// export type { CompassOrientation };

// export type LayoutNode =
//   | {
//       type: "split";
//       direction: "horizontal" | "vertical";
//       ratio: number; // value between 0.1 and 0.9
//       children: [LayoutNode, LayoutNode];
//     }
//   | {
//       type: "room";
//       id: string;
//       label: string;
//     };

// /**
//  * Recursively solves the slicing tree to compute exact (x, y, width, height) coordinates for all rooms.
//  * @param node The current node in the layout tree.
//  * @param x The starting X coordinate in feet.
//  * @param y The starting Y coordinate in feet.
//  * @param w The width in feet.
//  * @param h The height in feet.
//  * @param wallThickness Spacing in feet between split tiles to represent wall thickness.
//  */
// type PreferredBounds = { width: number; height: number };

// const MIN_SPLIT_RATIO = 0.12;
// const MAX_SPLIT_RATIO = 0.88;
// const PREFERRED_RATIO_BLEND = 0.7;
// const EPSILON = 1e-6;

// function clamp(value: number, min: number, max: number): number {
//   return Math.max(min, Math.min(max, value));
// }

// /**
//  * Resolve a room id to the preferred dimensions declared in roomSizes.ts.
//  * Supports generated ids such as bedroom-3 / bathroom-2.
//  */
// function preferredRoomSize(id: string): PreferredBounds {
//   if (ROOM_SIZES[id]) return ROOM_SIZES[id];

//   if (id.startsWith("bedroom-master")) {
//     return ROOM_SIZES["bedroom-master"] ?? { width: 12, height: 13 };
//   }

//   if (id.startsWith("bedroom-")) {
//     const n = Number(id.replace("bedroom-", ""));
//     if (Number.isFinite(n) && n >= 3) {
//       return ROOM_SIZES["bedroom-3"] ?? ROOM_SIZES["bedroom-2"] ?? { width: 10, height: 10 };
//     }
//     return ROOM_SIZES["bedroom-2"] ?? { width: 11, height: 11 };
//   }

//   if (id.startsWith("bathroom-master")) {
//     return ROOM_SIZES["bathroom-attached"] ?? ROOM_SIZES.bathroom ?? { width: 5, height: 8 };
//   }

//   if (id.startsWith("bathroom")) {
//     return ROOM_SIZES["bathroom-common"] ?? ROOM_SIZES.bathroom ?? { width: 5, height: 8 };
//   }

//   if (id.startsWith("kitchen")) {
//     return ROOM_SIZES.kitchen ?? { width: 10, height: 10 };
//   }

//   if (id === "family" || id === "lounge") {
//     return ROOM_SIZES.living ?? { width: 12, height: 14 };
//   }

//   if (id.startsWith("store")) {
//     return ROOM_SIZES.store ?? { width: 5, height: 6 };
//   }

//   if (id.startsWith("corridor") || id === "passage") {
//     return ROOM_SIZES.corridor ?? { width: 4, height: 8 };
//   }

//   return { width: 6, height: 6 };
// }

// /**
//  * Estimate the preferred footprint of an entire slicing subtree.
//  * Horizontal splits add widths; vertical splits add heights.
//  */
// function getPreferredBounds(node: LayoutNode): PreferredBounds {
//   if (node.type === "room") return preferredRoomSize(node.id);

//   const [a, b] = node.children;
//   const pa = getPreferredBounds(a);
//   const pb = getPreferredBounds(b);

//   if (node.direction === "horizontal") {
//     return {
//       width: pa.width + pb.width,
//       height: Math.max(pa.height, pb.height),
//     };
//   }

//   return {
//     width: Math.max(pa.width, pb.width),
//     height: pa.height + pb.height,
//   };
// }

// /**
//  * Calculate a split ratio that follows preferred room proportions while still
//  * respecting the ratio requested by generator.ts. This keeps the solver as a
//  * layout optimizer instead of blindly treating every split as 50/50.
//  */
// function getAdaptiveRatio(
//   node: Extract<LayoutNode, { type: "split" }>,
//   availableW: number,
//   availableH: number,
//   wallThickness: number
// ): number {
//   const [child1, child2] = node.children;
//   const p1 = getPreferredBounds(child1);
//   const p2 = getPreferredBounds(child2);

//   const requested = clamp(node.ratio, MIN_SPLIT_RATIO, MAX_SPLIT_RATIO);

//   const preferredRatio =
//     node.direction === "horizontal"
//       ? p1.width / Math.max(EPSILON, p1.width + p2.width)
//       : p1.height / Math.max(EPSILON, p1.height + p2.height);

//   // Preserve explicit generator intent while moving the result toward the
//   // room-size proportions. A 70% preference keeps Vastu-specific placement
//   // decisions stable but avoids obviously distorted room proportions.
//   let ratio =
//     requested * (1 - PREFERRED_RATIO_BLEND) +
//     preferredRatio * PREFERRED_RATIO_BLEND;

//   // Minimum feasible split based on preferred physical dimensions. This stops
//   // the solver from creating paper-thin child boxes when a parent is small.
//   const availablePrimary =
//     node.direction === "horizontal" ? availableW : availableH;
//   const childPrimary1 =
//     node.direction === "horizontal" ? p1.width : p1.height;
//   const childPrimary2 =
//     node.direction === "horizontal" ? p2.width : p2.height;

//   const usablePrimary = Math.max(1, availablePrimary - wallThickness);

//   // When the plot is smaller than the preferred aggregate footprint, scale both
//   // minimums together rather than forcing impossible absolute dimensions.
//   const preferredTotal = Math.max(EPSILON, childPrimary1 + childPrimary2);
//   const compression = Math.min(1, usablePrimary / preferredTotal);

//   const minPrimary1 = Math.max(1, childPrimary1 * compression * 0.72);
//   const minPrimary2 = Math.max(1, childPrimary2 * compression * 0.72);

//   const minRatio = clamp(minPrimary1 / usablePrimary, MIN_SPLIT_RATIO, 0.48);
//   const maxRatio = clamp(
//     1 - minPrimary2 / usablePrimary,
//     0.52,
//     MAX_SPLIT_RATIO
//   );

//   ratio = clamp(ratio, minRatio, maxRatio);

//   return Math.round(ratio * 1000) / 1000;
// }

// function solveLayoutInternal(
//   node: LayoutNode,
//   x: number,
//   y: number,
//   w: number,
//   h: number,
//   wallThickness: number
// ): Room[] {
//   if (node.type === "room") {
//     const rx = Math.round(x * 10) / 10;
//     const ry = Math.round(y * 10) / 10;
//     const rw = Math.round(Math.max(0.5, w) * 10) / 10;
//     const rh = Math.round(Math.max(0.5, h) * 10) / 10;

//     return [
//       {
//         id: node.id,
//         label: node.label,
//         x: rx,
//         y: ry,
//         width: rw,
//         height: rh,
//       },
//     ];
//   }

//   const rooms: Room[] = [];
//   const [child1, child2] = node.children;
//   const ratio = getAdaptiveRatio(node, w, h, wallThickness);

//   if (node.direction === "horizontal") {
//     const available = Math.max(1, w - wallThickness);
//     const targetW1 = available * ratio;
//     const w1 = Math.max(0.5, targetW1);
//     const w2 = Math.max(0.5, available - w1);
//     const x2 = x + w1 + wallThickness;

//     rooms.push(...solveLayoutInternal(child1, x, y, w1, h, wallThickness));
//     rooms.push(...solveLayoutInternal(child2, x2, y, w2, h, wallThickness));
//   } else {
//     const available = Math.max(1, h - wallThickness);
//     const targetH1 = available * ratio;
//     const h1 = Math.max(0.5, targetH1);
//     const h2 = Math.max(0.5, available - h1);
//     const y2 = y + h1 + wallThickness;

//     rooms.push(...solveLayoutInternal(child1, x, y, w, h1, wallThickness));
//     rooms.push(...solveLayoutInternal(child2, x, y2, w, h2, wallThickness));
//   }

//   return rooms;
// }

// /**
//  * Recursively solves the slicing tree and adaptively biases every split toward
//  * the preferred room proportions from roomSizes.ts. Existing explicit ratios
//  * remain influential, so generator.ts and Vastu-specific tree decisions are
//  * preserved rather than replaced.
//  */
// export function solveLayout(
//   node: LayoutNode,
//   x: number,
//   y: number,
//   w: number,
//   h: number,
//   wallThickness: number = LAYOUT_WALL_GAP_FT
// ): Room[] {
//   return solveLayoutInternal(
//     node,
//     x,
//     y,
//     Math.max(1, w),
//     Math.max(1, h),
//     wallThickness
//   );
// }

// /**
//  * Post-solve cleanup used by callers that want an additional optimizer pass.
//  * It removes accidental extreme aspect ratios by growing the smaller dimension
//  * when adjacent free space exists, without moving the room outside the supplied
//  * plot bounds.
//  *
//  * This helper is intentionally opt-in so existing generator.ts behavior is not
//  * unexpectedly changed. It is useful for the next constraint-validation stage.
//  */
// export function optimizeRoomAspectRatios(
//   rooms: Room[],
//   minX: number,
//   minY: number,
//   maxX: number,
//   maxY: number,
//   maxAspectRatio = 1.8
// ): Room[] {
//   const result = rooms.map((room) => ({ ...room }));
//   const snap01 = (v: number) => Math.round(v * 10) / 10;

//   const overlaps = (a: Room, b: Room) => {
//     const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
//     const oy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
//     return ox > 0.05 && oy > 0.05;
//   };

//   const canExpand = (room: Room, x: number, y: number, w: number, h: number) => {
//     if (x < minX - 0.05 || y < minY - 0.05) return false;
//     if (x + w > maxX + 0.05 || y + h > maxY + 0.05) return false;
//     for (const other of result) {
//       if (other.id === room.id) continue;
//       if (overlaps({ ...room, x, y, width: w, height: h }, other)) return false;
//     }
//     return true;
//   };

//   for (const room of result) {
//     if (room.id.startsWith("bathroom") || room.id === "parking") continue;

//     const ratio = Math.max(room.width / Math.max(0.5, room.height), room.height / Math.max(0.5, room.width));
//     if (ratio <= maxAspectRatio) continue;

//     // First try the short axis. This changes the shape toward a usable rectangle
//     // without disturbing the room's long dimension unnecessarily.
//     if (room.width > room.height) {
//       const wantedH = room.width / maxAspectRatio;
//       const delta = wantedH - room.height;
//       if (delta > 0 && canExpand(room, room.x, room.y, room.width, room.height + delta)) {
//         room.height = snap01(room.height + delta);
//       }
//     } else {
//       const wantedW = room.height / maxAspectRatio;
//       const delta = wantedW - room.width;
//       if (delta > 0 && canExpand(room, room.x, room.y, room.width + delta, room.height)) {
//         room.width = snap01(room.width + delta);
//       }
//     }
//   }

//   return result;
// }

// function hasNodeId(node: LayoutNode, id: string): boolean {
//   if (node.type === "room") {
//     return node.id === id;
//   }
//   return hasNodeId(node.children[0], id) || hasNodeId(node.children[1], id);
// }

// /**
//  * Recursively adjusts ratios in the layout tree to align a target room ID
//  * with target coordinates (tx, ty, tw, th) within a parent bounding box (x, y, w, h).
//  */
// export function adjustTreeForFixedNode(
//   node: LayoutNode,
//   x: number,
//   y: number,
//   w: number,
//   h: number,
//   targetId: string,
//   tx: number,
//   ty: number,
//   tw: number,
//   th: number,
//   wallThickness: number = LAYOUT_WALL_GAP_FT
// ): LayoutNode {
//   if (node.type === "room") {
//     return node;
//   }

//   const [child1, child2] = node.children;
//   const child1HasTarget = hasNodeId(child1, targetId);
//   const child2HasTarget = hasNodeId(child2, targetId);

//   let newRatio = node.ratio;

//   if (child1HasTarget || child2HasTarget) {
//     if (node.direction === "horizontal") {
//       if (child1HasTarget) {
//         // Target is in child1 (left). We want right boundary of child1 to match target's right edge.
//         newRatio = (tx + tw - x + wallThickness / 2) / w;
//       } else {
//         // Target is in child2 (right). We want left boundary of child2 to match target's left edge.
//         newRatio = (tx - x - wallThickness / 2) / w;
//       }
//     } else {
//       if (child1HasTarget) {
//         // Target is in child1 (top). We want bottom boundary of child1 to match target's bottom edge.
//         newRatio = (ty + th - y + wallThickness / 2) / h;
//       } else {
//         // Target is in child2 (bottom). We want top boundary of child2 to match target's top edge.
//         newRatio = (ty - y - wallThickness / 2) / h;
//       }
//     }
//   }

//   // Clamp ratio to acceptable bounds
//   newRatio = Math.max(0.05, Math.min(0.95, newRatio));

//   // Compute solved sizes to pass to child recursion
//   let w1 = w;
//   let w2 = w;
//   let h1 = h;
//   let h2 = h;
//   let x2 = x;
//   let y2 = y;

//   if (node.direction === "horizontal") {
//     const targetW1 = w * newRatio;
//     w1 = Math.max(1.0, targetW1 - wallThickness / 2);
//     w2 = Math.max(1.0, w - w1 - wallThickness);
//     x2 = x + w1 + wallThickness;
//   } else {
//     const targetH1 = h * newRatio;
//     h1 = Math.max(1.0, targetH1 - wallThickness / 2);
//     h2 = Math.max(1.0, h - h1 - wallThickness);
//     y2 = y + h1 + wallThickness;
//   }

//   const adjChild1 = adjustTreeForFixedNode(
//     child1,
//     x,
//     y,
//     node.direction === "horizontal" ? w1 : w,
//     node.direction === "vertical" ? h1 : h,
//     targetId,
//     tx,
//     ty,
//     tw,
//     th,
//     wallThickness
//   );

//   const adjChild2 = adjustTreeForFixedNode(
//     child2,
//     node.direction === "horizontal" ? x2 : x,
//     node.direction === "vertical" ? y2 : y,
//     node.direction === "horizontal" ? w2 : w,
//     node.direction === "vertical" ? h2 : h,
//     targetId,
//     tx,
//     ty,
//     tw,
//     th,
//     wallThickness
//   );

//   return {
//     type: "split",
//     direction: node.direction,
//     ratio: newRatio,
//     children: [adjChild1, adjChild2],
//   };
// }

// interface SharedWall {
//   wall: "top" | "bottom" | "left" | "right";
//   other: Room;
//   overlapStart: number;
//   overlapEnd: number;
//   length: number;
// }

// /**
//  * Geometrically places doors and windows for a list of solved rooms,
//  * satisfying architectural ventilation, size, and room privacy guidelines.
//  */
// export function generateDoorsAndWindows(
//   rooms: Room[],
//   plotLength: number,
//   plotBreadth: number,
//   roadFacing: "North" | "South" | "East" | "West",
//   vastu: boolean,
//   orientation: "North" | "South" | "East" | "West" | "Northeast" | "Northwest" | "Southeast" | "Southwest" = "North"
// ): { doors: Door[]; windows: Window[] } {
//   const doors: Door[] = [];
//   const windows: Window[] = [];

//   // ─── COMPASS MAPPING (Vastu) ───
//   // The 2D canvas is always North-up (y=0 = North, x=0 = West). Absolute
//   // Vastu room positions in generator.ts use FIXED_WALL_COMPASS. Window and
//   // door preferences here must use the same fixed mapping so Kitchen prefers
//   // true East/South light, Master true South/West, etc., for every roadFacing.
//   // (orientation is only used if a rotated drawing is ever introduced.)
//   const wallCompass = vastu ? FIXED_WALL_COMPASS : getWallCompass(orientation);

//   const xCoords = rooms.map((r) => r.x);
//   const yCoords = rooms.map((r) => r.y);
//   const xMaxCoords = rooms.map((r) => r.x + r.width);
//   const yMaxCoords = rooms.map((r) => r.y + r.height);
//   const houseLeft = rooms.length > 0 ? Math.min(...xCoords) : 1.5;
//   const houseRight = rooms.length > 0 ? Math.max(...xMaxCoords) : plotLength - 1.5;
//   const houseTop = rooms.length > 0 ? Math.min(...yCoords) : 1.5;
//   const houseBottom = rooms.length > 0 ? Math.max(...yMaxCoords) : plotBreadth - 1.5;

//   // Rooms produced by solveLayout sit exactly `wallThickness` (0.4ft) apart, never
//   // touching. This tolerance must be comfortably larger than that gap, otherwise no
//   // two rooms are ever detected as sharing a wall — which is what was happening
//   // before (0.25 < 0.4, so this check never matched anything).
//   const ADJACENCY_TOL = 0.5;

//   const getSharedWalls = (r1: Room): SharedWall[] => {
//     const shared: SharedWall[] = [];
//     rooms.forEach((r2) => {
//       if (r1.id === r2.id) return;

//       // Check vertical boundary: r1 is left of r2
//       if (Math.abs(r1.x + r1.width - r2.x) < ADJACENCY_TOL) {
//         const overlapStart = Math.max(r1.y, r2.y);
//         const overlapEnd = Math.min(r1.y + r1.height, r2.y + r2.height);
//         const length = overlapEnd - overlapStart;
//         if (length > 1.5) {
//           shared.push({ wall: "right", other: r2, overlapStart, overlapEnd, length });
//         }
//       }
//       // Check vertical boundary: r1 is right of r2
//       if (Math.abs(r1.x - (r2.x + r2.width)) < ADJACENCY_TOL) {
//         const overlapStart = Math.max(r1.y, r2.y);
//         const overlapEnd = Math.min(r1.y + r1.height, r2.y + r2.height);
//         const length = overlapEnd - overlapStart;
//         if (length > 1.5) {
//           shared.push({ wall: "left", other: r2, overlapStart, overlapEnd, length });
//         }
//       }
//       // Check horizontal boundary: r1 is top of r2
//       if (Math.abs(r1.y + r1.height - r2.y) < ADJACENCY_TOL) {
//         const overlapStart = Math.max(r1.x, r2.x);
//         const overlapEnd = Math.min(r1.x + r1.width, r2.x + r2.width);
//         const length = overlapEnd - overlapStart;
//         if (length > 1.5) {
//           shared.push({ wall: "bottom", other: r2, overlapStart, overlapEnd, length });
//         }
//       }
//       // Check horizontal boundary: r1 is bottom of r2
//       if (Math.abs(r1.y - (r2.y + r2.height)) < ADJACENCY_TOL) {
//         const overlapStart = Math.max(r1.x, r2.x);
//         const overlapEnd = Math.min(r1.x + r1.width, r2.x + r2.width);
//         const length = overlapEnd - overlapStart;
//         if (length > 1.5) {
//           shared.push({ wall: "top", other: r2, overlapStart, overlapEnd, length });
//         }
//       }
//     });
//     return shared;
//   };

//   // A wall is exterior only if it actually sits on the building's outer
//   // envelope. Previously this was inferred from shared-wall overlap (a wall
//   // was called "exterior" whenever less than 80% of it touched a neighbor),
//   // which misfires for any room that only partially borders its neighbor —
//   // e.g. a short Pooja Room next to a taller Bedroom shares just part of the
//   // Bedroom's wall height, so the old heuristic saw <80% overlap and called
//   // that shared interior wall "exterior", placing a window on it. That
//   // stray window is what renders as a doubled/extra wall segment between
//   // the two rooms. Checking against the house's actual bounding box is
//   // unambiguous and fixes this.
//   const WALL_TOL = 0.6;
//   const isWallExternal = (
//     room: Room,
//     wall: "top" | "bottom" | "left" | "right",
//     _shared: SharedWall[]
//   ): boolean => {
//     if (wall === "top") return Math.abs(room.y - houseTop) < WALL_TOL;
//     if (wall === "bottom") return Math.abs(room.y + room.height - houseBottom) < WALL_TOL;
//     if (wall === "left") return Math.abs(room.x - houseLeft) < WALL_TOL;
//     return Math.abs(room.x + room.width - houseRight) < WALL_TOL;
//   };

//   rooms.forEach((room) => {
//     // NOTE: "staircase" used to be skipped entirely here, which meant it never
//     // got a door on any floor — sealed box, unreachable. It now falls through
//     // to the general room logic below (it isn't living/kitchen/bath/pooja, so
//     // it gets a single door on its best shared wall, preferring living/family).
//     // "garden" stays skipped — it's an open-air yard, not an enclosed room.
//     if (room.id === "garden") return;

//     // ─── PARKING: wide car-entrance opening on the exterior wall, preferring
//     // the wall that faces the road so a car can drive straight in ───
//     if (room.id === "parking") {
//       const shared = getSharedWalls(room);
//       const extWallsParking: ("top" | "bottom" | "left" | "right")[] = [];
//       (["top", "bottom", "left", "right"] as const).forEach((w) => {
//         if (isWallExternal(room, w, shared)) extWallsParking.push(w);
//       });
//       if (extWallsParking.length === 0) return;

//       const roadWallName: Record<string, "top" | "bottom" | "left" | "right"> = {
//         North: "top",
//         South: "bottom",
//         East: "right",
//         West: "left",
//       };
//       const preferredWall = roadWallName[roadFacing];
//       const entranceWall = extWallsParking.includes(preferredWall) ? preferredWall : extWallsParking[0];

//       const span = entranceWall === "top" || entranceWall === "bottom" ? room.width : room.height;
//       // Widest opening that still leaves a little corner clearance either side,
//       // so the car can pull straight in without a narrow door-sized bottleneck.
//       const entranceWidth = Math.max(6.0, Math.min(span - 1.0, 9.0));
//       const entrancePos = Math.max(0.3, (span - entranceWidth) / 2);

//       doors.push({
//         room: room.id,
//         wall: entranceWall,
//         position: Math.round(entrancePos * 10) / 10,
//         width: Math.round(entranceWidth * 10) / 10,
//       });
//       return;
//     }

//     const isLiving = room.id === "living" || room.id === "family";
//     const isKitchen = room.id === "kitchen";
//     const isBath = room.id.startsWith("bathroom");
//     const isPooja = room.id === "pooja" || room.id === "study";

//     const shared = getSharedWalls(room);

//     // ─── WINDOW PLACEMENT ───
//     const extWalls: ("top" | "bottom" | "left" | "right")[] = [];
//     (["top", "bottom", "left", "right"] as const).forEach((w) => {
//       if (isWallExternal(room, w, shared)) {
//         extWalls.push(w);
//       }
//     });

//     if (extWalls.length > 0) {
//       let chosenWall = extWalls[0];
//       if (isLiving) {
//         // Main door is on the road wall — put windows on a DIFFERENT exterior side
//         let roadWallName: "top" | "bottom" | "left" | "right" = "top";
//         if (roadFacing === "South") roadWallName = "bottom";
//         else if (roadFacing === "East") roadWallName = "right";
//         else if (roadFacing === "West") roadWallName = "left";

//         const otherWalls = extWalls.filter((w) => w !== roadWallName);
//         if (otherWalls.length > 0) {
//           // Prefer true North / East light when possible (Vastu-friendly)
//           const lightOrder = (["top", "right", "bottom", "left"] as const).filter(
//             (w) => otherWalls.includes(w)
//           );
//           chosenWall = lightOrder[0] ?? otherWalls[0];
//         } else if (extWalls.includes(roadWallName)) {
//           // Only road wall is exterior — unavoidable
//           chosenWall = roadWallName;
//         }
//       } else if (vastu) {
//         // Absolute Vastu window-wall preferences (see lib/vastu.ts)
//         const preferredCompass = vastuWindowCompassPrefs(room.id);

//         const preferredWall = extWalls
//           .slice()
//           .sort(
//             (a, b) =>
//               preferredCompass.indexOf(wallCompass[a]) -
//               preferredCompass.indexOf(wallCompass[b])
//           )[0];
//         if (preferredWall) chosenWall = preferredWall;
//       }

//       const winWidth = isBath ? 2.0 : isPooja ? 2.0 : 4.0;
//       const span = chosenWall === "top" || chosenWall === "bottom" ? room.width : room.height;
//       const position = Math.max(0.5, Math.round(((span - winWidth) / 2) * 10) / 10);
//       windows.push({ room: room.id, wall: chosenWall, position, width: winWidth });
//     }
//     // else: room has no wall on the outer envelope (fully interior room) —
//     // skip the window rather than drawing one on a shared/interior wall,
//     // which would render as a stray extra wall segment between two rooms.

//     // ─── DOOR PLACEMENT ───
//     if (isLiving) {
//       // 1. MAIN DOOR — on the road-facing exterior wall of living when possible
//       const roadWallName: "top" | "bottom" | "left" | "right" =
//         roadFacing === "South"
//           ? "bottom"
//           : roadFacing === "East"
//             ? "right"
//             : roadFacing === "West"
//               ? "left"
//               : "top";

//       let mainWall = roadWallName;
//       // Prefer road wall if it is exterior; else closest exterior wall to road edge
//       if (!isWallExternal(room, roadWallName, shared)) {
//         const dist: Record<string, number> = {
//           top: Math.abs(room.y - 0),
//           bottom: Math.abs(room.y + room.height - plotBreadth),
//           left: Math.abs(room.x - 0),
//           right: Math.abs(room.x + room.width - plotLength),
//         };
//         const ext = (["top", "bottom", "left", "right"] as const).filter((w) =>
//           isWallExternal(room, w, shared)
//         );
//         if (ext.length > 0) {
//           mainWall = ext.slice().sort((a, b) => dist[a] - dist[b])[0];
//         }
//       }

//       const mainDoorWidth = 3.5;
//       const span =
//         mainWall === "top" || mainWall === "bottom" ? room.width : room.height;
//       const minCenter = span / 3;
//       const maxCenter = (2 * span) / 3 - mainDoorWidth;
//       let mainPos = (span - mainDoorWidth) / 2;
//       const staircase = rooms.find((r) => r.id === "staircase");
//       if (staircase) {
//         if (mainWall === "top" || mainWall === "bottom") {
//           const stairCenterX = staircase.x + staircase.width / 2;
//           const roomCenterX = room.x + room.width / 2;
//           mainPos = stairCenterX < roomCenterX ? minCenter : maxCenter;
//         } else {
//           const stairCenterY = staircase.y + staircase.height / 2;
//           const roomCenterY = room.y + room.height / 2;
//           mainPos = stairCenterY < roomCenterY ? minCenter : maxCenter;
//         }
//       }
//       mainPos = Math.max(2.0, Math.min(span - mainDoorWidth - 2.0, mainPos));
//       doors.push({
//         room: room.id,
//         wall: mainWall,
//         position: Math.round(mainPos * 10) / 10,
//         width: mainDoorWidth,
//       });

//       // 2. Internal door — dining / kitchen / bedroom / stair (never bathroom)
//       const rankLivingInternal = (id: string): number => {
//         if (id === "dining") return 100;
//         if (id === "kitchen" || id.startsWith("kitchen")) return 90;
//         if (id.includes("bedroom")) return 80;
//         if (id === "staircase") return 70;
//         if (id.includes("corridor") || id.includes("passage")) return 60;
//         if (id === "utility") return 40;
//         if (id.startsWith("bathroom")) return 0;
//         if (id === "parking" || id === "garden") return 0;
//         return 20;
//       };
//       const internalWalls = shared
//         .map((s) => ({ s, rank: rankLivingInternal(s.other.id) }))
//         .filter((x) => x.rank > 0)
//         .sort((a, b) => b.rank - a.rank || b.s.length - a.s.length)
//         .map((x) => x.s);
//       if (internalWalls.length > 0) {
//         const prefWall = internalWalls[0];
//         const doorWidth = 3.0;
//         const wallSpan =
//           prefWall.wall === "top" || prefWall.wall === "bottom"
//             ? room.width
//             : room.height;
//         const localStart =
//           prefWall.wall === "top" || prefWall.wall === "bottom"
//             ? prefWall.overlapStart - room.x
//             : prefWall.overlapStart - room.y;
//         const localEnd =
//           prefWall.wall === "top" || prefWall.wall === "bottom"
//             ? prefWall.overlapEnd - room.x
//             : prefWall.overlapEnd - room.y;
//         const localPos = localStart + (localEnd - localStart - doorWidth) / 2;
//         let minPos = Math.max(localStart, 2.0);
//         let maxPos = Math.min(localEnd - doorWidth, wallSpan - doorWidth - 2.0);
//         let clampedPos = localPos;
//         if (minPos <= maxPos) {
//           clampedPos = Math.max(minPos, Math.min(maxPos, localPos));
//         } else {
//           const safeMin = Math.min(2.0, (wallSpan - doorWidth) / 2);
//           const safeMax = Math.max(
//             wallSpan - doorWidth - 2.0,
//             (wallSpan - doorWidth) / 2
//           );
//           clampedPos = Math.max(safeMin, Math.min(safeMax, localPos));
//         }
//         doors.push({
//           room: room.id,
//           wall: prefWall.wall,
//           position: Math.round(clampedPos * 10) / 10,
//           width: doorWidth,
//           connectsTo: prefWall.other.id,
//         });
//       }
//     } else {
//       const doorWidth = isBath ? 2.5 : isPooja ? 2.0 : 3.0;

//       // Helpers — circulation must not force walking through a bedroom
//       const isBedroomId = (id: string) =>
//         id.includes("bedroom") && !id.includes("bath");
//       const isKitchenId = (id: string) =>
//         id === "kitchen" || id.startsWith("kitchen");
//       // Circulation targets for bedrooms / general rooms (kitchen OK for living)
//       const isPublicId = (id: string) =>
//         id === "living" ||
//         id === "family" ||
//         id === "dining" ||
//         id === "lounge" ||
//         isKitchenId(id) ||
//         id.includes("corridor") ||
//         id.includes("passage") ||
//         id.includes("lobby") ||
//         id.startsWith("store");
//       // Bathroom doors may open to these only — NEVER kitchen
//       const isBathDoorTarget = (id: string) =>
//         isBedroomId(id) ||
//         id === "living" ||
//         id === "family" ||
//         id === "dining" ||
//         id === "lounge" ||
//         id.includes("corridor") ||
//         id.includes("passage") ||
//         id.includes("lobby");
//       const isThisBedroom = isBedroomId(room.id);
//       const isAttachedBath =
//         isBath &&
//         (room.id.includes("attached") || room.id.includes("bathroom-master"));

//       // Rule 3: Bathroom doors never open onto the kitchen (hygiene + Vastu).
//       let validShared = shared.filter((s) => {
//         if (isBath) {
//           if (isKitchenId(s.other.id)) return false;
//           if (s.other.id.startsWith("bathroom")) return false;
//           return isBathDoorTarget(s.other.id);
//         }
//         if (isPooja && s.other.id.startsWith("bathroom")) {
//           return false;
//         }
//         // Kitchen must never get a door into a bathroom either
//         if (isKitchen && s.other.id.startsWith("bathroom")) {
//           return false;
//         }
//         if (isKitchenId(room.id) && s.other.id.startsWith("bathroom")) {
//           return false;
//         }
//         return s.other.id !== "parking" && s.other.id !== "garden";
//       });

//       // ── Per-room preferred door targets (ranked) ──
//       const rankTarget = (otherId: string): number => {
//         if (isBath) {
//           // Attached → bedroom only; common → living/dining then bedroom
//           if (isAttachedBath) {
//             if (isBedroomId(otherId)) return 100;
//             return 0;
//           }
//           if (otherId === "living" || otherId === "family") return 90;
//           if (otherId === "dining") return 80;
//           if (otherId.includes("corridor") || otherId.includes("passage"))
//             return 70;
//           if (isBedroomId(otherId)) return 40;
//           return 0;
//         }
//         if (isThisBedroom) {
//           // Bedroom → living first, then dining/corridor
//           // Never: bathroom (bath opens into bed), kitchen, other bedrooms
//           if (otherId.startsWith("bathroom")) return 0;
//           if (isKitchenId(otherId)) return 0;
//           if (isBedroomId(otherId)) return 0;
//           if (otherId === "living" || otherId === "family") return 100;
//           if (otherId === "dining") return 80;
//           if (otherId.includes("corridor") || otherId.includes("passage"))
//             return 70;
//           if (otherId === "lounge") return 60;
//           if (otherId === "utility") return 15;
//           return 10;
//         }
//         if (isKitchen || isKitchenId(room.id)) {
//           if (otherId === "dining") return 100;
//           if (otherId === "living" || otherId === "family") return 90;
//           if (otherId === "utility") return 70;
//           if (otherId.startsWith("store")) return 50;
//           if (otherId.startsWith("bathroom")) return 0;
//           if (isBedroomId(otherId)) return 0;
//           return 20;
//         }
//         if (isPooja) {
//           if (otherId === "living" || otherId === "family") return 100;
//           if (otherId === "dining") return 80;
//           if (otherId.includes("corridor")) return 60;
//           if (otherId.startsWith("bathroom")) return 0;
//           return 20;
//         }
//         if (room.id === "utility" || room.id.startsWith("utility")) {
//           if (isKitchenId(otherId)) return 100;
//           if (otherId === "living" || otherId === "dining") return 70;
//           if (otherId.startsWith("bathroom")) return 0;
//           return 30;
//         }
//         if (room.id === "dining") {
//           if (otherId.startsWith("bathroom")) return 0;
//           if (otherId === "living" || otherId === "family") return 100;
//           if (isKitchenId(otherId)) return 90;
//           if (isBedroomId(otherId)) return 0;
//           return 30;
//         }
//         if (room.id === "staircase") {
//           if (otherId === "living" || otherId === "family") return 100;
//           if (otherId.includes("corridor") || otherId.includes("lobby"))
//             return 80;
//           return 30;
//         }
//         // Default: public rooms preferred
//         if (isPublicId(otherId) && !isKitchenId(otherId)) return 80;
//         if (isKitchenId(otherId)) return 40;
//         if (isBedroomId(otherId)) return 10;
//         return 20;
//       };

//       validShared = validShared
//         .map((s) => ({ s, rank: rankTarget(s.other.id) }))
//         .filter((x) => x.rank > 0)
//         .sort((a, b) => b.rank - a.rank || b.s.length - a.s.length)
//         .map((x) => x.s);

//       if (isBath && isAttachedBath) {
//         // Match attached-N → bedroom-master-N when possible, else longest wall
//         const suffix = room.id.match(/(\d+)$/)?.[1];
//         const bedroomWalls = validShared.filter((s) => isBedroomId(s.other.id));
//         const matched = suffix
//           ? bedroomWalls.find(
//               (s) =>
//                 s.other.id === `bedroom-master-${suffix}` ||
//                 (suffix === "1" && s.other.id === "bedroom-master")
//             )
//           : undefined;
//         if (matched) {
//           validShared = [matched];
//         } else if (bedroomWalls.length > 0) {
//           validShared = [...bedroomWalls].sort((a, b) => b.length - a.length);
//         }
//       } else if (isThisBedroom) {
//         // Never door into another bedroom if any alternative exists.
//         // Prefer public rooms (living/dining/corridor) over everything else.
//         const publicWalls = validShared.filter(
//           (s) =>
//             s.other.id === "living" ||
//             s.other.id === "family" ||
//             s.other.id === "dining" ||
//             s.other.id === "lounge" ||
//             s.other.id.includes("corridor") ||
//             s.other.id.includes("passage") ||
//             s.other.id.includes("lobby")
//         );
//         if (publicWalls.length > 0) {
//           validShared = publicWalls;
//         } else {
//           const nonBed = validShared.filter((s) => !isBedroomId(s.other.id));
//           if (nonBed.length > 0) validShared = nonBed;
//         }
//       } else if (isKitchen || isKitchenId(room.id)) {
//         const ok = validShared.filter(
//           (s) =>
//             !s.other.id.startsWith("bathroom") && !isBedroomId(s.other.id)
//         );
//         if (ok.length > 0) validShared = ok;
//       }

//       // Fallback: still never allow bath↔kitchen
//       if (validShared.length === 0) {
//         validShared = shared.filter((s) => {
//           if (s.other.id === "parking" || s.other.id === "garden") return false;
//           if (isBath && isKitchenId(s.other.id)) return false;
//           if ((isKitchen || isKitchenId(room.id)) && s.other.id.startsWith("bathroom"))
//             return false;
//           return true;
//         });
//         if (validShared.length === 0) {
//           // Last resort for baths: exterior wall door (no shared internal)
//           validShared = [];
//         }
//       }

//       if (validShared.length > 0) {
//         // validShared already ranked by room-type preference + longest overlap
//         const chosen = validShared[0];

//         const wallSpan =
//           chosen.wall === "top" || chosen.wall === "bottom"
//             ? room.width
//             : room.height;
//         const localStart =
//           chosen.wall === "top" || chosen.wall === "bottom"
//             ? chosen.overlapStart - room.x
//             : chosen.overlapStart - room.y;
//         const localEnd =
//           chosen.wall === "top" || chosen.wall === "bottom"
//             ? chosen.overlapEnd - room.x
//             : chosen.overlapEnd - room.y;

//         // Always centre the door inside the shared-wall overlap first
//         let localPos = localStart + (localEnd - localStart - doorWidth) / 2;

//         // Keep door fully inside the overlap, with a small margin so it
//         // never sits on the very edge of the shared segment.
//         const EDGE = 0.75;
//         let minPos = localStart + EDGE;
//         let maxPos = localEnd - doorWidth - EDGE;

//         // Extra room-level corner clearance (from room ends)
//         minPos = Math.max(minPos, 1.5);
//         maxPos = Math.min(maxPos, wallSpan - doorWidth - 1.5);

//         // Bedrooms: prefer middle third of the room wall when the overlap allows it
//         if (isThisBedroom || room.id.startsWith("bedroom")) {
//           const midMin = wallSpan / 3;
//           const midMax = (2 * wallSpan) / 3 - doorWidth;
//           if (midMin <= midMax) {
//             minPos = Math.max(minPos, midMin);
//             maxPos = Math.min(maxPos, midMax);
//           }
//         }

//         // Kitchens: bias door toward the dining / living side of the shared wall
//         if (isKitchen || isKitchenId(room.id)) {
//           if (chosen.wall === "top" || chosen.wall === "bottom") {
//             if (chosen.other.x + chosen.other.width / 2 < room.x + room.width / 2) {
//               localPos = minPos;
//             } else {
//               localPos = maxPos;
//             }
//           } else {
//             if (chosen.other.y + chosen.other.height / 2 < room.y + room.height / 2) {
//               localPos = minPos;
//             } else {
//               localPos = maxPos;
//             }
//           }
//         }

//         let clampedPos = localPos;
//         if (minPos <= maxPos) {
//           clampedPos = Math.max(minPos, Math.min(maxPos, localPos));
//         } else {
//           // Overlap too short for preferred clearances — fall back to pure centre of overlap
//           clampedPos = localStart + (localEnd - localStart - doorWidth) / 2;
//           clampedPos = Math.max(0, Math.min(wallSpan - doorWidth, clampedPos));
//         }

//         doors.push({
//           room: room.id,
//           wall: chosen.wall,
//           position: Math.round(clampedPos * 10) / 10,
//           width: doorWidth,
//           connectsTo: chosen.other.id,
//         });
//       } else {
//         // No valid internal neighbour — pick an exterior-facing wall that
//         // does NOT back onto a kitchen (critical for bathrooms).
//         const facesKitchen = (wall: "top" | "bottom" | "left" | "right") =>
//           rooms.some((r2) => {
//             if (!isKitchenId(r2.id) && r2.id !== "kitchen") return false;
//             if (wall === "right" && Math.abs(room.x + room.width - r2.x) < 0.6)
//               return true;
//             if (wall === "left" && Math.abs(room.x - (r2.x + r2.width)) < 0.6)
//               return true;
//             if (wall === "bottom" && Math.abs(room.y + room.height - r2.y) < 0.6)
//               return true;
//             if (wall === "top" && Math.abs(room.y - (r2.y + r2.height)) < 0.6)
//               return true;
//             return false;
//           });
//         const candidates: Array<"top" | "bottom" | "left" | "right"> = [
//           "bottom",
//           "top",
//           "left",
//           "right",
//         ];
//         let wall: "top" | "bottom" | "left" | "right" = "bottom";
//         if (isBath) {
//           wall =
//             candidates.find((w) => !facesKitchen(w)) ||
//             candidates.find((w) =>
//               rooms.some((r2) => {
//                 if (!isBedroomId(r2.id)) return false;
//                 if (w === "right" && Math.abs(room.x + room.width - r2.x) < 0.6)
//                   return true;
//                 if (w === "left" && Math.abs(room.x - (r2.x + r2.width)) < 0.6)
//                   return true;
//                 if (
//                   w === "bottom" &&
//                   Math.abs(room.y + room.height - r2.y) < 0.6
//                 )
//                   return true;
//                 if (w === "top" && Math.abs(room.y - (r2.y + r2.height)) < 0.6)
//                   return true;
//                 return false;
//               })
//             ) ||
//             "left";
//         }
//         const wallSpan =
//           wall === "top" || wall === "bottom" ? room.width : room.height;
//         let mainPos = (wallSpan - doorWidth) / 2;
//         mainPos = Math.max(2.0, Math.min(wallSpan - doorWidth - 2.0, mainPos));
//         doors.push({
//           room: room.id,
//           wall,
//           position: Math.round(mainPos * 10) / 10,
//           width: doorWidth,
//         });
//       }
//     }
//   });

//   // ─── CONNECTIVITY GUARANTEE ───
//   // Every door above was chosen by local heuristics (nearest matching wall for
//   // that room in isolation). Nothing so far checks that the result actually
//   // forms one connected path back to the entrance — so a room could end up
//   // opening only into another room that itself has no door onward, leaving
//   // both stranded (this is what was happening to bathrooms/pooja rooms boxed
//   // in behind other rooms). Do a reachability pass from the entrance and
//   // bridge in a door for any room that didn't make it.
//   const findDoorNeighbor = (d: Door): Room | null => {
//     const room = rooms.find((r) => r.id === d.room);
//     if (!room) return null;
//     const isH = d.wall === "top" || d.wall === "bottom";
//     const dStart = (isH ? room.x : room.y) + d.position;
//     const dEnd = dStart + d.width;
//     let bestRoom: Room | null = null;
//     let bestOverlap = 0;
//     rooms.forEach((r2) => {
//       if (r2.id === room.id) return;
//       let touches = false;
//       if (d.wall === "right" && Math.abs(room.x + room.width - r2.x) < ADJACENCY_TOL) touches = true;
//       if (d.wall === "left" && Math.abs(room.x - (r2.x + r2.width)) < ADJACENCY_TOL) touches = true;
//       if (d.wall === "bottom" && Math.abs(room.y + room.height - r2.y) < ADJACENCY_TOL) touches = true;
//       if (d.wall === "top" && Math.abs(room.y - (r2.y + r2.height)) < ADJACENCY_TOL) touches = true;
//       if (!touches) return;
//       const s2 = isH ? r2.x : r2.y;
//       const e2 = isH ? r2.x + r2.width : r2.y + r2.height;
//       const overlap = Math.min(e2, dEnd) - Math.max(s2, dStart);
//       if (overlap > 0.3 && overlap > bestOverlap) {
//         bestRoom = r2;
//         bestOverlap = overlap;
//       }
//     });
//     return bestRoom;
//   };

//   const graph = new Map<string, Set<string>>();
//   rooms.forEach((r) => graph.set(r.id, new Set<string>()));
//   doors.forEach((d) => {
//     const neighbor = findDoorNeighbor(d);
//     if (neighbor) {
//       graph.get(d.room)?.add(neighbor.id);
//       graph.get(neighbor.id)?.add(d.room);
//     }
//   });

//   const entranceRoom = rooms.find((r) => r.id === "living" || r.id === "family");
//   if (entranceRoom) {
//     const reached = new Set<string>([entranceRoom.id]);
//     let queue = [entranceRoom.id];
//     while (queue.length) {
//       const cur = queue.shift()!;
//       graph.get(cur)?.forEach((n) => {
//         if (!reached.has(n)) {
//           reached.add(n);
//           queue.push(n);
//         }
//       });
//     }

//     // Iterate to a fixed point: bridging one room may itself unlock the path
//     // for another room chained behind it.
//     let progressed = true;
//     let guard = 0;
//     while (progressed && guard < rooms.length + 2) {
//       progressed = false;
//       guard++;
//       rooms.forEach((room) => {
//         if (reached.has(room.id) || room.id === "garden") return;

//         // A room can already sit in the door-graph next to a room that has
//         // JUST become reached (e.g. two rooms whose only doors open onto
//         // each other, like a bathroom that only connects to a kitchen). In
//         // that case the room is already connected — walking the existing
//         // edge for free — and does not need a brand-new bridge door on top
//         // of the one it already has. Skipping this check was the cause of
//         // rooms ending up with two doors on the same wall.
//         const existingNeighbors = graph.get(room.id);
//         if (existingNeighbors) {
//           for (const n of existingNeighbors) {
//             if (reached.has(n)) {
//               reached.add(room.id);
//               progressed = true;
//               return;
//             }
//           }
//         }

//         const shared = getSharedWalls(room);
//         if (shared.length === 0) return;

//         // Prefer bridging through a neighbour that's already reached (and
//         // avoid routing a bridge door through parking/garden if there's any
//         // other option — a bathroom door shouldn't open onto the driveway).
//         const isBed = (id: string) =>
//           id.includes("bedroom") && !id.includes("bath");
//         const isKit = (id: string) =>
//           id === "kitchen" || id.startsWith("kitchen");
//         const isBathRoom = room.id.startsWith("bathroom");
//         // Bathrooms must never bridge into the kitchen
//         const usable = shared.filter((s) => {
//           if (s.other.id === "parking" || s.other.id === "garden") return false;
//           if (isBathRoom && isKit(s.other.id)) return false;
//           if (isKit(room.id) && s.other.id.startsWith("bathroom")) return false;
//           return true;
//         });
//         const pool = usable.length > 0 ? usable : shared.filter((s) => {
//           // Even last-resort pool blocks bath↔kitchen
//           if (isBathRoom && isKit(s.other.id)) return false;
//           if (isKit(room.id) && s.other.id.startsWith("bathroom")) return false;
//           return true;
//         });
//         if (pool.length === 0) return;
//         const reachedPool = pool.filter((s) => reached.has(s.other.id));
//         // Prefer connecting to a reached PUBLIC room — never force path through bedroom
//         const isPub = (id: string) =>
//           id === "living" ||
//           id === "family" ||
//           id === "dining" ||
//           id === "lounge" ||
//           (!isBathRoom && isKit(id)) ||
//           id.includes("corridor") ||
//           id.includes("passage") ||
//           id.includes("lobby") ||
//           id.startsWith("store");
//         const publicReached = reachedPool.filter((s) => isPub(s.other.id));
//         // Attached bath may still connect to its bedroom
//         const bathToBed = isBathRoom
//           ? reachedPool.filter((s) => isBed(s.other.id))
//           : [];
//         let candidate =
//           (bathToBed.length > 0
//             ? bathToBed.sort((a, b) => b.length - a.length)[0]
//             : undefined) ||
//           publicReached.sort((a, b) => b.length - a.length)[0] ||
//           reachedPool.sort((a, b) => b.length - a.length)[0] ||
//           [...pool].sort((a, b) => b.length - a.length)[0];
//         if (!candidate || !reached.has(candidate.other.id)) return; // wait for a later pass
//         // Final guard
//         if (isBathRoom && isKit(candidate.other.id)) return;
//         if (isKit(room.id) && candidate.other.id.startsWith("bathroom")) return;

//         const doorWidth = Math.min(3.0, Math.max(1.5, candidate.length - 1.0));
//         const wallSpan = candidate.wall === "top" || candidate.wall === "bottom" ? room.width : room.height;
//         const localStart =
//           candidate.wall === "top" || candidate.wall === "bottom"
//             ? candidate.overlapStart - room.x
//             : candidate.overlapStart - room.y;
//         const localEnd =
//           candidate.wall === "top" || candidate.wall === "bottom"
//             ? candidate.overlapEnd - room.x
//             : candidate.overlapEnd - room.y;
//         let pos = localStart + (localEnd - localStart - doorWidth) / 2;
//         pos = Math.max(localStart, Math.min(localEnd - doorWidth, pos));
//         pos = Math.max(0.3, Math.min(wallSpan - doorWidth - 0.3, pos));

//         doors.push({
//           room: room.id,
//           wall: candidate.wall,
//           position: Math.round(pos * 10) / 10,
//           width: Math.round(doorWidth * 10) / 10,
//         });

//         reached.add(room.id);
//         graph.get(room.id)?.add(candidate.other.id);
//         graph.get(candidate.other.id)?.add(room.id);
//         progressed = true;
//       });
//     }
//   }

//   // ─── NO CIRCULATION THROUGH BEDROOMS ─────────────────────────────────
//   // If a non-bedroom room (kitchen, pooja, lounge, store, staircase, …)
//   // currently opens only into a bedroom, move its door onto a shared wall
//   // with living / corridor / lounge / kitchen when one exists.
//   {
//     const isBed = (id: string) =>
//       id.includes("bedroom") && !id.includes("bath");
//     const isPub = (id: string) =>
//       id === "living" ||
//       id === "family" ||
//       id === "dining" ||
//       id === "lounge" ||
//       id === "kitchen" ||
//       id.includes("corridor") ||
//       id.includes("passage") ||
//       id.includes("lobby") ||
//       id.startsWith("store");

//     const findNeighborId = (d: Door): string | null => {
//       const room = rooms.find((r) => r.id === d.room);
//       if (!room) return null;
//       const isH = d.wall === "top" || d.wall === "bottom";
//       const dStart = (isH ? room.x : room.y) + d.position;
//       const dEnd = dStart + d.width;
//       let best: string | null = null;
//       let bestO = 0;
//       for (const r2 of rooms) {
//         if (r2.id === room.id) continue;
//         let touches = false;
//         if (d.wall === "right" && Math.abs(room.x + room.width - r2.x) < ADJACENCY_TOL)
//           touches = true;
//         if (d.wall === "left" && Math.abs(room.x - (r2.x + r2.width)) < ADJACENCY_TOL)
//           touches = true;
//         if (d.wall === "bottom" && Math.abs(room.y + room.height - r2.y) < ADJACENCY_TOL)
//           touches = true;
//         if (d.wall === "top" && Math.abs(room.y - (r2.y + r2.height)) < ADJACENCY_TOL)
//           touches = true;
//         if (!touches) continue;
//         const s2 = isH ? r2.x : r2.y;
//         const e2 = isH ? r2.x + r2.width : r2.y + r2.height;
//         const o = Math.min(e2, dEnd) - Math.max(s2, dStart);
//         if (o > 0.3 && o > bestO) {
//           bestO = o;
//           best = r2.id;
//         }
//       }
//       return best;
//     };

//     for (const room of rooms) {
//       if (isBed(room.id)) continue;
//       if (room.id === "living" || room.id === "family") continue;
//       if (room.id === "parking" || room.id === "garden") continue;
//       // Attached baths may open to their bedroom
//       if (room.id.startsWith("bathroom")) continue;

//       const roomDoors = doors.filter((d) => d.room === room.id);
//       const opensToBed = roomDoors.some((d) => {
//         const n = findNeighborId(d);
//         return n !== null && isBed(n);
//       });
//       const opensToPub = roomDoors.some((d) => {
//         const n = findNeighborId(d);
//         return n !== null && isPub(n);
//       });
//       if (!opensToBed || opensToPub) continue;

//       // Has a door into a bedroom and none into public — try to relocate
//       // Prefer public; else any non-bedroom (staircase/store/lounge)
//       let shared = getSharedWalls(room).filter(
//         (s) => isPub(s.other.id) && s.length > 1.2
//       );
//       if (shared.length === 0) {
//         shared = getSharedWalls(room).filter(
//           (s) =>
//             !isBed(s.other.id) &&
//             !s.other.id.startsWith("bathroom") &&
//             s.other.id !== "parking" &&
//             s.other.id !== "garden" &&
//             s.length > 1.2
//         );
//       }
//       if (shared.length === 0) continue;

//       const target = shared.sort((a, b) => b.length - a.length)[0];
//       const doorWidth = Math.min(3.0, Math.max(1.8, target.length - 1.0));
//       const wallSpan =
//         target.wall === "top" || target.wall === "bottom"
//           ? room.width
//           : room.height;
//       const localStart =
//         target.wall === "top" || target.wall === "bottom"
//           ? target.overlapStart - room.x
//           : target.overlapStart - room.y;
//       const localEnd =
//         target.wall === "top" || target.wall === "bottom"
//           ? target.overlapEnd - room.x
//           : target.overlapEnd - room.y;
//       let pos = localStart + (localEnd - localStart - doorWidth) / 2;
//       pos = Math.max(0.3, Math.min(wallSpan - doorWidth - 0.3, pos));

//       // Remove bedroom-facing doors for this room; keep others
//       for (let i = doors.length - 1; i >= 0; i--) {
//         if (doors[i].room !== room.id) continue;
//         const n = findNeighborId(doors[i]);
//         if (n && isBed(n)) doors.splice(i, 1);
//       }
//       doors.push({
//         room: room.id,
//         wall: target.wall,
//         position: Math.round(pos * 10) / 10,
//         width: Math.round(doorWidth * 10) / 10,
//       });
//     }
//   }

//   // Clamp every opening so position+width stays inside the wall span
//   const clampOpening = (
//     roomId: string,
//     wall: "top" | "bottom" | "left" | "right",
//     position: number,
//     width: number
//   ) => {
//     const room = rooms.find((r) => r.id === roomId);
//     if (!room) return { position, width };
//     const span =
//       wall === "top" || wall === "bottom" ? room.width : room.height;
//     let w = Math.min(width, Math.max(1.5, span - 0.4));
//     let pos = position;
//     if (pos < 0.2) pos = 0.2;
//     if (pos + w > span - 0.2) pos = Math.max(0.2, span - 0.2 - w);
//     return {
//       position: Math.round(pos * 10) / 10,
//       width: Math.round(w * 10) / 10,
//     };
//   };

//   for (const d of doors) {
//     const c = clampOpening(d.room, d.wall, d.position, d.width);
//     d.position = c.position;
//     d.width = c.width;
//   }
//   for (const w of windows) {
//     const c = clampOpening(w.room, w.wall, w.position, w.width);
//     w.position = c.position;
//     w.width = c.width;
//   }

//   // ─── SEPARATE WINDOWS FROM DOORS (same wall / same spot) ─────────────
//   // Door + window on the same stretch of wall look like one opening.
//   // Move the window to another exterior wall, or slide it clear of the door.
//   {
//     const overlaps = (
//       aPos: number,
//       aW: number,
//       bPos: number,
//       bW: number
//     ) => Math.min(aPos + aW, bPos + bW) - Math.max(aPos, bPos) > 0.3;

//     for (let wi = windows.length - 1; wi >= 0; wi--) {
//       const win = windows[wi];
//       const room = rooms.find((r) => r.id === win.room);
//       if (!room) continue;

//       const roomDoors = doors.filter(
//         (d) => d.room === win.room && d.wall === win.wall
//       );
//       const hitsDoor = roomDoors.some((d) =>
//         overlaps(win.position, win.width, d.position, d.width)
//       );
//       if (!hitsDoor) continue;

//       // Try another exterior wall that has no door
//       const shared = getSharedWalls(room);
//       const extWalls: ("top" | "bottom" | "left" | "right")[] = [];
//       (["top", "bottom", "left", "right"] as const).forEach((w) => {
//         if (isWallExternal(room, w, shared)) extWalls.push(w);
//       });
//       const doorWalls = new Set(
//         doors.filter((d) => d.room === room.id).map((d) => d.wall)
//       );
//       const alt = extWalls.find((w) => w !== win.wall && !doorWalls.has(w));

//       if (alt) {
//         const span = alt === "top" || alt === "bottom" ? room.width : room.height;
//         const ww = Math.min(win.width, Math.max(1.5, span - 1));
//         win.wall = alt;
//         win.position = Math.max(0.5, (span - ww) / 2);
//         win.width = ww;
//         continue;
//       }

//       // Same wall only option — slide window clear of every door on that wall
//       const span =
//         win.wall === "top" || win.wall === "bottom" ? room.width : room.height;
//       let placed = false;
//       for (const tryPos of [
//         0.4,
//         span - win.width - 0.4,
//         span * 0.15,
//         span * 0.6,
//       ]) {
//         const pos = Math.max(0.3, Math.min(span - win.width - 0.3, tryPos));
//         if (
//           roomDoors.every(
//             (d) => !overlaps(pos, win.width, d.position, d.width)
//           )
//         ) {
//           win.position = Math.round(pos * 10) / 10;
//           placed = true;
//           break;
//         }
//       }
//       // If still overlapping and wall is tiny, drop the window
//       if (
//         !placed &&
//         roomDoors.some((d) =>
//           overlaps(win.position, win.width, d.position, d.width)
//         )
//       ) {
//         windows.splice(wi, 1);
//       }
//     }
//   }

//   // ─── DEDUPE DOORS ON SHARED WALLS ───
//   // Living and Dining each pick a door onto the same opening → two swings.
//   // Keep one door per shared opening. Prefer non-living as the owner.
//   {
//     const opposite: Record<string, "top" | "bottom" | "left" | "right"> = {
//       top: "bottom",
//       bottom: "top",
//       left: "right",
//       right: "left",
//     };
//     const roomById = new Map(rooms.map((r) => [r.id, r]));
//     const toRemove = new Set<number>();

//     for (let i = 0; i < doors.length; i++) {
//       if (toRemove.has(i)) continue;
//       const a = doors[i];
//       const ra = roomById.get(a.room);
//       if (!ra) continue;
//       const aConnects =
//         (a as Door & { connectsTo?: string }).connectsTo ||
//         findDoorNeighbor(a)?.id;

//       for (let j = i + 1; j < doors.length; j++) {
//         if (toRemove.has(j)) continue;
//         const b = doors[j];
//         if (a.room === b.room) continue;
//         const rb = roomById.get(b.room);
//         if (!rb) continue;

//         const bConnects =
//           (b as Door & { connectsTo?: string }).connectsTo ||
//           findDoorNeighbor(b)?.id;
//         const mutual =
//           aConnects === b.room ||
//           bConnects === a.room ||
//           (aConnects === b.room && bConnects === a.room);
//         if (!mutual) continue;
//         if (opposite[a.wall] !== b.wall) continue;

//         const aIsH = a.wall === "top" || a.wall === "bottom";
//         const bIsH = b.wall === "top" || b.wall === "bottom";
//         if (aIsH !== bIsH) continue;
//         const aStart = (aIsH ? ra.x : ra.y) + a.position;
//         const bStart = (bIsH ? rb.x : rb.y) + b.position;
//         const overlap =
//           Math.min(aStart + a.width, bStart + b.width) -
//           Math.max(aStart, bStart);
//         if (overlap < 1.0) continue;

//         const aIsLiving = a.room === "living";
//         const bIsLiving = b.room === "living";
//         if (aIsLiving && !bIsLiving) toRemove.add(i);
//         else if (bIsLiving && !aIsLiving) toRemove.add(j);
//         else toRemove.add(j);
//       }
//     }

//     if (toRemove.size > 0) {
//       const kept: Door[] = [];
//       doors.forEach((d, di) => {
//         if (!toRemove.has(di)) kept.push(d);
//       });
//       doors.length = 0;
//       doors.push(...kept);
//     }
//   }

//   // ─── DINING: at most one door ───
//   {
//     const diningIdxs = doors
//       .map((d, i) => (d.room === "dining" ? i : -1))
//       .filter((i) => i >= 0);
//     if (diningIdxs.length > 1) {
//       let keep = diningIdxs[0];
//       for (const i of diningIdxs) {
//         const d = doors[i] as Door & { connectsTo?: string };
//         const nb = d.connectsTo || findDoorNeighbor(d)?.id;
//         if (nb === "living" || nb === "family") {
//           keep = i;
//           break;
//         }
//       }
//       const kept: Door[] = [];
//       doors.forEach((d, i) => {
//         if (d.room !== "dining" || i === keep) kept.push(d);
//       });
//       doors.length = 0;
//       doors.push(...kept);
//     }
//   }

//   return { doors, windows };
// }
