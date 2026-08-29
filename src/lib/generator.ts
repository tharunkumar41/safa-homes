/**
 * Compatibility stub.
 * Real generation now happens in @/lib/templates/generateFromTemplate
 * and is called from /api/generate.
 */

import { PlotInputs, FloorPlan } from "./types";

/** @deprecated Use generateFromTemplate via /api/generate */
export function generateLocalLayout(_inputs: PlotInputs): FloorPlan {
  return {
    plotLength: 30,
    plotBreadth: 40,
    rooms: [],
    doors: [],
    windows: [],
    explanation: "Use /api/generate (template system). This stub is only for compile compatibility.",
  } as FloorPlan;
}

export function generateLocalUpperFloorLayout(
  inputs: PlotInputs,
  _floorNumber: number,
  _staircase: any
): FloorPlan {
  return generateLocalLayout(inputs);
}
