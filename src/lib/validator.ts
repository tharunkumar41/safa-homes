import { FloorPlan, Room, Door, Window } from "./types";
import * as roomSizes from "./roomSizes";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  roomId?: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  issues: ValidationIssue[];
}

const EPS = 0.1;
const ADJ_TOL = 0.6;
const MIN_SHARED_EDGE = 0.3;

// The validator remains road-neutral. When road-aware validation is added,
// always use this canonical value from the generated plan rather than deriving
// a road side from transformed room geometry.

function getCanonicalRoadFacing(plan: FloorPlan): "North" | "South" | "East" | "West" 
| undefined {
  const value = (plan as any)?.roadFacing;
  return value === "North" || value === "South" || value === "East" || value === "West"
    ? value : undefined;
}

function roomKey(id: string): string {
  if (id === "bedroom-master" || id.startsWith("bedroom-master-")) {
    return "bedroom-master";
  }

  if (id === "bedroom-guest") return "bedroom-guest";

  // Map concrete bedroom ids to the closest rule key (bedroom-2 / bedroom-3 / …)
  if (id === "bedroom-2" || id.startsWith("bedroom-2-")) return "bedroom-2";
  if (id === "bedroom-3" || id.startsWith("bedroom-3-")) return "bedroom-3";
  if (id === "bedroom-4" || id.startsWith("bedroom-4-")) return "bedroom-3";
  if (id === "bedroom-5" || id.startsWith("bedroom-5-")) return "bedroom-3";
  if (id.startsWith("bedroom-")) return "bedroom-3";

  if (id.startsWith("bathroom-master") || id.startsWith("bathroom-attached")) {
    return "bathroom-attached";
  }

  if (id.startsWith("bathroom")) return "bathroom-common";

  if (id.startsWith("kitchen")) return "kitchen";

  if (id.startsWith("store")) return "store";

  if (id.startsWith("corridor") || id.startsWith("passage")) return "corridor";

  if (id === "family" || id === "lounge") return "living";

  return id;
}

function getRule(room: Room) {
  const rules = (roomSizes as typeof roomSizes & { ROOM_RULES?: Record<string, any> }).ROOM_RULES;
  if (rules) return rules[roomKey(room.id)];
  const sizes = (roomSizes as typeof roomSizes & { ROOM_SIZES?: Record<string, { width: number; height: number }> }).ROOM_SIZES;
  const size = sizes?.[roomKey(room.id)];
  if (!size) return undefined;
  const minScale = room.id.startsWith("bedroom-master") ? 0.92 : 0.85;
  return {
    minWidth: size.width * minScale,
    minHeight: size.height * minScale,
    maxWidth: size.width * 1.25,
    maxHeight: size.height * 1.25,
    minArea: size.width * size.height * minScale * minScale,
    priority: 50,
    preferredAspectRatio: size.width / Math.max(0.1, size.height),
  };
}

function isSoftRoom(room: Room): boolean {
  return (
    room.id === "garden" ||
    room.id === "parking" ||
    room.id === "corridor" ||
    room.id.startsWith("corridor-") ||
    room.id.startsWith("passage") ||
    room.id.startsWith("store") ||
    room.id === "lounge" ||
    room.id === "family" ||
    room.id === "utility"
  );
}

function isBedroom(id: string): boolean {
  return id.includes("bedroom") && !id.includes("bath");
}

function isBathroom(id: string): boolean {
  return id.startsWith("bathroom") || id === "toilet" || id.includes("wc");
}

function area(r: Room): number {
  return Math.max(0, r.width) * Math.max(0, r.height);
}

function aspectRatio(r: Room): number {
  const a = Math.max(EPS, Math.min(r.width, r.height));
  const b = Math.max(r.width, r.height);
  return b / a;
}

function overlapAmount(a: Room, b: Room): { x: number; y: number } {
  return {
    x: Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
    y: Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  };
}

