/* Shared domain types for the AI residential floor-plan generator.
 * Design goals:
 * - Keep the existing generator / solver interfaces compatible.
 * - Store geometry separately from planning metadata.
 * - Support plot aspect-ratio aware generation.
 * - Support optional cultural / religious preference profiles without
 *   assuming one belief system for every user.
 * - Give future constraint/optimization stages enough information to work
 *   without changing the core Room shape again. */

// Basic geometry

export type CardinalDirection = "North" | "South" | "East" | "West";

export type CompassOrientation =
  | "North"  | "South"  | "East"  | "West"  | "Northeast"  | "Northwest"  | "Southeast"
  | "Southwest";

export type WallName = "top" | "bottom" | "left" | "right";
export type LayoutDirection = "horizontal" | "vertical";

export type PlotShape =
  | "square"  | "compact-rectangle"  | "rectangle"  | "long-rectangle"  | "very-narrow";

export type RoomKind =
  | "living"  | "family"  | "lounge"  | "bedroom"  | "master-bedroom"  | "guest-bedroom"
  | "kitchen"  | "dining"  | "bathroom"  | "pooja"  | "prayer"  | "study"  | "staircase"
  | "utility"  | "store"  | "corridor"  | "passage"  | "parking"  | "garden"  | "terrace"
  | "balcony"  | "servant"  | "other";

export type RoomStatus = | "required"  | "optional"  | "generated"  | "dropped"  | "warning";

export interface Size2D {
  width: number;
  height: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Rectangle extends Point2D, Size2D {}

export interface SizeBounds {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  minArea: number;
  preferredWidth?: number;
  preferredHeight?: number;
  preferredAspectRatio?: number;
  maxAspectRatio?: number;
}

// Room planning metadata

export interface RoomConstraint {
  kind?: RoomKind;
  preferred: Size2D; // Preferred target dimensions in feet.
  min: Size2D; // Hard/soft lower bounds used by the optimizer and validator.
  max: Size2D; // Upper bounds used to stop rooms absorbing the whole plot.
  minArea: number; // Minimum acceptable area in sq ft.
  priority: number; // Higher priority rooms receive space first.
  droppable?: boolean; // Optional room can be dropped when the program cannot fit.
  fixed?: boolean; // Room should not be scaled by the generic room-area optimizer.
  preferredAspectRatio?: number; // Preferred aspect ratio = longer side / shorter side.
  maxAspectRatio?: number; // Absolute maximum aspect ratio before the layout becomes impractical.
  areaWeight?: number; // Weight used when distributing extra/deficit area.
}

export interface RoomAdjacencyRule {
  roomId: string;
  preferredNear?: string[];
  requiredNear?: string[];
  avoidNear?: string[];
  mustNotTouch?: string[];
  preferredShareWall?: boolean;
  minSharedWallLength?: number;
}

export interface RoomAccessRule {
  roomId: string;
  allowFrom?: string[];
  preferFrom?: string[];
  forbidFrom?: string[];
  requiresExteriorAccess?: boolean;
}

export interface RoomPlanMeta {
  kind: RoomKind;
  status: RoomStatus;
  constraint?: RoomConstraint; // Preferred/min/max information resolved for this concrete room.
  priority?: number; // Relative importance in layout optimization.
  optional?: boolean; // True when this room was created as an optional expansion.
  dropped?: boolean; // True when this room was dropped and should not be recreated automatically.
  note?: string; // Human-readable reason when a room was dropped or reduced.
}

/* Room remains backward-compatible with the original geometry fields.
 * Existing code can still use room.x / y / width / height directly. */

export interface Room {
  id: string;
  label: string;

  x: number;   /** Geometry in feet, measured in plot coordinates. */
  y: number;
  width: number;
  height: number;
  
  kind?: RoomKind; /** Optional optimization metadata. */
  status?: RoomStatus;
  priority?: number;

  constraint?: RoomConstraint;
  note?: string; // User/generator notes, e.g. "reduced from requested 3rd bedroom".
  vastuZone?: string; // Optional true-compass placement hint/actual zone.
  preferenceProfile?: PreferenceProfile; // Optional cultural/religious preference tag for a prayer/worship room.
}

// Openings

export interface Door {
  room: string;
  wall: WallName;
  position: number; // Position measured along the selected wall from the room's local origin.

