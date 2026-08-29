import { resolveSetbacks, getBuildUpArea } from "@/lib/setbacks";
import { Cardinal, BhkLevel } from "./types";
import { selectTemplate } from "./selectTemplate";
import {
  scaleTemplate,
  findOverlaps,
  fillBuildUpGaps,
  resolveOverlaps,
  clampToBuildUp,
  ScaledRoom,
} from "./scaleTemplate";
import { refineLayout } from "./refineLayout";
import { generateOpenings } from "./openings";
import { validateVastu } from "./validateVastu";
import { parkingSizeForArea } from "./roomSizes";

export interface GenerateInput {
  lengthFt: number;
  breadthFt: number;
  roadFacing: Cardinal;
  bhk: BhkLevel;
  setbackFront?: number;
  setbackBack?: number;
  setbackLeft?: number;
  setbackRight?: number;
  wantParking?: boolean;
  wantPooja?: boolean;
  wantGarden?: boolean;
  /** Servant quarter — PDF from ~3250 sq ft; can force on/off. */
  wantServant?: boolean;
  /** Number of master bedrooms that need attached toilets (1 … bhk). */
  masterBedrooms?: number;
  /** Total bathrooms requested (attached + common). */
  bathrooms?: number;
}

const minBuildUp: Record<BhkLevel, { w: number; h: number }> = {
  1: { w: 14, h: 14 },  // PDF 1BHK; can be ~18×16 after reserving north parking
  2: { w: 16, h: 18 },  // PDF 2BHK after parking on 20×40 / 30×35
  3: { w: 25, h: 33 },
  4: { w: 28, h: 36 },
  5: { w: 32, h: 40 },
  6: { w: 36, h: 44 },
};

/** Parking footprint from PDF: 9×16 compact (<900 sq ft), else 10×18. */
function placeParking(
  rooms: ScaledRoom[],
  plotW: number,
  plotH: number,
  buildUp: { x: number; y: number; width: number; height: number },
  roadFacing: Cardinal
): ScaledRoom | null {
  const plotArea = plotW * plotH;
  const { w: PARKING_W, h: PARKING_H } = parkingSizeForArea(plotArea);
  // Prefer front setback strip (road side).
  const candidates: Array<{ x: number; y: number; width: number; height: number }> = [];

  if (roadFacing === "North") {
    // Front is north (y small) — use setback strip if wide enough, else beside build-up
    if (buildUp.y >= PARKING_H - 0.5) {
      candidates.push({ x: buildUp.x, y: 0.5, width: PARKING_W, height: Math.min(PARKING_H, buildUp.y - 0.5) });
    }
    candidates.push({ x: 0.5, y: buildUp.y, width: Math.min(PARKING_W, buildUp.x - 0.5), height: PARKING_H });
    candidates.push({
      x: buildUp.x + buildUp.width + 0.25,
      y: buildUp.y,
      width: Math.min(PARKING_W, plotW - (buildUp.x + buildUp.width) - 0.5),
      height: PARKING_H,
    });
  } else if (roadFacing === "South") {
    if (plotH - (buildUp.y + buildUp.height) >= PARKING_H - 0.5) {
      candidates.push({
        x: buildUp.x,
        y: buildUp.y + buildUp.height + 0.25,
        width: PARKING_W,
        height: Math.min(PARKING_H, plotH - (buildUp.y + buildUp.height) - 0.5),
      });
    }
    candidates.push({ x: 0.5, y: buildUp.y + buildUp.height - PARKING_H, width: Math.min(PARKING_W, buildUp.x - 0.5), height: PARKING_H });
  } else if (roadFacing === "East") {
    if (plotW - (buildUp.x + buildUp.width) >= PARKING_W - 0.5) {
      candidates.push({
        x: buildUp.x + buildUp.width + 0.25,
        y: buildUp.y,
        width: Math.min(PARKING_W, plotW - (buildUp.x + buildUp.width) - 0.5),
        height: PARKING_H,
      });
    }
  } else {
    // West
    if (buildUp.x >= PARKING_W - 0.5) {
      candidates.push({ x: 0.5, y: buildUp.y, width: Math.min(PARKING_W, buildUp.x - 0.5), height: PARKING_H });
    }
  }

  for (const c of candidates) {
    if (c.width < 8 || c.height < 10) continue;
    if (c.x < 0 || c.y < 0 || c.x + c.width > plotW + 0.1 || c.y + c.height > plotH + 0.1) continue;
    const parking: ScaledRoom = {
      id: "parking",
      label: "Car Parking",
      x: Math.round(c.x * 2) / 2,
      y: Math.round(c.y * 2) / 2,
      width: Math.round(c.width * 2) / 2,
      height: Math.round(c.height * 2) / 2,
    };
    const hit = rooms.some(
      (r) =>
        parking.x < r.x + r.width - 0.1 &&
        parking.x + parking.width > r.x + 0.1 &&
        parking.y < r.y + r.height - 0.1 &&
        parking.y + parking.height > r.y + 0.1
    );
    if (!hit) return parking;
  }
  return null;
}


/**
 * Reserve a parking bay on the road side by shrinking the build-up.
 * PDF 1BHK: 9×16 north of the house on a 20×33 plot.
 * Returns null if remaining build-up would fall below minSize.
 */
