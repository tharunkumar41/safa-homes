// import { Room } from "./types";

// /**
//  * Rooms anchored to compass directions under Vastu — preferred not to move:
//  *   Primary Master → SW, Kitchen → SE, Pooja → NE, Bath → NW, Staircase → fixed
//  * Living / dining / parking / extra bedrooms / utility may move to the road.
//  *
//  * When master count is high, secondary masters (bedroom-master-2, -3, …) are
//  * allowed to yield the road wall so Living can keep the entrance on the road.
//  * Primary "bedroom-master" stays protected unless nothing else can free the road.
//  *
//  * Goal: Living must end on the road-facing wall for ANY plot size / aspect.
//  * Dimension changes must not leave Living on a side or rear wall.
//  */
// const HARD_PROTECTED = ["kitchen", "pooja", "bathroom", "staircase"];

// function isHardProtected(id: string): boolean {
//   return HARD_PROTECTED.some((p) => id === p || id.startsWith(p));
// }

// /** Primary master only — secondary masters may yield the road edge. */
// function isPrimaryMaster(id: string): boolean {
//   return id === "bedroom-master";
// }

// function isSecondaryMaster(id: string): boolean {
//   return id.startsWith("bedroom-master-") && id !== "bedroom-master";
// }

// function area(r: Room): number {
//   return Math.max(0, r.width) * Math.max(0, r.height);
// }

// interface Envelope {
//   x: number;
//   y: number;
//   width: number;
//   height: number;
// }

// /**
//  * Swap only geometry (x/y/w/h). Ids and labels stay with the room object.
//  */
// function swapGeometry(a: Room, b: Room) {
//   const t = { x: a.x, y: a.y, width: a.width, height: a.height };
//   a.x = b.x;
//   a.y = b.y;
//   a.width = b.width;
//   a.height = b.height;
//   b.x = t.x;
//   b.y = t.y;
//   b.width = t.width;
//   b.height = t.height;
// }

// /**
//  * Engines place living on the North band. For South/East/West road, move
//  * living (and parking) onto the road wall by swapping with non-protected
//  * rooms. Living always ends up as the largest habitable room by area, while
//  * staying on the road wall whenever possible.
//  *
//  * After any size-fix pass (ensureLivingIsLargest / closeSmallGaps), call
//  * this again so Living is forced back onto the road if it was displaced.
//  */
// export function reorientForRoadFacing(
//   rooms: Room[],
//   envelope: Envelope,
//   roadFacing: "North" | "South" | "East" | "West" | undefined
// ): void {
//   if (!rooms.length) return;

//   const tol = 0.6;
//   const touchesFrontWall = (r: Room): boolean => {
//     if (!roadFacing || roadFacing === "North") {
//       return Math.abs(r.y - envelope.y) < tol;
//     }
//     if (roadFacing === "South")
//       return Math.abs(r.y + r.height - (envelope.y + envelope.height)) < tol;
//     if (roadFacing === "East")
//       return Math.abs(r.x + r.width - (envelope.x + envelope.width)) < tol;
//     if (roadFacing === "West") return Math.abs(r.x - envelope.x) < tol;
//     return false;
//   };

//   /** Depth of a room measured from the road wall inward. */
//   const depthFromRoad = (r: Room): number => {
//     if (!roadFacing || roadFacing === "North") return r.height;
//     if (roadFacing === "South") return r.height;
//     return r.width; // East / West
//   };

//   /** How much of the road wall this room spans (along-wall size). */
//   const spanAlongRoad = (r: Room): number => {
//     if (!roadFacing || roadFacing === "North" || roadFacing === "South")
//       return r.width;
//     return r.height;
//   };

//   const living = rooms.find(
//     (r) => r.id === "living" || r.id === "family" || r.id === "lounge"
//   );
//   if (!living) return;
//   // Normalize so later passes always see "living"
//   if (living.id === "lounge" || living.id === "family") {
//     living.id = "living";
//     living.label = "Living Room";
//   }

