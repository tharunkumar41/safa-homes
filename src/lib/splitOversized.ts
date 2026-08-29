// import { Room } from "./types";

// /**
//  * Post-processing pass: finds any room that has grown too large or too
//  * elongated (usually because the layout algorithm stretched one room to
//  * absorb leftover space on a side of the plot) and carves it into 2 or 3
//  * rooms — the original room kept at a sensible size, plus one or two new
//  * "filler" rooms placed in the freed space. Because the filler rooms are
//  * always carved out of the oversized room's own original rectangle, this
//  * can never create a new overlap with any other room.
//  */

// function snap(v: number): number {
//   return Math.round(v * 2) / 2;
// }

// interface Cap {
//   maxArea: number;
//   maxAspect: number;
// }

// /**
//  * Standard size ceilings (from design table) with a small tolerance.
//  * Rooms must not grow far beyond these — leftover space goes to other rooms
//  * or store fillers, not one oversized living/dining.
//  *
//  *   Living 14×16=224 → max 260
//  *   Master 12×14=168 → max 190
//  *   Bedroom 10×12=120 → max 140
//  *   Kitchen 10×10=100 → max 120
//  *   Dining 10×12=120 → max 140
//  *   Bath common 5×8=40 → max 55
//  *   Bath attached 6×8=48 → max 65
//  *   Pooja 5×6=30 → max 42
//  *   Utility 5×8=40 → max 55
//  *   Store 5×6=30 → max 50
//  *   Parking 10×18=180 → max 220
//  *   Stair 7×14=98 → max 120
//  */
// function capFor(id: string): Cap {
//   if (id === "living" || id === "family" || id === "lounge") {
//     return { maxArea: 300, maxAspect: 2.2 };
//   }
//   if (id === "bedroom-master" || id.startsWith("bedroom-master")) {
//     return { maxArea: 190, maxAspect: 1.7 };
//   }
//   if (id.startsWith("bedroom")) {
//     return { maxArea: 140, maxAspect: 1.7 };
//   }
//   if (id === "kitchen" || id.startsWith("kitchen")) {
//     return { maxArea: 120, maxAspect: 1.8 };
//   }
//   if (id === "dining") {
//     return { maxArea: 140, maxAspect: 1.8 };
//   }
//   if (id.startsWith("bathroom-attached") || id.includes("attached")) {
//     return { maxArea: 65, maxAspect: 2.0 };
//   }
//   if (id.startsWith("bathroom")) {
//     return { maxArea: 55, maxAspect: 2.2 };
//   }
//   if (id === "pooja") {
//     return { maxArea: 42, maxAspect: 1.8 };
//   }
//   if (id === "utility") {
//     return { maxArea: 55, maxAspect: 2.0 };
//   }
//   if (id.includes("store") || id.includes("pantry") || id.includes("study")) {
//     return { maxArea: 80, maxAspect: 2.2 };
//   }
//   if (id === "parking") {
//     return { maxArea: 220, maxAspect: 2.2 };
//   }
//   if (id === "staircase") {
//     return { maxArea: 120, maxAspect: 2.5 };
//   }
//   if (id.includes("corridor") || id.includes("passage") || id === "garden") {
//     return { maxArea: Infinity, maxAspect: Infinity };
//   }
//   return { maxArea: 100, maxAspect: 2.2 };
// }

// /** Max area a room may reach during fill/grow passes. */
// export function maxAreaForRoom(id: string): number {
//   return capFor(id).maxArea;
// }

// /** Rotates through sensible names for newly-created filler rooms. */
// function fillerLabel(sourceId: string, indexForSource: number): { id: string; label: string } {
//   const nth = indexForSource; // 0 = first filler carved from this room, 1 = second
//   if (sourceId === "living" || sourceId === "family" || sourceId === "lounge") {
//     const names = ["Family Lounge", "Store Room"];
//     return { id: `family-ext`, label: names[Math.min(nth, names.length - 1)] };
//   }
//   if (sourceId.startsWith("bedroom-master")) {
//     const names = ["Walk-in Closet", "Store Room"];
//     return { id: `closet-ext`, label: names[Math.min(nth, names.length - 1)] };
//   }
//   if (sourceId.startsWith("bedroom")) {
//     const names = ["Study Room", "Store Room"];
//     return { id: `study-ext`, label: names[Math.min(nth, names.length - 1)] };
//   }
//   if (sourceId === "kitchen" || sourceId === "dining") {
//     const names = ["Store Room", "Pantry"];
//     return { id: `store-ext`, label: names[Math.min(nth, names.length - 1)] };
//   }
//   return { id: `store-ext`, label: "Store Room" };
// }

// /** Unique room id — never collides across split / ensure / grow passes. */
// let _uidSeq = 0;
// function uniqueRoomId(prefix: string): string {
//   _uidSeq += 1;
//   // Deterministic — no Math.random (avoids SSR hydration mismatch)
//   return `${prefix}-${_uidSeq}`;
// }

// /**
//  * Drop exact duplicate rooms (same id, or same geometry within 0.3 ft).
//  * Keeps the first occurrence. Prevents React key collisions.
//  */
// export function dedupeRooms(rooms: Room[]): Room[] {
//   const seenIds = new Set<string>();
//   const seenGeo = new Set<string>();
//   const out: Room[] = [];
//   for (const r of rooms) {
//     // Drop zero-size junk
//     if (r.width < 1 || r.height < 1) continue;

//     const geoKey = [
//       Math.round(r.x * 2) / 2,
//       Math.round(r.y * 2) / 2,
//       Math.round(r.width * 2) / 2,
//       Math.round(r.height * 2) / 2,
//     ].join("_");
//     if (seenGeo.has(geoKey)) continue; // identical footprint
//     seenGeo.add(geoKey);

//     let id = r.id || "room";
//     if (seenIds.has(id)) {
//       id = uniqueRoomId(id.replace(/-\d+$/, "") || "room");
//       r.id = id;
//     }
//     seenIds.add(id);
//     out.push(r);
//   }
//   // Final pass: renumber any remaining collisions deterministically by index
//   const finalIds = new Set<string>();
//   for (let i = 0; i < out.length; i++) {
//     let id = out[i].id;
//     if (finalIds.has(id)) {
//       out[i] = { ...out[i], id: `${id}-i${i}` };
//       id = out[i].id;
//     }
//     finalIds.add(id);
//   }
//   return out;
// }

// export function splitOversizedRooms(rooms: Room[]): Room[] {
//   let counter = 0;
//   const extras: Room[] = [];

//   for (const r of rooms) {
//     const cap = capFor(r.id);
//     if (!isFinite(cap.maxArea) && !isFinite(cap.maxAspect)) continue;

//     const area = r.width * r.height;
//     const aspect = Math.max(r.width, r.height) / Math.max(0.1, Math.min(r.width, r.height));
//     const isOversized = area > cap.maxArea * 1.15 || aspect > cap.maxAspect + 0.15;
//     if (!isOversized) continue;

//     const wide = r.width >= r.height;
//     const longSide = wide ? r.width : r.height;
//     const shortSide = wide ? r.height : r.width;

//     // Keep ~60-65% of the long side for the main room, but never shrink the
//     // short side, and never go below a livable minimum on the long side.
//     let keepLong = snap(Math.max(shortSide * 1.05, Math.min(longSide * 0.63, cap.maxArea / Math.max(1, shortSide))));
//     keepLong = Math.min(keepLong, longSide - 4); // must free up at least 4ft
//     if (!(keepLong > 0) || longSide - keepLong < 4) continue; // not enough to carve

//     const freedLong = snap(longSide - keepLong);

//     // Shrink the room itself, keeping its x/y (near) corner fixed.
//     if (wide) {
//       r.width = keepLong;
//     } else {
//       r.height = keepLong;
//     }

//     // The freed strip runs along the long axis, `freedLong` deep and
//     // `shortSide` wide. If that strip is roomy enough, split it into two
//     // filler rooms end-to-end instead of one, giving 2-3 total rooms.
//     const stripX = wide ? r.x + keepLong : r.x;
//     const stripY = wide ? r.y : r.y + keepLong;
//     const stripW = wide ? freedLong : shortSide;
//     const stripH = wide ? shortSide : freedLong;

//     const pieces: { x: number; y: number; w: number; h: number }[] = [];
//     if (shortSide >= 9) {
//       const half = snap(shortSide / 2);
//       if (wide) {
//         pieces.push({ x: stripX, y: stripY, w: stripW, h: half });
//         pieces.push({ x: stripX, y: stripY + half, w: stripW, h: snap(shortSide - half) });
//       } else {
//         pieces.push({ x: stripX, y: stripY, w: half, h: stripH });
//         pieces.push({ x: stripX + half, y: stripY, w: snap(shortSide - half), h: stripH });
//       }
//     } else {
//       pieces.push({ x: stripX, y: stripY, w: stripW, h: stripH });
//     }

//     pieces.forEach((p, idx) => {
//       if (p.w < 3.5 || p.h < 3.5) return; // too small to be a usable room
//       const { id, label } = fillerLabel(r.id, idx);
//       counter += 1;
//       extras.push({
//         id: uniqueRoomId(id),
//         label,
//         x: snap(p.x),
//         y: snap(p.y),
//         width: snap(p.w),
//         height: snap(p.h),
//       });
//     });
//   }

//   const afterSplit = dedupeRooms([...rooms, ...extras]);
//   return dedupeRooms(ensureLivingIsLargest(afterSplit));
// }

// function isLivingId(id: string): boolean {
//   return id === "living" || id === "family" || id === "lounge";
// }

// /** Soft rooms that Living is allowed to absorb to grow larger on the road. */
// function isAbsorbable(id: string): boolean {
//   if (isLivingId(id)) return false;
//   if (id.startsWith("bathroom") || id === "kitchen" || id === "pooja") return false;
//   if (id === "staircase" || id === "parking") return false;
//   if (id === "bedroom-master") return false; // primary master protected
//   // dining, store, pantry, utility, secondary beds, study, corridors — OK to absorb
//   return true;
// }

// /**
//  * Grow Living (on the road wall) by absorbing adjacent soft rooms until it
//  * is clearly the largest public room. Call AFTER reorientForRoadFacing so
//  * Living is already on the road; this expands it inward / sideways without
//  * leaving the road edge.
//  *
//  * Target: at least max(160, 18% of envelope, 1.15× next-largest habitable).
//  */
// export function growLivingOnRoad(
//   rooms: Room[],
//   envelope?: { x: number; y: number; width: number; height: number },
//   roadFacing?: "North" | "South" | "East" | "West"
// ): Room[] {
//   const living = rooms.find((r) => isLivingId(r.id));
//   if (!living) return rooms;

