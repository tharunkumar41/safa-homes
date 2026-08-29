import { ScaledRoom } from "./scaleTemplate";
import { Cardinal } from "./types";

export interface Opening {
  room: string;
  type: "main" | "internal" | "bathroom" | "service";
  wall: "top" | "bottom" | "left" | "right";
  position: number;
  width: number;
  connectsTo?: string;
  exterior?: boolean;
}

export interface WindowOpening {
  room: string;
  wall: "top" | "bottom" | "left" | "right";
  position: number;
  width: number;
  type: "standard" | "ventilator" | "large" | "kitchen" | "bathroom";
  exterior?: boolean;
}

const EPS = 0.2;
/** Min shared-wall length (ft) to place a door */
const MIN_SHARE = 2.5;

const roadWall = (f: Cardinal): Opening["wall"] =>
  f === "North" ? "top" : f === "South" ? "bottom" : f === "East" ? "right" : "left";

function shared(a: ScaledRoom, b: ScaledRoom, minLen = MIN_SHARE) {
  const y1 = Math.max(a.y, b.y);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const x1 = Math.max(a.x, b.x);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  if (Math.abs(a.x + a.width - b.x) < EPS && y2 - y1 >= minLen)
    return { wall: "right" as const, length: y2 - y1, start: y1 - a.y };
  if (Math.abs(b.x + b.width - a.x) < EPS && y2 - y1 >= minLen)
    return { wall: "left" as const, length: y2 - y1, start: y1 - a.y };
  if (Math.abs(a.y + a.height - b.y) < EPS && x2 - x1 >= minLen)
    return { wall: "bottom" as const, length: x2 - x1, start: x1 - a.x };
  if (Math.abs(b.y + b.height - a.y) < EPS && x2 - x1 >= minLen)
    return { wall: "top" as const, length: x2 - x1, start: x1 - a.x };
  return null;
}

function addDoor(
  doors: Opening[],
  room: ScaledRoom,
  wall: Opening["wall"],
  start: number,
  length: number,
  width: number,
  type: Opening["type"],
  connectsTo?: string,
  exterior = false
) {
  const usable = Math.max(2.2, length - 0.4);
  const w = Math.min(width, usable);
  const wallLength = wall === "top" || wall === "bottom" ? room.width : room.height;
  const position = Math.max(0.2, Math.min(start + (length - w) / 2, wallLength - w - 0.2));
  if (position < 0 || position + w > wallLength + 0.15) return false;
  // Avoid stacking two doors almost on top of each other
  if (
    doors.some(
      (d) =>
        d.room === room.id &&
        d.wall === wall &&
        Math.abs(d.position - position) < Math.max(0.6, w * 0.5)
    )
  )
    return false;
  doors.push({
    room: room.id,
    type,
    wall,
    position,
    width: w,
    connectsTo,
    exterior,
  });
  return true;
}

function exteriorWalls(
  room: ScaledRoom,
  bx: number,
  by: number,
  bw: number,
  bh: number
) {
  const walls: [Opening["wall"], number][] = [];
  if (Math.abs(room.y - by) < 0.25) walls.push(["top", room.width]);
  if (Math.abs(room.y + room.height - (by + bh)) < 0.25) walls.push(["bottom", room.width]);
  if (Math.abs(room.x - bx) < 0.25) walls.push(["left", room.height]);
  if (Math.abs(room.x + room.width - (bx + bw)) < 0.25) walls.push(["right", room.height]);
  return walls;
}

const isBedroom = (id: string) =>
  id === "bedroom-master" ||
  id.startsWith("bedroom-master") ||
  /^bedroom-\d+$/.test(id);

const isBath = (id: string) => id.startsWith("bathroom");

/** True if this room already has a door (as owner or as connectsTo). */
function hasDoor(doors: Opening[], roomId: string) {
  return doors.some((d) => d.room === roomId || d.connectsTo === roomId);
}

/**
 * Generate doors + windows for the layout.
 *
 * Main door: on Living, on the road-facing exterior wall.
 * Internal doors: between rooms that share ≥ MIN_SHARE ft of wall.
 * Fallback: every habitable room gets at least one door when geometry allows.
 */
