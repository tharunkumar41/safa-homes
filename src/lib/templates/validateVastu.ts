import { ScaledRoom } from "./scaleTemplate";
import { preferredZones, avoidZones, Direction } from "./vastuRules";

export function zoneOf(
  room: ScaledRoom,
  bx: number,
  by: number,
  bw: number,
  bh: number
): Direction {
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

export interface VastuIssue {
  roomId: string;
  zone: Direction;
  problem: string;
  severity: "warning" | "error";
}

export function validateVastu(
  rooms: ScaledRoom[],
  bx: number,
  by: number,
  bw: number,
  bh: number
): VastuIssue[] {
  const issues: VastuIssue[] = [];
  for (const room of rooms) {
    // Skip pure circulation / outdoor
    if (
      room.id.startsWith("corridor") ||
      room.id === "parking" ||
      room.id === "garden"
    )
      continue;

    const zone = zoneOf(room, bx, by, bw, bh);
    const avoid = avoidZones(room.id);
    const preferred = preferredZones(room.id);

    if (avoid.includes(zone)) {
      issues.push({
        roomId: room.id,
        zone,
        problem: `${room.label} is in ${zone} (Vastu avoid zone)`,
        severity: "error",
      });
    } else if (preferred.length && !preferred.includes(zone)) {
      issues.push({
        roomId: room.id,
        zone,
        problem: `${room.label} is in ${zone}; preferred ${preferred.join(", ")}`,
        severity: "warning",
      });
    }
  }
  return issues;
}
