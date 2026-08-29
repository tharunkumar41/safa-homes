// import { Room } from "./types";

// /**
//  * Ensures attached bathrooms are distributed one-per-master-bedroom instead
//  * of two ending up next to the same master while another master gets none.
//  *
//  * Works in two safe steps that can never create an overlap:
//  *  1. Figure out which master "owns" each attached bathroom (nearest /
//  *     touching master).
//  *  2. If some master ends up owning 2+ baths while another owns 0, the
//  *     surplus bath's old slot is simply relabelled in place (no geometry
//  *     change, so it's always safe) and a brand-new small ensuite is carved
//  *     out of the deficient master's own rectangle (shrinking the master,
//  *     same technique used elsewhere in this codebase) — so the new bath can
//  *     never collide with any other room either.
//  */

// function snap(v: number): number {
//   return Math.round(v * 2) / 2;
// }

// function isMaster(r: Room): boolean {
//   return r.id === "bedroom-master" || r.id.startsWith("bedroom-master-");
// }

// function isAttachedBath(r: Room): boolean {
//   return r.id.startsWith("bathroom-attached") || r.id.startsWith("bathroom-master");
// }

// export function rebalanceAttachedBaths(rooms: Room[]): Room[] {
//   const masters = rooms.filter(isMaster);
//   if (masters.length < 2) return rooms; // nothing to rebalance

//   const baths = rooms.filter(isAttachedBath);
//   if (baths.length === 0) return rooms;

//   const touches = (a: Room, b: Room): boolean => {
//     const EPS = 0.6;
//     const xOverlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
//     const yOverlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
//     const closeX =
//       Math.abs(a.x + a.width - b.x) < EPS || Math.abs(b.x + b.width - a.x) < EPS;
//     const closeY =
//       Math.abs(a.y + a.height - b.y) < EPS || Math.abs(b.y + b.height - a.y) < EPS;
//     return (closeX && yOverlap > 1) || (closeY && xOverlap > 1);
//   };

//   const centerOf = (r: Room) => ({ cx: r.x + r.width / 2, cy: r.y + r.height / 2 });

//   const ownerOf = (bath: Room): Room => {
//     let best = masters[0];
//     let bestScore = Infinity;
//     for (const m of masters) {
//       const touchPenalty = touches(bath, m) ? 0 : 1000;
//       const bc = centerOf(bath);
//       const mc = centerOf(m);
//       const dist = Math.hypot(bc.cx - mc.cx, bc.cy - mc.cy);
//       const score = touchPenalty + dist;
//       if (score < bestScore) {
//         bestScore = score;
//         best = m;
//       }
//     }
//     return best;
//   };

//   const byMaster = new Map<Room, Room[]>();
//   for (const m of masters) byMaster.set(m, []);
//   for (const b of baths) byMaster.get(ownerOf(b))!.push(b);

//   const surplus: Room[] = [];
//   for (const list of byMaster.values()) {
//     while (list.length > 1) surplus.push(list.pop()!);
//   }

//   const deficient = masters.filter((m) => (byMaster.get(m) || []).length === 0);
//   if (surplus.length === 0 || deficient.length === 0) return rooms;

//   let counter = 0;
//   for (const m of deficient) {
//     if (surplus.length === 0) break;
//     const oldBath = surplus.shift()!;

//     const w = m.width;
//     const h = m.height;
//     if (w < 7 || h < 7) continue; // master too small to carve — leave it without one

//     const MIN_BATH = 4.5;
//     let bath: Room | null = null;
//     counter += 1;
//     // Prefixed distinctly from the layout algorithm's own
//     // "bathroom-attached-N" ids so a rebalanced bath can never collide
//     // with an id that already exists elsewhere in the room list.
//     const newBathId = `bathroom-attached-bal-${counter}`;
//     if (w >= h) {
//       const bw = snap(Math.min(6, Math.max(MIN_BATH, w * 0.32)));
//       if (w - bw >= 5) {
//         bath = {
//           id: newBathId,
//           label: "Attached Bathroom",
//           x: snap(m.x + w - bw),
//           y: m.y,
//           width: bw,
//           height: h,
//         };
//         m.width = snap(w - bw);
//       }
//     } else {
//       const bh = snap(Math.min(7, Math.max(MIN_BATH, h * 0.32)));
//       if (h - bh >= 5) {
//         bath = {
//           id: newBathId,
//           label: "Attached Bathroom",
//           x: m.x,
//           y: snap(m.y + h - bh),
//           width: w,
//           height: bh,
//         };
//         m.height = snap(h - bh);
//       }
//     }

//     if (bath) {
//       // Old slot stays exactly where it was — just becomes a store room
//       // instead of a duplicate bathroom, so no geometry ever moves and
//       // nothing can overlap.
//       oldBath.id = `store-rebalanced-${counter}`;
//       oldBath.label = "Store Room";
//       rooms.push(bath);
//     }
//   }

//   return rooms;
// }