export function generateOpenings(
  rooms: ScaledRoom[],
  roadFacing: Cardinal,
  bx: number,
  by: number,
  bw: number,
  bh: number
) {
  const doors: Opening[] = [];
  const windows: WindowOpening[] = [];
  const living = rooms.find((r) => r.id === "living");

  // ─── 1. Main entrance ─────────────────────────────────────────────
  // Prefer Living wall that faces the road. Fallback: any exterior wall
  // of Living closest to the road edge.
  if (living) {
    const preferred = roadWall(roadFacing);
    const ext = exteriorWalls(living, bx, by, bw, bh);
    let chosen = ext.find(([wall]) => wall === preferred);

    if (!chosen && ext.length) {
      const score = (wall: Opening["wall"]) => {
        if (roadFacing === "North") return wall === "top" ? 0 : wall === "bottom" ? 3 : 1;
        if (roadFacing === "South") return wall === "bottom" ? 0 : wall === "top" ? 3 : 1;
        if (roadFacing === "East") return wall === "right" ? 0 : wall === "left" ? 3 : 1;
        return wall === "left" ? 0 : wall === "right" ? 3 : 1;
      };
      chosen = [...ext].sort((a, b) => score(a[0]) - score(b[0]))[0];
    }

    // Last resort: place main door on Living's longest exterior wall
    if (!chosen && ext.length) {
      chosen = [...ext].sort((a, b) => b[1] - a[1])[0];
    }

    if (chosen) {
      const wallLen = chosen[1];
      const doorW = Math.min(3.5, Math.max(2.8, Math.min(3.5, wallLen * 0.22)));
      // Prefer slightly off-centre toward west/left so parking path stays clear
      let start = 0;
      if (chosen[0] === "top" || chosen[0] === "bottom") {
        start = Math.max(0, wallLen * 0.12);
      } else {
        start = Math.max(0, wallLen * 0.15);
      }
      addDoor(
        doors,
        living,
        chosen[0],
        start,
        Math.max(doorW + 1.5, wallLen * 0.4),
        doorW,
        "main",
        undefined,
        true
      );
    }
  }

  // ─── 2. Build dynamic candidate pairs ─────────────────────────────
  const candidates: [string, string][] = [
    // Living hub
    ["living", "dining"],
    ["living", "kitchen"],
    ["living", "bedroom-master"],
    ["living", "bedroom-2"],
    ["living", "bedroom-3"],
    ["living", "bedroom-4"],
    ["living", "bedroom-5"],
    ["living", "bedroom-6"],
    ["living", "pooja"],
    ["living", "bathroom-common"],
    ["living", "family"],
    ["living", "study"],
    ["living", "utility"],
    ["living", "store"],
    // Dining / kitchen
    ["dining", "kitchen"],
    ["dining", "bedroom-master"],
    ["dining", "bedroom-2"],
    ["kitchen", "utility"],
    ["kitchen", "store"],
    ["kitchen", "bathroom-common"],
    // Master ↔ baths
    ["bedroom-master", "bathroom-master"],
    ["bedroom-master", "bathroom-common"],
    ["bedroom-master", "bathroom-attached"],
    // Other bedrooms ↔ common bath
    ["bedroom-2", "bathroom-common"],
    ["bedroom-3", "bathroom-common"],
    ["bedroom-4", "bathroom-common"],
    ["bedroom-5", "bathroom-common"],
    ["bedroom-6", "bathroom-common"],
    // Corridor links
    ["corridor", "living"],
    ["corridor", "bedroom-master"],
    ["corridor", "bedroom-2"],
    ["corridor", "bedroom-3"],
    ["corridor", "bedroom-4"],
    ["corridor", "bathroom-common"],
    ["corridor", "bathroom-master"],
  ];

  // Auto-link numbered attached baths to their bedrooms
  // e.g. bathroom-master-2 → bedroom-master, bathroom-master-3 → nearest bed
  for (const room of rooms) {
    if (!isBath(room.id)) continue;
    // Prefer matching bedroom-master for bathroom-master*
    if (room.id.startsWith("bathroom-master") || room.id.includes("attached")) {
      candidates.push(["bedroom-master", room.id]);
      for (const bed of rooms) {
        if (isBedroom(bed.id)) candidates.push([bed.id, room.id]);
      }
    } else {
      // Common / other baths → all bedrooms + living
      candidates.push(["living", room.id]);
      for (const bed of rooms) {
        if (isBedroom(bed.id)) candidates.push([bed.id, room.id]);
      }
    }
  }

  // Pooja / store / utility / servant
  for (const room of rooms) {
    if (room.id === "pooja" || room.id === "store" || room.id.startsWith("store")) {
      candidates.push(["living", room.id], ["dining", room.id], ["kitchen", room.id]);
    }
    if (room.id === "utility") {
      candidates.push(["kitchen", room.id], ["living", room.id]);
    }
    if (room.id === "servant" || room.id.startsWith("servant")) {
      candidates.push(["kitchen", room.id], ["living", room.id]);
    }
  }

  // Deduplicate candidate pairs
  const seen = new Set<string>();
  const uniqueCandidates: [string, string][] = [];
  for (const [a, b] of candidates) {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueCandidates.push([a, b]);
  }

  for (const [aId, bId] of uniqueCandidates) {
    const a = rooms.find((r) => r.id === aId);
    const b = rooms.find((r) => r.id === bId);
    if (!a || !b) continue;
    const s = shared(a, b);
    if (!s) continue;
    const bath = isBath(a.id) || isBath(b.id);
    addDoor(
      doors,
      a,
      s.wall,
      s.start,
      s.length,
      bath ? 2.5 : 3,
      bath ? "bathroom" : "internal",
      b.id
    );
  }

  // ─── 3. Strong fallback — every habitable room needs access ───────
  const needsDoor = (id: string) =>
    id === "living" ||
    id === "dining" ||
    id === "kitchen" ||
    id === "pooja" ||
    id === "utility" ||
    id === "store" ||
    id === "family" ||
    id === "study" ||
    id === "servant" ||
    isBedroom(id) ||
    isBath(id) ||
    id.startsWith("store") ||
    id.startsWith("servant");

  for (const room of rooms) {
    if (!needsDoor(room.id)) continue;
    if (room.id === "parking" || room.id === "garden") continue;
    if (hasDoor(doors, room.id)) continue;

    // Prefer connection to living, then corridor, then longest shared wall
    const preferredOthers = [
      "living",
      "corridor",
      "dining",
      "kitchen",
      "bedroom-master",
    ];
    let best: {
      other: ScaledRoom;
      wall: Opening["wall"];
      length: number;
      start: number;
    } | null = null;

    for (const prefId of preferredOthers) {
      const other = rooms.find((r) => r.id === prefId);
      if (!other || other.id === room.id) continue;
      const s = shared(room, other);
      if (s) {
        best = { other, ...s };
        break;
      }
    }

    if (!best) {
      for (const other of rooms) {
        if (other.id === room.id) continue;
        if (other.id === "parking" || other.id === "garden") continue;
        const s = shared(room, other);
        if (s && (!best || s.length > best.length)) {
          best = { other, ...s };
        }
      }
    }

    if (best) {
      const bath = isBath(room.id) || isBath(best.other.id);
      addDoor(
        doors,
        room,
        best.wall,
        best.start,
        best.length,
        bath ? 2.5 : 3,
        bath ? "bathroom" : "internal",
        best.other.id
      );
    }
  }

  // ─── 4. Windows on exterior walls (skip walls that already have main door) ─
  for (const room of rooms) {
    if (room.id === "corridor" || room.id.startsWith("corridor")) continue;
    if (room.id === "parking" || room.id === "garden") continue;
    for (const [wall, length] of exteriorWalls(room, bx, by, bw, bh)) {
      // Don't put a window where the main door already is
      if (doors.some((d) => d.room === room.id && d.wall === wall && d.type === "main"))
        continue;
      const isBathroom = isBath(room.id);
      const width = Math.min(
        isBathroom ? 2.5 : room.id === "living" ? 5 : 4.5,
        Math.max(2, length * 0.45)
      );
      windows.push({
        room: room.id,
        wall,
        position: Math.max(0.25, (length - width) / 2),
        width,
        type: isBathroom
          ? "bathroom"
          : room.id === "kitchen"
            ? "kitchen"
            : room.id === "living"
              ? "large"
              : "standard",
        exterior: true,
      });
    }
  }

  return { doors, windows };
}
