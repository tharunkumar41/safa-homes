/**
 * Compatibility stub.
 * Real generation now happens in @/lib/templates/generateFromTemplate
 * and is called from /api/generate.
 */

import { PlotInputs, FloorPlan } from "./types";

/** @deprecated Use generateFromTemplate via /api/generate */
export function generateLocalLayout(_inputs: PlotInputs): FloorPlan {
  return {
    floor: 0,
    plotLength: 30,
    plotBreadth: 40,
    rooms: [],
    doors: [],
    windows: [],
    staircase: { x: 0, y: 0, width: 0, height: 0 },
    explanation: "Use /api/generate (template system). This stub is only for compile compatibility.",
  };
}

export function generateLocalUpperFloorLayout(
  inputs: PlotInputs,
  _floorNumber: number,
  _staircase: any
): FloorPlan {
  return generateLocalLayout(inputs);
}