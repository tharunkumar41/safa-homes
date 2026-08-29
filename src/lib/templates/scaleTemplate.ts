import { FloorTemplate, TemplateRoom } from "./types";

export interface ScaledRoom {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const SNAP = 0.5;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;

/**
 * Scale normalized template rooms into build-up coordinates, then
 * expand them so the build-up is fully tiled (no internal gray voids).
 */
export function scaleTemplate(
  template: FloorTemplate,
  bx: number,
  by: number,
  bw: number,
  bh: number
): ScaledRoom[] {
  // Exact proportional scale first (no snap) so topology is preserved.
  const rooms: ScaledRoom[] = template.rooms.map((r: TemplateRoom) => ({
    id: r.id,
    label: r.label,
    x: bx + r.x * bw,
    y: by + r.y * bh,
    width: Math.max(0.5, r.w * bw),
    height: Math.max(0.5, r.h * bh),
  }));

  clampToBuildUp(rooms, bx, by, bw, bh);
  resolveOverlaps(rooms);

  // Absorb residual voids so large plots have no gray gaps inside the walls.
  fillBuildUpGaps(rooms, bx, by, bw, bh);
  resolveOverlaps(rooms);
  clampToBuildUp(rooms, bx, by, bw, bh);

  // Final half-foot snap for clean dimensions, then fix any snap-induced issues.
  for (const room of rooms) {
    const x2 = snap(room.x + room.width);
    const y2 = snap(room.y + room.height);
    room.x = snap(room.x);
    room.y = snap(room.y);
    room.width = Math.max(0.5, x2 - room.x);
    room.height = Math.max(0.5, y2 - room.y);
  }
  clampToBuildUp(rooms, bx, by, bw, bh);
  resolveOverlaps(rooms);
  // One more gentle fill for snap micro-gaps, then final resolve.
  fillBuildUpGaps(rooms, bx, by, bw, bh);
  resolveOverlaps(rooms);
  clampToBuildUp(rooms, bx, by, bw, bh);

  return rooms;
}

export function clampToBuildUp(
  rooms: ScaledRoom[],
  bx: number,
  by: number,
  bw: number,
  bh: number
) {
  const right = bx + bw;
  const bottom = by + bh;
  for (const room of rooms) {
    if (room.x < bx) {
      room.width -= bx - room.x;
      room.x = bx;
    }
    if (room.y < by) {
      room.height -= by - room.y;
      room.y = by;
    }
    if (room.x + room.width > right) room.width = Math.max(0.5, right - room.x);
    if (room.y + room.height > bottom) room.height = Math.max(0.5, bottom - room.y);
    room.width = Math.max(0.5, room.width);
    room.height = Math.max(0.5, room.height);
  }
}

export function resolveOverlaps(rooms: ScaledRoom[]) {
  // Shrink along the smaller penetration axis until no overlaps remain.
  for (let pass = 0; pass < 12; pass++) {
    let moved = false;
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i];
        const b = rooms[j];
        if (!overlaps(a, b, 0.02)) continue;
        const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        // Prefer shrinking the lower-priority (later) room.
        if (ox <= oy) {
          if (b.x + b.width / 2 >= a.x + a.width / 2) {
            b.x += ox;
            b.width = Math.max(0.5, b.width - ox);
          } else {
            a.x += ox;
            a.width = Math.max(0.5, a.width - ox);
          }
        } else {
          if (b.y + b.height / 2 >= a.y + a.height / 2) {
            b.y += oy;
            b.height = Math.max(0.5, b.height - oy);
          } else {
            a.y += oy;
            a.height = Math.max(0.5, a.height - oy);
          }
        }
      }
    }
    if (!moved) break;
  }
}

/**
 * Expand rooms into uncovered build-up space.
 * Prefer growing living / corridor / dining before bedrooms / baths.
 */