//   const env = envelope || {
//     x: Math.min(...rooms.map((r) => r.x)),
//     y: Math.min(...rooms.map((r) => r.y)),
//     width: 0,
//     height: 0,
//   };
//   if (!envelope) {
//     const maxX = Math.max(...rooms.map((r) => r.x + r.width));
//     const maxY = Math.max(...rooms.map((r) => r.y + r.height));
//     env.width = maxX - env.x;
//     env.height = maxY - env.y;
//   }

//   const habitableArea = (r: Room) => {
//     if (r.id.startsWith("bathroom") || r.id === "pooja" || r.id === "staircase")
//       return 0;
//     if (r.id.includes("store") || r.id.includes("corridor") || r.id === "utility")
//       return 0;
//     return Math.max(0, r.width) * Math.max(0, r.height);
//   };

//   const nextLargest = () =>
//     Math.max(
//       0,
//       ...rooms
//         .filter((r) => r !== living)
//         .map((r) => habitableArea(r))
//     );

//   const envArea = Math.max(1, env.width * env.height);
//   // Living must be clearly the largest room (standard ~224, up to 300)
//   const minTarget = Math.max(
//     200,
//     Math.min(300, envArea * 0.14),
//     nextLargest() * 1.20  // at least 20% bigger than next habitable room
//   );

//   const tol = 0.55;
//   const sharesEdge = (a: Room, b: Room): "left" | "right" | "top" | "bottom" | null => {
//     const yOverlap =
//       Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
//     const xOverlap =
//       Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
//     // b is to the right of a
//     if (Math.abs(b.x - (a.x + a.width)) < tol && yOverlap > 2) return "right";
//     // b is to the left of a
//     if (Math.abs(a.x - (b.x + b.width)) < tol && yOverlap > 2) return "left";
//     // b is below a
//     if (Math.abs(b.y - (a.y + a.height)) < tol && xOverlap > 2) return "bottom";
//     // b is above a
//     if (Math.abs(a.y - (b.y + b.height)) < tol && xOverlap > 2) return "top";
//     return null;
//   };

//   // Prefer absorbing rooms that keep Living on the road wall after merge.
//   const touchesRoad = (r: Room): boolean => {
//     if (!roadFacing || roadFacing === "North")
//       return Math.abs(r.y - env.y) < tol;
//     if (roadFacing === "South")
//       return Math.abs(r.y + r.height - (env.y + env.height)) < tol;
//     if (roadFacing === "East")
//       return Math.abs(r.x + r.width - (env.x + env.width)) < tol;
//     if (roadFacing === "West") return Math.abs(r.x - env.x) < tol;
//     return true;
//   };

//   let result = [...rooms];
//   const getLiving = () => result.find((r) => isLivingId(r.id))!;

//   // Up to 8 absorb passes — stop once living is large enough OR at size cap
//   for (let pass = 0; pass < 8; pass++) {
//     const liv = getLiving();
//     const area = liv.width * liv.height;
//     if (area >= maxAreaForRoom("living") * 0.95) break;
//     if (area >= minTarget && area >= nextLargest() * 1.08) break;

//     // Candidates: absorbable rooms sharing an edge with living
//     const candidates = result
//       .filter((r) => r !== liv && isAbsorbable(r.id))
//       .map((r) => {
//         const edge = sharesEdge(liv, r);
//         if (!edge) return null;
//         const a = r.width * r.height;
//         // Prefer larger soft rooms, then dining, then stores
//         let rank = a;
//         if (r.id === "dining") rank += 40;
//         if (r.id.includes("store") || r.id.includes("pantry")) rank += 20;
//         if (r.id === "utility") rank += 10;
//         // Prefer absorbing interior (away from road) so living stays deep on road
//         if (!touchesRoad(r)) rank += 30;
//         return { room: r, edge, rank };
//       })
//       .filter(Boolean) as { room: Room; edge: "left" | "right" | "top" | "bottom"; rank: number }[];

//     if (candidates.length === 0) break;
//     candidates.sort((a, b) => b.rank - a.rank);
//     const { room: victim, edge } = candidates[0];

//     // Merge victim into living (union bounding box of the shared edge merge)
//     const nx = Math.min(liv.x, victim.x);
//     const ny = Math.min(liv.y, victim.y);
//     const nx2 = Math.max(liv.x + liv.width, victim.x + victim.width);
//     const ny2 = Math.max(liv.y + liv.height, victim.y + victim.height);

//     // Only accept merge if the union is mostly the two rooms (no huge holes)
//     const unionArea = (nx2 - nx) * (ny2 - ny);
//     const combined = liv.width * liv.height + victim.width * victim.height;
//     if (unionArea > combined * 1.35) {
//       // Union is too sparse — try a directional expand instead of full bbox
//       if (edge === "right") {
//         liv.width = snap(victim.x + victim.width - liv.x);
//       } else if (edge === "left") {
//         const right = liv.x + liv.width;
//         liv.x = snap(victim.x);
//         liv.width = snap(right - liv.x);
//       } else if (edge === "bottom") {
//         liv.height = snap(victim.y + victim.height - liv.y);
//       } else if (edge === "top") {
//         const bottom = liv.y + liv.height;
//         liv.y = snap(victim.y);
//         liv.height = snap(bottom - liv.y);
//       }
//     } else {
//       liv.x = snap(nx);
//       liv.y = snap(ny);
//       liv.width = snap(nx2 - nx);
//       liv.height = snap(ny2 - ny);
//     }

//     // Keep living label authoritative
//     if (liv.id === "lounge" || liv.id === "family") {
//       liv.id = "living";
//       liv.label = "Living Room";
//     }

//     // Remove absorbed room
//     result = result.filter((r) => r !== victim);
//   }

//   // Final: if still small, expand along road by taking neighboring road-wall soft rooms
//   {
//     const liv = getLiving();
//     if (liv.width * liv.height < minTarget) {
//       const onRoadNeighbors = result.filter((r) => {
//         if (r === liv || !isAbsorbable(r.id)) return false;
//         if (!touchesRoad(r) || !touchesRoad(liv)) return false;
//         return sharesEdge(liv, r) !== null;
//       });
//       for (const victim of onRoadNeighbors) {
//         const liv2 = getLiving();
//         if (liv2.width * liv2.height >= minTarget) break;
//         const nx = Math.min(liv2.x, victim.x);
//         const ny = Math.min(liv2.y, victim.y);
//         const nx2 = Math.max(liv2.x + liv2.width, victim.x + victim.width);
//         const ny2 = Math.max(liv2.y + liv2.height, victim.y + victim.height);
//         liv2.x = snap(nx);
//         liv2.y = snap(ny);
//         liv2.width = snap(nx2 - nx);
//         liv2.height = snap(ny2 - ny);
//         result = result.filter((r) => r !== victim);
//       }
//     }
//   }

//   return result;
// }

// /**
//  * Guarantee Living Room is strictly the largest room by area.
//  * Any other room whose area >= living is carved down (same style as
//  * splitOversized) so living always wins. Parking / staircase / corridor
//  * are left alone when they are intentionally large fixed zones.
//  *
//  * Call this after generation AND after reorientForRoadFacing — reorient
//  * can swap living into a smaller road-wall slot and leave other rooms larger.
//  * Prefer calling growLivingOnRoad first so Living is large, then this
//  * shrinks anything that still outranks it.
//  */
// export function ensureLivingIsLargest(rooms: Room[]): Room[] {
//   const living = rooms.find(
//     (r) => r.id === "living" || r.id === "family" || r.id === "lounge"
//   );
//   if (!living) return rooms;

//   // Normalize id so downstream treats it as the main living room
//   if (living.id === "lounge" || living.id === "family") {
//     living.id = "living";
//     living.label = living.label?.includes("Lounge")
//       ? "Living Room"
//       : living.label || "Living Room";
//   }

//   let livingArea = living.width * living.height;
//   // Target: every other room must be at least ~8% smaller than living.
//   const targetMax = livingArea * 0.92;

//   const skip = (id: string) =>
//     id === "living" ||
//     id === "family" ||
//     id === "lounge" ||
//     id === "parking" ||
//     id === "staircase" ||
//     id === "corridor" ||
//     id.startsWith("corridor") ||
//     id.includes("garden") ||
//     id.includes("terrace") ||
//     id.includes("balcony");

//   let counter = rooms.length;
//   const extras: Room[] = [];

//   for (const r of rooms) {
//     if (skip(r.id)) continue;

//     const area = r.width * r.height;
//     if (area <= targetMax) continue;

//     // Carve until this room is smaller than living.
//     // Prefer shrinking the longer side so aspect stays reasonable.
//     const wide = r.width >= r.height;
//     const longSide = wide ? r.width : r.height;
//     const shortSide = wide ? r.height : r.width;

//     const minKeepLong = (() => {
//       if (r.id.startsWith("bedroom-master")) return Math.max(10, shortSide * 0.95);
//       if (r.id.startsWith("bedroom")) return Math.max(9, shortSide * 0.9);
//       if (r.id === "kitchen" || r.id === "dining") return Math.max(8, shortSide * 0.9);
//       return Math.max(6, shortSide * 0.85);
//     })();

//     let keepLong = snap(
//       Math.max(minKeepLong, Math.min(longSide - 4, targetMax / Math.max(0.1, shortSide)))
//     );
//     if (keepLong >= longSide - 3.5) {
//       // Can't free enough on the long axis — try the other axis if it helps.
//       const altKeep = snap(
//         Math.max(
//           minKeepLong,
//           Math.min((wide ? r.height : r.width) - 4, targetMax / Math.max(0.1, longSide))
//         )
//       );
//       if (altKeep < (wide ? r.height : r.width) - 3.5) {
//         if (wide) {
//           const keepH = altKeep;
//           const freedH = snap(r.height - keepH);
//           const stripY = r.y + keepH;
//           r.height = keepH;
//           if (freedH >= 3.5 && r.width >= 3.5) {
//             counter += 1;
//             const { id, label } = fillerLabel(r.id, 0);
//             extras.push({
//               id: uniqueRoomId(id),
//               label,
//               x: snap(r.x),
//               y: snap(stripY),
//               width: snap(r.width),
//               height: snap(freedH),
//             });
//           }
//         } else {
//           const keepW = altKeep;
//           const freedW = snap(r.width - keepW);
//           const stripX = r.x + keepW;
//           r.width = keepW;
//           if (freedW >= 3.5 && r.height >= 3.5) {
//             counter += 1;
//             const { id, label } = fillerLabel(r.id, 0);
//             extras.push({
//               id: uniqueRoomId(id),
//               label,
//               x: snap(stripX),
//               y: snap(r.y),
//               width: snap(freedW),
//               height: snap(r.height),
//             });
//           }
//         }
//       }
//       continue;
//     }