//   // Soft-movable: never hard-protected; primary master excluded until last resort
//   const softMovable = () =>
//     rooms.filter(
//       (r) =>
//         r !== living &&
//         !isHardProtected(r.id) &&
//         !isPrimaryMaster(r.id)
//     );

//   const withSecondaryMasters = () =>
//     rooms.filter(
//       (r) => r !== living && !isHardProtected(r.id) && !isPrimaryMaster(r.id)
//     );

//   const anyYieldable = () =>
//     rooms.filter((r) => r !== living && !isHardProtected(r.id));

//   // Include primary master only as absolute last resort so living can reach road
//   const includingPrimaryMaster = () =>
//     rooms.filter((r) => r !== living && !isHardProtected(r.id));

//   // ── 1. Living becomes the largest soft-movable room (by area) ─────────
//   {
//     const larger = softMovable()
//       .filter((r) => area(r) > area(living) * 1.02)
//       .sort((a, b) => area(b) - area(a))[0];
//     if (larger) swapGeometry(living, larger);
//   }

//   // ── 2. For non-North road: move living onto the road wall ──────────────
//   //     Prefer the LARGEST front-wall soft room whose area is at least ~55%
//   //     of current living (so living does not collapse into a thin strip /
//   //     store slot). Fall back to any front room only if nothing adequate.
//   //     Lowered from 0.7 → 0.55 so dimension changes still find a target.
//   if (roadFacing && roadFacing !== "North" && !touchesFrontWall(living)) {
//     const pickBestFront = (pool: Room[], minAreaRatio: number) => {
//       const minA = area(living) * minAreaRatio;
//       const adequate = pool
//         .filter((r) => touchesFrontWall(r) && area(r) >= minA)
//         .sort((a, b) => {
//           // Prefer larger area, then deeper footprint from the road, then wider span
//           const da = area(b) - area(a);
//           if (Math.abs(da) > 1) return da;
//           const dd = depthFromRoad(b) - depthFromRoad(a);
//           if (Math.abs(dd) > 0.5) return dd;
//           return spanAlongRoad(b) - spanAlongRoad(a);
//         })[0];
//       if (adequate) return adequate;
//       // Fallback: largest front room regardless of size
//       return pool
//         .filter((r) => touchesFrontWall(r))
//         .sort((a, b) => area(b) - area(a))[0];
//     };

//     let bestFront = pickBestFront(softMovable(), 0.55);
//     if (!bestFront) bestFront = pickBestFront(withSecondaryMasters(), 0.5);
//     if (!bestFront) bestFront = pickBestFront(anyYieldable(), 0.4);
//     if (!bestFront) bestFront = pickBestFront(includingPrimaryMaster(), 0.3);

//     if (bestFront) {
//       swapGeometry(living, bestFront);
//     }
//   }

//   // ── 3. Living on road but another soft room on the same road wall is
//   //     larger → take that larger road footprint (keep entrance on road).
//   if (living && touchesFrontWall(living)) {
//     const biggerOnRoad = softMovable()
//       .filter((r) => touchesFrontWall(r) && area(r) > area(living) * 1.02)
//       .sort((a, b) => area(b) - area(a))[0];
//     if (biggerOnRoad) swapGeometry(living, biggerOnRoad);
//   }

//   // ── 3b. South/East/West: avoid a squat living strip on the road.
//   //     If living is on the road but very shallow, swap with a deeper
//   //     soft room that also touches the road (or the deepest soft room
//   //     overall if none on road is deep enough).
//   if (
//     living &&
//     touchesFrontWall(living) &&
//     roadFacing &&
//     roadFacing !== "North"
//   ) {
//     const minDepth = 10;
//     if (depthFromRoad(living) < minDepth) {
//       const deeperOnRoad = softMovable()
//         .filter(
//           (r) =>
//             touchesFrontWall(r) &&
//             depthFromRoad(r) > depthFromRoad(living) + 1.5 &&
//             area(r) >= area(living) * 0.7
//         )
//         .sort((a, b) => depthFromRoad(b) - depthFromRoad(a))[0];
//       if (deeperOnRoad) {
//         swapGeometry(living, deeperOnRoad);
//       }
//     }
//   }