function reserveParkingStrip(
  plotW: number,
  plotH: number,
  roadFacing: Cardinal,
  buildUp: { x: number; y: number; width: number; height: number },
  parkW: number,
  parkH: number,
  minSize: { w: number; h: number }
): { buildUp: { x: number; y: number; width: number; height: number }; parking: ScaledRoom } | null {
  const snap = (v: number) => Math.round(v * 2) / 2;

  /**
   * Placement strategy:
   * 1) Narrow frontage (≤25 ft): PARALLEL parking along the road.
   *    Car sits sideways — only ~8 ft of depth, full/most of frontage width.
   *    Best for 20×40 type plots; leaves the house a clear path and depth.
   * 2) Wider plots: PERPENDICULAR bay (parkW × parkH) on one side of the
   *    road strip, door path kept clear on the other side.
   */
  const narrow = (roadFacing === "North" || roadFacing === "South")
    ? plotW <= 25
    : plotH <= 25;

  if (roadFacing === "North") {
    if (narrow) {
      // Parallel: depth ~8 ft, width = most of build-up frontage
      const ph = snap(Math.min(8.5, buildUp.y + buildUp.height - minSize.h - 0.5));
      if (ph < 7) return null;
      const py = snap(0.5);
      const pw = snap(Math.min(buildUp.width, Math.max(16, buildUp.width - 1)));
      const px = snap(buildUp.x + (buildUp.width - pw) / 2);
      const newY = snap(py + ph);
      const newH = snap(buildUp.y + buildUp.height - newY);
      if (newH < minSize.h || buildUp.width < minSize.w) return null;
      return {
        buildUp: { x: buildUp.x, y: newY, width: buildUp.width, height: newH },
        parking: { id: "parking", label: "Car Parking", x: px, y: py, width: pw, height: ph },
      };
    }
    // Perpendicular bay on east side
    for (const depth of [parkH, Math.max(10, parkH - 2), 10]) {
      const py = snap(0.5);
      const maxPh = buildUp.y + buildUp.height - minSize.h - py;
      const ph = snap(Math.min(depth, maxPh));
      if (ph < 10) continue;
      const pw = snap(Math.min(parkW, Math.max(8, buildUp.width * 0.45)));
      if (pw < 8) continue;
      const px = snap(buildUp.x + buildUp.width - pw); // east
      const newY = snap(py + ph);
      const newH = snap(buildUp.y + buildUp.height - newY);
      if (newH < minSize.h) continue;
      return {
        buildUp: { x: buildUp.x, y: newY, width: buildUp.width, height: newH },
        parking: { id: "parking", label: "Car Parking", x: px, y: py, width: pw, height: ph },
      };
    }
    return null;
  }

  if (roadFacing === "South") {
    if (narrow) {
      const ph = snap(Math.min(8.5, buildUp.height - minSize.h));
      if (ph < 7) return null;
      const southRoom = plotH - (buildUp.y + buildUp.height);
      let py = snap(buildUp.y + buildUp.height - ph);
      let usePh = ph;
      if (southRoom > 0.5) {
        usePh = snap(Math.min(8.5, ph + southRoom - 0.5));
        py = snap(plotH - 0.5 - usePh);
      }
      const pw = snap(Math.min(buildUp.width, Math.max(16, buildUp.width - 1)));
      const px = snap(buildUp.x + (buildUp.width - pw) / 2);
      const newH = snap(py - buildUp.y);
      if (newH < minSize.h) return null;
      return {
        buildUp: { x: buildUp.x, y: buildUp.y, width: buildUp.width, height: newH },
        parking: { id: "parking", label: "Car Parking", x: px, y: py, width: pw, height: usePh },
      };
    }
    for (const depth of [parkH, Math.max(10, parkH - 2), 10]) {
      let ph = snap(Math.min(depth, buildUp.height - minSize.h));
      if (ph < 10) continue;
      let py = snap(buildUp.y + buildUp.height - ph);
      const southRoom = plotH - (buildUp.y + buildUp.height);
      if (southRoom > 0.5) {
        ph = snap(Math.min(depth, ph + southRoom - 0.5));
        py = snap(plotH - 0.5 - ph);
      }
      const pw = snap(Math.min(parkW, Math.max(8, buildUp.width * 0.45)));
      const px = snap(buildUp.x + buildUp.width - pw);
      const newH = snap(py - buildUp.y);
      if (newH < minSize.h) continue;
      return {
        buildUp: { x: buildUp.x, y: buildUp.y, width: buildUp.width, height: newH },
        parking: { id: "parking", label: "Car Parking", x: px, y: py, width: pw, height: ph },
      };
    }
    return null;
  }

  if (roadFacing === "East") {
    const strip = Math.min(narrow ? 8.5 : parkH, buildUp.width - minSize.w);
    if (strip < 7) return null;
    const eastRoom = plotW - (buildUp.x + buildUp.width);
    let pw = snap(Math.max(strip, Math.min(narrow ? 8.5 : parkH, strip + Math.max(0, eastRoom - 0.5))));
    if (pw < 7) return null;
    const px = snap(plotW - 0.5 - pw);
    const ph = snap(narrow ? Math.min(buildUp.height, Math.max(16, buildUp.height - 1)) : Math.min(Math.max(parkW, 16), buildUp.height));
    if (ph < 10) return null;
    const py = snap(buildUp.y + (buildUp.height - ph) / 2);
    const newW = snap(px - buildUp.x);
    if (newW < minSize.w) return null;
    return {
      buildUp: { x: buildUp.x, y: buildUp.y, width: newW, height: buildUp.height },
      parking: { id: "parking", label: "Car Parking", x: px, y: py, width: pw, height: ph },
    };
  }

  // West
  {
    const strip = Math.min(narrow ? 8.5 : parkH, buildUp.width - minSize.w);
    if (strip < 7) return null;
    let pw = snap(Math.min(narrow ? 8.5 : parkH, Math.max(strip, buildUp.x + strip - 0.5)));
    if (pw < 7) return null;
    const px = snap(0.5);
    const ph = snap(narrow ? Math.min(buildUp.height, Math.max(16, buildUp.height - 1)) : Math.min(16, buildUp.height));
    if (ph < 10) return null;
    const py = snap(buildUp.y + (buildUp.height - ph) / 2);
    const newX = snap(px + pw);
    const newW = snap(buildUp.x + buildUp.width - newX);
    if (newW < minSize.w) return null;
    return {
      buildUp: { x: newX, y: buildUp.y, width: newW, height: buildUp.height },
      parking: { id: "parking", label: "Car Parking", x: px, y: py, width: pw, height: ph },
    };
  }
}

