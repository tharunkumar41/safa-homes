/**
 * Compatibility stub.
 */

import { PlotInputs, FloorPlan } from "./types";

/** @deprecated Use the new template system via /api/generate */
export function generateFixedSizeLayout(_inputs: PlotInputs): FloorPlan {
  return {
    floor: 0,
    plotLength: 30,
    plotBreadth: 40,
    rooms: [],
    doors: [],
    windows: [],
    staircase: { x: 0, y: 0, width: 0, height: 0 },
    explanation: "Deprecated – use template system.",
  };
}