function sharedEdge(
  a: Room,
  b: Room
): { wall: "top" | "bottom" | "left" | "right"; length: number } | null {
  const verticalOverlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  if (verticalOverlap > MIN_SHARED_EDGE) {
    if (Math.abs(a.x + a.width - b.x) <= ADJ_TOL) {
      return { wall: "right", length: verticalOverlap };
    }
    if (Math.abs(b.x + b.width - a.x) <= ADJ_TOL) {
      return { wall: "left", length: verticalOverlap };
    }
  }

  const horizontalOverlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  if (horizontalOverlap > MIN_SHARED_EDGE) {
    if (Math.abs(a.y + a.height - b.y) <= ADJ_TOL) {
      return { wall: "bottom", length: horizontalOverlap };
    }
    if (Math.abs(b.y + b.height - a.y) <= ADJ_TOL) {
      return { wall: "top", length: horizontalOverlap };
    }
  }

  return null;
}

function doorTouchesRoom(planRoom: Room, door: Door, other: Room): boolean {
  const horizontal = door.wall === "top" || door.wall === "bottom";
  const start = (horizontal ? planRoom.x : planRoom.y) + door.position;
  const end = start + door.width;

  if (horizontal) {
    const edgeY = door.wall === "top" ? planRoom.y : planRoom.y + planRoom.height;
    const touches =
      Math.abs(edgeY - other.y) <= ADJ_TOL ||
      Math.abs(edgeY - (other.y + other.height)) <= ADJ_TOL;
    if (!touches) return false;
    const otherStart = other.x;
    const otherEnd = other.x + other.width;
    return Math.min(end, otherEnd) - Math.max(start, otherStart) > MIN_SHARED_EDGE;
  }

  const edgeX = door.wall === "left" ? planRoom.x : planRoom.x + planRoom.width;
  const touches =
    Math.abs(edgeX - other.x) <= ADJ_TOL ||
    Math.abs(edgeX - (other.x + other.width)) <= ADJ_TOL;
  if (!touches) return false;
  const otherStart = other.y;
  const otherEnd = other.y + other.height;
  return Math.min(end, otherEnd) - Math.max(start, otherStart) > MIN_SHARED_EDGE;
}

function openingInsideWall(room: Room, position: number, width: number, wall: Door["wall"] | Window["wall"]): boolean {
  const span = wall === "top" || wall === "bottom" ? room.width : room.height;
  return Number.isFinite(position) && Number.isFinite(width) && width > 0 && position
   >= -EPS && position + width <= span + EPS;
}

function addIssue(issues: ValidationIssue[], severity: ValidationSeverity, code: string,
  message: string, roomId?: string) {
  issues.push({ severity, code, message, roomId });
}

