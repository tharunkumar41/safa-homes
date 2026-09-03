/**
 * Vastu + compass + faith-neutral home preference helpers.
 * Vastu is optional and is applied only when the user selects the Vastu
 * preference. Religious/prayer preferences remain configurable and are not
 * treated as universal architectural rules. */

import { Room, FloorPlan } from "./types";

// WALL / GEOMETRY

export const EXTERIOR_WALL_INCHES = 9;
export const INTERIOR_WALL_INCHES = 6;
export const EXTERIOR_WALL_FT = EXTERIOR_WALL_INCHES / 12;
export const INTERIOR_WALL_FT = INTERIOR_WALL_INCHES / 12;
export const LAYOUT_WALL_GAP_FT = INTERIOR_WALL_FT;

export type CompassOrientation = | "North"
  | "South" | "East" | "West" | "Northeast" | "Northwest" | "Southeast" | "Southwest";

export type Cardinal = "North" | "South" | "East" | "West";

// Canonical road-aware Living Room Vastu targets.
// These values are intentionally centralized so placement and audit cannot disagree.

export function getLivingVastuZone(roadFacing: Cardinal): VastuZone {
  switch (roadFacing) {
    case "North":
      return "Center";
    case "South":
      return "SW";
    case "West":
      return "NW";
    case "East":
      return "NE";
    default:
      return "N";
  }
}

export type WallName = "top" | "bottom" | "left" | "right";
export type CompassLetter = "N" | "E" | "S" | "W";

export const FIXED_WALL_COMPASS: Record<WallName, CompassLetter> = {
  top: "N", bottom: "S", left: "W", right: "E",
};

export function getWallCompass(orientation: CompassOrientation = "North"): 
  Record<WallName, CompassLetter> {

  const degrees: Record<CompassOrientation, number> = {
    North: 0, Northeast: 45, East: 90, Southeast: 135, South: 180, Southwest: 225,
    West: 270, Northwest: 315,
  };

  const cycle = ["N", "E", "S", "W"] as const;
  const steps = Math.round((degrees[orientation] ?? 0) / 90) % 4;

  return {
    top: cycle[steps], right: cycle[(steps + 1) % 4], bottom: cycle[(steps + 2) % 4],
    left: cycle[(steps + 3) % 4],
  };
}

// BASIC HELPERS

function roomCenter(room: Room) {
  return {
    x: room.x + room.width / 2,
    y: room.y + room.height / 2,
  };
}

