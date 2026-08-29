import { ScaledRoom } from "./scaleTemplate";

/**
 * V5 deliberately does not resize or move rooms after scaling.
 * The templates are authored as non-overlapping room geometry; post-generation
 * expansion was the source of many of the old broken plans.
 */
export function refineLayout(rooms: ScaledRoom[]): ScaledRoom[] {
  return rooms.map((room) => ({ ...room }));
}