function placeGarden(
  rooms: ScaledRoom[],
  plotW: number,
  plotH: number,
  buildUp: { x: number; y: number; width: number; height: number }
): ScaledRoom | null {
  // Use leftover outdoor strip (prefer rear or side)
  const strips = [
    { x: 0.5, y: 0.5, width: plotW - 1, height: Math.max(0, buildUp.y - 0.75) },
    {
      x: 0.5,
      y: buildUp.y + buildUp.height + 0.25,
      width: plotW - 1,
      height: Math.max(0, plotH - (buildUp.y + buildUp.height) - 0.75),
    },
    { x: 0.5, y: buildUp.y, width: Math.max(0, buildUp.x - 0.75), height: buildUp.height },
    {
      x: buildUp.x + buildUp.width + 0.25,
      y: buildUp.y,
      width: Math.max(0, plotW - (buildUp.x + buildUp.width) - 0.75),
      height: buildUp.height,
    },
  ];

  let best: ScaledRoom | null = null;
  let bestArea = 0;
  for (const s of strips) {
    if (s.width < 4 || s.height < 4) continue;
    const area = s.width * s.height;
    if (area < 20 || area <= bestArea) continue;
    const garden: ScaledRoom = {
      id: "garden",
      label: "Garden",
      x: Math.round(s.x * 2) / 2,
      y: Math.round(s.y * 2) / 2,
      width: Math.round(s.width * 2) / 2,
      height: Math.round(s.height * 2) / 2,
    };
    const hit = rooms.some(
      (r) =>
        garden.x < r.x + r.width - 0.1 &&
        garden.x + garden.width > r.x + 0.1 &&
        garden.y < r.y + r.height - 0.1 &&
        garden.y + garden.height > r.y + 0.1
    );
    if (!hit) {
      best = garden;
      bestArea = area;
    }
  }
  return best;
}

/**
 * Bathroom policy (every layout):
 * - 1BHK → exactly 1 common bathroom.
 * - Multi BHK with secondary beds → 1 common + (bathrooms−1) attached.
 * - Multi BHK all-masters → bathrooms all attached (no common required).
 * Attached baths are ALWAYS carved from the master bedroom itself
 * (share a wall — same pattern as a typical Indian master suite).
 */