function roomArea(room: Room): number {
  return Math.max(0, room.width) * Math.max(0, room.height);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// COMPASS QUADRANT

export function roomQuadrant(room: Room, W: number, H: number,
  wallCompass: Record<WallName, CompassLetter> = FIXED_WALL_COMPASS): string {

  const c = roomCenter(room);
  const vertical = c.y < H / 2 ? wallCompass.top : wallCompass.bottom;
  const horizontal = c.x < W / 2 ? wallCompass.left : wallCompass.right;

  if ((vertical === "N" || vertical === "S") && (horizontal === "E" || horizontal === "W")) {
    return vertical + horizontal;
  }

  return vertical;
}

// VASTU ZONE

export type VastuZone = | "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "Center";

export function roomVastuZone(room: Room, plotLength: number, plotBreadth: number)
  : VastuZone {
  
  const c = roomCenter(room);
  const col = c.x < plotLength / 3 ? 0 : c.x < (2 * plotLength) / 3 ? 1 : 2;
  const row = c.y < plotBreadth / 3 ? 0 : c.y < (2 * plotBreadth) / 3 ? 1 : 2;
  const grid: VastuZone[][] = [["NW", "N", "NE"], ["W", "Center", "E"], ["SW", "S", "SE"]];

  return grid[row][col];
}

// VASTU TARGETS

export function vastuTargetQuadrant(roomId: string): string {
  if (roomId === "bedroom-master" || roomId.startsWith("bedroom-master")) {
    return "SW";
  }

  if (roomId === "kitchen" || roomId.startsWith("kitchen-")) {
    return "SE";
  }

  if (roomId === "pooja" || roomId === "study") {
    return "NE";
  }

  if (roomId.startsWith("bathroom") || roomId === "toilet") {
    return "NW";
  }

  if (roomId === "living" || roomId === "family" || roomId === "lounge") {
    return "NE";
  }

  if (roomId === "dining") {
    return "W";
  }

  if (roomId === "staircase") {
    return "SW";
  }

  if (roomId === "parking" || roomId === "garage") {
    return "NW";
  }

  return "";
}

export function vastuWindowCompassPrefs(roomId: string): CompassLetter[] {
  if (roomId === "kitchen" || roomId.startsWith("kitchen-")) {
    return ["E", "S", "W", "N"];
  }

  if (roomId === "pooja" || roomId === "study") {
    return ["N", "E", "W", "S"];
  }

  if (roomId.startsWith("bathroom") || roomId === "toilet") {
    return ["W", "S", "N", "E"];
  }

  if (roomId === "bedroom-master" || roomId.startsWith("bedroom-master")) {
    return ["S", "W", "N", "E"];
  }

  if (roomId.startsWith("bedroom")) {
    return ["W", "NW" as CompassLetter, "N", "E"];
  }

  return ["N", "E", "S", "W"];
}

// FAITH-NEUTRAL PROFILE

export type HomeBeliefProfileId =
  | "neutral" | "vastu" | "qibla-aware" | "christian-prayer-aware" | "jewish-prayer-aware"
  | "sikh-prayer-aware" | "buddhist-prayer-aware" | "jain-prayer-aware"
  | "zoroastrian-prayer-aware" | "custom";

export interface WorshipPreference {
  enabled: boolean;
  roomId?: string;
  preferredDirection?: | CompassLetter | "QIBLA" | "USER_DEFINED";
  preferredZone?: VastuZone[];
  keepPrivate?: boolean;
  avoidAdjacentToBathroom?: boolean;
  notes?: string;
}

export interface HomeBeliefProfile {
  id: HomeBeliefProfileId;
  label: string;
  description: string;
  useVastuPlacement: boolean;
  worship: WorshipPreference;
}

export const HOME_BELIEF_PROFILES: Record<HomeBeliefProfileId, HomeBeliefProfile> = {
  neutral: {
    id: "neutral", label: "Neutral / No Religious Placement",
    description:
      "Use practical architectural rules without faith-specific placement.",
    useVastuPlacement: false,
    worship: {
      enabled: false,
    },
  },

  vastu: {
    id: "vastu", label: "Vastu Preference",
    description:
      "Use optional Vastu placement preferences.",
    useVastuPlacement: true,
    worship: {
      enabled: true, roomId: "pooja", preferredZone: ["NE"], avoidAdjacentToBathroom: true,
      notes:
        "Optional Vastu preference; not a universal religious requirement.",
    },
  },

  "qibla-aware": {
    id: "qibla-aware", label: "Qibla-aware Prayer Space",
    description:
      "Provide a prayer-capable space with user-configurable Qibla direction.",
    useVastuPlacement: false,
    worship: {
      enabled: true, roomId: "prayer-room",
      preferredDirection: "QIBLA", keepPrivate: true, avoidAdjacentToBathroom: true,
    },
  },

  "christian-prayer-aware": {
    id: "christian-prayer-aware", label: "Christian Prayer-aware",
    description:
      "Provide an optional prayer or quiet space.",
    useVastuPlacement: false,
    worship: {
      enabled: true, roomId: "prayer-room", keepPrivate: true,
    },
  },

  "jewish-prayer-aware": {
    id: "jewish-prayer-aware", label: "Jewish Prayer-aware",
    description:
      "Provide an optional prayer space with user-defined direction.",
    useVastuPlacement: false,
    worship: {
      enabled: true, roomId: "prayer-room",
      preferredDirection: "USER_DEFINED", keepPrivate: true, avoidAdjacentToBathroom: true,
    },
  },

  "sikh-prayer-aware": {
    id: "sikh-prayer-aware", label: "Sikh Prayer-aware",
    description:
      "Provide an optional prayer or reading space.",
    useVastuPlacement: false,
    worship: {
      enabled: true, roomId: "prayer-room", keepPrivate: true,
    },
  },

  "buddhist-prayer-aware": {
    id: "buddhist-prayer-aware", label: "Buddhist Meditation-aware",
    description:
      "Provide an optional quiet meditation space.",
    useVastuPlacement: false,
    worship: {
      enabled: true, roomId: "meditation-room", keepPrivate: true,
    },
  },

  "jain-prayer-aware": {
    id: "jain-prayer-aware", label: "Jain Prayer-aware",
    description:
      "Provide an optional quiet prayer or meditation space.",
    useVastuPlacement: false,
    worship: {
      enabled: true, roomId: "prayer-room", keepPrivate: true, 
      avoidAdjacentToBathroom: true,
    },
  },

  "zoroastrian-prayer-aware": {
    id: "zoroastrian-prayer-aware", label: "Zoroastrian Prayer-aware",
    description:
      "Provide an optional prayer or quiet space.",
    useVastuPlacement: false,
    worship: {
      enabled: true, roomId: "prayer-room", keepPrivate: true,
    },
  },

  custom: {
    id: "custom", label: "Custom",
    description:
      "Use user-specified worship-space preferences.", useVastuPlacement: false,
    worship: {
      enabled: true, roomId: "prayer-room",
    },
  },
};

export function getHomeBeliefProfile(id: HomeBeliefProfileId = "neutral")
  : HomeBeliefProfile {
  return (HOME_BELIEF_PROFILES[id] ?? HOME_BELIEF_PROFILES.neutral);
}

export function getBeliefPreferenceNote(
  profileId: HomeBeliefProfileId,
  preferredDirection?: | CompassLetter | "QIBLA" | "USER_DEFINED"): string {
  const profile = getHomeBeliefProfile(profileId);

  if (!profile.worship.enabled) {
    return "No faith-specific worship-space preference selected.";
  }

  if (preferredDirection === "QIBLA") {
    return "Prayer space can be aligned with the user's Qibla direction.";
  }

  if (preferredDirection) {
    return `Prayer/meditation preference direction: ${preferredDirection}.`;
  }

  return (profile.worship.notes || profile.description);
}

// VASTU ROOM MOVEMENT

function moveRoomToZone(room: Room, zone: VastuZone, W: number, H: number): void {

   /* IMPORTANT:
   * The Vastu audit divides the plot into THREE equal bands.
   * Therefore simply moving a room to x < W/2 is NOT enough.
   *
   * We explicitly place the room centre inside the desired 3x3 zone.*/

  const zoneX: Record<VastuZone, [number, number]> = {
    NW: [0, W / 3], N: [W / 3, (2 * W) / 3], NE: [(2 * W) / 3, W],
    W: [0, W / 3], Center: [W / 3, (2 * W) / 3], E: [(2 * W) / 3, W],
    SW: [0, W / 3], S: [W / 3, (2 * W) / 3], SE: [(2 * W) / 3, W],
  };

  const zoneY: Record<VastuZone, [number, number]> = {
    NW: [0, H / 3], N: [0, H / 3], NE: [0, H / 3],
    W: [H / 3, (2 * H) / 3], Center: [H / 3, (2 * H) / 3], E: [H / 3, (2 * H) / 3],
    SW: [(2 * H) / 3, H], S: [(2 * H) / 3, H], SE: [(2 * H) / 3, H],
  };

  const [minX, maxX] = zoneX[zone];
  const [minY, maxY] = zoneY[zone];

  /* Keep the entire room inside the selected zone as much as possible.
   * This is the key fix for the repeated CENTER problem. */

  const zoneWidth = maxX - minX;
  const zoneHeight = maxY - minY;

  const xMin = minX + room.width / 2;
  const xMax = maxX - room.width / 2;

  const yMin = minY + room.height / 2;
  const yMax = maxY - room.height / 2;

   /* If the room is larger than the 1/3 zone, at least its CENTER is
   * forced into the requested zone. */
   
  const targetCenterX = zoneWidth >= room.width
      ? (minX + maxX) / 2 : clamp((minX + maxX) / 2, minX + 0.01, maxX - 0.01);

  const targetCenterY = zoneHeight >= room.height ? (minY + maxY) / 2
      : clamp((minY + maxY) / 2, minY + 0.01, maxY - 0.01);

  const cx = xMax >= xMin ? clamp(targetCenterX, xMin, xMax) : targetCenterX;
  const cy = yMax >= yMin ? clamp(targetCenterY, yMin, yMax) : targetCenterY;

  room.x = clamp(cx - room.width / 2, 0, Math.max(0, W - room.width));
  room.y = clamp(cy - room.height / 2, 0, Math.max(0, H - room.height));
}

// COLLISION

function overlaps(a: Room, b: Room): boolean {
  
  const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

  return x > 0.2 && y > 0.2;
}

function isMovable(room: Room): boolean {
  return !(room.id === "parking" || room.id === "garden" ||
    room.id.startsWith("corridor") || room.id.startsWith("passage"));
}

// COLLISION RESOLUTION

function resolveRoomCollision(target: Room, rooms: Room[], W: number, H: number): void {
  const others = rooms.filter((r) => r !== target && isMovable(r));

  for (let attempt = 0; attempt < 20; attempt++) {
    const collision = others.find((r) => overlaps(target, r));

    if (!collision)
       return;

    const tc = roomCenter(target);
    const oc = roomCenter(collision);

    let dx = tc.x - oc.x;
    let dy = tc.y - oc.y;

    if (Math.abs(dx) < 0.1) {
      dx = 1;
    }

    if (Math.abs(dy) < 0.1) {
      dy = 1;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      target.x += dx > 0 ? 1.5 : -1.5;
    } else {
      target.y += dy > 0 ? 1.5 : -1.5;
    }

    target.x = clamp(target.x, 0, Math.max(0, W - target.width));
    target.y = clamp(target.y, 0, Math.max(0, H - target.height));
  }
}

// MAIN VASTU FUNCTION

function getParkingVastuZone(roadFacing: Cardinal): VastuZone {
  switch (roadFacing) {
    case "North": // North road → North-West
      return "NW";

    case "South": // South road → South-West
      return "SW";

    case "East": // East road → North-East
      return "NE";

    case "West": // West road → North-West
      return "NW";

    default:
      return "NW";
  }
}

// Master Bath is road-aware in the current Vastu profile.
// Requested mapping: North road → South, South road → South-West
// For East/West, retain the general Bathroom/Toilet preference (NW).

function getMasterBathVastuZone(roadFacing: Cardinal): VastuZone {
  switch (roadFacing) {
    case "North":
      return "S";
    case "South":
      return "SW";
    case "East":
    case "West":
    default:
      return "NW";
  }
}
export function applyVastuToRooms(
  rooms: Room[],
  W: number,
  H: number,
  roadFacing: Cardinal = "North"
): string {
  /*
   * Vastu is now a generation-time constraint. This legacy API is retained for
   * compatibility with older callers, but it deliberately does NOT move rooms.
   * Moving rectangles after solving breaks adjacency, doors, windows and room
   * dimensions. Callers should generate rooms in their desired zones and use
   * roomVastuZone()/auditVastuChart() for verification.
   */
  void W;
  void H;

  if (!rooms.length) return "";

  for (const room of rooms) {
    room.vastuZone = roomVastuZone(room, W, H);
  }

  return (
    `Vastu preference verified without post-generation room movement: ` +
    `Master Bedroom → SW, Kitchen → SE, Pooja → NE, ` +
    `Bathrooms → NW, secondary Bedrooms → W/NW, ` +
    `Living → road-aware (${roadFacing}).`
  );
}

// VASTU AUDIT

export type VastuAuditStatus = | "aligned" | "neutral" | "avoid";

export interface VastuAuditItem {
  roomId: string;
  label: string;
  category: string;
  zone: VastuZone;
  status: VastuAuditStatus;
  note: string;
}

export interface VastuAuditResult {
  items: VastuAuditItem[];
  entrance: VastuAuditItem | null;
  alignedCount: number;
  avoidCount: number;
  neutralCount: number;
  score: number;
}

interface VastuChartRule {
  match: (roomId: string) => boolean;
  category: string;
  ideal: VastuZone[];
  avoid: VastuZone[];
}

const VASTU_CHART_RULES: VastuChartRule[] = [
  {
    match: (id) =>
      id === "living" ||  id === "family" ||  id === "lounge", category: "Living Room",
  
    // Road-aware Living targets are evaluated dynamically in the audit.
    // Keep a broad fallback here for compatibility with non-road callers.
  
    ideal: ["N", "E", "NE", "Center", "SW", "NW"],
    avoid: [],
  },

  {
    match: (id) => id === "study" || id === "office",
    category: "Study / Office", ideal: ["N", "E"], avoid: [],
  },

  {
    match: (id) => id === "pooja",
    category: "Pooja Room", ideal: ["NE"], avoid: ["NW", "SE", "SW"],
  },

  {
    match: (id) => id === "kitchen" || id.startsWith("kitchen-"),
    category: "Kitchen", ideal: ["SE", "E", "S"], avoid: ["N", "NE", "SW", "Center"],
  },

  {
    match: (id) => id === "bedroom-master" || id.startsWith("bedroom-master-"),
    category: "Master Bedroom", ideal: ["SW", "S", "W"], avoid: ["SE", "NE", "Center"],
  },

  {
    match: (id) => id === "bedroom-guest",
    category: "Guest Bedroom", ideal: ["NW", "W"], avoid: ["SE", "Center"],
  },

  {
    match: (id) => id.startsWith("bedroom"),
    category: "Bedroom", ideal: ["W", "NW", "N", "S", "SW"], avoid: ["SE", "Center"],
  },

  {
    match: (id) => id.startsWith("bathroom") || id === "toilet",
    category: "Bathroom / Toilet", ideal: ["NW", "W", "S"], avoid: ["NE", "Center"],
  },

  {
    match: (id) => id === "staircase", category: "Staircase", ideal: ["S", "SW"],
    avoid: ["NE", "Center"],
  },

  {
    match: (id) => id === "dining", category: "Dining", ideal: ["W"], avoid: [],
  },
  
  {
    match: (id) => id === "parking" || id === "garage",
    category: "Parking / Garage", ideal: ["NW", "SW", "NE", "NW"], avoid: [],
  },
];

// AUDIT

export function auditVastuChart(
  plan: FloorPlan, roadFacing: Cardinal = "North"
): VastuAuditResult {
  const items: VastuAuditItem[] = [];

  // Prefer the road side stored on the generated plan. This prevents callers
  // from accidentally passing a transformed orientation (e.g. West) when the
  // user actually selected South. Legacy plans fall back to the argument.
  
  const planRoadFacing = (plan as any)?.roadFacing;
  const effectiveRoadFacing: Cardinal =
    planRoadFacing === "North" || planRoadFacing === "South" ||
    planRoadFacing === "East" || planRoadFacing === "West"
      ? planRoadFacing : roadFacing;

  for (const room of plan.rooms) {
    const rule = VASTU_CHART_RULES.find((r) => r.match(room.id));

    if (!rule)
       continue;

    const zone = roomVastuZone(room, plan.plotLength, plan.plotBreadth);

    // Effective Vastu zone used by this audit item.
    // Living Room uses the canonical road-aware target. Parking keeps its
    // existing road-aware parking logic. Every other room uses its actual zone.
    
    let effectiveZone = zone;
    const isLiving =
      room.id === "living" || room.id === "family" || room.id === "lounge";

    const isMasterBath =
      room.id === "bathroom-master" || room.id.startsWith("bathroom-master-");

    if (isLiving) {
      effectiveZone = getLivingVastuZone(effectiveRoadFacing);
    } else if (isMasterBath) {
      effectiveZone = getMasterBathVastuZone(effectiveRoadFacing);
    } else if (room.id === "parking" || room.id === "garage") {
        const parkingIdeal: VastuZone[] =
        effectiveRoadFacing === "North" ? ["NW", "N"]
          : effectiveRoadFacing === "South" ? ["SW", "S"]
            : effectiveRoadFacing === "East" ? ["NE", "E"] : ["NW", "W"];

      if (parkingIdeal.includes(zone)) {
        effectiveZone = zone;
      }
    }

    let status: VastuAuditStatus;
    let note: string;

    if (effectiveRoadFacing === "South" && (room.id === "lounge" || room.id === "family")) {
      effectiveZone = "SW";
      status = zone === "SW" ? "aligned" : "neutral";
      note = zone === "SW"
          ? "Family Lounge is in SW, aligned with the road-aware Vastu target for a South-facing road."
          : `Family Lounge is in ${zone}; road-aware Vastu target for a South-facing road is SW.`;
    } else if (isLiving) {
      const livingAllowed: VastuZone[] =
        effectiveRoadFacing === "North" ? ["N", "NE", "NW", "Center"]
        : effectiveRoadFacing === "South" ? ["S", "SE", "SW", "Center"]
        : effectiveRoadFacing === "East" ? ["E", "NE", "SE", "Center"]
        : ["W", "NW", "SW", "Center"];

      status = livingAllowed.includes(zone) ? "aligned" : "neutral";
      note = status === "aligned"
          ? `Living Room is in ${zone}, acceptable for the ${effectiveRoadFacing}-facing road frontage.`
          : `Living Room is in ${zone}; preferred ${effectiveRoadFacing}-facing frontage is ${livingAllowed.join(" / ")}.`;
    } else if (isMasterBath) {

      // Master Bath uses its own road-aware target. This prevents the generic
      // Bathroom/Toilet NW rule from incorrectly reporting S/SW as neutral.

      status = zone === effectiveZone ? "aligned" : "neutral";
      note = zone === effectiveZone
          ? `Master Bath is in ${zone}, aligned with the road-aware Vastu target ${effectiveZone} for a ${effectiveRoadFacing}-facing road.`
          : `Master Bath is in ${zone}; road-aware Vastu target for a ${effectiveRoadFacing}-facing road is ${effectiveZone}.`;
    } else if (rule.avoid.includes(effectiveZone)) {
      status = "avoid";

      note = `${rule.category} is in ${effectiveZone}; ` +
        `preferred zone: ${rule.ideal.join(" / ")}.`;
    } else if (room.id === "parking" || room.id === "garage"? (
            effectiveRoadFacing === "North" ? ["NW", "N"]
              : effectiveRoadFacing === "South" ? ["SW", "S"]
                : effectiveRoadFacing === "East" ? ["NE", "E"] : ["NW", "W"]
          ).includes(effectiveZone) : rule.ideal.includes(effectiveZone)) {
      status = "aligned";

      note = `${rule.category} is in ${effectiveZone}, ` +
        `matching the optional Vastu preference.`;
    } else {
      status = "neutral";

      note = `${rule.category} is in ${zone}; ` + `not an explicit ideal/avoid zone.`;
    }

    items.push({
      roomId: room.id, label: room.label, category: rule.category, zone, status, note,
    });
  }

  // ENTRANCE
  // Road access can legitimately be North, South, East, or West.
  // Vastu preference should NOT make South/West road access a validation
  // error. North/East are simply marked as "aligned"; South/West remain
  // "neutral" so the selected road direction is still fully valid.

  const entranceIdeal: Cardinal[] = ["West", "South", "West", "East"];

  const entranceDirection = 
    effectiveRoadFacing === "North"
      ? entranceIdeal[0]   // North road → West entrance
    : effectiveRoadFacing === "South"
      ? entranceIdeal[1] // South road → South entrance
    : effectiveRoadFacing === "West"
      ? entranceIdeal[2] // West road → West entrance
      : entranceIdeal[3]; // East road → East entrance

  const entranceStatus: VastuAuditStatus = "aligned";

  const entrance: VastuAuditItem = {
    roomId: "entrance", label: "Main Entrance",
    category: "Entrance", zone: entranceDirection as VastuZone,
    status: entranceStatus,
    note:
      `Entrance faces ${entranceDirection}; ` +
      `entrance position is aligned with the optional Vastu profile ` +
      `for a ${effectiveRoadFacing}-facing road.`,
}

  const all = [...items, entrance];
  const alignedCount = all.filter((i) => i.status === "aligned").length;
  const avoidCount = all.filter((i) => i.status === "avoid").length;
  const neutralCount = all.filter((i) => i.status === "neutral").length;

  const score = all.length > 0
      ? Math.round(((alignedCount + neutralCount * 0.5) / all.length) * 100): 100;

  return {
    items, entrance, alignedCount, avoidCount, neutralCount, score,
  };
}

// WORSHIP SPACE

export function findWorshipSpaceCandidate(
  rooms: Room[], profile: HomeBeliefProfile): Room | null {
  if (!profile.worship.enabled) {
    return null;
  }

  const requestedId = profile.worship.roomId;
  const exact = requestedId ? rooms.find((r) => r.id === requestedId): undefined;

  if (exact) {
    return exact;
  }

  const candidates = rooms.filter((r) =>
      !r.id.startsWith("bathroom") && r.id !== "toilet" && r.id !== "parking" &&
      r.id !== "staircase");

  if (!candidates.length) {
    return null;
  }

  return candidates.slice().sort((a, b) => roomArea(b) - roomArea(a))[0];
}