export function validateFloorPlanDetailed(plan: FloorPlan): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!plan || !Number.isFinite(plan.plotLength) || !Number.isFinite(plan.plotBreadth)) {
    addIssue(issues, "error", "INVALID_PLOT", "Plot dimensions are missing or invalid.");
    return { valid: false, score: 0, issues };
  }

  if (plan.plotLength <= 0 || plan.plotBreadth <= 0) {
    addIssue(issues, "error", "INVALID_PLOT", "Plot dimensions must be greater than zero.");
    return { valid: false, score: 0, issues };
  }

  if (!Array.isArray(plan.rooms) || plan.rooms.length === 0) {
    addIssue(issues, "error", "NO_ROOMS", "No rooms were generated.");
    return { valid: false, score: 0, issues };
  }

  const rooms = plan.rooms;
  const byId = new Map<string, Room>();

  for (const room of rooms) {

    if (byId.has(room.id)) {
      addIssue(issues, "error", "DUPLICATE_ROOM_ID", `Duplicate room id: ${room.id}`, room.id);
    }
    byId.set(room.id, room);
  }

  const buildUp = plan.buildUp;
  const envelope = buildUp ?? {
    x: 0, y: 0,
    width: plan.plotLength, height: plan.plotBreadth,
  };

  // 1. Basic geometry / finite values / build-up bounds.

  for (const r of rooms) {
    const values = [r.x, r.y, r.width, r.height];
    if (values.some((v) => !Number.isFinite(v))) {
      addIssue(issues, "error", "INVALID_GEOMETRY", `Room ${r.label} contains a non-finite coordinate or dimension.`, r.id);
      continue;
    }
    if (r.width <= 0 || r.height <= 0) {
      addIssue(issues, "error", "INVALID_SIZE", `${r.label} has a non-positive width or height.`, r.id);
    }

    const insidePlot =
      r.x >= -EPS && r.y >= -EPS &&
      r.x + r.width <= plan.plotLength + EPS && r.y + r.height <= plan.plotBreadth + EPS;

    if (!insidePlot) {
      addIssue(issues, "error", "OUTSIDE_PLOT", `${r.label} extends outside the plot 
        boundary.`, r.id);
    }

    const insideBuildUp = r.x >= envelope.x - EPS && r.y >= envelope.y - EPS &&
      r.x + r.width <= envelope.x + envelope.width + EPS &&
      r.y + r.height <= envelope.y + envelope.height + EPS;

    if (!insideBuildUp && r.id !== "parking" && r.id !== "garden") {
      addIssue(issues, "error", "OUTSIDE_BUILDUP", `${r.label} extends outside the build-up area.`, r.id);
    }
  }

  // 2. Overlap check. Parking/garden may be intentionally external, but room-to-room
  // overlaps among enclosed spaces are never valid.

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];

      if (isSoftRoom(a) || isSoftRoom(b))
         continue;
      const ov = overlapAmount(a, b);

      if (ov.x > 0.1 && ov.y > 0.1) {
        addIssue(issues, "error", "ROOM_OVERLAP",
          `${a.label} overlaps ${b.label} by approximately 
          ${ov.x.toFixed(1)}×${ov.y.toFixed(1)} ft.`, a.id);
      }
    }
  }

  // 3. Constraint validation from roomSizes.ts.
  // Preferred dimensions are not treated as hard requirements; min/max are.
  // On small plots (< 1200 sq ft) undersized rooms are warnings, not hard errors,
  // because the engine intentionally scales rooms down to keep a workable plan.

  const plotArea = plan.plotLength * plan.plotBreadth;
  // Plots up to ~1500 sq ft often need slightly scaled rooms; treat size
  // shortfalls as warnings so a usable plan is not scored to zero.
  const sizeSeverity: ValidationSeverity = plotArea <= 1500 ? "warning" : "error";

  for (const room of rooms) {
    if (isSoftRoom(room))
       continue;
    const rule = getRule(room);
    if (!rule)
       continue;

    const minW = rule.minWidth;
    const minH = rule.minHeight;
    const maxW = rule.maxWidth;
    const maxH = rule.maxHeight;
    const a = area(room);

    // Allow 90° rotation: either width/height or height/width can satisfy bounds.

    const fitsDirect = room.width + 0.3 >= minW && room.height + 0.3 >= minH;
    const fitsRotated = room.height + 0.3 >= minW && room.width + 0.3 >= minH;

    if (!fitsDirect && !fitsRotated) {
      addIssue(issues, sizeSeverity, "BELOW_MIN_DIMENSION",
        `${room.label} is ${room.width.toFixed(1)}×${room.height.toFixed(1)} ft;
         minimum target is about ${minW}×${minH} ft.`, room.id);
    }

    // Hard maximums are warnings rather than fatal errors because a large room can be
    // intentionally requested on a large plot. The solver should eventually optimize it.

    const exceedsMax = room.width > maxW + 0.5 || room.height > maxH + 0.5;

    if (exceedsMax) {
      addIssue(issues, "warning", "ABOVE_PREFERRED_MAX",
        `${room.label} is ${room.width.toFixed(1)}×${room.height.toFixed(1)} ft, 
        above the configured preferred maximum ${maxW}×${maxH} ft.`, room.id);
    }

    if (a + 0.5 < rule.minArea) {
      addIssue(issues, sizeSeverity, "BELOW_MIN_AREA",
        `${room.label} has ${a.toFixed(1)} sq ft; minimum target is ${rule.minArea} sq ft.`,
        room.id);
    }

    const ratio = aspectRatio(room);
    const layoutRules = (roomSizes as typeof roomSizes & { LAYOUT_RULES?: { MAX_ASPECT_RATIO?: number } }).LAYOUT_RULES;
    const maxRatio = Math.max(1.8, layoutRules?.MAX_ASPECT_RATIO ?? 1.8);

    // Staircases and corridors are allowed to be more elongated.
    const isLinear =
      room.id === "staircase" ||
      room.id.startsWith("corridor") ||
      room.id.startsWith("passage");
    const effectiveMax = isLinear ? Math.max(maxRatio, 2.5) : maxRatio;

    if (ratio > Math.min(3.5, effectiveMax + 0.2)) {
      addIssue(issues, isLinear ? "warning" : sizeSeverity, "EXTREME_ASPECT_RATIO",
        `${room.label} has an extreme aspect ratio of ${ratio.toFixed(2)}:1.`, room.id);
    } else if (ratio > effectiveMax) {
      addIssue(issues, "warning", "HIGH_ASPECT_RATIO",
        `${room.label} is elongated at ${ratio.toFixed(2)}:1; preferred maximum is about
         ${maxRatio.toFixed(2)}:1.`, room.id);
    }
  }

  // 4. Room hierarchy checks: master should not be materially smaller than a secondary bedroom.
  
  const master = rooms.find((r) => r.id === "bedroom-master" || r.id.startsWith("bedroom-master-"));
  const secondary = rooms.filter((r) => isBedroom(r.id) && !r.id.startsWith("bedroom-master"));
  
  if (master && secondary.length > 0) {
    const smallestSecondary = Math.min(...secondary.map(area));
    if (area(master) + 5 < smallestSecondary * 0.95) {
      addIssue(issues, "warning", "MASTER_TOO_SMALL",
        `Master Bedroom (${area(master).toFixed(0)} sq ft) is materially smaller than a
         secondary bedroom (${smallestSecondary.toFixed(0)} sq ft).`, master.id);
    }
  }

  // 5. Door/window geometry.

  const doors = Array.isArray(plan.doors) ? plan.doors : [];
  const windows = Array.isArray(plan.windows) ? plan.windows : [];

  for (const door of doors) {
    const room = byId.get(door.room);
    
    if (!room) {
      addIssue(issues, "error", "DOOR_UNKNOWN_ROOM", 
        `Door references unknown room ${door.room}.`, door.room);
      continue;
    }

    if (!openingInsideWall(room, door.position, door.width, door.wall)) {
      addIssue(issues, "error", "DOOR_OUT_OF_BOUNDS", 
        `Door on ${room.label} falls outside its wall span.`, room.id);
    }
  }

  for (const win of windows) {
    const room = byId.get(win.room);
    
    if (!room) {
      addIssue(issues, "error", "WINDOW_UNKNOWN_ROOM", `Window references unknown room ${win.room}.`, win.room);
      continue;
    }

    if (!openingInsideWall(room, win.position, win.width, win.wall)) {
      addIssue(issues, "error", "WINDOW_OUT_OF_BOUNDS", `Window on ${room.label} falls outside its wall span.`, room.id);
    }
  }

  // 6. Doors should physically touch a shared wall or the building exterior.

  for (const door of doors) {
    const room = byId.get(door.room);

    if (!room)
       continue;

    const hasExteriorOpening = (() => {
      if (door.wall === "top")
         return Math.abs(room.y - envelope.y) <= ADJ_TOL;
      if (door.wall === "bottom")
         return Math.abs(room.y + room.height - (envelope.y + envelope.height)) <= ADJ_TOL;
      if (door.wall === "left")
         return Math.abs(room.x - envelope.x) <= ADJ_TOL;

      return Math.abs(room.x + room.width - (envelope.x + envelope.width)) <= ADJ_TOL;
    })();
    
    const touchesNeighbor = rooms.some((other) => other.id !== room.id && doorTouchesRoom(room, door, other));
    
    if (!hasExteriorOpening && !touchesNeighbor) {
      addIssue(issues, "error", "DOOR_NOT_CONNECTED", `Door on ${room.label} does not connect to the exterior or another room.`, room.id);
    }
  }

  // 7. Every enclosed room should normally have a door. Utility/store can be optional,
  // but bedrooms, living, kitchen, dining, pooja and bathrooms must be reachable.
  
  for (const room of rooms) {
    if (room.id === "garden" || room.id === "parking" || room.id === "corridor"
       || room.id.startsWith("passage"))
        continue;
    const hasDoor = doors.some((d) => d.room === room.id);

    if (!hasDoor) {
      addIssue(issues, "error", "MISSING_DOOR", `${room.label} has no door.`, room.id);
    }
  }

  // 8. Bathroom hygiene / privacy rules.
  
  for (const bath of rooms.filter((r) => isBathroom(r.id))) {
    for (const other of rooms) {
      if (other.id === bath.id)
         continue;
      if (!sharedEdge(bath, other))
         continue;
      if (other.id.startsWith("kitchen") || other.id === "dining") {
        // Touching a kitchen/dining room is not automatically invalid geometrically;
        // flag it as a design warning rather than making the plan impossible.
        addIssue(issues, "warning", "BATH_NEAR_KITCHEN_DINING",
          `${bath.label} directly shares a wall with ${other.label}; consider a more private 
          service arrangement.`, bath.id);
      }
    }

    const bathDoors = doors.filter((d) => d.room === bath.id);
    for (const d of bathDoors) {
      const target = rooms.find((r) => doorTouchesRoom(bath, d, r));

      if (target && (target.id.startsWith("kitchen") || target.id === "dining")) {
        addIssue(issues, "error", "BATH_DOOR_TO_KITCHEN",
          `${bath.label} opens directly toward ${target.label}.`, bath.id);
      }
    }
  }

  // 9. Bedroom circulation: bedrooms should have a connection to public/circulation space,
  // not require walking through another bedroom.
  
  for (const bedroom of rooms.filter((r) => isBedroom(r.id))) {
    const bedroomDoors = doors.filter((d) => d.room === bedroom.id);
    const connectedRooms = bedroomDoors
      .map((d) => rooms.find((r) => r.id !== bedroom.id && doorTouchesRoom(bedroom, d, r)))
      .filter((r): r is Room => Boolean(r));

    const publicConnection = connectedRooms.some((r) =>
        r.id === "living" || r.id === "family" || r.id === "lounge" ||
        r.id === "dining" || r.id === "kitchen" ||
        r.id.includes("corridor") || r.id.includes("passage") ||
        r.id.includes("lobby"));

    const onlyBedroomConnection = connectedRooms.length > 0 && connectedRooms.every((r) => isBedroom(r.id));
    if (!publicConnection && onlyBedroomConnection) {
      addIssue(issues, "error", "BEDROOM_THROUGH_BEDROOM",
        `${bedroom.label} appears to be accessible only through another bedroom.`,
        bedroom.id);
    }
  }

  // 10. Parking usability.
  
  const parking = rooms.find((r) => r.id === "parking");
  if (parking) {
    if (Math.min(parking.width, parking.height) < 9
     || Math.max(parking.width, parking.height) < 15) {

      addIssue(issues, "error", "PARKING_TOO_SMALL",
      `Parking is only ${parking.width.toFixed(1)}×${parking.height.toFixed(1)} ft; 
        it is below the usable target.`, parking.id);
    }
  }

  // 11. Basic circulation warning for larger plans.
  
  if (plan.plotLength * plan.plotBreadth > 900 && plan.floor === 0) {
    const hasCirculation = rooms.some((r) =>
        r.id === "living" || r.id === "family" || r.id === "lounge" ||
        r.id.includes("corridor") || r.id.includes("passage") ||
        r.id.includes("lobby"));

    if (!hasCirculation) {
      addIssue(issues, "warning", "NO_CLEAR_CIRCULATION", 
        "No clear common circulation/lobby space was detected.");
    }
  }

  // 12. Required rooms sanity check.
  
  const hasLiving = rooms.some((r) => r.id === "living" || r.id === "family");
  const hasKitchen = rooms.some((r) => r.id.startsWith("kitchen"));
  
  if (!hasLiving)
     addIssue(issues, "error", "MISSING_LIVING", "The plan has no living/common room.");
  if (!hasKitchen)
     addIssue(issues, "error", "MISSING_KITCHEN", "The plan has no kitchen.");

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(0, Math.round(100 - errors * 18 - warnings * 3));

  return {
    valid: errors === 0, score, issues,
  };
}

// Backward-compatible boolean API used by the current generator/app.

export function validateFloorPlan(plan: FloorPlan): boolean {
  return validateFloorPlanDetailed(plan).valid;
}

// Useful for UI/debugging: returns only messages, without changing the plan.

export function getFloorPlanValidationWarnings(plan: FloorPlan): string[] {
  return validateFloorPlanDetailed(plan).issues
    .filter((issue) => issue.severity === "warning").map((issue) => issue.message);
}

// Useful for UI/debugging: returns all errors and warnings with room IDs.

export function getFloorPlanValidationIssues(plan: FloorPlan): ValidationIssue[] {
  return validateFloorPlanDetailed(plan).issues;
}