//     const freedLong = snap(longSide - keepLong);
//     if (wide) {
//       r.width = keepLong;
//     } else {
//       r.height = keepLong;
//     }

//     const stripX = wide ? r.x + keepLong : r.x;
//     const stripY = wide ? r.y : r.y + keepLong;
//     const stripW = wide ? freedLong : shortSide;
//     const stripH = wide ? shortSide : freedLong;

//     if (stripW >= 3.5 && stripH >= 3.5) {
//       counter += 1;
//       const { id, label } = fillerLabel(r.id, 0);
//       extras.push({
//         id: uniqueRoomId(id),
//         label,
//         x: snap(stripX),
//         y: snap(stripY),
//         width: snap(stripW),
//         height: snap(stripH),
//       });
//     }
//   }

//   // Do NOT hard-shrink rooms in place — that leaves empty gray gaps.
//   // Carving above already produced fillers for the freed strips.
//   return dedupeRooms([...rooms, ...extras]);
// }


// /**
//  * Close only hairline / small leftover gaps between rooms (≤ 1.5 ft).
//  * Does NOT aggressively expand into free space (that caused overlaps on E/W).
//  */
// export function closeSmallGaps(
//   rooms: Room[],
//   _envelope?: { x: number; y: number; width: number; height: number }
// ): void {
//   const snap = (v: number) => Math.round(v * 2) / 2;
//   // Allow larger residual strips to be absorbed so gray voids disappear.
//   // Previous 1.5 ft left visible gaps on most real plots.
//   const GAP_MAX = 6.0;
//   const tol = 0.12;

//   const priority = (id: string): number => {
//     if (id === "living" || id === "family" || id === "lounge") return 100;
//     if (id.startsWith("bedroom-master")) return 90;
//     if (id === "kitchen") return 85;
//     if (id.startsWith("bedroom")) return 75;
//     if (id === "dining") return 70;
//     if (id.startsWith("bathroom")) return 50;
//     if (id === "pooja") return 45;
//     if (id === "staircase" || id === "parking") return 20;
//     if (id.includes("corridor") || id.includes("passage")) return 10;
//     return 40;
//   };
//   const skip = (id: string) =>
//     id.includes("corridor") || id.includes("passage") || id === "garden";

//   for (let pass = 0; pass < 3; pass++) {
//     let changed = false;
//     for (let i = 0; i < rooms.length; i++) {
//       for (let j = i + 1; j < rooms.length; j++) {
//         const a = rooms[i];
//         const b = rooms[j];
//         if (skip(a.id) || skip(b.id)) continue;

//         // a left of b — only close tiny gaps
//         {
//           const gap = b.x - (a.x + a.width);
//           const yOverlap =
//             Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
//           if (gap > tol && gap <= GAP_MAX && yOverlap > 1.5) {
//             if (priority(a.id) >= priority(b.id)) {
//               a.width = snap(a.width + gap);
//             } else {
//               const right = b.x + b.width;
//               b.x = snap(a.x + a.width);
//               b.width = snap(right - b.x);
//             }
//             changed = true;
//             continue;
//           }
//         }
//         // a above b
//         {
//           const gap = b.y - (a.y + a.height);
//           const xOverlap =
//             Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
//           if (gap > tol && gap <= GAP_MAX && xOverlap > 1.5) {
//             if (priority(a.id) >= priority(b.id)) {
//               a.height = snap(a.height + gap);
//             } else {
//               const bottom = b.y + b.height;
//               b.y = snap(a.y + a.height);
//               b.height = snap(bottom - b.y);
//             }
//             changed = true;
//           }
//         }
//       }
//     }
//     if (!changed) break;
//   }
// }

// /**
//  * Expand rooms into empty build-up space so gray voids disappear.
//  *
//  * Strategy:
//  *  1) Step-grow every room (Living first) into free space.
//  *  2) Detect remaining free rectangles via a coarse grid scan.
//  *  3) Merge each free rect into the highest-priority adjacent room
//  *     (Living preferred). If no adjacent room, attach to Living if it
//  *     shares any edge with the free zone after a small expand.
//  *  4) Close inter-room gaps up to 6 ft.
//  */
// export function fillEmptyGaps(
//   rooms: Room[],
//   envelope?: { x: number; y: number; width: number; height: number }
// ): void {
//   if (!rooms.length) return;

//   const env = envelope || {
//     x: Math.min(...rooms.map((r) => r.x)),
//     y: Math.min(...rooms.map((r) => r.y)),
//     width: 0,
//     height: 0,
//   };
//   if (!envelope) {
//     const maxX = Math.max(...rooms.map((r) => r.x + r.width));
//     const maxY = Math.max(...rooms.map((r) => r.y + r.height));
//     env.width = maxX - env.x;
//     env.height = maxY - env.y;
//   }
//   if (env.width < 2 || env.height < 2) return;

//   const EPS = 0.2;
//   const STEP = 0.5;

//   const overlaps = (a: { x: number; y: number; width: number; height: number }, b: Room) =>
//     a.x < b.x + b.width - EPS &&
//     a.x + a.width > b.x + EPS &&
//     a.y < b.y + b.height - EPS &&
//     a.y + a.height > b.y + EPS;

//   const hitsOther = (
//     candidate: { x: number; y: number; width: number; height: number },
//     self: Room | null
//   ) => rooms.some((o) => o !== self && overlaps(candidate, o));

//   const priority = (id: string): number => {
//     if (id === "living" || id === "family" || id === "lounge") return 100;
//     if (id.startsWith("bedroom-master")) return 90;
//     if (id === "kitchen" || id.startsWith("kitchen")) return 85;
//     if (id.startsWith("bedroom")) return 75;
//     if (id === "dining") return 70;
//     if (id.startsWith("bathroom")) return 50;
//     if (id === "pooja") return 45;
//     if (id.includes("store") || id.includes("pantry") || id === "utility") return 40;
//     if (id.includes("study")) return 55;
//     if (id === "staircase" || id === "parking") return 25;
//     if (id.includes("corridor") || id.includes("passage") || id === "garden") return 5;
//     return 40;
//   };

//   // ── 1. Step-grow (Living first) ──────────────────────────────────────
//   // Give Living / Master extra headroom so residual strips get filled.
//   const earlyGrowMul = (id: string) => {
//     if (id === "living" || id === "family" || id === "lounge") return 1.35;
//     if (id.startsWith("bedroom-master")) return 1.22;
//     if (id === "kitchen" || id.startsWith("kitchen")) return 1.18;
//     return 1.05;
//   };
//   for (let pass = 0; pass < 250; pass++) {
//     let grew = false;
//     const order = [...rooms].sort((a, b) => priority(b.id) - priority(a.id));
//     for (const r of order) {
//       if (priority(r.id) <= 5) continue;
//       const maxA = maxAreaForRoom(r.id) * earlyGrowMul(r.id);
//       if (r.width * r.height >= maxA * 0.98) continue;
//       for (const dir of ["right", "down", "left", "up"] as const) {
//         let next: { x: number; y: number; width: number; height: number };
//         if (dir === "right") next = { x: r.x, y: r.y, width: r.width + STEP, height: r.height };
//         else if (dir === "down") next = { x: r.x, y: r.y, width: r.width, height: r.height + STEP };
//         else if (dir === "left") next = { x: r.x - STEP, y: r.y, width: r.width + STEP, height: r.height };
//         else next = { x: r.x, y: r.y - STEP, width: r.width, height: r.height + STEP };

//         if (next.x < env.x - EPS) continue;
//         if (next.y < env.y - EPS) continue;
//         if (next.x + next.width > env.x + env.width + EPS) continue;
//         if (next.y + next.height > env.y + env.height + EPS) continue;
//         if (next.width * next.height > maxA + 1) continue;
//         if (hitsOther(next, r)) continue;

//         r.x = snap(Math.max(env.x, next.x));
//         r.y = snap(Math.max(env.y, next.y));
//         r.width = snap(Math.min(next.width, env.x + env.width - r.x));
//         r.height = snap(Math.min(next.height, env.y + env.height - r.y));
//         grew = true;
//         break;
//       }
//     }
//     if (!grew) break;
//   }

//   // ── 2. Free-rectangle scan on a coarse grid ──────────────────────────
//   // Mark covered cells, then extract maximal empty rectangles and assign
//   // each to the best adjacent room.
//   const CELL = 1.0; // 1 ft grid
//   const cols = Math.max(1, Math.ceil(env.width / CELL));
//   const rows = Math.max(1, Math.ceil(env.height / CELL));
//   const covered: boolean[][] = Array.from({ length: rows }, () =>
//     Array(cols).fill(false)
//   );

//   for (const r of rooms) {
//     const c0 = Math.max(0, Math.floor((r.x - env.x) / CELL));
//     const c1 = Math.min(cols - 1, Math.floor((r.x + r.width - env.x - 0.01) / CELL));
//     const r0 = Math.max(0, Math.floor((r.y - env.y) / CELL));
//     const r1 = Math.min(rows - 1, Math.floor((r.y + r.height - env.y - 0.01) / CELL));
//     for (let ry = r0; ry <= r1; ry++) {
//       for (let cx = c0; cx <= c1; cx++) {
//         covered[ry][cx] = true;
//       }
//     }
//   }

//   // Extract empty maximal rectangles (greedy: scan row by row)
//   type FreeRect = { x: number; y: number; width: number; height: number };
//   const freeRects: FreeRect[] = [];
//   const visited: boolean[][] = Array.from({ length: rows }, () =>
//     Array(cols).fill(false)
//   );

//   for (let ry = 0; ry < rows; ry++) {
//     for (let cx = 0; cx < cols; cx++) {
//       if (covered[ry][cx] || visited[ry][cx]) continue;
//       // Grow width
//       let w = 0;
//       while (cx + w < cols && !covered[ry][cx + w] && !visited[ry][cx + w]) w++;
//       // Grow height while full width stays free
//       let h = 1;
//       outer: while (ry + h < rows) {
//         for (let dx = 0; dx < w; dx++) {
//           if (covered[ry + h][cx + dx] || visited[ry + h][cx + dx]) break outer;
//         }
//         h++;
//       }
//       for (let dy = 0; dy < h; dy++) {
//         for (let dx = 0; dx < w; dx++) visited[ry + dy][cx + dx] = true;
//       }
//       const fw = w * CELL;
//       const fh = h * CELL;
//       if (fw >= 1.5 && fh >= 1.5) {
//         freeRects.push({
//           x: snap(env.x + cx * CELL),
//           y: snap(env.y + ry * CELL),
//           width: snap(Math.min(fw, env.x + env.width - (env.x + cx * CELL))),
//           height: snap(Math.min(fh, env.y + env.height - (env.y + ry * CELL))),
//         });
//       }
//     }
//   }