function applyBathroomPolicy(
  rooms: ScaledRoom[],
  bhk: BhkLevel,
  masterCount: number,
  bathroomsRequested?: number
): ScaledRoom[] {
  const isBath = (id: string) =>
    id === "bathroom-master" ||
    id === "bathroom-common" ||
    /^bathroom-\d+$/.test(id) ||
    /^bathroom-master-\d+$/.test(id);

  const isBed = (id: string) =>
    id === "bedroom-master" ||
    /^bedroom-\d+$/.test(id) ||
    /^bedroom-master-\d+$/.test(id);

  // --- 1BHK: single common bathroom only ---
  if (bhk === 1) {
    const baths = rooms.filter((r) => isBath(r.id));
    const keep = baths[0];
    const rest = rooms.filter((r) => !isBath(r.id));
    if (!keep) return rooms;
    return [...rest, { ...keep, id: "bathroom-common", label: "Bathroom" }];
  }

  const totalBaths = Math.max(
    1,
    Math.round(Number(bathroomsRequested) || masterCount + 1)
  );
  const secondaryCount = Math.max(0, bhk - masterCount);

  // Always honour bathroom count: 1 common (if secondary beds exist) + rest attached.
  // Attached carves from largest bedrooms (masters first).
  const needCommon = secondaryCount > 0 ? 1 : totalBaths > masterCount ? 1 : 0;
  const needAttached = Math.max(0, totalBaths - needCommon);

  // Rank bedrooms for master assignment: prefer SW / S / W (Vastu), then size.
  // Avoid promoting NE bedrooms to "master" — that causes avoid flags on 4–6BHK.
  const bedVastuScore = (r: ScaledRoom) => {
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    // Higher = better for master (south + west favored)
    let s = cy * 3 - cx;
    // Strong penalty for NE corner
    if (cx > 18 && cy < 14) s -= 200;
    if (cx > 22 && cy < 10) s -= 100;
    return s + r.width * r.height * 0.05;
  };
  const beds = rooms
    .filter((r) => isBed(r.id))
    .sort((a, b) => bedVastuScore(b) - bedVastuScore(a))
    .map((b) => ({ ...b }));

  const masters = beds.slice(0, masterCount);
  const secondaries = beds.slice(masterCount);

  // Keep non-bed non-bath rooms. Turn old template baths into corridors
  // so their area is not left as a gray void before gap-fill runs.
  let out: ScaledRoom[] = rooms
    .filter((r) => !isBed(r.id) && !isBath(r.id))
    .map((r) => ({ ...r }));
  rooms
    .filter((r) => isBath(r.id))
    .forEach((b, i) => {
      out.push({
        ...b,
        id: `corridor-exbath-${i}`,
        label: "Passage",
      });
    });

  masters.forEach((bed, i) => {
    out.push({
      ...bed,
      id: i === 0 ? "bedroom-master" : `bedroom-master-${i + 1}`,
      label: i === 0 ? "Master Bedroom" : `Master Bedroom ${i + 1}`,
    });
  });
  secondaries.forEach((bed, i) => {
    out.push({
      ...bed,
      id: `bedroom-${i + 2}`,
      label: `Bedroom ${i + 2}`,
    });
  });

  /**
   * Always carve an attached bath from the master (shares a wall).
   * Uses smaller minimums so compact 9×10 rooms still get a bath.
   */
  const carveAttached = (
    bedId: string,
    bathId: string,
    bathLabel: string
  ): ScaledRoom | null => {
    const idx = out.findIndex((r) => r.id === bedId);
    if (idx < 0) return null;
    const bed = out[idx];

    // Right strip — need ≥6 ft left for bed
    if (bed.width >= 10 && bed.height >= 5) {
      const bw = Math.min(5, Math.max(3.5, bed.width - 6.5));
      const bath: ScaledRoom = {
        id: bathId,
        label: bathLabel,
        x: bed.x + bed.width - bw,
        y: bed.y,
        width: bw,
        height: Math.min(bed.height, Math.max(5, bed.height * 0.7)),
      };
      out[idx] = { ...bed, width: bed.width - bw };
      return bath;
    }

    // Bottom strip
    if (bed.height >= 10 && bed.width >= 5) {
      const bh = Math.min(5, Math.max(3.5, bed.height - 6.5));
      const bath: ScaledRoom = {
        id: bathId,
        label: bathLabel,
        x: bed.x + Math.max(0, bed.width - Math.min(bed.width, 6)),
        y: bed.y + bed.height - bh,
        width: Math.min(bed.width, Math.max(5, bed.width * 0.5)),
        height: bh,
      };
      out[idx] = { ...bed, height: bed.height - bh };
      return bath;
    }

    // Force carve even on small rooms (min leftover ~5.5)
    if (bed.width >= 9) {
      const bw = 3.5;
      const bath: ScaledRoom = {
        id: bathId,
        label: bathLabel,
        x: bed.x + bed.width - bw,
        y: bed.y,
        width: bw,
        height: Math.min(bed.height, 6),
      };
      out[idx] = { ...bed, width: bed.width - bw };
      return bath;
    }
    if (bed.height >= 9) {
      const bh = 3.5;
      const bath: ScaledRoom = {
        id: bathId,
        label: bathLabel,
        x: bed.x,
        y: bed.y + bed.height - bh,
        width: Math.min(bed.width, 6),
        height: bh,
      };
      out[idx] = { ...bed, height: bed.height - bh };
      return bath;
    }
    return null;
  };

  // Carve from masters first, then secondaries if more attached baths needed
  const carveTargets: string[] = [
    ...masters.map((_, i) => (i === 0 ? "bedroom-master" : `bedroom-master-${i + 1}`)),
    ...secondaries.map((_, i) => `bedroom-${i + 2}`),
  ];

  const attached: ScaledRoom[] = [];
  for (let i = 0; i < needAttached && i < carveTargets.length; i++) {
    const bedId = carveTargets[i];
    const isMaster = bedId.startsWith("bedroom-master");
    const bathId =
      attached.length === 0 ? "bathroom-master" : `bathroom-master-${attached.length + 1}`;
    const bathLabel =
      attached.length === 0
        ? "Attached Bathroom"
        : `Attached Bathroom ${attached.length + 1}`;
    // Only call it "attached" style for masters; secondary still gets a private bath
    const label = isMaster || i < masterCount ? bathLabel : `Bathroom ${attached.length + 1}`;
    const bath = carveAttached(bedId, bathId, label);
    if (bath) attached.push(bath);
  }

  // If carving failed for some masters, reclaim corridor-exbath slots as attached
  if (attached.length < needAttached) {
    const reclaim = out.filter((r) => r.id.startsWith("corridor-exbath-"));
    for (const slot of reclaim) {
      if (attached.length >= needAttached) break;
      const i = attached.length;
      out = out.filter((r) => r.id !== slot.id);
      attached.push({
        ...slot,
        id: i === 0 ? "bathroom-master" : `bathroom-master-${i + 1}`,
        label: i === 0 ? "Attached Bathroom" : `Attached Bathroom ${i + 1}`,
      });
    }
  }

  // Common bathroom
  let common: ScaledRoom | null = null;
  if (needCommon) {
    // Prefer an unused exbath corridor slot
    const slotIdx = out.findIndex((r) => r.id.startsWith("corridor-exbath-"));
    if (slotIdx >= 0) {
      const slot = out[slotIdx];
      out.splice(slotIdx, 1);
      common = {
        ...slot,
        id: "bathroom-common",
        label: "Common Bathroom",
      };
    }
    if (!common) {
      const donors = [
        ...secondaries.map((_, i) => `bedroom-${i + 2}`),
        "living",
        ...out.filter((r) => r.id.startsWith("corridor")).map((r) => r.id),
      ];
      for (const id of donors) {
        const idx = out.findIndex((r) => r.id === id);
        if (idx < 0) continue;
        const donor = out[idx];
        if (donor.width >= 9 && donor.height >= 8) {
          const bw = 4;
          const bh = 5.5;
          common = {
            id: "bathroom-common",
            label: "Common Bathroom",
            x: donor.x + donor.width - bw,
            y: donor.y + donor.height - bh,
            width: bw,
            height: bh,
          };
          out[idx] = { ...donor, width: donor.width - bw };
          break;
        }
      }
    }
  }

  // Guarantee: if still short of totalBaths, convert remaining exbath corridors
  out.push(...attached);
  if (common) out.push(common);

  const isBathRoom = (id: string) =>
    id === "bathroom-master" ||
    id === "bathroom-common" ||
    /^bathroom-master-\d+$/.test(id) ||
    /^bathroom-\d+$/.test(id);

  // FORCE exact bathroom count
  let bathCount = out.filter((r) => isBathRoom(r.id)).length;

  // 1) Reclaim exbath corridors
  if (bathCount < totalBaths) {
    const slots = out.filter((r) => r.id.startsWith("corridor-exbath-"));
    for (const slot of slots) {
      if (bathCount >= totalBaths) break;
      out = out.filter((r) => r.id !== slot.id);
      bathCount++;
      const id =
        !out.some((r) => r.id === "bathroom-master")
          ? "bathroom-master"
          : needCommon && !out.some((r) => r.id === "bathroom-common")
            ? "bathroom-common"
            : `bathroom-master-${bathCount}`;
      const label =
        id === "bathroom-common"
          ? "Common Bathroom"
          : `Attached Bathroom${bathCount > 1 ? " " + bathCount : ""}`;
      out.push({ ...slot, id, label });
    }
  }

  // 2) Carve from largest rooms until totalBaths
  bathCount = out.filter((r) => isBathRoom(r.id)).length;
  let guard = 0;
  while (bathCount < totalBaths && guard < 12) {
    guard++;
    // Prefer larger rooms; deprioritize NE corner (cx high, cy low in N↑ layout)
    const donors = [...out]
      .filter(
        (r) =>
          !isBathRoom(r.id) &&
          !r.id.startsWith("corridor-exbath") &&
          r.width >= 9 &&
          r.height >= 7
      )
      .sort((a, b) => {
        const score = (r: typeof a) => {
          const area = r.width * r.height;
          // penalize NE-ish rooms so baths are not carved there
          const cx = r.x + r.width / 2;
          const cy = r.y + r.height / 2;
          const nePenalty = (cx > 20 && cy < 12) ? 500 : 0;
          return area - nePenalty;
        };
        return score(b) - score(a);
      });
    if (!donors.length) break;
    // Prefer non-NE donors when available
    const nonNE = donors.filter((r) => {
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      return !(cx > 20 && cy < 14);
    });
    const donor = (nonNE[0] || donors[0]);
    const di = out.findIndex((r) => r.id === donor.id);
    if (di < 0) break;
    const bw = 4;
    const bh = Math.min(5.5, donor.height);
    bathCount++;
    const id =
      !out.some((r) => r.id === "bathroom-master")
        ? "bathroom-master"
        : needCommon && !out.some((r) => r.id === "bathroom-common")
          ? "bathroom-common"
          : `bathroom-master-${bathCount}`;
    const label =
      id === "bathroom-common"
        ? "Common Bathroom"
        : `Attached Bathroom${bathCount > 1 ? " " + bathCount : ""}`;
    out.push({
      id,
      label,
      x: donor.x + donor.width - bw,
      y: donor.y,
      width: bw,
      height: bh,
    });
    out[di] = { ...donor, width: donor.width - bw };
  }

  // Nudge any bathroom that landed in the NE corner slightly south/west (Vastu)
  {
    const maxX = Math.max(...out.map((r) => r.x + r.width), 1);
    const maxY = Math.max(...out.map((r) => r.y + r.height), 1);
    for (const r of out) {
      if (!r.id.startsWith("bathroom")) continue;
      const cx = (r.x + r.width / 2) / maxX;
      const cy = (r.y + r.height / 2) / maxY;
      if (cx > 0.66 && cy < 0.33) {
        // shift down into preferred S/W strip if space allows
        const shift = Math.min(r.height * 0.4, maxY * 0.2);
        r.y = Math.min(r.y + shift, maxY - r.height);
      }
    }
  }

  resolveBathOverlaps(out);
  return out;
}

