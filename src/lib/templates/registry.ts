import { Cardinal, FloorTemplate, BhkLevel } from "./types";
import { makeTemplate } from "./layoutFactory";

export const TEMPLATES: FloorTemplate[] = (
  ["North", "South", "East", "West"] as Cardinal[]
).flatMap((facing) =>
  ([1, 2, 3, 4, 5, 6] as BhkLevel[]).map((bhk) => makeTemplate(bhk, facing))
);

export function getTemplate(
  bhk: BhkLevel,
  facing: Cardinal,
  wantPooja = bhk > 1
): FloorTemplate | null {
  try {
    return makeTemplate(bhk, facing, wantPooja);
  } catch {
    return null;
  }
}