//   // Sort largest free rects first
//   freeRects.sort((a, b) => b.width * b.height - a.width * a.height);

//   const sharesEdge = (
//     a: { x: number; y: number; width: number; height: number },
//     b: { x: number; y: number; width: number; height: number }
//   ): boolean => {
//     const tol = 0.6;
//     const yOv = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
//     const xOv = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
//     if (Math.abs(b.x - (a.x + a.width)) < tol && yOv > 1) return true;
//     if (Math.abs(a.x - (b.x + b.width)) < tol && yOv > 1) return true;
//     if (Math.abs(b.y - (a.y + a.height)) < tol && xOv > 1) return true;
//     if (Math.abs(a.y - (b.y + b.height)) < tol && xOv > 1) return true;
//     return false;
//   };

//   for (const fr of freeRects) {
//     // Prefer Living if it shares an edge; else highest priority neighbor
//     let best: Room | null = null;
//     let bestScore = -1;
//     for (const r of rooms) {
//       if (priority(r.id) <= 5) continue;
//       if (!sharesEdge(fr, r)) continue;
//       let score = priority(r.id);
//       // Strong bonus for living
//       if (r.id === "living" || r.id === "family" || r.id === "lounge") score += 50;
//       // Prefer larger rooms already
//       score += Math.min(30, (r.width * r.height) / 20);
//       if (score > bestScore) {
//         bestScore = score;
//         best = r;
//       }
//     }

//     // If no edge neighbor, try Living anyway if close (within 2 ft)
//     if (!best) {
//       const living = rooms.find(
//         (r) => r.id === "living" || r.id === "family" || r.id === "lounge"
//       );
//       if (living) {
//         const gapX = Math.max(0, Math.max(fr.x - (living.x + living.width), living.x - (fr.x + fr.width)));
//         const gapY = Math.max(0, Math.max(fr.y - (living.y + living.height), living.y - (fr.y + fr.height)));
//         const xOv = Math.min(fr.x + fr.width, living.x + living.width) - Math.max(fr.x, living.x);
//         const yOv = Math.min(fr.y + fr.height, living.y + living.height) - Math.max(fr.y, living.y);
//         if ((gapX <= 2 && yOv > 1) || (gapY <= 2 && xOv > 1)) {
//           best = living;
//         }
//       }
//     }

//     if (!best) {
//       // Last resort: nearest room by center distance
//       let minDist = Infinity;
//       for (const r of rooms) {
//         if (priority(r.id) <= 5) continue;
//         const rcx = r.x + r.width / 2;
//         const rcy = r.y + r.height / 2;
//         const fcx = fr.x + fr.width / 2;
//         const fcy = fr.y + fr.height / 2;
//         const d = Math.abs(rcx - fcx) + Math.abs(rcy - fcy);
//         if (d < minDist) {
//           minDist = d;
//           best = r;
//         }
//       }
//     }

//     if (!best) continue;

//     // Merge free rect into best via union bbox, but only if union is mostly solid
//     const nx = Math.min(best.x, fr.x);
//     const ny = Math.min(best.y, fr.y);
//     const nx2 = Math.max(best.x + best.width, fr.x + fr.width);
//     const ny2 = Math.max(best.y + best.height, fr.y + fr.height);
//     const union = { x: nx, y: ny, width: nx2 - nx, height: ny2 - ny };

//     // Check union doesn't deep-overlap other rooms
//     const conflict = rooms.some(
//       (o) => o !== best && overlaps(union, o) && overlapArea(union, o) > 1.0
//     );
//     if (conflict) {
//       // Directional expand only
//       const tol = 0.6;
//       const yOv = Math.min(best.y + best.height, fr.y + fr.height) - Math.max(best.y, fr.y);
//       const xOv = Math.min(best.x + best.width, fr.x + fr.width) - Math.max(best.x, fr.x);
//       if (Math.abs(fr.x - (best.x + best.width)) < tol && yOv > 1) {
//         // free is to the right
//         const tryW = { ...best, width: fr.x + fr.width - best.x };
//         if (!hitsOther(tryW, best)) {
//           best.width = snap(tryW.width);
//         }
//       } else if (Math.abs(best.x - (fr.x + fr.width)) < tol && yOv > 1) {
//         const right = best.x + best.width;
//         const tryR = { x: fr.x, y: best.y, width: right - fr.x, height: best.height };
//         if (!hitsOther(tryR, best)) {
//           best.x = snap(fr.x);
//           best.width = snap(right - fr.x);
//         }
//       } else if (Math.abs(fr.y - (best.y + best.height)) < tol && xOv > 1) {
//         const tryH = { ...best, height: fr.y + fr.height - best.y };
//         if (!hitsOther(tryH, best)) {
//           best.height = snap(tryH.height);
//         }
//       } else if (Math.abs(best.y - (fr.y + fr.height)) < tol && xOv > 1) {
//         const bottom = best.y + best.height;
//         const tryT = { x: best.x, y: fr.y, width: best.width, height: bottom - fr.y };
//         if (!hitsOther(tryT, best)) {
//           best.y = snap(fr.y);
//           best.height = snap(bottom - fr.y);
//         }
//       }
//       continue;
//     }

//     const mergedArea = (nx2 - nx) * (ny2 - ny);
//     const mergeMul =
//       best.id === "living" || best.id === "family" || best.id === "lounge"
//         ? 1.40
//         : best.id.startsWith("bedroom-master")
//           ? 1.25
//           : 1.12;
//     if (mergedArea > maxAreaForRoom(best.id) * mergeMul) {
//       // Would blow past allowed size — only take a directional strip within cap
//       const roomA = best.width * best.height;
//       const budget = Math.max(0, maxAreaForRoom(best.id) * mergeMul - roomA);
//       if (budget < 8) continue;
//       // Prefer expand toward free rect without exceeding budget
//       const tol = 0.6;
//       const yOv = Math.min(best.y + best.height, fr.y + fr.height) - Math.max(best.y, fr.y);
//       const xOv = Math.min(best.x + best.width, fr.x + fr.width) - Math.max(best.x, fr.x);
//       if (Math.abs(fr.x - (best.x + best.width)) < tol && yOv > 1) {
//         const addW = Math.min(fr.width, budget / Math.max(0.1, best.height));
//         if (addW >= 1.5) best.width = snap(best.width + addW);
//       } else if (Math.abs(fr.y - (best.y + best.height)) < tol && xOv > 1) {
//         const addH = Math.min(fr.height, budget / Math.max(0.1, best.width));
//         if (addH >= 1.5) best.height = snap(best.height + addH);
//       }
//       continue;
//     }
//     best.x = snap(nx);
//     best.y = snap(ny);
//     best.width = snap(nx2 - nx);
//     best.height = snap(ny2 - ny);
//   }

//   function overlapArea(
//     a: { x: number; y: number; width: number; height: number },
//     b: Room
//   ): number {
//     const x0 = Math.max(a.x, b.x);
//     const y0 = Math.max(a.y, b.y);
//     const x1 = Math.min(a.x + a.width, b.x + b.width);
//     const y1 = Math.min(a.y + a.height, b.y + b.height);
//     const w = x1 - x0;
//     const h = y1 - y0;
//     if (w <= 0 || h <= 0) return 0;
//     return w * h;
//   }

//   // ── 3. Final step-grow + gap close ─────────────────────────────────
//   // Allow Living / Master more growth so leftover strips get absorbed.
//   const growMul = (id: string) => {
//     if (id === "living" || id === "family" || id === "lounge") return 1.40;
//     if (id.startsWith("bedroom-master")) return 1.25;
//     if (id === "kitchen" || id.startsWith("kitchen")) return 1.20;
//     return 1.08;
//   };
//   for (let pass = 0; pass < 150; pass++) {
//     let grew = false;
//     const order = [...rooms].sort((a, b) => priority(b.id) - priority(a.id));
//     for (const r of order) {
//       if (priority(r.id) <= 5) continue;
//       const maxA = maxAreaForRoom(r.id) * growMul(r.id);
//       if (r.width * r.height >= maxA * 0.98) continue;
//       for (const dir of ["right", "down", "left", "up"] as const) {
//         let next: { x: number; y: number; width: number; height: number };
//         if (dir === "right") next = { x: r.x, y: r.y, width: r.width + STEP, height: r.height };
//         else if (dir === "down") next = { x: r.x, y: r.y, width: r.width, height: r.height + STEP };
//         else if (dir === "left") next = { x: r.x - STEP, y: r.y, width: r.width + STEP, height: r.height };
//         else next = { x: r.x, y: r.y - STEP, width: r.width, height: r.height + STEP };
//         if (next.x < env.x - EPS) continue;
//         if (next.y < env.y - EPS) continue;
//         if (next.x + next.width > env.x + env.width + EPS) continue;
//         if (next.y + next.height > env.y + env.height + EPS) continue;
//         if (next.width * next.height > maxA + 1) continue;
//         if (hitsOther(next, r)) continue;
//         r.x = snap(Math.max(env.x, next.x));
//         r.y = snap(Math.max(env.y, next.y));
//         r.width = snap(Math.min(next.width, env.x + env.width - r.x));
//         r.height = snap(Math.min(next.height, env.y + env.height - r.y));
//         grew = true;
//         break;
//       }
//     }
//     if (!grew) break;
//   }