  width: number; // Opening width in feet.

  // Optional metadata for optimization/rendering.

  type?: "main" | "internal" | "bathroom" | "service" | "parking" | "stair";
  connectsTo?: string;
  exterior?: boolean;
}

export interface Window {
  room: string;
  wall: WallName;
  position: number; // Position measured along the selected wall from the room's local origin.
  width: number;   // Opening width in feet.
  type?: "standard" | "ventilator" | "large" | "kitchen" | "bathroom"; // Optional metadata.
  exterior?: boolean;
}

// Plot / site inputs                                                         

export interface SetbackInputs {
  front?: number;
  back?: number;
  left?: number;
  right?: number;

  north?: number; /** Optional direct cardinal overrides. */
  south?: number;
  east?: number;
  west?: number;
}

export interface PlotInputs {

  // Plot frontage / width along the road.

  lengthFt: number;
  breadthFt: number; // Plot depth away from the road.

  widthFt?: number; /** Aliases used by some UI layers. */
  depthFt?: number;

  heightFt?: number; // Building floor-to-ceiling height.
  orientation?: CompassOrientation;
  roadFacing?: CardinalDirection; // Actual road-facing edge.

  setbackFront?: number; /** Setbacks. */
  setbackBack?: number;
  setbackLeft?: number;
  setbackRight?: number;
  setbackNorth?: number;
  setbackSouth?: number;
  setbackEast?: number;
  setbackWest?: number;

  bedrooms?: number; /* Requested program.*/
  masterBedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  parking?: boolean;
  garden?: boolean;
  poojaRoom?: boolean;
  dining?: boolean;
  utility?: boolean;
  servantQuarters?: boolean;

  vastu?: boolean; // Cultural / planning preferences.
  preferenceProfile?: PreferenceProfile;
  style?: "modern" | "traditional" | "minimalist" | "contemporary"; // Visual / design style.
  floors?: number; // Floor count.
  familyType?: "nuclear" | "joint";
  kitchenType?: "open" | "closed";

  optimizeSpace?: boolean; // Optional optimizer controls.
  prioritizeNaturalLight?: boolean;
  prioritizePrivacy?: boolean;
  prioritizeAccessibility?: boolean;
  
  customRooms?: CustomRoomRequest[]; // Optional room list for future custom-program UI.
}

// Plot analysis / build-up

export interface Setbacks {
  front: number;
  back: number;
  left: number;
  right: number;
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface BuildUpArea extends Rectangle {}

export interface PlotAnalysis {
  plotArea: number;
  buildableArea: number;
  plotWidth: number;
  plotHeight: number;
  buildableWidth: number;
  buildableHeight: number;
  aspectRatio: number;
  compactness: number;
  shape: PlotShape;
  isWide: boolean;
  isDeep: boolean;
  isNarrow: boolean;
  shapeScore: number; // 1 = compact; lower values mean a more elongated plot.
  roomScale: number; // Preferred room scaling factor derived from buildable area.
  density?: number; // Estimated program density = required area / buildable area.
}

// Planning program / BHK

export interface BhkProgram {
  bhk: number;
  bedrooms: number;
  masterBedrooms: number;
  bathrooms: number;
  kitchens: number;
  allowPooja: boolean;
  allowParking: boolean;
  allowGarden: boolean;
  allowServant: boolean;
  allowDining: boolean;
  allowUtility: boolean;
  minLiving: number;
  minMaster: number;
  minBedroom: number;
  minKitchen: number;
  minBath: number;
  estimatedCoreArea?: number;
  estimatedTotalArea?: number;
  wasBhkReduced?: boolean;
  label: string;
}

export interface CustomRoomRequest {
  id: string;
  label: string;
  kind?: RoomKind;
  count?: number;
  preferred?: Size2D;
  min?: Size2D;
  max?: Size2D;
  minArea?: number;
  priority?: number;
  optional?: boolean;
}

/* Cultural / religious planning preferences
 *These profiles describe user-selectable preferences.
 * They are not universal religious rules.
 * "neutral" means no religious placement rules are applied.
 * Other profiles can affect the position/orientation of a worship/prayer
 * space without changing basic structural, safety, sanitation, accessibility,
 * or ventilation requirements. */

export type PreferenceProfile =
  | "neutral"  | "vastu"  | "qibla-aware"  | "christian-prayer-aware"  | "jewish-prayer-aware"
  | "sikh-prayer-aware" | "buddhist-prayer-aware"  | "jain-prayer-aware"
  | "zoroastrian-prayer-aware" | "custom";

export interface WorshipPreference {
  enabled: boolean;
  profile: PreferenceProfile;
  directionDegrees?: number; // Optional user-specified compass bearing for the worship direction.
  preferredDirection?: CompassOrientation | CardinalDirection; // Optional direction label selected by the user.
  spaceLabel?: string; // Preferred name for the space, e.g. Pooja Room / Prayer Room / Study.
  nearRooms?: string[]; // Desired adjacency, if the user requests it.
  avoidRooms?: string[]; // Rooms the user wants the worship space kept away from.
}

// Layout solver types

export type LayoutNode =
  | {
      type: "split";
      direction: LayoutDirection;

      /* Current requested ratio. The adaptive solver may adjust this toward
       * preferred room dimensions while preserving sensible geometry. */

      ratio: number;
      children: [LayoutNode, LayoutNode];
    }
  | {
      type: "room";
      id: string;
      label: string;
    };

export interface LayoutSolveOptions {
  wallThickness?: number;
  preferredSizeWeight?: number; // Blend 0 = trust requested tree ratio, 1 = trust preferred room sizes.
  enforceAspectRatios?: boolean; // Keep room aspect ratios within practical bounds where possible.
  optimizeWhitespace?: boolean; // Permit adaptive room expansion into spare space.
  maxIterations?: number; // Maximum number of refinement passes.
}

export interface LayoutDiagnostics {
  preferredArea: number;
  solvedArea: number;
  warnings: string[];
  constrainedRooms: string[];
  undersizedRooms: string[];
  oversizedRooms: string[];
  extremeAspectRooms: string[];
  score?: number;
}

// Floor plan

export interface FloorPlan {

