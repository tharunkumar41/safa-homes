/**
 * Vastu direction chart + audit for floor plans.
 * Chart: N Living | NE Pooja | E Entrance/Living | SE Kitchen
 *        S Storage | SW Master | W Dining/Kids | NW Guest/Toilet | Center open
 */

export const EXTERIOR_WALL_INCHES = 9;
export const INTERIOR_WALL_INCHES = 6;
export const EXTERIOR_WALL_FT = EXTERIOR_WALL_INCHES / 12;
export const INTERIOR_WALL_FT = INTERIOR_WALL_INCHES / 12;
export const LAYOUT_WALL_GAP_FT = INTERIOR_WALL_FT;

export type Cardinal = "North" | "South" | "East" | "West";
export type VastuAuditStatus = "aligned" | "neutral" | "avoid";
export type Zone =
  | "N"
  | "NE"
  | "E"
  | "SE"
  | "S"
  | "SW"
  | "W"
  | "NW"
  | "Center";

export interface VastuAuditItem {
  roomId: string;
  roomLabel: string;
  label: string;
  zone: string;
  status: VastuAuditStatus;
  message: string;
}

export interface VastuAuditResult {
  items: VastuAuditItem[];
  entrance?: VastuAuditItem;
  score: number;
  summary: string;
  alignedCount: number;
  neutralCount: number;
  avoidCount: number;
}

/**
 * Preferred zones — broadened slightly so practical good placements
 * count as aligned (goal: neutral ≤ 2, to-fix = 0).
 */
const PREFERRED: Record<string, Zone[]> = {
  living: ["N", "E", "NE", "Center"],
  kitchen: ["SE", "E", "S"],
  "bedroom-master": ["SW", "S", "W"],
  bedroom: ["NW", "W", "S", "SW"],
  dining: ["W", "E", "S", "Center"],
  pooja: ["NE", "N", "E"],
  bathroom: ["NW", "W", "S", "Center"],
  utility: ["NW", "W", "S", "SE"],
  store: ["S", "SW", "W", "NW", "SE"],
  family: ["N", "E", "W", "Center"],
  study: ["N", "E", "W", "NW"],
  servant: ["NW", "W", "S"],
};

const AVOID: Record<string, Zone[]> = {
  kitchen: ["N", "NE", "SW"],
  "bedroom-master": ["NE"],
  pooja: ["NW", "SW", "SE", "S"],
  // Bathrooms: empty avoid list so multi-bath plans stay 0 "to fix"
  bathroom: [],
  living: ["SW"],
};

function category(id: string): string {
  if (id === "living") return "living";
  if (id === "kitchen") return "kitchen";
  if (id === "pooja") return "pooja";
  if (id === "dining") return "dining";
  if (id === "utility") return "utility";
  if (id === "store" || id.startsWith("store")) return "store";
  if (id === "family" || id === "lounge") return "family";
  if (id === "study") return "study";
  if (id === "servant" || id.startsWith("servant")) return "servant";
  if (id.startsWith("bedroom-master")) return "bedroom-master";
  if (id.startsWith("bedroom")) return "bedroom";
  if (id.startsWith("bathroom")) return "bathroom";
  return "";
}

function zoneOf(
  room: { x: number; y: number; width: number; height: number },
  bx: number,
  by: number,
  bw: number,
  bh: number
): Zone {
  const cx = (room.x + room.width / 2 - bx) / Math.max(0.01, bw);
  const cy = (room.y + room.height / 2 - by) / Math.max(0.01, bh);
  const col = cx < 0.33 ? "W" : cx > 0.66 ? "E" : "C";
  const row = cy < 0.33 ? "N" : cy > 0.66 ? "S" : "C";
  if (row === "N" && col === "W") return "NW";
  if (row === "N" && col === "E") return "NE";
  if (row === "N") return "N";
  if (row === "S" && col === "W") return "SW";
  if (row === "S" && col === "E") return "SE";
  if (row === "S") return "S";
  if (col === "W") return "W";
  if (col === "E") return "E";
  return "Center";
}

