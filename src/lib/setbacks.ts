/**
 * Plot setbacks and build-up area.
 *
 * Defaults (as specified):
 *   Front (road side) = 3 ft
 *   Back / Left / Right = 1 ft each
 *
 * N/S/E/W setbacks are derived from road facing + front/back/left/right.
 */

export type Cardinal = "North" | "South" | "East" | "West";

export interface SetbackInputs {
  front?: number;
  back?: number;
  left?: number;
  right?: number;
  /** Optional explicit cardinal overrides */
  north?: number;
  south?: number;
  east?: number;
  west?: number;
}

export interface ResolvedSetbacks {
  front: number;
  back: number;
  left: number;
  right: number;
  north: number;
  south: number;
  east: number;
  west: number;
}

export const DEFAULT_SETBACKS: Required<
  Pick<SetbackInputs, "front" | "back" | "left" | "right">
> = {
  front: 3,
  back: 1,
  left: 1,
  right: 1,
};

/**
 * Resolve front/back/left/right (+ optional N/S/E/W overrides) into
 * absolute cardinal setbacks for a given road-facing side.
 *
 * Convention relative to standing on the road looking into the plot:
 *   front = road edge, back = opposite, left/right = sides.
 */
export function resolveSetbacks(
  roadFacing: Cardinal = "North",
  input: SetbackInputs = {}
): ResolvedSetbacks {
  const front = input.front ?? DEFAULT_SETBACKS.front;
  const back = input.back ?? DEFAULT_SETBACKS.back;
  const left = input.left ?? DEFAULT_SETBACKS.left;
  const right = input.right ?? DEFAULT_SETBACKS.right;

  let north = back;
  let south = back;
  let east = left;
  let west = right;

  switch (roadFacing) {
    case "North":
      // Road at North → front = N, back = S, left = W, right = E
      north = front;
      south = back;
      west = left;
      east = right;
      break;
    case "South":
      south = front;
      north = back;
      east = left;
      west = right;
      break;
    case "East":
      east = front;
      west = back;
      north = left;
      south = right;
      break;
    case "West":
      west = front;
      east = back;
      south = left;
      north = right;
      break;
  }

  // Explicit cardinal overrides win
  if (input.north != null) north = input.north;
  if (input.south != null) south = input.south;
  if (input.east != null) east = input.east;
  if (input.west != null) west = input.west;

  return { front, back, left, right, north, south, east, west };
}

export interface BuildUpArea {
  /** Origin of build-up area in plot coordinates (ft from plot SW/top-left). */
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Build-up rectangle inside the plot after applying cardinal setbacks.
 * Coordinate system: x = 0 at West edge, y = 0 at North edge (canvas top).
 */
export function getBuildUpArea(
  plotW: number,
  plotH: number,
  sb: ResolvedSetbacks
): BuildUpArea {
  const x = sb.west;
  const y = sb.north;
  const width = Math.max(1, plotW - sb.west - sb.east);
  const height = Math.max(1, plotH - sb.north - sb.south);
  return { x, y, width, height };
}
