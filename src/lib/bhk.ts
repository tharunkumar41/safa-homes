/**
 * BHK recommendation and validation — aligned with
 * Indian Residential Floor Plan Reference Set (Plot Size.pdf).
 *
 * PDF summary (North-facing, ground-focused):
 *  ~660 → 1BHK  |  ~800–1050 → 2BHK  |  ~1350–2000 → 3BHK
 *  ~2350–3250 → 4BHK  |  ~3750–4250 → 5BHK  |  ~4680 → 6BHK
 */
export type PlotShape =
  | "square"
  | "compact-rectangle"
  | "rectangle"
  | "long-rectangle"
  | "very-narrow";
export type BhkConfig = {
  bhk: number;
  bedrooms: number;
  masterBedrooms: number;
  bathrooms: number;
  kitchens: number;
  plotArea: number;
  buildableArea: number;
  aspectRatio: number;
  compactness: number;
  plotShape: PlotShape;
  buildableWidth: number;
  buildableHeight: number;
  allowPooja: boolean;
  allowParking: boolean;
  allowGarden: boolean;
  allowServant: boolean;
  allowDining: boolean;
  allowUtility: boolean;
  minLiving: number;
  minMaster: number;
  minBedroom: number;
  minKitchen: number;
  minBath: number;
  estimatedCoreArea: number;
  estimatedTotalArea: number;
  wasBhkReduced: boolean;
  label: string;
  recommendedBhk: number;
  maxFeasibleBhk: number;
  parkingCount: number;
};

/** PDF-aligned BHK recommendation by plot area (sq ft). */
export function recommendedBhkForArea(plotArea: number): number {
  const area = Math.max(1, Number(plotArea) || 1);
  if (area < 700) return 1;       // ~660 → 1BHK
  if (area < 1100) return 2;      // ~800–1050 → 2BHK
  if (area < 2100) return 3;      // ~1350–2000 → 3BHK
  if (area < 3400) return 4;      // ~2350–3250 → 4BHK
  if (area < 4500) return 5;      // ~3750–4250 → 5BHK
  return 6;                       // ~4680 → 6BHK
}

export function maxBhkForArea(plotArea: number): number {
  const area = Math.max(1, Number(plotArea) || 1);
  if (area < 600) return 1;
  if (area < 900) return 2;
  if (area < 1300) return 3;
  if (area < 1800) return 4;
  if (area < 2600) return 5;
  return 6;
}

export function maxBhkForGeometry(
  buildableArea: number,
  buildableWidth: number,
  buildableHeight: number
): number {
  const areaCap = maxBhkForArea(buildableArea);
  const shortSide = Math.min(buildableWidth || 20, buildableHeight || 20);
  const longSide = Math.max(buildableWidth || 20, buildableHeight || 20);
  let geoCap = areaCap;
  if (shortSide < 14) geoCap = Math.min(geoCap, 1);
  else if (shortSide < 18) geoCap = Math.min(geoCap, 2);
  else if (shortSide < 22) geoCap = Math.min(geoCap, 3);
  else if (shortSide < 26) geoCap = Math.min(geoCap, 4);
  else if (shortSide < 30) geoCap = Math.min(geoCap, 5);
  if (longSide < 24) geoCap = Math.min(geoCap, 2);
  else if (longSide < 30) geoCap = Math.min(geoCap, 3);
  else if (longSide < 36) geoCap = Math.min(geoCap, 4);
  return Math.max(1, geoCap);
}

/** Parking bay count from PDF summary table. */
export function parkingCountForArea(plotArea: number): number {
  if (plotArea < 1800) return 1;
  if (plotArea < 4000) return 2;
  return 3;
}

export function resolveBhkConfig(
  plotArea: number,
  requestedBhk?: number,
  buildableWidth?: number,
  buildableHeight?: number,
  _floors = 1
): BhkConfig {
  const rawArea = Math.max(1, Number(plotArea) || 1);
  const w = Number(buildableWidth) || Math.sqrt(rawArea);
  const h = Number(buildableHeight) || Math.sqrt(rawArea);
  const buildableArea = w * h;
  const maxFeasible = maxBhkForGeometry(buildableArea, w, h);
  const recommended = Math.min(recommendedBhkForArea(rawArea), maxFeasible);
  const requested =
    requestedBhk == null
      ? recommended
      : Math.max(1, Math.min(6, Math.round(Number(requestedBhk) || 1)));
  const wasBhkReduced = requested > maxFeasible;
  const bhk = wasBhkReduced ? maxFeasible : requested;

  // Bathroom counts aligned with PDF:
  // 1BHK → 1 common; 2BHK → 1–2; 3BHK → 2–3; 4BHK → 3–5; 5–6 → attached + common + servant toilet
  let bathrooms = 1;
  if (bhk === 2) bathrooms = 2;
  else if (bhk === 3) bathrooms = rawArea >= 1600 ? 3 : 2;
  else if (bhk === 4) bathrooms = rawArea >= 2700 ? 5 : 4;
  else if (bhk >= 5) bathrooms = bhk + 1; // attached + common (+ servant)

  const kitchens = bhk >= 5 ? 2 : 1;
  const parkingCount = parkingCountForArea(rawArea);

  // PDF: pooja niche < ~1100, separate room from ~1350
  const allowPooja = true; // niche or room always attempted
  // Parking from 2BHK+ only
  const allowParking = bhk > 1;
  const allowGarden = rawArea >= 1000;
  // PDF: servant from ~3250
  const allowServant = rawArea >= 3200;
  const allowDining = bhk >= 2 || rawArea >= 800;
  const allowUtility = rawArea >= 1600;

  // Min areas from PDF minimum practical sizes
  return {
    bhk,
    bedrooms: bhk,
    masterBedrooms: bhk >= 2 ? 1 : 0,
    bathrooms,
    kitchens,
    plotArea: rawArea,
    buildableArea,
    aspectRatio: w / Math.max(0.1, h),
    compactness: 1,
    plotShape: "rectangle",
    buildableWidth: w,
    buildableHeight: h,
    allowPooja,
    allowParking,
    allowGarden,
    allowServant,
    allowDining,
    allowUtility,
    minLiving: bhk === 1 ? 168 : bhk <= 2 ? 168 : bhk === 3 ? 224 : 288, // 12×14 / 14×16 / 16×18
    minMaster: bhk === 1 ? 120 : 168, // 10×12 / 12×14
    minBedroom: 100,
    minKitchen: bhk === 1 ? 56 : bhk <= 3 ? 80 : 120,
    minBath: bhk <= 2 ? 24 : 35,
    estimatedCoreArea: bhk * 200,
    estimatedTotalArea: bhk * 280,
    wasBhkReduced,
    label: `${bhk}BHK`,
    recommendedBhk: recommended,
    maxFeasibleBhk: maxFeasible,
    parkingCount,
  };
}
