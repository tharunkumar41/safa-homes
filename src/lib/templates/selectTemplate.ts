import { Cardinal, FloorTemplate, BhkLevel } from "./types";
import { getTemplate } from "./registry";

export interface SelectOptions {
  bhk: BhkLevel;
  roadFacing: Cardinal;
  buildUpWidth: number;
  buildUpHeight: number;
  wantParking?: boolean;
  wantPooja?: boolean;
}

export function selectTemplate(opts: SelectOptions): FloorTemplate | null {
  // Direction is selected directly. No rotation and no Vastu room-ID remapping.
  // Parking is intentionally not injected into the house footprint at this stage.
  return getTemplate(opts.bhk, opts.roadFacing, opts.wantPooja ?? opts.bhk > 1);
}