/** Shrink bathrooms that intersect other rooms so generation never throws on overlap. */
function resolveBathOverlaps(rooms: ScaledRoom[]) {
  const isBath = (id: string) =>
    id === "bathroom-master" ||
    id === "bathroom-common" ||
    /^bathroom-\d+$/.test(id) ||
    /^bathroom-master-\d+$/.test(id);

  for (let pass = 0; pass < 8; pass++) {
    let fixed = false;
    for (let i = 0; i < rooms.length; i++) {
      if (!isBath(rooms[i].id)) continue;
      for (let j = 0; j < rooms.length; j++) {
        if (i === j) continue;
        const a = rooms[i];
        const b = rooms[j];
        if (!overlaps(a, b, 0.02)) continue;
        const ox =
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const oy =
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        if (ox <= 0 || oy <= 0) continue;
        fixed = true;
        // Shrink/move the bathroom along the smaller axis
        if (ox <= oy) {
          if (a.x + a.width / 2 >= b.x + b.width / 2) {
            a.x += ox;
            a.width = Math.max(3.5, a.width - ox);
          } else {
            a.width = Math.max(3.5, a.width - ox);
          }
        } else {
          if (a.y + a.height / 2 >= b.y + b.height / 2) {
            a.y += oy;
            a.height = Math.max(4.5, a.height - oy);
          } else {
            a.height = Math.max(4.5, a.height - oy);
          }
        }
      }
    }
    if (!fixed) break;
  }
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  eps = 0.05
): boolean {
  return (
    a.x < b.x + b.width - eps &&
    a.x + a.width > b.x + eps &&
    a.y < b.y + b.height - eps &&
    a.y + a.height > b.y + eps
  );
}

/**
 * PDF-aligned optional rooms (V6 templates are essential-only).
 * Carve from large donors after bathroom policy:
 *  - Separate pooja 4×5 (NE) when wantPooja && (bhk≥3 or area≥1350)
 *  - Utility 6×8 adjoining kitchen (SE) when area≥1600
 *  - Store 6×8 (South) when area≥2000
 *  - Servant 8×10 + 4×6 toilet (NW, rear) when area≥3200 or wantServant
 *
 * Coord system: x West→East, y North→South (y=0 is north edge of build-up).
 */
type Corner = "NE" | "NW" | "SE" | "SW";

