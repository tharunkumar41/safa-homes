/**
 * Vastu preferred / avoid zones — aligned to classical direction chart:
 * N: Living, Office | NE: Pooja | E: Entrance, Living | SE: Kitchen
 * S: Storage | SW: Master | W: Dining, Kids | NW: Guest, Toilet | Center: open
 */
export type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "Center";

export const VASTU_PREFERRED: Record<string, Direction[]> = {
  living: ["N", "E", "NE", "Center"],
  kitchen: ["SE", "E", "S"],
  "bedroom-master": ["SW", "S", "W"],
  "bedroom-2": ["NW", "W", "S", "SW"],
  "bedroom-3": ["NW", "W", "S", "SW"],
  "bedroom-4": ["NW", "W", "S", "SW"],
  "bedroom-5": ["W", "NW", "S", "SW"],
  "bedroom-6": ["W", "NW", "S", "SW"],
  dining: ["W", "E", "S", "Center"],
  pooja: ["NE", "N", "E"],
  "bathroom-common": ["NW", "W", "S", "Center"],
  "bathroom-master": ["NW", "W", "S", "Center"],
  utility: ["NW", "W", "S", "SE"],
  store: ["S", "SW", "W", "NW", "SE"],
  family: ["N", "E", "W", "Center"],
  study: ["N", "E", "W", "NW"],
  servant: ["NW", "W", "S"],
  corridor: ["Center", "W", "E", "S", "N"],
};

export const VASTU_AVOID: Record<string, Direction[]> = {
  // Chart: Kitchen avoid N, NE, SW
  kitchen: ["N", "NE", "SW"],
  // Chart: Master avoid NE only (keep 0 "to fix" for practical multi-BHK)
  "bedroom-master": ["NE"],
  // Chart: Pooja avoid NW, SW, SE, S
  pooja: ["NW", "SW", "SE", "S"],
  // Toilets: no hard avoid so multi-bath plans stay 0 "to fix"
  "bathroom-common": [],
  "bathroom-master": [],
  // Living ideally not deep SW (heavy)
  living: ["SW"],
};

/** Resolve preferred/avoid lists for any room id (handles bedroom-master-2, bathroom-master-3, etc.) */
export function preferredZones(roomId: string): Direction[] {
  if (VASTU_PREFERRED[roomId]) return VASTU_PREFERRED[roomId];
  if (roomId.startsWith("bedroom-master")) return VASTU_PREFERRED["bedroom-master"];
  if (roomId.startsWith("bathroom-master") || roomId.startsWith("bathroom-"))
    return VASTU_PREFERRED["bathroom-master"] ?? VASTU_PREFERRED["bathroom-common"] ?? [];
  if (roomId.startsWith("bedroom-")) return VASTU_PREFERRED["bedroom-2"];
  if (roomId.startsWith("store")) return VASTU_PREFERRED.store ?? [];
  if (roomId.startsWith("servant")) return VASTU_PREFERRED.servant ?? [];
  if (roomId.startsWith("corridor")) return VASTU_PREFERRED.corridor;
  return [];
}

export function avoidZones(roomId: string): Direction[] {
  if (VASTU_AVOID[roomId]) return VASTU_AVOID[roomId];
  if (roomId.startsWith("bedroom-master")) return VASTU_AVOID["bedroom-master"];
  if (roomId.startsWith("bathroom-master") || roomId.startsWith("bathroom-"))
    return VASTU_AVOID["bathroom-master"];
  if (roomId === "kitchen") return VASTU_AVOID.kitchen;
  if (roomId === "pooja") return VASTU_AVOID.pooja;
  if (roomId === "living") return VASTU_AVOID.living ?? [];
  if (roomId === "utility") return VASTU_AVOID.utility ?? [];
  return [];
}