  /** 0 = ground, 1 = first, 2 = second. */
  
  floor: number;
  plotLength: number;
  plotBreadth: number;
  heightFt?: number;
  rooms: Room[];
  doors: Door[];
  windows: Window[];

  staircase: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  explanation: string;
  warnings?: string[];

  //Setback/build-up information.

  buildUp?: BuildUpArea;
  setbacks?: Setbacks;

  // Optional diagnostics for UI/debugging.

  analysis?: PlotAnalysis;
  bhkProgram?: BhkProgram;
  diagnostics?: LayoutDiagnostics;
}

// Validation

export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationCode =
  | "OUT_OF_BOUNDS"  | "OVERLAP"  | "INVALID_GEOMETRY"  | "DUPLICATE_ID"  | "MIN_SIZE"
  | "MIN_AREA" | "ASPECT_RATIO"  | "OVERSIZED_ROOM"  | "MISSING_DOOR"  | "INVALID_DOOR"
  | "INVALID_WINDOW"  | "MISSING_LIVING"  | "MISSING_KITCHEN"  | "PARKING_TOO_SMALL"
  | "BATHROOM_ADJACENCY"  | "CIRCULATION"  | "WORSHIP_PREFERENCE"  | "ROOM_HIERARCHY"
  | "BUILDUP_BOUNDARY"  | "OTHER";

export interface ValidationIssue {
  code: ValidationCode;
  severity: ValidationSeverity;
  roomId?: string;
  message: string;
  penalty?: number;
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  issues: ValidationIssue[];
}

// Optimization result

export interface LayoutScore {
  total: number;
  spaceUtilization: number;
  roomProportion: number;
  circulation: number;
  daylight: number;
  privacy: number;
  adjacency: number;
  preference: number;
  boundarySafety: number;
}

export interface LayoutCandidate {
  rooms: Room[];
  doors: Door[];
  windows: Window[];
  score: LayoutScore;
  warnings: string[];
  iterations?: number;
}

// Useful constants

export const DEFAULT_LAYOUT_OPTIONS: Required<LayoutSolveOptions> = {
  wallThickness: 0.5, preferredSizeWeight: 0.65, enforceAspectRatios: true,
  optimizeWhitespace: true, maxIterations: 12,
};

export const DEFAULT_WORSHIP_PREFERENCE: WorshipPreference = {
  enabled: false, profile: "neutral",
};