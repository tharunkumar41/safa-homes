/**
 * Compatibility stub.
 */

import { PlotInputs, FloorPlan } from "./types";

/** @deprecated Use the new template system via /api/generate */
export function generateFixedSizeLayout(_inputs: PlotInputs): FloorPlan {
  return {
    plotLength: 30,
    plotBreadth: 40,
    rooms: [],
    doors: [],
    windows: [],
    explanation: "Deprecated – use template system.",
  } as FloorPlan;
}