//   // Close gaps up to 8 ft between rooms.
//   // Allow high-priority rooms (Living, Master, Kitchen) more headroom so
//   // residual gray voids are absorbed instead of left as empty strips.
//   const GAP_MAX = 8.0;
//   const tol = 0.15;
//   const areaMul = (id: string) => {
//     if (id === "living" || id === "family" || id === "lounge") return 1.45;
//     if (id.startsWith("bedroom-master")) return 1.30;
//     if (id === "kitchen" || id.startsWith("kitchen")) return 1.25;
//     if (id.startsWith("bedroom")) return 1.20;
//     return 1.10;
//   };
//   for (let pass = 0; pass < 8; pass++) {
//     let changed = false;
//     for (let i = 0; i < rooms.length; i++) {
//       for (let j = 0; j < rooms.length; j++) {
//         if (i === j) continue;
//         const a = rooms[i];
//         const b = rooms[j];
//         {
//           const gap = b.x - (a.x + a.width);
//           const yOverlap =
//             Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
//           if (gap > tol && gap <= GAP_MAX && yOverlap > 1.5) {
//             if (priority(a.id) >= priority(b.id)) {
//               const nextA = (a.width + gap) * a.height;
//               if (nextA <= maxAreaForRoom(a.id) * areaMul(a.id)) {
//                 a.width = snap(a.width + gap);
//                 changed = true;
//               }
//             } else {
//               const right = b.x + b.width;
//               const newW = Math.max(3.5, right - (a.x + a.width));
//               if (newW * b.height <= maxAreaForRoom(b.id) * areaMul(b.id)) {
//                 b.x = snap(a.x + a.width);
//                 b.width = snap(newW);
//                 changed = true;
//               }
//             }
//           }
//         }
//         {
//           const gap = b.y - (a.y + a.height);
//           const xOverlap =
//             Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
//           if (gap > tol && gap <= GAP_MAX && xOverlap > 1.5) {
//             if (priority(a.id) >= priority(b.id)) {
//               const nextA = a.width * (a.height + gap);
//               if (nextA <= maxAreaForRoom(a.id) * areaMul(a.id)) {
//                 a.height = snap(a.height + gap);
//                 changed = true;
//               }
//             } else {
//               const bottom = b.y + b.height;
//               const newH = Math.max(3.5, bottom - (a.y + a.height));
//               if (b.width * newH <= maxAreaForRoom(b.id) * areaMul(b.id)) {
//                 b.y = snap(a.y + a.height);
//                 b.height = snap(newH);
//                 changed = true;
//               }
//             }
//           }
//         }
//       }
//     }
//     if (!changed) break;
//   }
// }

// /**
//  * Remove any room that substantially overlaps the Living Room so Living
//  * stays large and the plan has no stacked/overlapping footprints.
//  *
//  * - Soft rooms (store, corridor, utility, extra lounge, dining, secondary beds)
//  *   that overlap Living are deleted entirely.
//  * - Hard rooms (kitchen, bath, pooja, primary master, staircase, parking)
//  *   that overlap are shrunk away from Living when possible; if still mostly
//  *   inside Living they are removed as a last resort.
//  * - Living geometry is never reduced.
//  */
// export function removeRoomsOverlappingLiving(rooms: Room[]): Room[] {
//   const living = rooms.find((r) => isLivingId(r.id));
//   if (!living || living.width < 1 || living.height < 1) return rooms;

//   const EPS = 0.35; // ignore hairline touches / snap noise
//   const overlapArea = (a: Room, b: Room): number => {
//     const x0 = Math.max(a.x, b.x);
//     const y0 = Math.max(a.y, b.y);
//     const x1 = Math.min(a.x + a.width, b.x + b.width);
//     const y1 = Math.min(a.y + a.height, b.y + b.height);
//     const w = x1 - x0;
//     const h = y1 - y0;
//     if (w <= EPS || h <= EPS) return 0;
//     return w * h;
//   };

//   const isHard = (id: string): boolean =>
//     id.startsWith("bathroom") ||
//     id === "kitchen" ||
//     id.startsWith("kitchen") ||
//     id === "pooja" ||
//     id === "staircase" ||
//     id === "parking" ||
//     id === "bedroom-master";

//   const result: Room[] = [];
//   for (const r of rooms) {
//     if (r === living || isLivingId(r.id)) {
//       result.push(r);
//       continue;
//     }

//     const ov = overlapArea(living, r);
//     if (ov <= 0) {
//       result.push(r);
//       continue;
//     }

//     const rArea = Math.max(0.1, r.width * r.height);
//     const frac = ov / rArea;

//     // Soft / filler rooms: any real overlap → remove (Living keeps the space)
//     if (!isHard(r.id)) {
//       // Drop this room; living already covers the space
//       continue;
//     }

//     // Hard room: try to shrink it out of the living footprint
//     if (frac < 0.15) {
//       // Minor overlap — shrink the overlapping side
//       const lx2 = living.x + living.width;
//       const ly2 = living.y + living.height;
//       const rx2 = r.x + r.width;
//       const ry2 = r.y + r.height;

//       // Overlap box
//       const ox0 = Math.max(living.x, r.x);
//       const oy0 = Math.max(living.y, r.y);
//       const ox1 = Math.min(lx2, rx2);
//       const oy1 = Math.min(ly2, ry2);
//       const ow = ox1 - ox0;
//       const oh = oy1 - oy0;

//       if (ow >= oh) {
//         // Prefer horizontal shrink
//         if (r.x + r.width / 2 < living.x + living.width / 2) {
//           // Room is more to the left — cut right edge
//           r.width = snap(Math.max(3.5, living.x - r.x));
//         } else {
//           // Room more to the right — cut left edge
//           const newX = snap(lx2);
//           r.width = snap(Math.max(3.5, rx2 - newX));
//           r.x = newX;
//         }
//       } else {
//         if (r.y + r.height / 2 < living.y + living.height / 2) {
//           r.height = snap(Math.max(3.5, living.y - r.y));
//         } else {
//           const newY = snap(ly2);
//           r.height = snap(Math.max(3.5, ry2 - newY));
//           r.y = newY;
//         }
//       }
//       if (r.width >= 3.5 && r.height >= 3.5 && overlapArea(living, r) <= EPS) {
//         result.push(r);
//       }
//       // else drop if still overlapping or too small
//       continue;
//     }

//     // Heavy overlap with a hard room — drop it so Living stays clean
//     continue;
//   }

//   // Ensure living is still present
//   if (!result.some((r) => isLivingId(r.id))) {
//     result.unshift(living);
//   }

//   return result;
// }

// /**
//  * Final layout cleanup — resolves ALL overlaps and fills gaps cleanly.
//  * Call once at the end of the generate pipeline.
//  *
//  * Rules:
//  *  1. Dedupe identical footprints / colliding ids
//  *  2. Resolve pairwise overlaps by priority (higher keeps space, lower shrinks)
//  *  3. Drop rooms that become too small after shrinking
//  *  4. Expand rooms into free space up to standard max sizes (Living first)
//  *  5. Close residual inter-room gaps
//  */
// export function normalizeLayout(
//   rooms: Room[],
//   envelope?: { x: number; y: number; width: number; height: number }
// ): Room[] {
//   if (!rooms.length) return rooms;

//   let list = dedupeRooms(rooms.map((r) => ({ ...r })));

//   const env = envelope || {
//     x: Math.min(...list.map((r) => r.x)),
//     y: Math.min(...list.map((r) => r.y)),
//     width: 0,
//     height: 0,
//   };
//   if (!envelope) {
//     env.width = Math.max(...list.map((r) => r.x + r.width)) - env.x;
//     env.height = Math.max(...list.map((r) => r.y + r.height)) - env.y;
//   }

//   const pri = (id: string): number => {
//     if (id === "living" || id === "family" || id === "lounge") return 100;
//     if (id === "bedroom-master" || id.startsWith("bedroom-master")) return 95;
//     if (id === "kitchen" || id.startsWith("kitchen")) return 90;
//     if (id.startsWith("bedroom")) return 80;
//     if (id === "dining") return 70;
//     if (id.startsWith("bathroom")) return 60;
//     if (id === "pooja") return 55;
//     if (id === "staircase") return 50;
//     if (id === "parking") return 45;
//     if (id === "utility") return 40;
//     if (id.includes("study") || id.includes("closet")) return 35;
//     if (id.includes("store") || id.includes("pantry") || id.includes("ext")) return 20;
//     if (id.includes("corridor") || id.includes("passage") || id === "garden") return 5;
//     return 30;
//   };

//   const EPS = 0.25;

//   const overlapBox = (a: Room, b: Room) => {
//     const x0 = Math.max(a.x, b.x);
//     const y0 = Math.max(a.y, b.y);
//     const x1 = Math.min(a.x + a.width, b.x + b.width);
//     const y1 = Math.min(a.y + a.height, b.y + b.height);
//     return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
//   };

//   // ── Resolve overlaps (multiple passes) ───────────────────────────────
//   for (let pass = 0; pass < 12; pass++) {
//     let changed = false;
//     // Sort so higher priority is processed as the "keeper"
//     list.sort((a, b) => pri(b.id) - pri(a.id));

//     for (let i = 0; i < list.length; i++) {
//       for (let j = i + 1; j < list.length; j++) {
//         const a = list[i]; // higher or equal priority
//         const b = list[j];
//         const ov = overlapBox(a, b);
//         if (ov.w <= EPS || ov.h <= EPS) continue;

//         // Always shrink the lower-priority room (b)
//         // Choose the axis that requires less shrinkage
//         const cutLeft = a.x + a.width - b.x; // how much to cut from b's left
//         const cutRight = b.x + b.width - a.x;
//         const cutTop = a.y + a.height - b.y;
//         const cutBottom = b.y + b.height - a.y;

//         // Valid cuts: only if they push b fully outside a
//         type Cut = { axis: "x" | "y"; dir: 1 | -1; amount: number };
//         const candidates: Cut[] = [];
//         if (cutLeft > EPS && cutLeft < b.width)
//           candidates.push({ axis: "x", dir: 1, amount: cutLeft }); // shift b right / shrink from left
//         if (cutRight > EPS && cutRight < b.width)
//           candidates.push({ axis: "x", dir: -1, amount: cutRight });
//         if (cutTop > EPS && cutTop < b.height)
//           candidates.push({ axis: "y", dir: 1, amount: cutTop });
//         if (cutBottom > EPS && cutBottom < b.height)
//           candidates.push({ axis: "y", dir: -1, amount: cutBottom });

//         if (candidates.length === 0) {
//           // b is mostly inside a — drop b if it's soft, else shrink to nothing
//           if (pri(b.id) <= 35) {
//             list.splice(j, 1);
//             j--;
//             changed = true;
//           }
//           continue;
//         }

//         candidates.sort((c1, c2) => c1.amount - c2.amount);
//         const best = candidates[0];

//         if (best.axis === "x") {
//           if (best.dir === 1) {
//             // push b's left edge to a's right
//             const newX = snap(a.x + a.width);
//             b.width = snap(b.x + b.width - newX);
//             b.x = newX;
//           } else {
//             // push b's right edge to a's left
//             b.width = snap(a.x - b.x);
//           }
//         } else {
//           if (best.dir === 1) {
//             const newY = snap(a.y + a.height);
//             b.height = snap(b.y + b.height - newY);
//             b.y = newY;
//           } else {
//             b.height = snap(a.y - b.y);
//           }
//         }
//         changed = true;
//       }
//     }