/** Expand rooms into uncovered build-up space (no gray voids). */
export function fillBuildUpGaps(
  rooms: ScaledRoom[],
  bx: number,
  by: number,
  bw: number,
  bh: number
) {
  const right = bx + bw;
  const bottom = by + bh;
  // Extra area priority (lower expands first):
  // Living → Master Bedroom → Dining → Kitchen → Other Bedrooms →
  // Family Lounge / Study → Bathrooms → Utility → Pooja / Store →
  // Balcony → Passage / Corridor
  // (lower number expands first and receives more leftover space)
  const priority = (id: string) => {
    if (id === "living") return 1;
    if (id === "bedroom-master" || id.startsWith("bedroom-master")) return 2;
    if (id === "dining") return 3;
    if (id === "kitchen") return 4;
    if (id.startsWith("bedroom-")) return 5; // other bedrooms
    if (id === "family" || id === "study" || id === "lounge") return 6;
    if (id.startsWith("bathroom") || id === "bathroom") return 7;
    if (id === "utility") return 8;
    if (id === "pooja" || id === "pooja-space" || id === "store") return 9;
    if (id === "balcony" || id.startsWith("balcony")) return 10;
    if (id.startsWith("corridor") || id === "passage" || id.includes("passage")) return 11;
    return 6;
  };

  const isBath = (id: string) => id.startsWith("bathroom");

  // Expand non-baths first (many passes), then baths into any remaining voids only.
  for (let pass = 0; pass < 16; pass++) {
    const ordered = [...rooms]
      .filter((r) => !isBath(r.id))
      .sort((a, b) => priority(a.id) - priority(b.id));
    for (const room of ordered) {
      const gap = freeExtent(room, rooms, "right", right, bottom, bx, by);
      if (gap > 0.05) room.width += gap;
    }
    for (const room of ordered) {
      const gap = freeExtent(room, rooms, "down", right, bottom, bx, by);
      if (gap > 0.05) room.height += gap;
    }
    for (const room of ordered) {
      const gap = freeExtent(room, rooms, "left", right, bottom, bx, by);
      if (gap > 0.05) {
        room.x -= gap;
        room.width += gap;
      }
    }
    for (const room of ordered) {
      const gap = freeExtent(room, rooms, "up", right, bottom, bx, by);
      if (gap > 0.05) {
        room.y -= gap;
        room.height += gap;
      }
    }
  }

  // Residual micro-gaps: expand corridors/living aggressively
  for (let pass = 0; pass < 6; pass++) {
    const ordered = [...rooms]
      .filter((r) => !isBath(r.id))
      .sort((a, b) => priority(a.id) - priority(b.id));
    for (const room of ordered) {
      for (const dir of ["right", "down", "left", "up"] as const) {
        const gap = freeExtent(room, rooms, dir, right, bottom, bx, by);
        if (gap > 0.02) {
          if (dir === "right") room.width += gap;
          else if (dir === "down") room.height += gap;
          else if (dir === "left") {
            room.x -= gap;
            room.width += gap;
          } else {
            room.y -= gap;
            room.height += gap;
          }
        }
      }
    }
  }

  // Final: let bathrooms expand only into pure voids (fills gray gaps under baths)
  for (let pass = 0; pass < 4; pass++) {
    for (const room of rooms) {
      if (!isBath(room.id)) continue;
      for (const dir of ["right", "down", "left", "up"] as const) {
        const gap = freeExtent(room, rooms, dir, right, bottom, bx, by);
        if (gap > 0.02) {
          if (dir === "right") room.width += gap;
          else if (dir === "down") room.height += gap;
          else if (dir === "left") {
            room.x -= gap;
            room.width += gap;
          } else {
            room.y -= gap;
            room.height += gap;
          }
        }
      }
    }
  }

  // Snap final sizes
  for (const room of rooms) {
    room.x = snap(room.x);
    room.y = snap(room.y);
    room.width = Math.max(0.5, snap(room.width));
    room.height = Math.max(0.5, snap(room.height));
  }
}


/** How far `room` can grow in a direction before hitting another room or the boundary. */
function freeExtent(
  room: ScaledRoom,
  rooms: ScaledRoom[],
  dir: "right" | "left" | "down" | "up",
  right: number,
  bottom: number,
  bx: number,
  by: number
): number {
  const eps = 0.05;
  if (dir === "right") {
    let limit = right - (room.x + room.width);
    if (limit <= eps) return 0;
    for (const other of rooms) {
      if (other === room) continue;
      // other starts to the right and vertically overlaps
      if (other.x + eps >= room.x + room.width - eps) {
        const vOverlap =
          Math.min(room.y + room.height, other.y + other.height) - Math.max(room.y, other.y);
        if (vOverlap > eps) {
          limit = Math.min(limit, other.x - (room.x + room.width));
        }
      }
    }
    return Math.max(0, limit);
  }
  if (dir === "left") {
    let limit = room.x - bx;
    if (limit <= eps) return 0;
    for (const other of rooms) {
      if (other === room) continue;
      if (other.x + other.width - eps <= room.x + eps) {
        const vOverlap =
          Math.min(room.y + room.height, other.y + other.height) - Math.max(room.y, other.y);
        if (vOverlap > eps) {
          limit = Math.min(limit, room.x - (other.x + other.width));
        }
      }
    }
    return Math.max(0, limit);
  }
  if (dir === "down") {
    let limit = bottom - (room.y + room.height);
    if (limit <= eps) return 0;
    for (const other of rooms) {
      if (other === room) continue;
      if (other.y + eps >= room.y + room.height - eps) {
        const hOverlap =
          Math.min(room.x + room.width, other.x + other.width) - Math.max(room.x, other.x);
        if (hOverlap > eps) {
          limit = Math.min(limit, other.y - (room.y + room.height));
        }
      }
    }
    return Math.max(0, limit);
  }
  // up
  let limit = room.y - by;
  if (limit <= eps) return 0;
  for (const other of rooms) {
    if (other === room) continue;
    if (other.y + other.height - eps <= room.y + eps) {
      const hOverlap =
        Math.min(room.x + room.width, other.x + other.width) - Math.max(room.x, other.x);
      if (hOverlap > eps) {
        limit = Math.min(limit, room.y - (other.y + other.height));
      }
    }
  }
  return Math.max(0, limit);
}

export function overlaps(a: ScaledRoom, b: ScaledRoom, eps = 0.05): boolean {
  return (
    a.x < b.x + b.width - eps &&
    a.x + a.width > b.x + eps &&
    a.y < b.y + b.height - eps &&
    a.y + a.height > b.y + eps
  );
}

export function findOverlaps(rooms: ScaledRoom[]): [string, string][] {
  const result: [string, string][] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (overlaps(rooms[i], rooms[j])) result.push([rooms[i].id, rooms[j].id]);
    }
  }
  return result;
}