//   // ── 4. Prefer a taller / deeper living on East/West (vertical strip) ───
//   if (
//     living &&
//     touchesFrontWall(living) &&
//     (roadFacing === "East" || roadFacing === "West")
//   ) {
//     const livingAspect = living.height / Math.max(0.1, living.width);
//     if (livingAspect < 0.85) {
//       const tallerOnRoad = softMovable()
//         .filter(
//           (r) =>
//             touchesFrontWall(r) &&
//             r.height / Math.max(0.1, r.width) > livingAspect + 0.15 &&
//             area(r) >= area(living) * 0.7
//         )
//         .sort(
//           (a, b) =>
//             b.height / Math.max(0.1, b.width) -
//             a.height / Math.max(0.1, a.width)
//         )[0];
//       if (tallerOnRoad) swapGeometry(living, tallerOnRoad);
//     }
//   }

//   // ── 5. Parking on road wall when possible (smallest front-wall slot) ───
//   const parking = rooms.find((r) => r.id === "parking");
//   if (
//     parking &&
//     roadFacing &&
//     roadFacing !== "North" &&
//     !touchesFrontWall(parking)
//   ) {
//     const candidate = softMovable()
//       .filter((r) => touchesFrontWall(r) && r !== living)
//       .sort((a, b) => area(a) - area(b))[0];
//     if (candidate) swapGeometry(parking, candidate);
//   }

//   // ── 6. Final size preference: living must stay the largest soft room ──
//   //     Prefer candidates that are still on the road wall so entrance stays.
//   if (living) {
//     const candidates = softMovable().filter(
//       (r) => area(r) > area(living) * 1.02
//     );
//     if (candidates.length > 0) {
//       const onRoad = candidates
//         .filter((r) => touchesFrontWall(r))
//         .sort((a, b) => area(b) - area(a))[0];
//       const any = candidates.sort((a, b) => area(b) - area(a))[0];
//       // Prefer larger room on the road; only leave the road if the only
//       // larger rooms are interior (and living would stay tiny otherwise).
//       if (onRoad) {
//         swapGeometry(living, onRoad);
//       } else if (any && area(any) > area(living) * 1.25) {
//         // Interior is much larger — take it, then try to return to road
//         // with the next-best front slot if living left the road.
//         swapGeometry(living, any);
//         if (
//           roadFacing &&
//           roadFacing !== "North" &&
//           !touchesFrontWall(living)
//         ) {
//           const front = softMovable()
//             .filter((r) => touchesFrontWall(r) && area(r) >= area(living) * 0.55)
//             .sort((a, b) => area(b) - area(a))[0];
//           if (front) swapGeometry(living, front);
//         }
//       }
//     }
//   }

//   // ── 7. HARD GUARANTEE: Living must touch the road wall ─────────────────
//   //     After all preference swaps, if living is still not on the road,
//   //     force a swap with ANY room on the road (even primary master).
//   //     This is what keeps Living road-facing when length/width change.
//   if (living && roadFacing && !touchesFrontWall(living)) {
//     const forcePool = rooms
//       .filter((r) => r !== living && touchesFrontWall(r))
//       .sort((a, b) => {
//         // Prefer non-protected, then larger area, then deeper
//         const aHard = isHardProtected(a.id) ? 1 : 0;
//         const bHard = isHardProtected(b.id) ? 1 : 0;
//         if (aHard !== bHard) return aHard - bHard;
//         const da = area(b) - area(a);
//         if (Math.abs(da) > 1) return da;
//         return depthFromRoad(b) - depthFromRoad(a);
//       });
//     if (forcePool.length > 0) {
//       swapGeometry(living, forcePool[0]);
//     }
//   }
// }