//     // Drop rooms that became too small
//     const before = list.length;
//     list = list.filter((r) => {
//       if (r.width < 3.0 || r.height < 3.0) return false;
//       if (r.width * r.height < 9 && pri(r.id) <= 35) return false;
//       return true;
//     });
//     if (list.length !== before) changed = true;
//     if (!changed) break;
//   }

//   list = dedupeRooms(list);

//   // ── Expand into free space (respect max sizes, Living first) ─────────
//   const STEP = 0.5;
//   const hits = (
//     c: { x: number; y: number; width: number; height: number },
//     self: Room
//   ) =>
//     list.some(
//       (o) =>
//         o !== self &&
//         c.x < o.x + o.width - EPS &&
//         c.x + c.width > o.x + EPS &&
//         c.y < o.y + o.height - EPS &&
//         c.y + c.height > o.y + EPS
//     );

//   for (let pass = 0; pass < 200; pass++) {
//     let grew = false;
//     const order = [...list].sort((a, b) => pri(b.id) - pri(a.id));
//     for (const r of order) {
//       if (pri(r.id) <= 5) continue;
//       const maxA = maxAreaForRoom(r.id);
//       if (r.width * r.height >= maxA * 0.98) continue;

//       for (const dir of ["right", "down", "left", "up"] as const) {
//         let next: { x: number; y: number; width: number; height: number };
//         if (dir === "right")
//           next = { x: r.x, y: r.y, width: r.width + STEP, height: r.height };
//         else if (dir === "down")
//           next = { x: r.x, y: r.y, width: r.width, height: r.height + STEP };
//         else if (dir === "left")
//           next = { x: r.x - STEP, y: r.y, width: r.width + STEP, height: r.height };
//         else
//           next = { x: r.x, y: r.y - STEP, width: r.width, height: r.height + STEP };

//         if (next.x < env.x - EPS) continue;
//         if (next.y < env.y - EPS) continue;
//         if (next.x + next.width > env.x + env.width + EPS) continue;
//         if (next.y + next.height > env.y + env.height + EPS) continue;
//         if (next.width * next.height > maxA + 1) continue;
//         if (hits(next, r)) continue;

//         r.x = snap(Math.max(env.x, next.x));
//         r.y = snap(Math.max(env.y, next.y));
//         r.width = snap(Math.min(next.width, env.x + env.width - r.x));
//         r.height = snap(Math.min(next.height, env.y + env.height - r.y));
//         grew = true;
//         break;
//       }
//     }
//     if (!grew) break;
//   }

//   // ── Close gaps between rooms (up to 3 ft) without exceeding max ──────
//   const GAP_MAX = 3.5;
//   for (let pass = 0; pass < 4; pass++) {
//     let changed = false;
//     for (let i = 0; i < list.length; i++) {
//       for (let j = 0; j < list.length; j++) {
//         if (i === j) continue;
//         const a = list[i];
//         const b = list[j];
//         // horizontal gap: a left of b
//         {
//           const gap = b.x - (a.x + a.width);
//           const yOv =
//             Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
//           if (gap > EPS && gap <= GAP_MAX && yOv > 2) {
//             if (pri(a.id) >= pri(b.id)) {
//               if ((a.width + gap) * a.height <= maxAreaForRoom(a.id) * 1.02) {
//                 a.width = snap(a.width + gap);
//                 changed = true;
//               }
//             } else {
//               const right = b.x + b.width;
//               const newW = Math.max(3, right - (a.x + a.width));
//               if (newW * b.height <= maxAreaForRoom(b.id) * 1.02) {
//                 b.x = snap(a.x + a.width);
//                 b.width = snap(newW);
//                 changed = true;
//               }
//             }
//           }
//         }
//         // vertical gap: a above b
//         {
//           const gap = b.y - (a.y + a.height);
//           const xOv =
//             Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
//           if (gap > EPS && gap <= GAP_MAX && xOv > 2) {
//             if (pri(a.id) >= pri(b.id)) {
//               if (a.width * (a.height + gap) <= maxAreaForRoom(a.id) * 1.02) {
//                 a.height = snap(a.height + gap);
//                 changed = true;
//               }
//             } else {
//               const bottom = b.y + b.height;
//               const newH = Math.max(3, bottom - (a.y + a.height));
//               if (b.width * newH <= maxAreaForRoom(b.id) * 1.02) {
//                 b.y = snap(a.y + a.height);
//                 b.height = snap(newH);
//                 changed = true;
//               }
//             }
//           }
//         }
//       }
//     }
//     if (!changed) break;
//   }


//   // ── Free-rect fill for stubborn voids (esp. East/West) ───────────────
//   {
//     const CELL = 1.0;
//     const cols = Math.max(1, Math.ceil(env.width / CELL));
//     const rows = Math.max(1, Math.ceil(env.height / CELL));
//     const covered: boolean[][] = Array.from({ length: rows }, () =>
//       Array(cols).fill(false)
//     );
//     for (const r of list) {
//       const c0 = Math.max(0, Math.floor((r.x - env.x) / CELL));
//       const c1 = Math.min(cols - 1, Math.floor((r.x + r.width - env.x - 0.01) / CELL));
//       const r0 = Math.max(0, Math.floor((r.y - env.y) / CELL));
//       const r1 = Math.min(rows - 1, Math.floor((r.y + r.height - env.y - 0.01) / CELL));
//       for (let ry = r0; ry <= r1; ry++)
//         for (let cx = c0; cx <= c1; cx++) covered[ry][cx] = true;
//     }
//     const visited: boolean[][] = Array.from({ length: rows }, () =>
//       Array(cols).fill(false)
//     );
//     type FR = { x: number; y: number; width: number; height: number };
//     const freeRects: FR[] = [];
//     for (let ry = 0; ry < rows; ry++) {
//       for (let cx = 0; cx < cols; cx++) {
//         if (covered[ry][cx] || visited[ry][cx]) continue;
//         let w = 0;
//         while (cx + w < cols && !covered[ry][cx + w] && !visited[ry][cx + w]) w++;
//         let h = 1;
//         outer: while (ry + h < rows) {
//           for (let dx = 0; dx < w; dx++) {
//             if (covered[ry + h][cx + dx] || visited[ry + h][cx + dx]) break outer;
//           }
//           h++;
//         }
//         for (let dy = 0; dy < h; dy++)
//           for (let dx = 0; dx < w; dx++) visited[ry + dy][cx + dx] = true;
//         const fw = w * CELL;
//         const fh = h * CELL;
//         if (fw >= 2 && fh >= 2) {
//           freeRects.push({
//             x: snap(env.x + cx * CELL),
//             y: snap(env.y + ry * CELL),
//             width: snap(Math.min(fw, env.x + env.width - (env.x + cx * CELL))),
//             height: snap(Math.min(fh, env.y + env.height - (env.y + ry * CELL))),
//           });
//         }
//       }
//     }
//     freeRects.sort((a, b) => b.width * b.height - a.width * a.height);

//     const shares = (a: FR, b: Room) => {
//       const tol = 0.7;
//       const yOv = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
//       const xOv = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
//       if (Math.abs(b.x - (a.x + a.width)) < tol && yOv > 1) return true;
//       if (Math.abs(a.x - (b.x + b.width)) < tol && yOv > 1) return true;
//       if (Math.abs(b.y - (a.y + a.height)) < tol && xOv > 1) return true;
//       if (Math.abs(a.y - (b.y + b.height)) < tol && xOv > 1) return true;
//       return false;
//     };

//     for (const fr of freeRects) {
//       let best: Room | null = null;
//       let bestScore = -1;
//       for (const r of list) {
//         if (pri(r.id) <= 5) continue;
//         if (!shares(fr, r)) continue;
//         const maxA = maxAreaForRoom(r.id);
//         const roomA = r.width * r.height;
//         if (roomA >= maxA * 0.98 && pri(r.id) < 100) continue;
//         let score = pri(r.id);
//         if (r.id === "living" || r.id === "family") score += 40;
//         score += Math.min(20, roomA / 30);
//         if (score > bestScore) {
//           bestScore = score;
//           best = r;
//         }
//       }
//       if (!best) continue;

//       // Directional expand only (safer than full bbox union)
//       const tol = 0.7;
//       const yOv = Math.min(best.y + best.height, fr.y + fr.height) - Math.max(best.y, fr.y);
//       const xOv = Math.min(best.x + best.width, fr.x + fr.width) - Math.max(best.x, fr.x);
//       const maxA = maxAreaForRoom(best.id);
//       const budget = Math.max(0, maxA - best.width * best.height);

//       if (Math.abs(fr.x - (best.x + best.width)) < tol && yOv > 1) {
//         const add = Math.min(fr.width, budget / Math.max(0.1, best.height));
//         if (add >= 1) {
//           const tryR = { ...best, width: best.width + add };
//           if (!hits(tryR, best)) best.width = snap(best.width + add);
//         }
//       } else if (Math.abs(best.x - (fr.x + fr.width)) < tol && yOv > 1) {
//         const add = Math.min(fr.width, budget / Math.max(0.1, best.height));
//         if (add >= 1) {
//           const tryR = { x: best.x - add, y: best.y, width: best.width + add, height: best.height };
//           if (!hits(tryR, best) && tryR.x >= env.x - EPS) {
//             best.x = snap(best.x - add);
//             best.width = snap(best.width + add);
//           }
//         }
//       } else if (Math.abs(fr.y - (best.y + best.height)) < tol && xOv > 1) {
//         const add = Math.min(fr.height, budget / Math.max(0.1, best.width));
//         if (add >= 1) {
//           const tryR = { ...best, height: best.height + add };
//           if (!hits(tryR, best)) best.height = snap(best.height + add);
//         }
//       } else if (Math.abs(best.y - (fr.y + fr.height)) < tol && xOv > 1) {
//         const add = Math.min(fr.height, budget / Math.max(0.1, best.width));
//         if (add >= 1) {
//           const tryR = { x: best.x, y: best.y - add, width: best.width, height: best.height + add };
//           if (!hits(tryR, best) && tryR.y >= env.y - EPS) {
//             best.y = snap(best.y - add);
//             best.height = snap(best.height + add);
//           }
//         }
//       }
//     }
//   }