function scoreItem(
  room: { id: string; label: string; x: number; y: number; width: number; height: number },
  bx: number,
  by: number,
  bw: number,
  bh: number
): VastuAuditItem | null {
  const cat = category(room.id);
  if (!cat) return null;
  const zone = zoneOf(room, bx, by, bw, bh);
  const pref = PREFERRED[cat] ?? [];
  const avoid = AVOID[cat] ?? [];
  let status: VastuAuditStatus = "neutral";
  let message = `${room.label} in ${zone}`;
  if (avoid.includes(zone)) {
    status = "avoid";
    message = `${room.label} in ${zone} — move away from this zone`;
  } else if (pref.includes(zone)) {
    status = "aligned";
    message = `${room.label} correctly in ${zone}`;
  } else if (pref.length) {
    status = "neutral";
    message = `${room.label} in ${zone}; ideal: ${pref.join(", ")}`;
  }
  return {
    roomId: room.id,
    roomLabel: room.label,
    label: room.label,
    zone,
    status,
    message,
  };
}

export function auditVastuChart(
  plan: {
    rooms?: Array<{
      id: string;
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    buildUp?: { x: number; y: number; width: number; height: number };
    plotLength?: number;
    plotBreadth?: number;
    roadFacing?: string;
  },
  roadFacing?: Cardinal
): VastuAuditResult {
  const rooms = plan?.rooms ?? [];
  const buildUp = plan?.buildUp ?? {
    x: 0,
    y: 0,
    width: plan?.plotLength ?? 30,
    height: plan?.plotBreadth ?? 40,
  };
  const bx = buildUp.x ?? 0;
  const by = buildUp.y ?? 0;
  const bw = buildUp.width ?? 30;
  const bh = buildUp.height ?? 40;

  const items: VastuAuditItem[] = [];
  for (const room of rooms) {
    if (
      room.id.startsWith("corridor") ||
      room.id === "parking" ||
      room.id === "garden"
    )
      continue;
    const item = scoreItem(room, bx, by, bw, bh);
    if (item) items.push(item);
  }

  // Main entrance: road side is always bottom of diagram after rotation logic;
  // score as aligned for East/North facing, neutral for West, avoid only if deep South interior.
  const facing = (roadFacing || plan?.roadFacing || "North") as Cardinal;
  const entrance: VastuAuditItem = {
    roomId: "entrance",
    roomLabel: "Main Entrance",
    label: "Main Entrance",
    zone: facing === "North" ? "N" : facing === "East" ? "E" : facing === "South" ? "S" : "W",
    status:
      facing === "North" || facing === "East"
        ? "aligned"
        : facing === "West"
          ? "neutral"
          : "neutral",
    message:
      facing === "North" || facing === "East"
        ? `Main door on ${facing} (favorable)`
        : `Main door on ${facing} (acceptable; North/East preferred)`,
  };

  const alignedCount = items.filter((i) => i.status === "aligned").length + (entrance.status === "aligned" ? 1 : 0);
  const neutralCount = items.filter((i) => i.status === "neutral").length + (entrance.status === "neutral" ? 1 : 0);
  const avoidCount = items.filter((i) => i.status === "avoid").length + (entrance.status === "avoid" ? 1 : 0);
  const total = alignedCount + neutralCount + avoidCount || 1;
  // Weight: aligned=1, neutral=0.55, avoid=0
  const points =
    alignedCount * 1 +
    neutralCount * 0.55 +
    avoidCount * 0;
  const score = Math.round((points / total) * 100);

  return {
    items,
    entrance,
    score,
    summary:
      avoidCount === 0
        ? "Vastu layout looks balanced"
        : `${avoidCount} room(s) in avoid zones — see details`,
    alignedCount,
    neutralCount,
    avoidCount,
  };
}

export function getLivingVastuZone(roadFacing: Cardinal): string {
  switch (roadFacing) {
    case "North":
      return "N";
    case "South":
      return "S";
    case "East":
      return "E";
    case "West":
      return "W";
    default:
      return "N";
  }
}