function carveCorner(
  rooms: ScaledRoom[],
  donorIdx: number,
  id: string,
  label: string,
  tw: number,
  th: number,
  corner: Corner,
  minRemainW: number,
  minRemainH: number
): ScaledRoom | null {
  const donor = rooms[donorIdx];
  if (!donor) return null;
  if (donor.width < tw + minRemainW && donor.height < th + minRemainH) return null;

  // Prefer strip carve that leaves a usable residual rectangle
  const tryStrip = (): ScaledRoom | null => {
    // Horizontal strip (shrink height)
    if (donor.height >= th + minRemainH && donor.width >= tw) {
      let x = donor.x;
      if (corner === "NE" || corner === "SE") x = donor.x + donor.width - tw;
      const y =
        corner === "NE" || corner === "NW"
          ? donor.y
          : donor.y + donor.height - th;
      // If full-width strip is safer when donor is only slightly wider than tw
      const useFullW = donor.width < tw + minRemainW;
      const room: ScaledRoom = {
        id,
        label,
        x: useFullW ? donor.x : x,
        y,
        width: useFullW ? donor.width : tw,
        height: th,
      };
      if (corner === "NE" || corner === "NW") {
        rooms[donorIdx] = {
          ...donor,
          y: donor.y + th,
          height: donor.height - th,
        };
      } else {
        rooms[donorIdx] = { ...donor, height: donor.height - th };
      }
      return room;
    }
    // Vertical strip (shrink width)
    if (donor.width >= tw + minRemainW && donor.height >= th) {
      let y = donor.y;
      if (corner === "SE" || corner === "SW") y = donor.y + donor.height - th;
      const x =
        corner === "NE" || corner === "SE"
          ? donor.x + donor.width - tw
          : donor.x;
      const useFullH = donor.height < th + minRemainH;
      const room: ScaledRoom = {
        id,
        label,
        x,
        y: useFullH ? donor.y : y,
        width: tw,
        height: useFullH ? donor.height : th,
      };
      if (corner === "NE" || corner === "SE") {
        rooms[donorIdx] = { ...donor, width: donor.width - tw };
      } else {
        rooms[donorIdx] = {
          ...donor,
          x: donor.x + tw,
          width: donor.width - tw,
        };
      }
      return room;
    }
    return null;
  };

  return tryStrip();
}

function pickDonor(
  rooms: ScaledRoom[],
  preferIds: string[],
  scoreFn: (r: ScaledRoom) => number,
  minArea: number
): number {
  const blocked = (id: string) =>
    id.startsWith("bathroom") ||
    id === "pooja" ||
    id === "utility" ||
    id === "store" ||
    id === "servant" ||
    id === "servant-toilet" ||
    id === "parking" ||
    id === "garden" ||
    id.startsWith("corridor");

  // Prefer explicit ids first
  for (const id of preferIds) {
    const idx = rooms.findIndex(
      (r) => r.id === id && r.width * r.height >= minArea && !blocked(r.id)
    );
    if (idx >= 0) return idx;
  }
  let best = -1;
  let bestScore = -Infinity;
  rooms.forEach((r, i) => {
    if (blocked(r.id) || r.width * r.height < minArea) return;
    const s = scoreFn(r);
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  });
  return best;
}

function applyOptionalRooms(
  roomsIn: ScaledRoom[],
  opts: {
    plotArea: number;
    bhk: BhkLevel;
    wantPooja: boolean;
    wantServant: boolean;
  }
): { rooms: ScaledRoom[]; notes: string[] } {
  const rooms = roomsIn.map((r) => ({ ...r }));
  const notes: string[] = [];
  const area = opts.plotArea;

  // --- Separate pooja (PDF: niche <~1100, separate room from ~1350 / 3BHK+) ---
  // Vastu: Pooja MUST be in NE / N / E as a COMPACT rectangle (never a thin strip).
  // Method: cut a vertical strip from the east side of Living, take the north
  // portion as Pooja (5×5), and turn any remaining south portion of that strip
  // into a small Store so no void is left.
  const wantSeparatePooja =
    opts.wantPooja && (opts.bhk >= 3 || area >= 1350) && !rooms.some((r) => r.id === "pooja");
  if (wantSeparatePooja) {
    const livingIdx = rooms.findIndex((r) => r.id === "living");
    const diningIdx = rooms.findIndex((r) => r.id === "dining");
    const donorIdx = livingIdx >= 0 ? livingIdx : diningIdx;

    if (donorIdx >= 0) {
      const donor = rooms[donorIdx];
      const pw = 5; // pooja width
      const ph = 5; // pooja height
      const minRemainW = 12;

      if (donor.width >= pw + minRemainW && donor.height >= ph + 6) {
        // 1) Cut vertical strip from east side of donor
        const stripX = donor.x + donor.width - pw;
        rooms[donorIdx] = { ...donor, width: donor.width - pw };

        // 2) North part of strip → Pooja (compact)
        const pooja: ScaledRoom = {
          id: "pooja",
          label: "Pooja Room",
          x: stripX,
          y: donor.y,
          width: pw,
          height: ph,
        };
        rooms.push(pooja);

        // 3) Remaining south part of strip → Store (if tall enough), else leave for gap-fill
        const remainH = donor.height - ph;
        if (remainH >= 4.5) {
          const store: ScaledRoom = {
            id: rooms.some((r) => r.id === "store") ? "store-2" : "store",
            label: "Store",
            x: stripX,
            y: donor.y + ph,
            width: pw,
            height: remainH,
          };
          rooms.push(store);
          notes.push("Added separate pooja room (NE, compact 5×5) + store below");
        } else {
          notes.push("Added separate pooja room (NE, compact 5×5)");
        }
      } else {
        notes.push("Pooja skipped — Living/Dining too small to carve compact NE room");
      }
    }
  }

  // Post-check: fix any existing pooja that is a thin strip or in the wrong place
  {
    const poojaIdx = rooms.findIndex((r) => r.id === "pooja");
    if (poojaIdx >= 0) {
      const pooja = rooms[poojaIdx];
      const isThinStrip = pooja.height < 4 || pooja.width > 10;
      const allY = rooms.map((r) => r.y + r.height / 2);
      const midY = (Math.min(...allY) + Math.max(...allY)) / 2;
      const inSouth = pooja.y + pooja.height / 2 > midY;

      if (isThinStrip || inSouth) {
        rooms.splice(poojaIdx, 1);

        const livingIdx = rooms.findIndex((r) => r.id === "living");
        if (livingIdx >= 0) {
          const donor = rooms[livingIdx];
          const pw = 5;
          const ph = 5;
          if (donor.width >= pw + 12 && donor.height >= ph + 6) {
            const stripX = donor.x + donor.width - pw;
            rooms[livingIdx] = { ...donor, width: donor.width - pw };

            rooms.push({
              id: "pooja",
              label: "Pooja Room",
              x: stripX,
              y: donor.y,
              width: pw,
              height: ph,
            });

            const remainH = donor.height - ph;
            if (remainH >= 4.5 && !rooms.some((r) => r.id === "store")) {
              rooms.push({
                id: "store",
                label: "Store",
                x: stripX,
                y: donor.y + ph,
                width: pw,
                height: remainH,
              });
            }
            notes.push("Fixed pooja → compact 5×5 at NE of Living");
          } else {
            notes.push("Removed thin/south pooja — could not re-place compact NE room");
          }
        }
      }
    }
  }

  // --- Utility adjoining kitchen (PDF from ~1600 / medium-large) ---
  if (area >= 1600 && !rooms.some((r) => r.id === "utility")) {
    const idx = pickDonor(
      rooms,
      ["kitchen", "dining", "living"],
      (r) => {
        // Prefer SE: high x, high y
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        const isKit = r.id === "kitchen" ? 80 : 0;
        return isKit + cx + cy + r.width * r.height * 0.01;
      },
      6 * 8 + 7 * 8
    );
    if (idx >= 0) {
      const carved = carveCorner(
        rooms,
        idx,
        "utility",
        "Utility",
        6,
        8,
        "SE",
        7,
        8
      );
      if (carved) {
        rooms.push(carved);
        notes.push("Added utility (SE, adjoining kitchen zone)");
      }
    }
  }

  // --- Store on South (PDF from ~2000) ---
  if (area >= 2000 && !rooms.some((r) => r.id === "store")) {
    const idx = pickDonor(
      rooms,
      ["bedroom-3", "bedroom-4", "bedroom-2", "dining", "living"],
      (r) => {
        // Prefer South: high y; avoid kitchen / baths already filtered
        const cy = r.y + r.height / 2;
        return cy * 3 + r.width * r.height * 0.02;
      },
      6 * 8 + 9 * 9
    );
    if (idx >= 0) {
      const carved = carveCorner(
        rooms,
        idx,
        "store",
        "Store",
        6,
        8,
        "SW",
        9,
        9
      );
      if (carved) {
        rooms.push(carved);
        notes.push("Added store room (South)");
      }
    }
  }

  // --- Servant quarter + toilet (PDF from ~3250, NW rear access) ---
  const doServant =
    (opts.wantServant || area >= 3200) && !rooms.some((r) => r.id === "servant");
  if (doServant) {
    const idx = pickDonor(
      rooms,
      ["bedroom-5", "bedroom-6", "bedroom-4", "bedroom-3", "bedroom-2"],
      (r) => {
        // Prefer NW: low x, low-mid y (north-west / rear-side)
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        return -cx * 3 - cy + r.width * r.height * 0.02;
      },
      8 * 10 + 7 * 8
    );
    if (idx >= 0) {
      const carved = carveCorner(
        rooms,
        idx,
        "servant",
        "Servant Room",
        8,
        10,
        "NW",
        7,
        8
      );
      if (carved) {
        rooms.push(carved);
        // Carve 4×6 toilet from servant itself if large enough
        const sIdx = rooms.length - 1;
        const toilet = carveCorner(
          rooms,
          sIdx,
          "servant-toilet",
          "Servant Toilet",
          4,
          6,
          "SW",
          5,
          6
        );
        if (toilet) {
          rooms.push(toilet);
          notes.push("Added servant quarter + toilet (NW)");
        } else {
          notes.push("Added servant quarter (NW)");
        }
      }
    } else {
      notes.push("Servant requested but no suitable donor room — skipped");
    }
  }

  return { rooms, notes };
}