//   // Final overlap sweep — zero tolerance
//   for (let pass = 0; pass < 6; pass++) {
//     let changed = false;
//     list.sort((a, b) => pri(b.id) - pri(a.id));
//     for (let i = 0; i < list.length; i++) {
//       for (let j = i + 1; j < list.length; j++) {
//         const a = list[i];
//         const b = list[j];
//         const ov = overlapBox(a, b);
//         if (ov.w <= 0.1 || ov.h <= 0.1) continue;
//         // shrink b on the smaller overlap axis
//         if (ov.w <= ov.h) {
//           if (b.x + b.width / 2 < a.x + a.width / 2) {
//             b.width = snap(Math.max(0, a.x - b.x));
//           } else {
//             const nx = snap(a.x + a.width);
//             b.width = snap(Math.max(0, b.x + b.width - nx));
//             b.x = nx;
//           }
//         } else {
//           if (b.y + b.height / 2 < a.y + a.height / 2) {
//             b.height = snap(Math.max(0, a.y - b.y));
//           } else {
//             const ny = snap(a.y + a.height);
//             b.height = snap(Math.max(0, b.y + b.height - ny));
//             b.y = ny;
//           }
//         }
//         changed = true;
//       }
//     }
//     list = list.filter((r) => r.width >= 3 && r.height >= 3);
//     if (!changed) break;
//   }

//   return dedupeRooms(list);
// }

// /**
//  * Guarantee at least one usable common bathroom exists on the plan.
//  * Critical for small plots (e.g. 20×30) where packing / normalize may drop it.
//  *
//  * Strategy:
//  *  1. If any bathroom already exists and is ≥ 4×5 → done
//  *  2. Else try to place 5×7 in the largest free rectangle
//  *  3. Else carve 5×7 from a soft non-critical room (store, study, lounge, utility)
//  *  4. Else carve a strip from the edge of living (last resort)
//  */
// export function ensureMinimumBathroom(
//   rooms: Room[],
//   envelope?: { x: number; y: number; width: number; height: number }
// ): Room[] {
//   const hasBath = rooms.some(
//     (r) =>
//       (r.id.startsWith("bathroom") || r.id.includes("bath")) &&
//       r.width >= 4 &&
//       r.height >= 5
//   );
//   if (hasBath) return rooms;

//   const list = rooms.map((r) => ({ ...r }));
//   const env = envelope || {
//     x: Math.min(...list.map((r) => r.x)),
//     y: Math.min(...list.map((r) => r.y)),
//     width: 0,
//     height: 0,
//   };
//   if (!envelope && list.length) {
//     env.width = Math.max(...list.map((r) => r.x + r.width)) - env.x;
//     env.height = Math.max(...list.map((r) => r.y + r.height)) - env.y;
//   }

//   const BATH_W = 5;
//   const BATH_H = 7;
//   const EPS = 0.3;

//   const overlaps = (
//     a: { x: number; y: number; width: number; height: number },
//     b: Room
//   ) =>
//     a.x < b.x + b.width - EPS &&
//     a.x + a.width > b.x + EPS &&
//     a.y < b.y + b.height - EPS &&
//     a.y + a.height > b.y + EPS;

//   // ── Try free space via coarse grid ───────────────────────────────────
//   const CELL = 1;
//   const cols = Math.max(1, Math.ceil(env.width / CELL));
//   const rows = Math.max(1, Math.ceil(env.height / CELL));
//   const covered: boolean[][] = Array.from({ length: rows }, () =>
//     Array(cols).fill(false)
//   );
//   for (const r of list) {
//     const c0 = Math.max(0, Math.floor((r.x - env.x) / CELL));
//     const c1 = Math.min(cols - 1, Math.floor((r.x + r.width - env.x - 0.01) / CELL));
//     const r0 = Math.max(0, Math.floor((r.y - env.y) / CELL));
//     const r1 = Math.min(rows - 1, Math.floor((r.y + r.height - env.y - 0.01) / CELL));
//     for (let ry = r0; ry <= r1; ry++)
//       for (let cx = c0; cx <= c1; cx++) covered[ry][cx] = true;
//   }

//   // Find a free block ≥ 5×7
//   for (let ry = 0; ry < rows; ry++) {
//     for (let cx = 0; cx < cols; cx++) {
//       if (covered[ry][cx]) continue;
//       let w = 0;
//       while (cx + w < cols && !covered[ry][cx + w]) w++;
//       let h = 1;
//       outer: while (ry + h < rows) {
//         for (let dx = 0; dx < w; dx++) {
//           if (covered[ry + h][cx + dx]) break outer;
//         }
//         h++;
//       }
//       if (w * CELL >= BATH_W && h * CELL >= BATH_H) {
//         list.push({
//           id: "bathroom-common-1",
//           label: "Common Bathroom",
//           x: snap(env.x + cx * CELL),
//           y: snap(env.y + ry * CELL),
//           width: BATH_W,
//           height: BATH_H,
//         });
//         return dedupeRooms(list);
//       }
//     }
//   }

//   // ── Carve from soft room ─────────────────────────────────────────────
//   const soft = list
//     .filter(
//       (r) =>
//         r.id.includes("store") ||
//         r.id.includes("study") ||
//         r.id.includes("closet") ||
//         r.id === "utility" ||
//         r.id === "lounge" ||
//         r.id === "family" ||
//         r.id.includes("pantry") ||
//         r.id === "pooja"
//     )
//     .filter((r) => r.width >= BATH_W + 1 && r.height >= BATH_H + 1)
//     .sort((a, b) => b.width * b.height - a.width * a.height);

//   if (soft.length > 0) {
//     const donor = soft[0];
//     // Carve bath from the end of the longer side
//     if (donor.width >= donor.height) {
//       const bathX = snap(donor.x + donor.width - BATH_W);
//       list.push({
//         id: "bathroom-common-1",
//         label: "Common Bathroom",
//         x: bathX,
//         y: snap(donor.y),
//         width: BATH_W,
//         height: snap(Math.min(BATH_H, donor.height)),
//       });
//       donor.width = snap(bathX - donor.x);
//     } else {
//       const bathY = snap(donor.y + donor.height - BATH_H);
//       list.push({
//         id: "bathroom-common-1",
//         label: "Common Bathroom",
//         x: snap(donor.x),
//         y: bathY,
//         width: snap(Math.min(BATH_W, donor.width)),
//         height: BATH_H,
//       });
//       donor.height = snap(bathY - donor.y);
//     }
//     return dedupeRooms(list);
//   }

//   // ── Carve from kitchen if large enough ───────────────────────────────
//   const kitchen = list.find(
//     (r) => r.id === "kitchen" || r.id.startsWith("kitchen")
//   );
//   if (kitchen && kitchen.width * kitchen.height >= 80) {
//     if (kitchen.width >= BATH_W + 6) {
//       const bathX = snap(kitchen.x + kitchen.width - BATH_W);
//       list.push({
//         id: "bathroom-common-1",
//         label: "Common Bathroom",
//         x: bathX,
//         y: snap(kitchen.y),
//         width: BATH_W,
//         height: snap(Math.min(BATH_H, kitchen.height)),
//       });
//       kitchen.width = snap(bathX - kitchen.x);
//       return dedupeRooms(list);
//     }
//   }

//   // ── Last resort: carve from living edge (keep living large) ──────────
//   const living = list.find(
//     (r) => r.id === "living" || r.id === "family" || r.id === "lounge"
//   );
//   if (living && living.width >= BATH_W + 10 && living.height >= BATH_H + 8) {
//     // Place bath in the corner of living farthest from center of plot
//     const bathX = snap(living.x);
//     const bathY = snap(living.y);
//     list.push({
//       id: "bathroom-common-1",
//       label: "Common Bathroom",
//       x: bathX,
//       y: bathY,
//       width: BATH_W,
//       height: BATH_H,
//     });
//     // Shift living to the right of the bath strip if width allows
//     if (living.width - BATH_W >= 10) {
//       living.x = snap(living.x + BATH_W);
//       living.width = snap(living.width - BATH_W);
//     } else {
//       living.y = snap(living.y + BATH_H);
//       living.height = snap(living.height - BATH_H);
//     }
//     return dedupeRooms(list);
//   }

//   return list;
// }


// /**
//  * Snap and align room edges so neighboring rooms share flush walls.
//  * Fixes small gaps (up to 2.5 ft) and near-miss alignments that look
//  * like crooked corridors on larger East/South/West plans.
//  */
// export function alignRoomEdges(rooms: Room[]): Room[] {
//   if (rooms.length < 2) return rooms;
//   const list = rooms.map((r) => ({ ...r }));
//   const EPS = 0.15;
//   const GAP = 3.5; // close gaps up to this

//   const pri = (id: string) => {
//     if (id === "living" || id === "family" || id === "lounge") return 100;
//     if (id.startsWith("bedroom-master")) return 90;
//     if (id === "kitchen") return 85;
//     if (id.startsWith("bedroom")) return 75;
//     if (id.startsWith("bathroom")) return 60;
//     if (id === "pooja") return 50;
//     if (id.includes("store") || id.includes("ext")) return 20;
//     return 40;
//   };

//   // Snap every edge to 0.5 ft grid first
//   for (const r of list) {
//     r.x = snap(r.x);
//     r.y = snap(r.y);
//     r.width = snap(r.width);
//     r.height = snap(r.height);
//   }

//   for (let pass = 0; pass < 8; pass++) {
//     let changed = false;

//     for (let i = 0; i < list.length; i++) {
//       for (let j = i + 1; j < list.length; j++) {
//         const a = list[i];
//         const b = list[j];

//         const yOv =
//           Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
//         const xOv =
//           Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);

//         // ── Horizontal neighbors (a left of b) ────────────────────────
//         if (yOv > 1.5) {
//           const gap = b.x - (a.x + a.width);
//           if (gap > EPS && gap <= GAP) {
//             // Close gap toward higher priority
//             if (pri(a.id) >= pri(b.id)) {
//               a.width = snap(a.width + gap);
//             } else {
//               const right = b.x + b.width;
//               b.x = snap(a.x + a.width);
//               b.width = snap(Math.max(3, right - b.x));
//             }
//             changed = true;
//           } else if (Math.abs(gap) <= EPS) {
//             // Already touching — snap exactly
//             const target = snap(a.x + a.width);
//             if (Math.abs(b.x - target) > 0.01) {
//               const right = b.x + b.width;
//               b.x = target;
//               b.width = snap(Math.max(3, right - b.x));
//               changed = true;
//             }
//           }
//         }

//         // ── Vertical neighbors (a above b) ────────────────────────────
//         if (xOv > 1.5) {
//           const gap = b.y - (a.y + a.height);
//           if (gap > EPS && gap <= GAP) {
//             if (pri(a.id) >= pri(b.id)) {
//               a.height = snap(a.height + gap);
//             } else {
//               const bottom = b.y + b.height;
//               b.y = snap(a.y + a.height);
//               b.height = snap(Math.max(3, bottom - b.y));
//             }
//             changed = true;
//           } else if (Math.abs(gap) <= EPS) {
//             const target = snap(a.y + a.height);
//             if (Math.abs(b.y - target) > 0.01) {
//               const bottom = b.y + b.height;
//               b.y = target;
//               b.height = snap(Math.max(3, bottom - b.y));
//               changed = true;
//             }
//           }
//         }

