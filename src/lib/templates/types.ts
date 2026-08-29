export type Cardinal = "North" | "South" | "East" | "West";

export type BhkLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface TemplateRoom {
  id: string;
  label: string;
  /** Normalized plot coordinates: x=West→East, y=North→South. */
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface FloorTemplate {
  id: string;
  name: string;
  bhk: BhkLevel;
  roadFacing: Cardinal;
  aspect: "square" | "wide" | "deep";
  hasParking: boolean;
  hasPooja: boolean;
  hasStairs: boolean;
  rooms: TemplateRoom[];
}