export function generateFromTemplate(input: GenerateInput) {
  const {
    lengthFt: W,
    breadthFt: H,
    roadFacing,
    bhk,
    wantPooja = bhk > 1,
    // Parking off by default — only when user explicitly enables it
    wantParking = false,
    wantGarden = false,
    wantServant,
  } = input;

  // Bathroom rules (matches the essential-rooms chart):
  //  1BHK → exactly 1 bathroom.
  //  2BHK → 1–2, 3BHK → 2–3, 4BHK → 3–4, 5BHK → 4–5, 6BHK → 5–6.
  //  Default to the lower bound of that range (1 common bath, plus one
  //  attached bath per extra bedroom beyond the first two) unless the
  //  caller explicitly requests a different count.
  const masterCount = Math.max(
    1,
    Math.min(bhk, Math.round(Number(input.masterBedrooms) || 1))
  );
  // PDF: 1BHK→1, 2BHK→2, 3BHK→2–3, etc.
  const defaultBathrooms = bhk === 1 ? 1 : bhk === 2 ? 2 : Math.max(2, bhk - 1);
  const bathroomsRequested = Math.max(
    1,
    Math.round(Number(input.bathrooms) || defaultBathrooms)
  );

  if (!Number.isFinite(W) || !Number.isFinite(H) || W < 10 || H < 10) {
    throw new Error(`Invalid plot size: ${W} x ${H} ft`);
  }

  const sb = resolveSetbacks(roadFacing, {
    front: input.setbackFront,
    back: input.setbackBack,
    left: input.setbackLeft,
    right: input.setbackRight,
  });
  let buildUp = getBuildUpArea(W, H, sb);
  const min = minBuildUp[bhk];
  if (buildUp.width < min.w || buildUp.height < min.h) {
    throw new Error(
      `${bhk}BHK needs at least about ${min.w} x ${min.h} ft of build-up. Current build-up is ${buildUp.width.toFixed(1)} x ${buildUp.height.toFixed(1)} ft. Reduce setbacks or choose a lower BHK.`
    );
  }

  // PDF: reserve parking on the road side by shrinking build-up (e.g. 9×16 north on 20×33)
  let reservedParking: ScaledRoom | null = null;
  if (wantParking) {
    const { w: pw, h: ph } = parkingSizeForArea(W * H);
    const reserved = reserveParkingStrip(W, H, roadFacing, buildUp, pw, ph, min);
    if (reserved) {
      buildUp = reserved.buildUp;
      reservedParking = reserved.parking;
    }
  }

  const template = selectTemplate({
    bhk,
    roadFacing,
    buildUpWidth: buildUp.width,
    buildUpHeight: buildUp.height,
    wantParking,
    wantPooja,
  });
  if (!template) throw new Error(`No ${bhk}BHK ${roadFacing} template found`);

  let rooms = refineLayout(
    scaleTemplate(template, buildUp.x, buildUp.y, buildUp.width, buildUp.height)
  );

  // Validate bedroom count matches BHK
  const bedroomIds = rooms.filter(
    (r) => r.id === "bedroom-master" || /^bedroom-\d+$/.test(r.id)
  );
  if (bedroomIds.length !== bhk) {
    throw new Error(
      `Template produced ${bedroomIds.length} bedrooms but ${bhk}BHK was requested. Template: ${template.id}`
    );
  }

  // Apply bathroom policy (attached masters + common; 1BHK = single bath).
  rooms = applyBathroomPolicy(rooms, bhk, masterCount, bathroomsRequested);

  // Carving/removing baths can leave voids — re-tile the build-up.
  fillBuildUpGaps(rooms, buildUp.x, buildUp.y, buildUp.width, buildUp.height);
  resolveOverlaps(rooms);
  clampToBuildUp(rooms, buildUp.x, buildUp.y, buildUp.width, buildUp.height);
  // Second pass: absorb micro-gaps after overlap resolve
  fillBuildUpGaps(rooms, buildUp.x, buildUp.y, buildUp.width, buildUp.height);
  resolveOverlaps(rooms);
  clampToBuildUp(rooms, buildUp.x, buildUp.y, buildUp.width, buildUp.height);

  // PDF optional rooms: separate pooja, utility, store, servant (when area allows)
  const plotArea = W * H;
  const autoServant = wantServant != null ? !!wantServant : plotArea >= 3200;
  const optional = applyOptionalRooms(rooms, {
    plotArea,
    bhk,
    wantPooja: !!wantPooja,
    wantServant: autoServant,
  });
  rooms = optional.rooms;

  // Re-tile after optional carves
  fillBuildUpGaps(rooms, buildUp.x, buildUp.y, buildUp.width, buildUp.height);
  resolveOverlaps(rooms);
  clampToBuildUp(rooms, buildUp.x, buildUp.y, buildUp.width, buildUp.height);

  const overlaps = findOverlaps(rooms);
  if (overlaps.length) {
    // Soft resolve once more on baths only, then ignore residual SNAP-level noise
    resolveOverlaps(rooms);
    const still = findOverlaps(rooms);
    if (still.length) {
      throw new Error(
        `Template geometry overlap: ${still.map(([a, b]) => `${a} / ${b}`).join(", ")}`
      );
    }
  }

  // Clamp any room that drifted outside the build-up (can happen when many
  // attached baths are carved on high BHK). Prefer recovery over a hard crash.
  const outsideWarnings: string[] = [];
  {
    const bx = buildUp.x;
    const by = buildUp.y;
    const br = buildUp.x + buildUp.width;
    const bb = buildUp.y + buildUp.height;
    const dropIds: string[] = [];

    for (const r of rooms) {
      if (r.x < bx) {
        r.width -= bx - r.x;
        r.x = bx;
      }
      if (r.y < by) {
        r.height -= by - r.y;
        r.y = by;
      }
      if (r.x + r.width > br) r.width = br - r.x;
      if (r.y + r.height > bb) r.height = bb - r.y;

      // Drop unusable fragments (too small after clamp)
      if (r.width < 3 || r.height < 3) {
        dropIds.push(r.id);
      }
    }

    if (dropIds.length) {
      rooms = rooms.filter((r) => !dropIds.includes(r.id));
      outsideWarnings.push(
        `Could not fit: ${dropIds.join(", ")} — removed. Try a larger plot or fewer bathrooms.`
      );
    }

    clampToBuildUp(rooms, buildUp.x, buildUp.y, buildUp.width, buildUp.height);
  }

  const warnings: string[] = [...optional.notes, ...outsideWarnings];
  {
    const bathN = rooms.filter(
      (r) =>
        r.id.startsWith("bathroom") ||
        r.id === "bathroom-master" ||
        r.id === "bathroom-common"
    ).length;
    if (bathN !== bathroomsRequested) {
      warnings.push(
        `Requested ${bathroomsRequested} bathrooms, plan has ${bathN}. Increase plot size for more attached baths.`
      );
    }
  }

  if (wantParking) {
    if (reservedParking) {
      rooms = [...rooms, reservedParking];
    } else {
      const parking = placeParking(rooms, W, H, buildUp, roadFacing);
      if (parking) {
        rooms = [...rooms, parking];
      } else {
        warnings.push(
          "Parking requested but no suitable outdoor space found without overlapping the building. Consider larger plot or smaller setbacks."
        );
      }
    }
  }

  if (wantGarden) {
    const garden = placeGarden(rooms, W, H, buildUp);
    if (garden) {
      rooms = [...rooms, garden];
    } else {
      warnings.push("Garden requested but insufficient outdoor strip remaining after setbacks and parking.");
    }
  }

  const { doors, windows } = generateOpenings(
    rooms.filter((r) => r.id !== "parking" && r.id !== "garden"),
    roadFacing,
    buildUp.x,
    buildUp.y,
    buildUp.width,
    buildUp.height
  );
  const vastuIssues = validateVastu(
    rooms.filter((r) => r.id !== "parking" && r.id !== "garden"),
    buildUp.x,
    buildUp.y,
    buildUp.width,
    buildUp.height
  );

  return {
    templateId: template.id,
    templateName: template.name,
    plotLength: W,
    plotBreadth: H,
    roadFacing,
    buildUp,
    rooms,
    doors,
    windows,
    vastuIssues,
    isVastuCompliant: vastuIssues.every((issue) => issue.severity !== "error"),
    warnings,
    bhk,
  };
}