//         // ── Align co-linear outer edges when nearly aligned ───────────
//         // Top edges
//         if (Math.abs(a.y - b.y) > EPS && Math.abs(a.y - b.y) <= 1.5 && xOv > 2) {
//           if (pri(a.id) >= pri(b.id)) {
//             const dy = a.y - b.y;
//             b.y = snap(a.y);
//             b.height = snap(Math.max(3, b.height - dy));
//           } else {
//             const dy = b.y - a.y;
//             a.y = snap(b.y);
//             a.height = snap(Math.max(3, a.height - dy));
//           }
//           changed = true;
//         }
//         // Bottom edges
//         const aBot = a.y + a.height;
//         const bBot = b.y + b.height;
//         if (Math.abs(aBot - bBot) > EPS && Math.abs(aBot - bBot) <= 1.5 && xOv > 2) {
//           if (pri(a.id) >= pri(b.id)) {
//             b.height = snap(aBot - b.y);
//           } else {
//             a.height = snap(bBot - a.y);
//           }
//           if (a.height >= 3 && b.height >= 3) changed = true;
//         }
//         // Left edges
//         if (Math.abs(a.x - b.x) > EPS && Math.abs(a.x - b.x) <= 1.5 && yOv > 2) {
//           if (pri(a.id) >= pri(b.id)) {
//             const dx = a.x - b.x;
//             b.x = snap(a.x);
//             b.width = snap(Math.max(3, b.width - dx));
//           } else {
//             const dx = b.x - a.x;
//             a.x = snap(b.x);
//             a.width = snap(Math.max(3, a.width - dx));
//           }
//           changed = true;
//         }
//         // Right edges
//         const aRight = a.x + a.width;
//         const bRight = b.x + b.width;
//         if (Math.abs(aRight - bRight) > EPS && Math.abs(aRight - bRight) <= 1.5 && yOv > 2) {
//           if (pri(a.id) >= pri(b.id)) {
//             b.width = snap(aRight - b.x);
//           } else {
//             a.width = snap(bRight - a.x);
//           }
//           if (a.width >= 3 && b.width >= 3) changed = true;
//         }
//       }
//     }

//     if (!changed) break;
//   }

//   return list.filter((r) => r.width >= 3 && r.height >= 3);
// }


// /**
//  * After layout + normalize, ensure BHK-required rooms are present.
//  * Priority: bedrooms → bathrooms → kitchen → utility → parking.
//  * Uses free rectangles first; if needed, removes low-value store/ext rooms
//  * to free space for mandatory rooms.
//  *
//  * Indian BHK (typical):
//  *   1 BHK → 1 bed, 1 bath, living, kitchen
//  *   2 BHK → 2 bed, 1–2 bath
//  *   3 BHK → 3 bed, 2 bath
//  *   4 BHK → 4 bed, 3 bath
//  *   5 BHK → 5 bed, 3–4 bath
//  */
// export function placeMissingRequiredRooms(
//   rooms: Room[],
//   opts: {
//     bedrooms?: number;
//     bathrooms?: number;
//     utility?: boolean;
//     parking?: boolean;
//     envelope?: { x: number; y: number; width: number; height: number };
//   }
// ): Room[] {
//   let list = rooms.map((r) => ({ ...r }));
//   const env = opts.envelope || {
//     x: Math.min(...list.map((r) => r.x), 0),
//     y: Math.min(...list.map((r) => r.y), 0),
//     width: 0,
//     height: 0,
//   };
//   if (!opts.envelope && list.length) {
//     env.width = Math.max(...list.map((r) => r.x + r.width)) - env.x;
//     env.height = Math.max(...list.map((r) => r.y + r.height)) - env.y;
//   }
//   if (env.width < 5 || env.height < 5) return list;

//   const needBeds = Math.max(1, Math.round(Number(opts.bedrooms) || 1));
//   const needBaths = Math.max(1, Math.round(Number(opts.bathrooms) || 1));
//   const needUtility = opts.utility !== false && (opts.utility || env.width * env.height >= 600);
//   const needParking = !!opts.parking;

//   const isBed = (r: Room) =>
//     r.id.startsWith("bedroom") && r.width >= 7 && r.height >= 7;
//   const isBath = (r: Room) =>
//     (r.id.startsWith("bathroom") || r.id.includes("bath")) &&
//     r.width >= 4 &&
//     r.height >= 5;
//   const isStore = (r: Room) =>
//     r.id.includes("store") ||
//     r.id.includes("ext") ||
//     r.id.includes("pantry") ||
//     r.id.includes("study") ||
//     r.id.includes("closet") ||
//     (r.id.includes("family") && r.id !== "living");

//   type Need = { id: string; label: string; w: number; h: number };
//   const missing: Need[] = [];

//   // Count existing
//   const bedIds = new Set(list.filter(isBed).map((r) => r.id));
//   let bedCount = bedIds.size;
//   // Ensure unique sequential bedroom ids for missing ones
//   while (bedCount < needBeds) {
//     bedCount++;
//     if (bedCount === 1 && !list.some((r) => r.id === "bedroom-master")) {
//       missing.push({
//         id: "bedroom-master",
//         label: "Master Bedroom",
//         w: 12,
//         h: 14,
//       });
//     } else {
//       const id = `bedroom-${bedCount}`;
//       if (!list.some((r) => r.id === id)) {
//         missing.push({
//           id,
//           label: `Bedroom ${bedCount}`,
//           w: 10,
//           h: 12,
//         });
//       } else {
//         // id taken but count short — use alternate id
//         missing.push({
//           id: `bedroom-extra-${bedCount}`,
//           label: `Bedroom ${bedCount}`,
//           w: 10,
//           h: 12,
//         });
//       }
//     }
//   }

//   let bathCount = list.filter(isBath).length;
//   while (bathCount < needBaths) {
//     bathCount++;
//     missing.push({
//       id: `bathroom-common-${bathCount}`,
//       label: bathCount === 1 ? "Common Bathroom" : `Common Bathroom ${bathCount}`,
//       w: 5,
//       h: 8,
//     });
//   }

//   if (needUtility && !list.some((r) => r.id === "utility" || r.id.startsWith("utility"))) {
//     missing.push({ id: "utility", label: "Utility/Wash", w: 5, h: 8 });
//   }
//   if (needParking && !list.some((r) => r.id === "parking")) {
//     missing.push({ id: "parking", label: "Car Parking", w: 10, h: 16 });
//   }

//   if (missing.length === 0) return list;

//   const EPS = 0.25;
//   const overlapsAny = (cand: {
//     x: number;
//     y: number;
//     width: number;
//     height: number;
//   }) =>
//     list.some(
//       (r) =>
//         cand.x < r.x + r.width - EPS &&
//         cand.x + cand.width > r.x + EPS &&
//         cand.y < r.y + r.height - EPS &&
//         cand.y + cand.height > r.y + EPS
//     );

//   /** Find free spot for w×h (and rotated). */
//   const findSpot = (
//     w: number,
//     h: number
//   ): { x: number; y: number; w: number; h: number } | null => {
//     const step = 1.0;
//     for (const [ww, hh] of [
//       [w, h],
//       [h, w],
//       [w - 1, h],
//       [w, h - 1],
//       [Math.max(4, w - 2), Math.max(5, h - 2)],
//     ] as [number, number][]) {
//       if (ww < 4 || hh < 4) continue;
//       for (let y = env.y; y + hh <= env.y + env.height + 0.2; y += step) {
//         for (let x = env.x; x + ww <= env.x + env.width + 0.2; x += step) {
//           const cand = {
//             x: snap(x),
//             y: snap(y),
//             width: snap(ww),
//             height: snap(hh),
//           };
//           if (!overlapsAny(cand)) return { x: cand.x, y: cand.y, w: cand.width, h: cand.height };
//         }
//       }
//     }
//     return null;
//   };

//   /** Remove store rooms (smallest first) until spot found or none left. */
//   const freeSpaceByRemovingStores = (w: number, h: number) => {
//     const stores = list
//       .filter(isStore)
//       .sort((a, b) => a.width * a.height - b.width * b.height);
//     for (const s of stores) {
//       list = list.filter((r) => r !== s);
//       const spot = findSpot(w, h);
//       if (spot) return spot;
//     }
//     return findSpot(w, h);
//   };

//   /** Carve need from the largest store/dining that can fit it. */
//   const carveFromDonor = (need: Need): boolean => {
//     const donors = list
//       .filter(
//         (r) =>
//           (isStore(r) || r.id === "dining") &&
//           r.width >= need.w &&
//           r.height >= need.h
//       )
//       .sort((a, b) => b.width * b.height - a.width * a.height);
//     if (!donors.length) return false;
//     const donor = donors[0];
//     list.push({
//       id: need.id,
//       label: need.label,
//       x: snap(donor.x),
//       y: snap(donor.y),
//       width: need.w,
//       height: need.h,
//     });
//     if (donor.width - need.w >= 4) {
//       donor.x = snap(donor.x + need.w);
//       donor.width = snap(donor.width - need.w);
//     } else if (donor.height - need.h >= 4) {
//       donor.y = snap(donor.y + need.h);
//       donor.height = snap(donor.height - need.h);
//     } else {
//       list = list.filter((r) => r !== donor);
//     }
//     return true;
//   };

//   for (const need of missing) {
//     if (list.some((r) => r.id === need.id)) continue;

//     let spot = findSpot(need.w, need.h);
//     if (!spot) spot = freeSpaceByRemovingStores(need.w, need.h);

//     if (spot) {
//       list.push({
//         id: need.id,
//         label: need.label,
//         x: spot.x,
//         y: spot.y,
//         width: spot.w,
//         height: spot.h,
//       });
//       continue;
//     }

//     if (carveFromDonor(need)) continue;

//     // Last resort: shrink living slightly if huge and carve from it
//     const living = list.find((r) => r.id === "living" || r.id === "family");
//     if (
//       living &&
//       living.width * living.height >= 220 &&
//       living.width >= need.w + 10 &&
//       living.height >= need.h + 8
//     ) {
//       list.push({
//         id: need.id,
//         label: need.label,
//         x: snap(living.x),
//         y: snap(living.y),
//         width: need.w,
//         height: need.h,
//       });
//       living.x = snap(living.x + need.w);
//       living.width = snap(living.width - need.w);
//     }
//   }

//   return dedupeRooms(list);
// }
