import { ScaledRoom } from "./scaleTemplate";

/** Kept for compatibility. Corridors/passages are explicit template rooms in V5. */
export function addCorridor(rooms: ScaledRoom[]): ScaledRoom[] {
  return rooms.map((room) => ({ ...room }));
}
