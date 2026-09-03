"use client";

import React, { useState, useRef, useEffect } from "react";
import { FloorPlan, Room, Door, Window } from "@/lib/types";
import {
  Compass,
  Download,
  FileJson,
  Check,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
} from "lucide-react";

interface FloorPlanCanvasProps {
  layout: FloorPlan;
  orientation?: string;
  roadFacing?: string;
  activeFloor?: number;
}

// ── Classic architectural plan style (black line on white paper) ────────
const ROOM_STYLES: Record<
  string,
  { bg: string; border: string; labelColor: string; label: string }
> = {
  living:           { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Living Room" },
  kitchen:          { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Kitchen" },
  "bedroom-master": { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Master Bedroom" },
  "bedroom-2":      { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Bedroom" },
  "bedroom-3":      { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Bedroom" },
  "bathroom-1":     { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Bathroom" },
  "bathroom-2":     { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Bathroom" },
  "bathroom-master":{ bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Master Bath" },
  bathroom:         { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Bathroom" },
  parking:          { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Parking" },
  garden:           { bg: "#F8FAFC", border: "#111111", labelColor: "#111111", label: "Garden" },
  staircase:        { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Staircase" },
  pooja:            { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Pooja Room" },
  dining:           { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Dining" },
  balcony:          { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Balcony" },
  family:           { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Family Lounge" },
  "bedroom-guest":  { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Guest Bedroom" },
  terrace:          { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Terrace" },
  study:            { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Study / Office" },
  store:            { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Store" },
  utility:          { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Utility" },
  servant:          { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Servant Room" },
  "servant-toilet": { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Servant Toilet" },
  corridor:         { bg: "#FAFAFA", border: "#333333", labelColor: "#333333", label: "Corridor" },
  passage:          { bg: "#FAFAFA", border: "#333333", labelColor: "#333333", label: "Passage" },
};

function getStyle(id: string) {
  for (const key of Object.keys(ROOM_STYLES)) {
    if (id === key || id.startsWith(key)) return ROOM_STYLES[key];
  }
  return { bg: "#FFFFFF", border: "#111111", labelColor: "#111111", label: "Room" };
}

// Clean number formatting
function fmt(n: number): string {
  const r = Math.round(n * 2) / 2;
  return r % 1 === 0 ? String(r) : r.toFixed(1);
}

export default function FloorPlanCanvas({
  layout,
  orientation = "North",
  roadFacing = "North",
  activeFloor = 0,
}: FloorPlanCanvasProps) {
  const [showVastu, setShowVastu] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  // const [labelOffsetX, setLabelOffsetX] = useState(0); // 👈 Add this
  // const [labelOffsetY, setLabelOffsetY] = useState(0); // 👈 Add this
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1.0);

  const svgRef = useRef<SVGSVGElement>(null);
  const svgFullscreenRef = useRef<SVGSVGElement>(null);

  const { plotLength: W, plotBreadth: H, rooms = [], doors = [], windows = [], buildUp, heightFt } = layout;
  console.log(
  "FLOORPLAN ROOMS:",
  rooms.map((r) => ({
    id: r.id,
    label: r.label,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
  }))
);

  const DOOR_SCALE_FACTOR = 0.4;

  // ── Rotate whole plan so road edge is always at the bottom ─────────────
  // Always key off roadFacing (not the living door wall). When master count
  // rises, living often leaves the road edge; door-based rotation then flips
  // axes incorrectly for East/West (and can look "previous" for all sides).
  // South = 0°, North = 180°, East = 90°, West = -90°. Labels counter-rotate.
  const roadRot =
    roadFacing === "North" ? 180 :
    roadFacing === "East" ? 90 :
    roadFacing === "West" ? -90 : 0; // South
  const doorWall: "top" | "bottom" | "left" | "right" =
    roadFacing === "South" ? "bottom" :
    roadFacing === "East" ? "right" :
    roadFacing === "West" ? "left" : "top";
  const axesSwapped = roadRot === 90 || roadRot === -90;
  const labelCounterRot = -roadRot;
  // ── Scale and Padding ───────────────────────────────────────────────────
  const SC = 20; // 1 ft = 20 SVG units
  const PAD = 48;
  const plotSvgW = W * SC;
  const plotSvgH = H * SC;
  const svgW = axesSwapped ? plotSvgH : plotSvgW;
  const svgH = axesSwapped ? plotSvgW : plotSvgH;
  const viewW = svgW + PAD * 2;
  const viewH = svgH + PAD * 2;

  // ── Wall Thickness Constants ───────────────────────────────────────────
  const T_ext = 0.75; // External walls 9 inches (Indian residential)
  const T_int = 0.5; // Internal walls 6 inches (Indian residential)

  // Find boundaries of the house structure dynamically
  const houseLeft = rooms.length > 0 ? Math.min(...rooms.map((r) => r.x)) : 1.5;
  const houseRight = rooms.length > 0 ? Math.max(...rooms.map((r) => r.x + r.width)) : W - 1.5;
  const houseTop = rooms.length > 0 ? Math.min(...rooms.map((r) => r.y)) : 1.5;
  const houseBottom = rooms.length > 0 ? Math.max(...rooms.map((r) => r.y + r.height)) : H - 1.5;

  // Calculates room drawing bounds shifted inward by wall thicknesses
  function getRoomOffsets(room: Room) {
    // Tolerance 0.6 ft so rooms slightly off the envelope still get exterior thickness
    const near = (a: number, b: number) => Math.abs(a - b) < 0.6;
    const leftOffset = near(room.x, houseLeft) ? T_ext : T_int / 2;
    const rightOffset = near(room.x + room.width, houseRight) ? T_ext : T_int / 2;
    const topOffset = near(room.y, houseTop) ? T_ext : T_int / 2;
    const bottomOffset = near(room.y + room.height, houseBottom) ? T_ext : T_int / 2;
    return { leftOffset, rightOffset, topOffset, bottomOffset };
  }

  /** Full wall thickness (ft) for a room edge — exterior 9″ or interior 6″ */
  function wallThicknessFt(room: Room, wall: "top" | "bottom" | "left" | "right"): number {
    const near = (a: number, b: number) => Math.abs(a - b) < 0.6;
    if (wall === "top") return near(room.y, houseTop) ? T_ext : T_int;
    if (wall === "bottom") return near(room.y + room.height, houseBottom) ? T_ext : T_int;
    if (wall === "left") return near(room.x, houseLeft) ? T_ext : T_int;
    return near(room.x + room.width, houseRight) ? T_ext : T_int;
  }

  // ── Keyboard Shortcuts for Fullscreen Modal ──────────────────────────────
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      } else if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(3.0, z + 0.25));
      } else if (e.key === "-") {
        setZoom((z) => Math.max(0.75, z - 0.25));
      } else if (e.key === "0") {
        setZoom(1.0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // ── Locate Entry Points ─────────────────────────────────────────────────
  const parkingRoom = rooms.find((r) => r.id === "parking");
  const livingRoom = rooms.find((r) => r.id === "living");

  function gateCenter(): { x: number; y: number } {
    const align = md ?? { x: W / 2, y: H / 2 };
    switch (doorWall) {
      case "top": return { x: align.x, y: 0 };
      case "bottom": return { x: align.x, y: H };
      case "left": return { x: 0, y: align.y };
      case "right": return { x: W, y: align.y };
      default: return { x: W / 2, y: 0 };
    }
  }

  function mainDoorPoint(): { x: number; y: number } | null {
    const door = doors.find((d) => d.room === "living");
    if (!door || !livingRoom) return null;
    const pos = door.position + door.width / 2;
    switch (door.wall) {
      case "top":
        return { x: livingRoom.x + pos, y: livingRoom.y };
      case "bottom":
        return { x: livingRoom.x + pos, y: livingRoom.y + livingRoom.height };
      case "left":
        return { x: livingRoom.x, y: livingRoom.y + pos };
      case "right":
        return { x: livingRoom.x + livingRoom.width, y: livingRoom.y + pos };
    }
  }

  const md = mainDoorPoint();
const gc = gateCenter();

  function buildEntryPath(): string {
    if (!md) return "";
    const gx = gc.x * SC, gy = gc.y * SC;
    const dx = md.x * SC, dy = md.y * SC;
    if (roadFacing === "North" || roadFacing === "South") {
      return `${gx},${gy} ${gx},${dy} ${dx},${dy}`;
    }
    return `${gx},${gy} ${dx},${gy} ${dx},${dy}`;
  }

  // ── Helper: Scaling & Clamping ──────────────────────────────────────────
  const furnitureScale = (roomW: number, roomH: number) => {
    const area = roomW * roomH;
    if (area < 80) return 0.65;
    if (area < 120) return 0.80;
    if (area < 180) return 0.90;
    return 1.0;
  };

  const clampedRect = (
    roomX: number,
    roomY: number,
    roomW: number,
    roomH: number,
    offsetX: number,
    offsetY: number,
    itemW: number,
    itemH: number,
    padding = 4
  ) => {
    const innerW = roomW - padding * 2;
    const innerH = roomH - padding * 2;
    if (itemW > innerW || itemH > innerH) {
      return null;
    }
    const targetX = roomX + offsetX;
    const targetY = roomY + offsetY;
    const minX = roomX + padding;
    const maxX = roomX + roomW - padding - itemW;
    const minY = roomY + padding;
    const maxY = roomY + roomH - padding - itemH;
    const x = Math.max(minX, Math.min(targetX, maxX));
    const y = Math.max(minY, Math.min(targetY, maxY));
    return { x, y, w: itemW, h: itemH };
  };

  const getRoomAbbreviation = (id: string): string => {
    if (id === "bedroom-master" || id.startsWith("bedroom-master")) return "MB";
    if (id === "bedroom-2") return "B2";
    if (id === "bedroom-3") return "B3";
    if (id === "bedroom-4") return "B4";
    if (id === "bedroom-5") return "B5";
    if (id === "bedroom-guest") return "GB";
    if (id === "living") return "L";
    if (id === "kitchen") return "K";
    if (id.startsWith("bathroom")) return "WC";
    if (id === "staircase") return "S";
    if (id === "parking") return "P";
    if (id === "pooja") return "PJ";
    if (id === "dining") return "D";
    if (id === "garden") return "G";
    if (id === "balcony") return "B";
    if (id === "family") return "FL";
    if (id === "terrace") return "T";
    if (id === "study") return "ST";
    return "R";
  };

  // ── Render Furniture Vectors ────────────────────────────────────────────
  const renderFurniture = (room: Room) => {
    const { leftOffset, rightOffset, topOffset, bottomOffset } = getRoomOffsets(room);
    const rx = (room.x + leftOffset) * SC;
    const ry = (room.y + topOffset) * SC;
    const rw = (room.width - leftOffset - rightOffset) * SC;
    const rh = (room.height - topOffset - bottomOffset) * SC;

    const color = "rgba(17, 17, 17, 0.45)"; // classic plan furniture outlines
    const stroke = 1.0;

    // Small utility rooms shouldn't contain large furniture clutter
    const isSmall = room.width < 5.5 || room.height < 5.5;
    if (isSmall && !room.id.startsWith("bathroom") && room.id !== "pooja" && room.id !== "utility") {
      return null;
    }

    const scale = furnitureScale(room.width, room.height);

    // ── Reusable decorative icon helpers (kept local to this fn) ──────────
    // Stylized corner plant: pot + three triangular leaf blades
    const plantIcon = (cx: number, cy: number, s: number, suffix: string) => (
      <g key={`plant-${room.id}-${suffix}`} opacity={0.6}>
        <path
          d={`M ${cx - 5 * s} ${cy + 4 * s} L ${cx - 4 * s} ${cy + 11 * s} L ${cx + 4 * s} ${cy + 11 * s} L ${cx + 5 * s} ${cy + 4 * s} Z`}
          fill="none"
          stroke={color}
          strokeWidth={stroke * 0.85}
        />
        <line x1={cx} y1={cy + 4 * s} x2={cx} y2={cy - 11 * s} stroke={color} strokeWidth={stroke * 0.8} />
        <path d={`M ${cx} ${cy - 2 * s} Q ${cx - 9 * s} ${cy - 6 * s} ${cx - 2 * s} ${cy - 13 * s} Q ${cx - 6 * s} ${cy - 5 * s} ${cx} ${cy - 2 * s} Z`} fill="none" stroke={color} strokeWidth={stroke * 0.7} />
        <path d={`M ${cx} ${cy - 4 * s} Q ${cx + 9 * s} ${cy - 8 * s} ${cx + 2 * s} ${cy - 15 * s} Q ${cx + 6 * s} ${cy - 7 * s} ${cx} ${cy - 4 * s} Z`} fill="none" stroke={color} strokeWidth={stroke * 0.7} />
        <path d={`M ${cx} ${cy - 6 * s} Q ${cx - 2 * s} ${cy - 14 * s} ${cx} ${cy - 20 * s} Q ${cx + 2 * s} ${cy - 14 * s} ${cx} ${cy - 6 * s} Z`} fill="none" stroke={color} strokeWidth={stroke * 0.7} />
      </g>
    );

    // Wall speaker: circle with small dots inside, meant to sit near a ceiling corner
    const speakerIcon = (cx: number, cy: number, r: number, suffix: string) => (
      <g key={`speaker-${room.id}-${suffix}`} opacity={0.55}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke * 0.75} />
        <circle cx={cx} cy={cy} r={r * 0.5} fill="none" stroke={color} strokeWidth={stroke * 0.6} />
        <circle cx={cx} cy={cy} r={r * 0.14} fill={color} />
      </g>
    );

    // Small "X" texture mark used on upholstered cushions
    const cushionMark = (cx: number, cy: number, s: number, suffix: string) => (
      <g key={`x-${room.id}-${suffix}`} opacity={0.6}>
        <line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} stroke={color} strokeWidth={stroke * 0.7} />
        <line x1={cx - s} y1={cy + s} x2={cx + s} y2={cy - s} stroke={color} strokeWidth={stroke * 0.7} />
      </g>
    );

    if (
      room.id === "bedroom-master" ||
      room.id.startsWith("bedroom-master") ||
      room.id === "bedroom-guest" ||
      room.id.startsWith("bedroom-2") ||
      room.id.startsWith("bedroom-3") ||
      room.id.startsWith("bedroom-4") ||
      room.id.startsWith("bedroom-5")
    ) {
      // ── Centered Bed Dimensions ──
      const bW = Math.min(rw * 0.65, 80) * scale;
      const bH = Math.min(rh * 0.70, 90) * scale;
      const bed = clampedRect(rx, ry, rw, rh, (rw - bW) / 2, (rh - bH) / 2, bW, bH, 4);
      if (!bed) return null;

      // ── Rug ──
      const rugW = Math.min(rw * 0.92, bed.w + 32 * scale);
      const rugH = Math.min(rh * 0.85, bed.h + 38 * scale);
      const rug = clampedRect(rx, ry, rw, rh, (rw - rugW) / 2, (rh - rugH) / 2, rugW, rugH, 2);

      // ── Top Artwork / Canopy (Flush with Headboard) ──
      const artW = Math.min(bed.w * 0.90, 80 * scale);
      const artH = 18 * scale;
      const artY = bed.y - 14 * scale;
      const art = clampedRect(rx, ry, rw, rh, (rw - artW) / 2, artY - ry, artW, artH, 4);

      // ── Footboard Panel ──
      const fbH = 16 * scale;
      const fbY = bed.y + bed.h - fbH;
      const fb = { x: bed.x, y: fbY, w: bed.w, h: fbH };

      // ── Pillows (Wider and Flatter) ──
      const pW = (bed.w - 10 * scale) / 2;
      const pH = 16 * scale;
      const pY = bed.y + 14 * scale;

      // ── Nightstand constants ──
      const nsW = 14 * scale;
      const nsH = nsW;
      const nsGap = 4 * scale;
      const nsY = bed.y + 4 * scale;
      const leftNsX = bed.x - nsGap - nsW;
      const rightNsX = bed.x + bed.w + nsGap;
      const showLeft = leftNsX >= rx + 3;
      const showRight = rightNsX + nsW <= rx + rw - 3;

      // ── Nightstand Renderer ──
      const renderNs = (nsX: number, nsY: number) => (
        <g>
          <rect x={nsX} y={nsY} width={nsW} height={nsH} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.2} />
          <rect x={nsX + 2*scale} y={nsY + 2*scale} width={nsW - 4*scale} height={nsH - 4*scale} fill="none" stroke={color} strokeWidth={stroke * 0.6} />
          <path d={`M ${nsX + 2*scale} ${nsY + nsH} L ${nsX + nsW/2} ${nsY + nsH + 8*scale} L ${nsX + nsW - 2*scale} ${nsY + nsH} Z`} fill="none" stroke={color} strokeWidth={stroke * 0.9} />
          <path d={`M ${nsX + 4*scale} ${nsY + nsH + 8*scale} L ${nsX + nsW/2} ${nsY + nsH + 8*scale + 10*scale} L ${nsX + nsW - 4*scale} ${nsY + nsH + 8*scale} Z`} fill="none" stroke={color} strokeWidth={stroke * 0.9} />
        </g>
      );


      return (
        <g key={`furn-${room.id}`} className="pointer-events-none select-none" transform={`rotate(${labelCounterRot}, ${rx + rw/2}, ${ry + rh/2})`}>
          {/* ─── RUG ─── */}
          {rug && (
            <g>
              <rect x={rug.x} y={rug.y} width={rug.w} height={rug.h} rx={2 * scale} fill="url(#rug-dots)" stroke={color} strokeWidth={stroke * 0.8} />
              <rect x={rug.x + 4 * scale} y={rug.y + 4 * scale} width={rug.w - 8 * scale} height={rug.h - 8 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.8} strokeDasharray={`${2*scale}, ${2*scale}`} />
            </g>
          )}

          {/* ─── TOP ARTWORK / CANOPY ─── */}
          {art && (
            <g>
              <rect x={art.x} y={art.y} width={art.w} height={art.h} rx={2 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.2} />
              <rect x={art.x + 3 * scale} y={art.y + 3 * scale} width={art.w - 6 * scale} height={art.h - 6 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
              <path d={`M ${art.x + 5 * scale} ${art.y + art.h * 0.55} Q ${art.x + art.w * 0.3} ${art.y + art.h * 0.35} ${art.x + art.w * 0.5} ${art.y + art.h * 0.55} Q ${art.x + art.w * 0.7} ${art.y + art.h * 0.35} ${art.x + art.w - 5 * scale} ${art.y + art.h * 0.55}`} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
              <path d={`M ${art.x + 5 * scale} ${art.y + art.h * 0.75} Q ${art.x + art.w * 0.3} ${art.y + art.h * 0.55} ${art.x + art.w * 0.5} ${art.y + art.h * 0.75} Q ${art.x + art.w * 0.7} ${art.y + art.h * 0.55} ${art.x + art.w - 5 * scale} ${art.y + art.h * 0.75}`} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
            </g>
          )}

          {/* ─── CURVED HEADBOARD ─── */}
          <path d={`M ${bed.x} ${bed.y + bed.h} L ${bed.x} ${bed.y} Q ${bed.x + bed.w/4} ${bed.y - 6*scale} ${bed.x + bed.w/2} ${bed.y} Q ${bed.x + 3*bed.w/4} ${bed.y - 6*scale} ${bed.x + bed.w} ${bed.y} L ${bed.x + bed.w} ${bed.y + bed.h} Z`} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.2} />
          <path d={`M ${bed.x + 4*scale} ${bed.y} L ${bed.x + 4*scale} ${bed.y + bed.h}`} fill="none" stroke={color} strokeWidth={stroke * 0.5} strokeDasharray={`1,1`} />
          <path d={`M ${bed.x + bed.w - 4*scale} ${bed.y} L ${bed.x + bed.w - 4*scale} ${bed.y + bed.h}`} fill="none" stroke={color} strokeWidth={stroke * 0.5} strokeDasharray={`1,1`} />

          {/* ─── BED BASE ─── */}
          <rect x={bed.x} y={bed.y} width={bed.w} height={bed.h} rx={2 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.2} />

          {/* ─── FOOTBOARD PANEL ─── */}
          <rect x={fb.x} y={fb.y} width={fb.w} height={fb.h} rx={2 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.2} />
          <rect x={fb.x + 3 * scale} y={fb.y + 3 * scale} width={fb.w - 6 * scale} height={fb.h - 6 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
          <path d={`M ${fb.x + 5 * scale} ${fb.y + fb.h * 0.55} Q ${fb.x + fb.w * 0.3} ${fb.y + fb.h * 0.35} ${fb.x + fb.w * 0.5} ${fb.y + fb.h * 0.55} Q ${fb.x + fb.w * 0.7} ${fb.y + fb.h * 0.35} ${fb.x + fb.w - 5 * scale} ${fb.y + fb.h * 0.55}`} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
          <path d={`M ${fb.x + 5 * scale} ${fb.y + fb.h * 0.75} Q ${fb.x + fb.w * 0.3} ${fb.y + fb.h * 0.55} ${fb.x + fb.w * 0.5} ${fb.y + fb.h * 0.75} Q ${fb.x + fb.w * 0.7} ${fb.y + fb.h * 0.55} ${fb.x + fb.w - 5 * scale} ${fb.y + fb.h * 0.75}`} fill="none" stroke={color} strokeWidth={stroke * 0.8} />

          {/* ─── PILLOWS ─── */}
          <g>
            <rect x={bed.x + 6 * scale} y={pY} width={pW} height={pH} rx={2 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.2} />
            <line x1={bed.x + 6 * scale} y1={pY + 3 * scale} x2={bed.x + 6 * scale + pW} y2={pY + 3 * scale} stroke={color} strokeWidth={stroke * 0.7} />
            <rect x={bed.x + bed.w - 6 * scale - pW} y={pY} width={pW} height={pH} rx={2 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.2} />
            <line x1={bed.x + bed.w - 6 * scale - pW} y1={pY + 3 * scale} x2={bed.x + bed.w - 6 * scale} y2={pY + 3 * scale} stroke={color} strokeWidth={stroke * 0.7} />
          </g>

          {/* ─── NIGHTSTANDS ─── */}
          {showLeft && renderNs(leftNsX, nsY)}
          {showRight && renderNs(rightNsX, nsY)}


        </g>
      );
    }

    if (room.id === "living") {
      // ── Centered Maket n-Shape (Pulled away from top-right door arc) ──
      const color = "rgba(17, 17, 17, 0.45)";
      const stroke = 1.0;

      // DYNAMIC PADDING: Pulls the rug deep into the center to clear doors.
      const PAD = Math.max(4, Math.min(8, Math.min(room.width, room.height) * 0.15)); 
      
      // 40% ON THE RUG / 60% OUTSIDE THE RUG
      const RUG_OVERLAP_RATIO = 0.4;
      const CORNER_GAP = 1.5; 
      // Pushes the right sofa physically left (which moves it visually right to clear the arc)
      const VISUAL_RIGHT_SHIFT = 3.5; 

      // 1. Rug perfectly centered in the room
      const rugW = Math.min(rw * 0.55, 110);
      const rugH = Math.min(rh * 0.50, 90);
      const rug = clampedRect(rx, ry, rw, rh, (rw - rugW) / 2, (rh - rugH) / 2, rugW, rugH, PAD);
      if (!rug) return null;

      // 2. Side Furniture Widths (Capped safely)
      let sofaVisRightW = Math.min(rw * 0.12, 25);
      let chairVisLeftSize = Math.min(rw * 0.12, 22);

      // 3. Top Sofa (3-Seater) - 40% inside the rug's bottom edge
      const sofaVisTopH = Math.min(rug.h * 0.25, 35);
      const usedWidthOnRug = (sofaVisRightW * RUG_OVERLAP_RATIO) + (chairVisLeftSize * RUG_OVERLAP_RATIO) + (CORNER_GAP * 2);
      const sofaVisTopW = Math.min(rug.w * 0.85, Math.max(rug.w * 0.60, rug.w - usedWidthOnRug));
      
      const sofaVisTopX = (rw - sofaVisTopW) / 2;
      const sofaVisTopY = (rug.y - ry + rug.h) - sofaVisTopH * 0.6; 
      
      const sofaVisTop = clampedRect(rx, ry, rw, rh, sofaVisTopX, sofaVisTopY, sofaVisTopW, sofaVisTopH, 0);
      if (!sofaVisTop) return null;

      // 4. Right Sofa (3-Seater) - SHIFTED PHYSICALLY LEFT to move visually RIGHT
      const sofaVisRightH = rug.h * 0.85;
      const sofaVisRightX = (rug.x - rx) - sofaVisRightW * 0.6 - VISUAL_RIGHT_SHIFT;
      const sofaVisRightY = (rug.y - ry) + (rug.h - sofaVisRightH) / 2;
      
      const sofaVisRight = clampedRect(rx, ry, rw, rh, sofaVisRightX, sofaVisRightY, sofaVisRightW, sofaVisRightH, 0);
      if (!sofaVisRight) return null;

      // 5. Left Chair (1-Seater) - 40% inside the rug's right edge
      const chairVisLeftY = (rug.y - ry) + (rug.h - chairVisLeftSize * 1.2) / 2;
      const chairVisLeftX = (rug.x + rug.w - rx) - chairVisLeftSize * 0.6;
      
      const chairVisLeft = clampedRect(rx, ry, rw, rh, chairVisLeftX, chairVisLeftY, chairVisLeftSize, chairVisLeftSize * 1.2, 0);
      if (!chairVisLeft) return null;

      // 6. Coffee Table (Perfectly centered on the Rug)
      const tableR = Math.min(rug.w, rug.h) * 0.16;
      const tcx = rug.x + rug.w / 2;
      const tcy = rug.y + rug.h / 2;

      // ── Helpers ──
      const throwPillow = (x: number, y: number, w: number, h: number, angle: number) => (
        <rect x={x} y={y} width={w} height={h} rx={1.5} fill="#FFFFFF" stroke={color} strokeWidth={stroke} transform={`rotate(${angle}, ${x + w/2}, ${y + h/2})`} />
      );
      const xMark = (cx: number, cy: number, size: number) => (
        <g opacity={0.85}>
          <line x1={cx - size} y1={cy - size} x2={cx + size} y2={cy + size} stroke={color} strokeWidth={1.5} />
          <line x1={cx - size} y1={cy + size} x2={cx + size} y2={cy - size} stroke={color} strokeWidth={1.5} />
        </g>
      );

      return (
        <g key={`furn-${room.id}`} className="pointer-events-none select-none">
          <rect x={rug.x} y={rug.y} width={rug.w} height={rug.h} rx={2 * scale} fill="url(#rug-dots)" stroke={color} strokeWidth={0.75} opacity={0.85} />

          {/* ─── Top Sofa ─── */}
          <g>
            <rect x={sofaVisTop.x} y={sofaVisTop.y} width={sofaVisTop.w} height={sofaVisTop.h} rx={5} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
            <rect x={sofaVisTop.x} y={sofaVisTop.y + sofaVisTop.h - 6} width={sofaVisTop.w} height={12} rx={2} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
            <rect x={sofaVisTop.x} y={sofaVisTop.y} width={sofaVisTop.w * 0.08} height={sofaVisTop.h} rx={3} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
            <rect x={sofaVisTop.x + sofaVisTop.w - sofaVisTop.w * 0.08} y={sofaVisTop.y} width={sofaVisTop.w * 0.08} height={sofaVisTop.h} rx={3} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
            {Array.from({ length: 3 }).map((_, i) => {
              const sx = sofaVisTop.x + sofaVisTop.w * (0.09 + i * 0.29);
              const sw = sofaVisTop.w * 0.24;
              const sy = sofaVisTop.y + sofaVisTop.h * 0.05;
              const sh = sofaVisTop.h * 0.80;
              return (
                <g key={`top-seat-${i}`}>
                  <rect x={sx} y={sy} width={sw} height={sh} rx={3} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 0.9} />
                  {xMark(sx + sw/2, sy + sh/2, sw * 0.15)}
                  {throwPillow(sx + 2, sy + sh - 4, sw * 0.45, sh * 0.35, -22)}
                  {throwPillow(sx + sw - 2 - sw * 0.45, sy + sh - 4, sw * 0.45, sh * 0.35, 22)}
                </g>
              );
            })}
          </g>

          {/* ─── Right Sofa (Faces Left) ─── */}
          <g>
            <rect x={sofaVisRight.x} y={sofaVisRight.y} width={sofaVisRight.w} height={sofaVisRight.h} rx={5} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
            <rect x={sofaVisRight.x + sofaVisRight.w - 6} y={sofaVisRight.y} width={6} height={sofaVisRight.h} rx={2} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
            <rect x={sofaVisRight.x + sofaVisRight.w * 0.15} y={sofaVisRight.y} width={sofaVisRight.w * 0.7} height={sofaVisRight.h * 0.08} rx={3} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
            <rect x={sofaVisRight.x + sofaVisRight.w * 0.15} y={sofaVisRight.y + sofaVisRight.h - sofaVisRight.h * 0.08} width={sofaVisRight.w * 0.7} height={sofaVisRight.h * 0.08} rx={3} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
            {Array.from({ length: 3 }).map((_, i) => {
              const sy = sofaVisRight.y + sofaVisRight.h * (0.10 + i * 0.29);
              const sh = sofaVisRight.h * 0.24;
              const sx = sofaVisRight.x + sofaVisRight.w * 0.15;
              const sw = sofaVisRight.w * 0.7;
              return (
                <g key={`right-seat-${i}`}>
                  <rect x={sx} y={sy} width={sw} height={sh} rx={3} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 0.9} />
                  {xMark(sx + sw/2, sy + sh/2, sh * 0.15)}
                  {throwPillow(sx + 2, sy - 3, sw * 0.45, sh * 0.35, -20)}
                  {throwPillow(sx + sw - 2 - sw * 0.45, sy + sh - 3 - sh * 0.35, sw * 0.45, sh * 0.35, 20)}
                </g>
              );
            })}
          </g>

          {/* ─── Left Chair (Faces Right) ─── */}
          <g>
            <rect x={chairVisLeft.x} y={chairVisLeft.y} width={chairVisLeft.w} height={chairVisLeft.h} rx={5} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
            <rect x={chairVisLeft.x} y={chairVisLeft.y} width={6} height={chairVisLeft.h} rx={2} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
            <rect x={chairVisLeft.x} y={chairVisLeft.y} width={chairVisLeft.w * 0.8} height={chairVisLeft.h * 0.08} rx={3} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
            <rect x={chairVisLeft.x} y={chairVisLeft.y + chairVisLeft.h - chairVisLeft.h * 0.08} width={chairVisLeft.w * 0.8} height={chairVisLeft.h * 0.08} rx={3} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
            <rect x={chairVisLeft.x + chairVisLeft.w * 0.12} y={chairVisLeft.y + chairVisLeft.h * 0.12} width={chairVisLeft.w * 0.76} height={chairVisLeft.h * 0.76} rx={3} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 0.9} />
            {xMark(chairVisLeft.x + chairVisLeft.w * 0.5, chairVisLeft.y + chairVisLeft.h * 0.5, chairVisLeft.w * 0.13)}
            {throwPillow(chairVisLeft.x + chairVisLeft.w * 0.5, chairVisLeft.y + chairVisLeft.h * 0.14, chairVisLeft.w * 0.35, chairVisLeft.h * 0.25, -30)}
            {throwPillow(chairVisLeft.x + chairVisLeft.w * 0.5, chairVisLeft.y + chairVisLeft.h * 0.6, chairVisLeft.w * 0.35, chairVisLeft.h * 0.25, 30)}
          </g>

          {/* ─── Coffee Table ─── */}
          <circle cx={tcx} cy={tcy} r={tableR} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.2} />
          <circle cx={tcx} cy={tcy} r={tableR * 0.6} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
        </g>
      );
    }

    if (room.id === "kitchen") {
      // ── Central Floating Kitchen Block ──
      // Pad ensures doors can open on ANY wall without hitting the furniture.
      const pad = 8 * scale; 
      const centerX = rx + rw / 2;
      const centerY = ry + rh / 2;

      // Main Base Counter (Marble slab)
      const bW = Math.min(rw * 0.65, 72 * scale);
      const bH = Math.min(rh * 0.60, 54 * scale);
      const bX = centerX - bW / 2;
      const bY = centerY - bH / 2;

      // Top Floating Cabinet (Exact Maket dual-hump)
      const cabW = Math.min(bW * 0.82, 58 * scale);
      const cabH = 24 * scale;
      const gap = 6 * scale;
      const cabY = bY - cabH - gap;
      const cabX = centerX - cabW / 2;
      const humpR = 10 * scale;

      // Stove Unit (Left side of the counter)
      const stoveW = bW * 0.38;
      const stoveH = bH * 0.72;
      const stoveX = bX + 6 * scale;
      const stoveY = bY + (bH - stoveH) / 2;

      // Sink Unit (Right side of the counter)
      const sinkW = bW * 0.34;
      const sinkH = bH * 0.72;
      const sinkX = bX + bW - sinkW - 6 * scale;
      const sinkY = bY + (bH - sinkH) / 2;

      // Stove Vertical Control Panel (Left side of stove)
      const panelW = 8 * scale;
      const panelH = stoveH * 0.60;
      const panelX = stoveX - panelW;
      const panelY = stoveY + (stoveH - panelH) / 2;

      return (
        <g key={`furn-${room.id}`} className="pointer-events-none select-none" transform={`rotate(${labelCounterRot}, ${rx + rw/2}, ${ry + rh/2})`}>
          
          {/* ─── 1. TOP FLOATING CABINET (DUAL SEMI-CIRCLE) ─── */}
          <g>
            {/* Outer cabinet box - thick framing */}
            <rect x={cabX} y={cabY} width={cabW} height={cabH} rx={2 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.4} />
            {/* Inner seam line - adds that premium double-stroke detail */}
            <rect x={cabX + 2 * scale} y={cabY + 2 * scale} width={cabW - 4 * scale} height={cabH - 4 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.6} />
            
            {/* Two semi-circle humps on the top */}
            <path d={`M ${cabX + 6 * scale} ${cabY} A ${humpR} ${humpR} 0 0 1 ${cabX + 6 * scale + humpR * 2} ${cabY}`} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.4} />
            <path d={`M ${cabX + 6 * scale + humpR * 2 + 4 * scale} ${cabY} A ${humpR} ${humpR} 0 0 1 ${cabX + 6 * scale + humpR * 2 + 4 * scale + humpR * 2} ${cabY}`} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.4} />

            {/* Two small handle dots at the bottom */}
            <circle cx={cabX + cabW * 0.35} cy={cabY + cabH} r={2.5 * scale} fill={color} />
            <circle cx={cabX + cabW * 0.65} cy={cabY + cabH} r={2.5 * scale} fill={color} />
          </g>

          {/* ─── 2. MAIN COUNTER SLAB ─── */}
          {/* Thick outer shell */}
          <rect x={bX} y={bY} width={bW} height={bH} rx={4 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.6} />
          {/* Inner thinner shell for depth */}
          <rect x={bX + 3 * scale} y={bY + 3 * scale} width={bW - 6 * scale} height={bH - 6 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.6} />

          {/* ─── 3. PREMIUM STOVE MODULE (with grates) ─── */}
          <g>
            {/* Stove outer outline */}
            <rect x={stoveX} y={stoveY} width={stoveW} height={stoveH} rx={3 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.4} />
            {/* Stove inner detail */}
            <rect x={stoveX + 2 * scale} y={stoveY + 2 * scale} width={stoveW - 4 * scale} height={stoveH - 4 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.5} />
            
            {/* 4 Burner Rings with Grate Crosses (2x2 grid) */}
            {[0, 1].map((row) =>
              [0, 1].map((col) => {
                const bx = stoveX + stoveW * (0.2 + col * 0.45);
                const by = stoveY + stoveH * (0.2 + row * 0.45);
                const r = stoveH * 0.12;
                return (
                  <g key={`burner-${row}-${col}`}>
                    <circle cx={bx} cy={by} r={r} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
                    <circle cx={bx} cy={by} r={r * 0.5} fill="none" stroke={color} strokeWidth={stroke * 0.4} />
                    {/* Grate Crosshairs */}
                    <line x1={bx - r * 0.8} y1={by} x2={bx + r * 0.8} y2={by} stroke={color} strokeWidth={stroke * 0.4} />
                    <line x1={bx} y1={by - r * 0.8} x2={bx} y2={by + r * 0.8} stroke={color} strokeWidth={stroke * 0.4} />
                  </g>
                );
              })
            )}
            
            {/* Vertical Side Control Panel */}
            <rect x={panelX} y={panelY} width={panelW} height={panelH} rx={2 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.2} />
            <circle cx={panelX + panelW / 2} cy={panelY + panelH * 0.25} r={2.5 * scale} fill={color} />
            <circle cx={panelX + panelW / 2} cy={panelY + panelH * 0.50} r={2.5 * scale} fill={color} />
            <circle cx={panelX + panelW / 2} cy={panelY + panelH * 0.75} r={2.5 * scale} fill={color} />
          </g>

          {/* ─── 4. PREMIUM SINK MODULE (with Faucet) ─── */}
          <g>
            {/* Sink outer shell */}
            <rect x={sinkX} y={sinkY} width={sinkW} height={sinkH} rx={3 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.4} />
            <rect x={sinkX + 2 * scale} y={sinkY + 2 * scale} width={sinkW - 4 * scale} height={sinkH - 4 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.5} />
            
            {/* Sink inner basin */}
            <rect x={sinkX + 6 * scale} y={sinkY + 6 * scale} width={sinkW - 12 * scale} height={sinkH - 12 * scale} rx={2 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
            
            {/* Drain hole */}
            <circle cx={sinkX + sinkW / 2} cy={sinkY + sinkH / 2} r={2.5 * scale} fill={color} />
            
            {/* Artistic Arched Faucet */}
            <g>
              {/* Base of faucet */}
              <circle cx={sinkX + sinkW / 2} cy={sinkY + 5 * scale} r={3 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 0.8} />
              {/* Curve / Spout */}
              <path d={`M ${sinkX + sinkW / 2} ${sinkY + 5 * scale} L ${sinkX + sinkW / 2} ${sinkY + 5 * scale + 4 * scale} Q ${sinkX + sinkW / 2} ${sinkY + 12 * scale} ${sinkX + sinkW / 2 + 8 * scale} ${sinkY + 12 * scale} L ${sinkX + sinkW / 2 + 10 * scale} ${sinkY + 12 * scale}`} fill="none" stroke={color} strokeWidth={stroke * 1.0} />
              {/* Water drop hint */}
              <circle cx={sinkX + sinkW / 2 + 10 * scale} cy={sinkY + 13 * scale} r={1.5 * scale} fill={color} />
              {/* Handle lever on the base */}
              <path d={`M ${sinkX + sinkW / 2 - 3 * scale} ${sinkY + 4 * scale} L ${sinkX + sinkW / 2 - 6 * scale} ${sinkY + 3 * scale}`} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
            </g>
          </g>

        </g>
      );
    }

    if (room.id.startsWith("bathroom")) {
      const roomArea = room.width * room.height;
      const isTinyBathroom = roomArea < 25; // If smaller than 5x5, we hide the sink

      // ── Layout allocation ────────────────────────────────────────────────
      // 1. Long, Pill-Shaped Bathtub - Centered
      // If tiny, we shrink the tub slightly to give breathing room
      const bathW = Math.min(rw * (isTinyBathroom ? 0.60 : 0.55), isTinyBathroom ? 40 : 48) * scale;
      const bathH = Math.min(rh * (isTinyBathroom ? 0.80 : 0.90), isTinyBathroom ? 60 : 72) * scale;
      const bath = clampedRect(rx, ry, rw, rh, (rw - bathW) / 2, (rh - bathH) / 2, bathW, bathH, 2);

      // 2. MASSIVE Vanity & Sink - ONLY rendered if there is enough space
      let sink: ReturnType<typeof clampedRect> | null = null;
      if (!isTinyBathroom) {
        const sinkW = Math.min(rw * 0.55, 44) * scale;
        const sinkH = Math.min(rh * 0.50, 38) * scale;
        sink = clampedRect(rx, ry, rw, rh, rw - sinkW - 2 * scale, 2 * scale, sinkW, sinkH, 2);
      }

      if (!bath) return null;

      // ── 1. Long Pill-Shaped Bathtub ──────────────────────────────────────
      const renderBathtub = () => {
        const bx = bath.x, by = bath.y, bw = bath.w, bh = bath.h;
        const r = bw / 2; // Perfect pill shape
        return (
          <g>
            <rect x={bx} y={by} width={bw} height={bh} rx={r} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.6} />
            <rect x={bx + 6 * scale} y={by + 6 * scale} width={bw - 12 * scale} height={bh - 12 * scale} rx={r - 3 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.9} />
            <path d={`M ${bx + 8 * scale} ${by + 14 * scale} Q ${bx + bw / 2} ${by + 8 * scale} ${bx + bw - 8 * scale} ${by + 14 * scale}`} fill="none" stroke={color} strokeWidth={stroke * 0.6} />
            <circle cx={bx + bw / 2} cy={by + bh / 2} r={2.5 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
            <circle cx={bx + bw / 2} cy={by + bh / 2} r={1 * scale} fill={color} />
            <g transform={`translate(${bx + bw / 2}, ${by + bh - 6 * scale})`}>
              <rect x={-5 * scale} y={-2 * scale} width={10 * scale} height={4 * scale} rx={1 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
              <path d={`M 0 2 L 0 12`} stroke={color} strokeWidth={2.5 * scale} />
              <path d={`M -2 4 L -8 2 L -8 6 Z`} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 0.8} />
              <ellipse cx={0} cy={14 * scale} rx={2 * scale} ry={1.5 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.6} />
            </g>
          </g>
        );
      };

      // ── 2. Enlarged Premium Vanity & Sink ────────────────────────────────
      const renderSink = () => {
        if (!sink) return null; // Sink is null if bathroom is too small
        const sx = sink.x, sy = sink.y, sw = sink.w, sh = sink.h;
        return (
          <g>
            <rect x={sx + 4 * scale} y={sy + sh * 0.50} width={sw - 8 * scale} height={sh * 0.48} rx={2 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.2} />
            <rect x={sx + sw / 2 - 5 * scale} y={sy + sh * 0.70} width={10 * scale} height={sh * 0.08} rx={1 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
            <rect x={sx} y={sy} width={sw} height={sh * 0.45} rx={2 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.4} />
            <rect x={sx + 3 * scale} y={sy + 4 * scale} width={sw - 6 * scale} height={sh * 0.35} fill="none" stroke={color} strokeWidth={stroke * 0.5} />
            <ellipse cx={sx + sw / 2} cy={sy + sh * 0.23} rx={sw * 0.35} ry={sh * 0.16} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.2} />
            <ellipse cx={sx + sw / 2} cy={sy + sh * 0.23} rx={sw * 0.30} ry={sh * 0.12} fill="none" stroke={color} strokeWidth={stroke * 0.6} />
            <path d={`M ${sx + sw / 2} ${sy + 2 * scale} L ${sx + sw / 2} ${sy + 8 * scale} Q ${sx + sw / 2} ${sy + 14 * scale} ${sx + sw / 2 - 4 * scale} ${sy + 14 * scale} L ${sx + sw / 2 - 6 * scale} ${sy + 14 * scale}`} fill="none" stroke={color} strokeWidth={stroke * 1.2} />
            <circle cx={sx + sw / 2} cy={sy + 4 * scale} r={1.5 * scale} fill={color} />
            <circle cx={sx + sw / 2 - 6 * scale} cy={sy + 14 * scale} r={1 * scale} fill={color} />
          </g>
        );
      };

      return (
        <g key={`furn-${room.id}`} className="pointer-events-none select-none" transform={`rotate(${labelCounterRot}, ${rx + rw/2}, ${ry + rh/2})`}>
          {renderBathtub()}
          {renderSink()}
        </g>
      );
    }

        if (room.id === "dining") {
      // ── Maket Style Dining Table with 8 Semi-Circular Chairs ──
      const color = "rgba(17, 17, 17, 0.45)";
      const stroke = 1.0;

      // 1. Square Table
      const tW = 60 * scale;
      const tH = 60 * scale;
      const table = clampedRect(rx, ry, rw, rh, (rw - tW) / 2, (rh - tH) / 2, tW, tH, 4);
      if (!table) return null;

      const cx = table.x + tW / 2;
      const cy = table.y + tH / 2;
      const gap = 2 * scale; // gap between table edge and chair
      const chairW = 14 * scale;
      const chairH = 6 * scale;
      const rad = chairW / 2;
      const offset = 18 * scale; // distance from table center to chair center

      const renderMaketChair = (x: number, y: number, rotation: number) => {
        return (
          <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
            {/* Chair Backrest (Semi-circle) */}
            <path
              d={`M ${-chairW / 2} ${0} A ${rad} ${rad} 0 0 0 ${chairW / 2} ${0}`}
              fill="none"
              stroke={color}
              strokeWidth={stroke * 1.2}
            />
            {/* Chair Seat */}
            <rect
              x={-chairW / 2}
              y={0}
              width={chairW}
              height={chairH}
              rx={1 * scale}
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={stroke}
            />
            {/* Partition line between backrest and seat */}
            <line
              x1={-chairW / 2}
              y1={0}
              x2={chairW / 2}
              y2={0}
              stroke={color}
              strokeWidth={stroke * 0.8}
            />
          </g>
        );
      };

      return (
        <g key={`furn-${room.id}`} className="pointer-events-none select-none">
          {/* Main Table Outline */}
          <rect
            x={table.x}
            y={table.y}
            width={table.w}
            height={table.h}
            rx={2 * scale}
            fill="#FFFFFF"
            stroke={color}
            strokeWidth={stroke * 1.5}
          />
          {/* Inner Table Detail (Maket style) */}
          <rect
            x={table.x + 4 * scale}
            y={table.y + 4 * scale}
            width={table.w - 8 * scale}
            height={table.h - 8 * scale}
            fill="none"
            stroke={color}
            strokeWidth={stroke * 0.5}
          />

          {/* Top Row (2 chairs, facing DOWN) */}
          {renderMaketChair(cx - offset, cy - (tH / 2 + gap + chairH / 2), 180)}
          {renderMaketChair(cx + offset, cy - (tH / 2 + gap + chairH / 2), 180)}

          {/* Bottom Row (2 chairs, facing UP) */}
          {renderMaketChair(cx - offset, cy + (tH / 2 + gap + chairH / 2), 0)}
          {renderMaketChair(cx + offset, cy + (tH / 2 + gap + chairH / 2), 0)}

          {/* Left Column (2 chairs, facing RIGHT) */}
          {renderMaketChair(cx - (tW / 2 + gap + chairH / 2), cy - offset, 90)}
          {renderMaketChair(cx - (tW / 2 + gap + chairH / 2), cy + offset, 90)}

          {/* Right Column (2 chairs, facing LEFT) */}
          {renderMaketChair(cx + (tW / 2 + gap + chairH / 2), cy - offset, -90)}
          {renderMaketChair(cx + (tW / 2 + gap + chairH / 2), cy + offset, -90)}
        </g>
      );
    }

    if (room.id === "parking") {
      // ── Dotted Car Outline ──
      const cW = Math.min(rw * 0.7, 75) * scale;
      const cH = Math.min(rh * 0.78, 145) * scale;
      const car = clampedRect(rx, ry, rw, rh, (rw - cW) / 2, (rh - cH) / 2, cW, cH, 4);

      if (!car) return null;

      return (
        <g key={`furn-${room.id}`} className="pointer-events-none select-none">
          {/* Car Body */}
          <rect x={car.x} y={car.y} width={car.w} height={car.h} rx={10 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
          {/* Windshield */}
          <path d={`M ${car.x + 8 * scale} ${car.y + car.h * 0.22} Q ${car.x + car.w / 2} ${car.y + car.h * 0.15} ${car.x + car.w - 8 * scale} ${car.y + car.h * 0.22}`} fill="none" stroke={color} strokeWidth={stroke} />
          {/* Rear Windshield */}
          <path d={`M ${car.x + 8 * scale} ${car.y + car.h * 0.78} Q ${car.x + car.w / 2} ${car.y + car.h * 0.85} ${car.x + car.w - 8 * scale} ${car.y + car.h * 0.78}`} fill="none" stroke={color} strokeWidth={stroke} />
        </g>
      );
    }

    if (room.id === "pooja") {
      // ── Pooja Mandir (Upside down geometric flip) ──
      const color = "rgba(17, 17, 17, 0.45)";
      const stroke = 1.0;
      const localScale = furnitureScale(room.width, room.height);

      // 1. Stepped Altar Base
      const baseW = Math.min(rw * 0.85, 40);
      const baseH = Math.min(rh * 0.25, 15);
      // 2. Temple Backdrop Wall
      const wallW = Math.min(rw * 0.70, 32);
      const wallH = Math.min(rh * 0.55, 28);
      
      // 3. Calculate center offsets for the entire structure
      const domeHeight = wallH * 0.85;
      const totalHeight = baseH + wallH + domeHeight;
      const topY = (rh - totalHeight) / 2;

      const base = clampedRect(rx, ry, rw, rh, (rw - baseW) / 2, topY, baseW, baseH, 2);
      if (!base) return null;

      const wall = clampedRect(rx, ry, rw, rh, (rw - wallW) / 2, topY + baseH, wallW, wallH, 2);
      if (!wall) return null;

      const domePath = `M ${wall.x + 4} ${wall.y} L ${wall.x + wall.w - 4} ${wall.y} L ${wall.x + wall.w} ${wall.y - wall.h * 0.35} Q ${wall.x + wall.w / 2} ${wall.y - wall.h * 0.85} ${wall.x} ${wall.y - wall.h * 0.35} Z`;

      const centerX = rx + rw / 2;
      const centerY = ry + rh / 2;
      const diyaY = wall.y + wall.h / 2 + 4 * localScale;

      // Flip the Y-axis around the room's exact center
      const flipTransform = `scale(1, -1) translate(0, ${-centerY * 2})`;

      return (
        <g key={`furn-${room.id}`} transform={flipTransform} className="pointer-events-none select-none">
          <g>
            {/* <rect x={base.x} y={base.y} width={base.w} height={base.h} rx={1} fill="#FFFFFF" stroke={color} strokeWidth={stroke} /> */}
            {/* <rect x={base.x + 4 * localScale} y={base.y + 4 * localScale} width={base.w - 8 * localScale} height={base.h - 8 * localScale} rx={1} fill="#FFFFFF" stroke={color} strokeWidth={stroke} /> */}
            <rect x={base.x + 8 * localScale} y={base.y + 8 * localScale} width={base.w - 16 * localScale} height={base.h - 16 * localScale} rx={1} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
          </g>
          <g>
            <rect x={wall.x} y={wall.y} width={wall.w} height={wall.h} fill="#FFFFFF" stroke={color} strokeWidth={stroke} rx={1} />
            <rect x={wall.x + 4 * localScale} y={wall.y + 4 * localScale} width={wall.w - 8 * localScale} height={wall.h - 8 * localScale} fill="none" stroke={color} strokeWidth={stroke * 0.7} rx={1} />
            <path d={domePath} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
            {/* <line x1={wall.x + wall.w / 2} y1={wall.y} x2={wall.x + wall.w / 2} y2={wall.y - wall.h * 0.85} stroke={color} strokeWidth={stroke * 0.5} strokeDasharray={`2,2`} /> */}
          </g>
          <g>
            <circle cx={centerX} cy={diyaY - 4 * localScale} r={10 * localScale} fill="none" stroke={color} strokeWidth={stroke * 0.5} strokeDasharray={`2,2`} opacity={0.8} />
            <circle cx={centerX} cy={diyaY - 4 * localScale} r={6 * localScale} fill="url(#rug-dots)" stroke={color} strokeWidth={stroke * 0.3} />
            <rect x={centerX - 7 * localScale} y={diyaY + 8 * localScale} width={14 * localScale} height={4 * localScale} rx={1} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 0.8} />
            <rect x={centerX - 5 * localScale} y={diyaY + 5 * localScale} width={10 * localScale} height={3 * localScale} rx={1} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 0.8} />
            <path d={`M ${centerX - 4 * localScale} ${diyaY + 4 * localScale} Q ${centerX} ${diyaY + 6 * localScale} ${centerX + 4 * localScale} ${diyaY + 4 * localScale} Z`} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
            <line x1={centerX} y1={diyaY + 4 * localScale} x2={centerX} y2={diyaY + 2 * localScale} stroke={color} strokeWidth={1.5} />
            <path d={`M ${centerX} ${diyaY - 10 * localScale} C ${centerX - 6 * localScale} ${diyaY - 2 * localScale} ${centerX - 5 * localScale} ${diyaY + 3 * localScale} ${centerX} ${diyaY + 5 * localScale} C ${centerX + 5 * localScale} ${diyaY + 3 * localScale} ${centerX + 6 * localScale} ${diyaY - 2 * localScale} ${centerX} ${diyaY - 10 * localScale} Z`} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
            <path d={`M ${centerX} ${diyaY - 5 * localScale} C ${centerX - 3 * localScale} ${diyaY - 1 * localScale} ${centerX - 2 * localScale} ${diyaY + 2 * localScale} ${centerX} ${diyaY + 3 * localScale} C ${centerX + 2 * localScale} ${diyaY + 2 * localScale} ${centerX + 3 * localScale} ${diyaY - 1 * localScale} ${centerX} ${diyaY - 5 * localScale} Z`} fill="none" stroke={color} strokeWidth={stroke * 0.7} />
          </g>
        </g>
      );
    }

    if (room.id === "utility") {
      // ── Freestanding Utility Island ──
      const centerX = rx + rw / 2;
      const centerY = ry + rh / 2;

      // Main Slab / Counter Base
      const bW = Math.min(rw * 0.65, 72 * scale);
      const bH = Math.min(rh * 0.55, 46 * scale);
      const bX = centerX - bW / 2;
      const bY = centerY - bH / 2;

      // ── Flush Machine Layout ──
      const pad = 4 * scale; 
      const innerW = bW - pad * 2;
      
      // Sink (Left)
      const skW = innerW * 0.30;
      const skH = bH * 0.75;
      const skX = bX + pad;
      const skY = bY + (bH - skH) / 2;

      const machineGap = 4 * scale;
      const machineW = (innerW - skW - machineGap) / 2;
      const wH = bH * 0.75;
      
      const wX = skX + skW + machineGap -2  * scale;
      const wY = bY + (bH - wH) / 2;
      const dX = wX + machineW + machineGap -2 * scale; // Flush to right
      const dY = wY;

      // ── Centered Shelf (Exact center of Washer + Dryer) ──
      const shelfGap = 12 * scale;
      const shelfH = 6 * scale;
      const shelfOverhang = 2 * scale; // Small symmetrical overhang
      
      // Calculate the exact center of the washer/dryer block
      const machineBlockCenterX = wX + machineW + machineGap / 2;
      
      const shelfW = machineW * 2 + machineGap + shelfOverhang * 2;
      const shelfX = machineBlockCenterX - shelfW / 2;
      const shelfY = wY - shelfH - shelfGap;

      return (
        <g key={`furn-${room.id}`} className="pointer-events-none select-none" transform={`rotate(${labelCounterRot}, ${rx + rw/2}, ${ry + rh/2})`}>
          
          {/* ─── 1. MAIN COUNTER SLAB ─── */}
          <rect x={bX} y={bY} width={bW} height={bH} rx={3 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.6} />
          <rect x={bX + 3 * scale} y={bY + 3 * scale} width={bW - 6 * scale} height={bH - 6 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.6} />

          {/* ─── 2. DEEP LAUNDRY SINK ─── */}
          <g>
            <rect x={skX} y={skY} width={skW} height={skH} rx={3 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.4} />
            <rect x={skX + 2 * scale} y={skY + 2 * scale} width={skW - 4 * scale} height={skH - 4 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.5} />
            <rect x={skX + 6 * scale} y={skY + 6 * scale} width={skW - 12 * scale} height={skH - 12 * scale} rx={2 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
            <circle cx={skX + skW / 2} cy={skY + skH / 2} r={2.5 * scale} fill={color} />
            
            {/* High-Arc Faucet */}
            <g>
              <rect x={skX + skW / 2 - 2 * scale} y={skY + 4 * scale} width={4 * scale} height={4 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 0.8} />
              <path d={`M ${skX + skW / 2} ${skY + 4 * scale} L ${skX + skW / 2} ${skY + 10 * scale} Q ${skX + skW / 2} ${skY + 16 * scale} ${skX + skW / 2 + 8 * scale} ${skY + 16 * scale} L ${skX + skW / 2 + 10 * scale} ${skY + 16 * scale}`} fill="none" stroke={color} strokeWidth={stroke * 1.0} />
              <circle cx={skX + skW / 2 + 10 * scale} cy={skY + 17 * scale} r={1.5 * scale} fill={color} />
              <path d={`M ${skX + skW / 2 - 4 * scale} ${skY + 4 * scale} L ${skX + skW / 2 - 8 * scale} ${skY + 3 * scale}`} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
            </g>
          </g>

          {/* ─── 3. WASHING MACHINE ─── */}
          <g>
            <rect x={wX} y={wY} width={machineW} height={wH} rx={2 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.4} />
            <rect x={wX + 2 * scale} y={wY + 2 * scale} width={machineW - 4 * scale} height={wH - 4 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.5} />
            <circle cx={wX + machineW / 2} cy={wY + wH / 2} r={machineW * 0.35} fill="none" stroke={color} strokeWidth={stroke * 1.2} />
            <circle cx={wX + machineW / 2} cy={wY + wH / 2} r={machineW * 0.28} fill="none" stroke={color} strokeWidth={stroke * 0.6} />
            <circle cx={wX + machineW / 2} cy={wY + wH / 2} r={machineW * 0.05} fill={color} />
            <rect x={wX + 4 * scale} y={wY + 4 * scale} width={machineW - 8 * scale} height={4 * scale} rx={1 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 0.8} />
            <circle cx={wX + 8 * scale} cy={wY + 6 * scale} r={1.5 * scale} fill={color} />
            <circle cx={wX + machineW - 8 * scale} cy={wY + 6 * scale} r={2.5 * scale} fill={color} />
          </g>

          {/* ─── 4. DRYER (Flush Right) ─── */}
          <g>
            <rect x={dX} y={dY} width={machineW} height={wH} rx={2 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.4} />
            <rect x={dX + 2 * scale} y={dY + 2 * scale} width={machineW - 4 * scale} height={wH - 4 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.5} />
            <circle cx={dX + machineW / 2} cy={dY + wH / 2} r={machineW * 0.35} fill="none" stroke={color} strokeWidth={stroke * 1.2} />
            <circle cx={dX + machineW / 2} cy={dY + wH / 2} r={machineW * 0.28} fill="none" stroke={color} strokeWidth={stroke * 0.6} />
            <circle cx={dX + machineW / 2} cy={dY + wH / 2} r={machineW * 0.05} fill={color} />
            <rect x={dX + 4 * scale} y={dY + 4 * scale} width={machineW - 8 * scale} height={4 * scale} rx={1 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 0.8} />
            <circle cx={dX + 8 * scale} cy={dY + 6 * scale} r={1.5 * scale} fill={color} />
            <circle cx={dX + machineW - 8 * scale} cy={dY + 6 * scale} r={2.5 * scale} fill={color} />
          </g>

        </g>
      );
    }

    if (room.id === "study" || room.id === "family") {
      // ── Study / Lounge Table with 4 Chairs on a Dotted Rug ──
      const rugW = Math.min(rw * 0.8, 92) * scale;
      const rugH = Math.min(rh * 0.8, 92) * scale;
      const rug = clampedRect(rx, ry, rw, rh, (rw - rugW) / 2, (rh - rugH) / 2, rugW, rugH, 4);

      if (!rug) return null;

      const tW = 38 * scale;
      const tH = 38 * scale;
      const tableX = rug.x + rug.w / 2 - tW / 2;
      const tableY = rug.y + rug.h / 2 - tH / 2;
      const chair = 11 * scale;
      const gap = 3 * scale;

      return (
        <g key={`furn-${room.id}`} className="pointer-events-none select-none">
          {/* Dotted Rug */}
          <rect x={rug.x} y={rug.y} width={rug.w} height={rug.h} rx={2 * scale} fill="url(#rug-dots)" stroke={color} strokeWidth={0.75} opacity={0.85} />
          {/* Table */}
          <rect x={tableX} y={tableY} width={tW} height={tH} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
          {/* Chairs — top, bottom, left, right */}
          <rect x={tableX + tW / 2 - chair / 2} y={tableY - chair - gap} width={chair} height={chair} rx={1.5 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
          <rect x={tableX + tW / 2 - chair / 2} y={tableY + tH + gap} width={chair} height={chair} rx={1.5 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
          <rect x={tableX - chair - gap} y={tableY + tH / 2 - chair / 2} width={chair} height={chair} rx={1.5 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
          <rect x={tableX + tW + gap} y={tableY + tH / 2 - chair / 2} width={chair} height={chair} rx={1.5 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke} />
        </g>
      );
    }

    if (room.id === "store" || room.id.startsWith("store-")) {
      // ── Central Freestanding Shelving Unit ──
      const pad = 6 * scale; // Margin from doors/walls
      const bW = Math.min(rw * 0.55, 44) * scale;
      const bH = Math.min(rh * 0.70, 50) * scale;
      const bX = rx + (rw - bW) / 2;
      const bY = ry + (rh - bH) / 2;

      return (
        <g key={`furn-${room.id}`} className="pointer-events-none select-none" transform={`rotate(${labelCounterRot}, ${rx + rw/2}, ${ry + rh/2})`}>
          {/* Outer Frame */}
          <rect x={bX} y={bY} width={bW} height={bH} rx={2 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.4} />
          
          {/* 3 Inner Shelves */}
          <line x1={bX} y1={bY + bH * 0.25} x2={bX + bW} y2={bY + bH * 0.25} stroke={color} strokeWidth={stroke * 0.8} />
          <line x1={bX} y1={bY + bH * 0.50} x2={bX + bW} y2={bY + bH * 0.50} stroke={color} strokeWidth={stroke * 0.8} />
          <line x1={bX} y1={bY + bH * 0.75} x2={bX + bW} y2={bY + bH * 0.75} stroke={color} strokeWidth={stroke * 0.8} />

          {/* Small Storage Boxes */}
          {[0.15, 0.40, 0.65].map((xOff, i) => (
            <g key={`box-${i}`}>
              <rect x={bX + bW * xOff} y={bY + 4 * scale + i * (bH * 0.25 - 4 * scale)} width={bW * 0.15} height={bH * 0.20} rx={1 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 0.6} />
              <line x1={bX + bW * xOff + bW * 0.05} y1={bY + 4 * scale + i * (bH * 0.25)} x2={bX + bW * xOff + bW * 0.10} y2={bY + 4 * scale + i * (bH * 0.25)} stroke={color} strokeWidth={stroke * 0.4} />
            </g>
          ))}
        </g>
      );
    }

    if (room.id === "servant") {
      // ── Centered Single Cot ──
      const pad = 6 * scale;
      const bW = Math.min(rw * 0.55, 44) * scale;
      const bH = Math.min(rh * 0.55, 44) * scale;
      const bX = rx + (rw - bW) / 2;
      const bY = ry + (rh - bH) / 2;

      return (
        <g key={`furn-${room.id}`} className="pointer-events-none select-none" transform={`rotate(${labelCounterRot}, ${rx + rw/2}, ${ry + rh/2})`}>
          {/* Bed Base */}
          <rect x={bX} y={bY} width={bW} height={bH} rx={2 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.4} />
          
          {/* Simple Flat Headboard */}
          <rect x={bX} y={bY - 4 * scale} width={bW} height={6 * scale} rx={1 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.2} />

          {/* Single Pillow */}
          <rect x={bX + bW * 0.2} y={bY + 6 * scale} width={bW * 0.6} height={bH * 0.25} rx={2 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 0.9} />
        </g>
      );
    }

    if (room.id === "kitchen-2") {
      // ── Centered Secondary Kitchen Block ──
      const pad = 6 * scale;
      const bW = Math.min(rw * 0.50, 42) * scale;
      const bH = Math.min(rh * 0.40, 34) * scale;
      const bX = rx + (rw - bW) / 2;
      const bY = ry + (rh - bH) / 2;

      return (
        <g key={`furn-${room.id}`} className="pointer-events-none select-none" transform={`rotate(${labelCounterRot}, ${rx + rw/2}, ${ry + rh/2})`}>
          {/* Main Counter Slab */}
          <rect x={bX} y={bY} width={bW} height={bH} rx={3 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 1.6} />
          <rect x={bX + 3 * scale} y={bY + 3 * scale} width={bW - 6 * scale} height={bH - 6 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.5} />

          {/* 2 Burner Rings */}
          <circle cx={bX + bW * 0.3} cy={bY + bH / 2} r={bH * 0.15} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
          <circle cx={bX + bW * 0.3} cy={bY + bH / 2} r={bH * 0.07} fill="none" stroke={color} strokeWidth={stroke * 0.4} />
          <circle cx={bX + bW * 0.6} cy={bY + bH / 2} r={bH * 0.15} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
          <circle cx={bX + bW * 0.6} cy={bY + bH / 2} r={bH * 0.07} fill="none" stroke={color} strokeWidth={stroke * 0.4} />

          {/* Side Control Panel */}
          <rect x={bX + bW - 6 * scale} y={bY + bH * 0.2} width={4 * scale} height={bH * 0.6} rx={1 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 0.8} />
          <circle cx={bX + bW - 4 * scale} cy={bY + bH * 0.35} r={1.5 * scale} fill={color} />
          <circle cx={bX + bW - 4 * scale} cy={bY + bH * 0.65} r={1.5 * scale} fill={color} />
        </g>
      );
    }

    if (room.id === "garden") {
      const pad = 4 * scale;
      const centerX = rx + rw / 2;
      const centerY = ry + rh / 2;

      return (
        <g key={`furn-${room.id}`} className="pointer-events-none select-none" transform={`rotate(${labelCounterRot}, ${rx + rw/2}, ${ry + rh/2})`}>
          {/* Dotted Lawn Border */}
          <rect x={rx + pad} y={ry + pad} width={rw - pad * 2} height={rh - pad * 2} rx={3 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.6} strokeDasharray={`3,3`} opacity={0.5} />

          {/* Hedge strip along the top edge */}
          <rect x={rx + pad} y={ry + pad} width={rw - pad * 2} height={8 * scale} rx={1 * scale} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 0.8} />
          <line x1={rx + pad + 4 * scale} y1={ry + pad + 4 * scale} x2={rx + rw - pad - 4 * scale} y2={ry + pad + 4 * scale} stroke={color} strokeWidth={stroke * 0.5} strokeDasharray={`2,2`} />

          {/* Small Centered Tree */}
          <g transform={`translate(${centerX}, ${centerY})`}>
            {/* Trunk */}
            <line x1={0} y1={10 * scale} x2={0} y2={-15 * scale} stroke={color} strokeWidth={2.5 * scale} />
            {/* Canopy (3 overlapping circles) */}
            <circle cx={0} cy={-20 * scale} r={10 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
            <circle cx={-8 * scale} cy={-15 * scale} r={8 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
            <circle cx={8 * scale} cy={-15 * scale} r={8 * scale} fill="none" stroke={color} strokeWidth={stroke * 0.8} />
          </g>
        </g>
      );
    }

    if (room.id === "corridor" || room.id.startsWith("corridor") || room.id.startsWith("passage") || room.id === "passage") {
      return (
        <g key={`furn-${room.id}`} className="pointer-events-none select-none" transform={`rotate(${labelCounterRot}, ${rx + rw/2}, ${ry + rh/2})`}>
          {/* Dotted Movement Path (runs top-to-bottom/left-to-right through the center) */}
          <line x1={rx + 4 * scale} y1={ry + 4 * scale} x2={rx + rw - 4 * scale} y2={ry + rh - 4 * scale} stroke={color} strokeWidth={stroke * 0.5} strokeDasharray={`4,4`} opacity={0.6} />
          <path d={`M ${rx + rw - 4 * scale} ${ry + rh - 4 * scale} L ${rx + rw - 1 * scale} ${ry + rh - 4 * scale} L ${rx + rw - 4 * scale} ${ry + rh - 1 * scale} Z`} fill={color} opacity={0.6} />

          {/* Small corner potted plant */}
          <g transform={`translate(${rx + 4 * scale}, ${ry + 4 * scale})`}>
            <path d={`M 0 8 L -2 4 L 6 4 L 4 8 Z`} fill="#FFFFFF" stroke={color} strokeWidth={stroke * 0.8} />
            <path d={`M 2 4 Q -2 0 0 -2 Q 2 0 2 4 Z`} fill="none" stroke={color} strokeWidth={stroke * 0.6} />
            <path d={`M 2 4 Q 6 0 4 -2 Q 4 0 2 4 Z`} fill="none" stroke={color} strokeWidth={stroke * 0.6} />
          </g>
        </g>
      );
    }

    return null;
  };

  // ── Render Staircase Treads and Arrow ───────────────────────────────────
  const renderStaircase = (room: Room) => {
    const { leftOffset, rightOffset, topOffset, bottomOffset } = getRoomOffsets(room);
    const rx = (room.x + leftOffset) * SC;
    const ry = (room.y + topOffset) * SC;
    const rw = (room.width - leftOffset - rightOffset) * SC;
    const rh = (room.height - topOffset - bottomOffset) * SC;

    const scale = furnitureScale(room.width, room.height);
    const color = "rgba(221, 214, 254, 0.5)";
    const stroke = 1.0;
    const elements: React.JSX.Element[] = [];

    const isVertical = rh > rw;
    const len = isVertical ? rh : rw;
    const treadSpacing = 10 * scale;
    const treadCount = Math.floor((len - 8) / treadSpacing);
    const clampedCount = Math.max(2, Math.min(treadCount, 12));

    if (isVertical) {
      const stepH = rh / (clampedCount + 1);
      for (let i = 1; i <= clampedCount; i++) {
        const y = ry + i * stepH;
        elements.push(
          <line key={`stair-${i}`} x1={rx} y1={y} x2={rx + rw} y2={y} stroke={color} strokeWidth={stroke} />
        );
      }
      const midX = rx + rw / 2;
      elements.push(
        <line key="stair-mid" x1={midX} y1={ry + 10} x2={midX} y2={ry + rh - 10} stroke={color} strokeWidth={stroke}  />
      );
      if (rh >= 60) {
        const arrowY1 = ry + rh - 15;
        const arrowY2 = ry + 15;
        elements.push(
          <g key="stair-arrow">
            <circle cx={midX} cy={arrowY1} r={3} fill={color} />
            <line x1={midX} y1={arrowY1} x2={midX} y2={arrowY2} stroke={color} strokeWidth={1.2} markerEnd="url(#arr-grey)" />
            <text x={midX + 8} y={arrowY1} fill="rgba(74, 85, 104, 0.4)" fontSize={9} fontWeight="bold">UP</text>
          </g>
        );
      }
    } else {
      const stepW = rw / (clampedCount + 1);
      for (let i = 1; i <= clampedCount; i++) {
        const x = rx + i * stepW;
        elements.push(
          <line key={`stair-${i}`} x1={x} y1={ry} x2={x} y2={ry + rh} stroke={color} strokeWidth={stroke} />
        );
      }
      const midY = ry + rh / 2;
      elements.push(
        <line key="stair-mid" x1={rx + 10} y1={midY} x2={rx + rw - 10} y2={midY} stroke={color} strokeWidth={stroke} strokeDasharray="3,3" />
      );
      if (rw >= 60) {
        const arrowX1 = rx + 15;
        const arrowX2 = rx + rw - 15;
        elements.push(
          <g key="stair-arrow">
            <circle cx={arrowX1} cy={midY} r={3} fill={color} />
            <line x1={arrowX1} y1={midY} x2={arrowX2} y2={midY} stroke={color} strokeWidth={1.2} markerEnd="url(#arr-grey)" />
            <text x={arrowX1} y={midY - 8} fill="rgba(74, 85, 104, 0.4)" fontSize={9} fontWeight="bold">UP</text>
          </g>
        );
      }
    }

    return <g key={`stairs-${room.id}`}>{elements}</g>;
  };

  // ── Render Wall Clearings for Thresholds ───────────────────────────────
  const renderDoorClearing = (door: Door, room: Room, idx: number) => {
    const rx = room.x * SC, ry = room.y * SC;
    const rw = room.width * SC, rh = room.height * SC;
    const pos = door.position * SC;
    const tw = wallThicknessFt(room, door.wall) * SC;
    const dw = door.width * SC; // The original full width

    // 1. Determine if the hinge is at the "start" or the "end" of the wall segment
    const isHorizontal = door.wall === "top" || door.wall === "bottom";
    const span = isHorizontal ? rw : rh;
    const isHingeLeftOrTop = pos < (span - dw) / 2;

    // 2. Calculate where the wall needs to be erased based on the scaled door
    let scaledStart = pos;
    let scaledEnd = pos + dw;

    if (isHingeLeftOrTop) {
      // Hinge is on the left (or top), door scales towards the right (or bottom)
      scaledEnd = pos + dw * DOOR_SCALE_FACTOR;
    } else {
      // Hinge is on the right (or bottom), door scales towards the left (or top)
      scaledStart = pos + dw * (1 - DOOR_SCALE_FACTOR);
    }

    const scaledDw = scaledEnd - scaledStart;
    const scaledPos = scaledStart;

    // 3. Apply the new scaled width and shifted position to the wall clearing
    let cx = 0, cy = 0, cw = 0, ch = 0;
    switch (door.wall) {
      case "top":
        cx = rx + scaledPos; cy = ry - tw / 2; cw = scaledDw; ch = tw; break;
      case "bottom":
        cx = rx + scaledPos; cy = ry + rh - tw / 2; cw = scaledDw; ch = tw; break;
      case "left":
        cx = rx - tw / 2; cy = ry + scaledPos; cw = tw; ch = scaledDw; break;
      case "right":
        cx = rx + rw - tw / 2; cy = ry + scaledPos; cw = tw; ch = scaledDw; break;
    }

    return (
      <rect key={`door-clr-${idx}`} x={cx} y={cy} width={cw} height={ch} fill="#FFFFFF" />
    );
  };

  const renderWindowClearing = (win: Window, room: Room, idx: number) => {
    const rx = room.x * SC, ry = room.y * SC;
    const rw = room.width * SC, rh = room.height * SC;
    const ww = win.width * SC, pos = win.position * SC;
    const tw = wallThicknessFt(room, win.wall) * SC;

    let cx = 0, cy = 0, cw = 0, ch = 0;
    switch (win.wall) {
      case "top":
        cx = rx + pos;
        cy = ry - tw / 2;
        cw = ww;
        ch = tw;
        break;
      case "bottom":
        cx = rx + pos;
        cy = ry + rh - tw / 2;
        cw = ww;
        ch = tw;
        break;
      case "left":
        cx = rx - tw / 2;
        cy = ry + pos;
        cw = tw;
        ch = ww;
        break;
      case "right":
        cx = rx + rw - tw / 2;
        cy = ry + pos;
        cw = tw;
        ch = ww;
        break;
    }

    return (
      <rect key={`win-clr-${idx}`} x={cx} y={cy} width={cw} height={ch} fill="#FFFFFF" />
    );
  };

  // ── Render Doors (Swing Arcs and Panels) ────────────────────────────────
  const renderDoor = (door: Door, room: Room, idx: number) => {
    const rx = room.x * SC, ry = room.y * SC;
    const rw = room.width * SC, rh = room.height * SC;
    const dw = door.width * SC; // Keep the backend's original width
    const pos = door.position * SC;
    const isMain = door.room === "living";

    const { leftOffset, rightOffset, topOffset, bottomOffset } = getRoomOffsets(room);
    const rx_inner = (room.x + leftOffset) * SC;
    const ry_inner = (room.y + topOffset) * SC;
    const rw_inner = (room.width - leftOffset - rightOffset) * SC;
    const rh_inner = (room.height - topOffset - bottomOffset) * SC;

    let xh = 0, yh = 0, xc = 0, yc = 0, xo = 0, yo = 0, arc = "", panel = "";
    const color = "#111111"; // classic black door swing
    const strokeW = isMain ? 2.0 : 1.6; 

    const depth = (door.wall === "top" || door.wall === "bottom") ? rh_inner : rw_inner;

    // Fallback for tiny walls
    if (depth < dw) {
      let x1 = 0, y1 = 0, x2 = 0, y2 = 0, cx = 0, cy = 0;
      switch (door.wall) {
        case "top":    x1 = rx + pos; y1 = ry; x2 = rx + pos + dw; y2 = ry; cx = rx + pos + dw / 2; cy = ry; break;
        case "bottom": x1 = rx + pos; y1 = ry + rh; x2 = rx + pos + dw; y2 = ry + rh; cx = rx + pos + dw / 2; cy = ry + rh; break;
        case "left":   x1 = rx; y1 = ry + pos; x2 = rx; y2 = ry + pos + dw; cx = rx; cy = ry + pos + dw / 2; break;
        case "right":  x1 = rx + rw; y1 = ry + pos; x2 = rx + rw; y2 = ry + pos + dw; cx = rx + rw; cy = ry + pos + dw / 2; break;
      }
      return (
        <g key={`door-${idx}`}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} strokeDasharray="3,3" />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={12} fontWeight="bold">↔</text>
        </g>
      );
    }

    // Calculate the hinge coordinates (xh, yh)
    switch (door.wall) {
      case "top":
        if (pos < (rw - dw) / 2) { // Hinge is on the left side of the door
          xh = rx + pos; yh = ry;
          xc = rx + pos + dw; yc = ry;
          xo = xh; yo = yh + dw;
          arc = `M ${xo} ${yo} A ${dw} ${dw} 0 0 0 ${xc} ${yc}`;
        } else { // Hinge is on the right side of the door
          xh = rx + pos + dw; yh = ry;
          xc = rx + pos; yc = ry;
          xo = xh; yo = yh + dw;
          arc = `M ${xo} ${yo} A ${dw} ${dw} 0 0 1 ${xc} ${yc}`;
        }
        panel = `M ${xh} ${yh} L ${xo} ${yo}`;
        break;
      case "bottom":
        if (pos < (rw - dw) / 2) {
          xh = rx + pos; yh = ry + rh;
          xc = rx + pos + dw; yc = ry + rh;
          xo = xh; yo = yh - dw;
          arc = `M ${xo} ${yo} A ${dw} ${dw} 0 0 1 ${xc} ${yc}`;
        } else {
          xh = rx + pos + dw; yh = ry + rh;
          xc = rx + pos; yc = ry + rh;
          xo = xh; yo = yh - dw;
          arc = `M ${xo} ${yo} A ${dw} ${dw} 0 0 0 ${xc} ${yc}`;
        }
        panel = `M ${xh} ${yh} L ${xo} ${yo}`;
        break;
      case "left":
        if (pos < (rh - dw) / 2) {
          xh = rx; yh = ry + pos;
          xc = rx; yc = ry + pos + dw;
          xo = xh + dw; yo = yh;
          arc = `M ${xo} ${yo} A ${dw} ${dw} 0 0 1 ${xc} ${yc}`;
        } else {
          xh = rx; yh = ry + pos + dw;
          xc = rx; yc = ry + pos;
          xo = xh + dw; yo = yh;
          arc = `M ${xo} ${yo} A ${dw} ${dw} 0 0 0 ${xc} ${yc}`;
        }
        panel = `M ${xh} ${yh} L ${xo} ${yo}`;
        break;
      case "right":
        if (pos < (rh - dw) / 2) {
          xh = rx + rw; yh = ry + pos;
          xc = rx + rw; yc = ry + pos + dw;
          xo = xh - dw; yo = yh;
          arc = `M ${xo} ${yo} A ${dw} ${dw} 0 0 0 ${xc} ${yc}`;
        } else {
          xh = rx + rw; yh = ry + pos + dw;
          xc = rx + rw; yc = ry + pos;
          xo = xh - dw; yo = yh;
          arc = `M ${xo} ${yo} A ${dw} ${dw} 0 0 1 ${xc} ${yc}`;
        }
        panel = `M ${xh} ${yh} L ${xo} ${yo}`;
        break;
    }

    const clipId = `clip-${room.id}-${idx}`;

    // ════════════════════════════════════════════════════════════════════════
    // ✅ UPDATED: Uses the global DOOR_SCALE_FACTOR constant
    // ════════════════════════════════════════════════════════════════════════
    const SCALE_FACTOR = DOOR_SCALE_FACTOR; // Now reads from the constant at the top
    // Moving origin to hinge -> scale -> moving origin back
    const transform = `translate(${xh}, ${yh}) scale(${SCALE_FACTOR}) translate(${-xh}, ${-yh})`;

    return (
      <g key={`door-${idx}`}>
        <defs>
          <clipPath id={clipId}>
            <rect x={rx_inner} y={ry_inner} width={rw_inner} height={rh_inner} />
          </clipPath>
        </defs>
        <g transform={transform} clipPath={`url(#${clipId})`}>
          <path
            d={arc}
            fill="none"
            stroke={color}
            strokeWidth={1}
            strokeDasharray="3,3"
            opacity={0.85}
          />
          <path
            d={panel}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        </g>
      </g>
    );
  };

  // ── Render Windows ──────────────────────────────────────────────────────
  const renderWindow = (win: Window, room: Room, idx: number) => {
    const rx = room.x * SC, ry = room.y * SC;
    const rw = room.width * SC, rh = room.height * SC;
    const ww = win.width * SC;
    const pos = win.position * SC;

    const T_ext_SVG = T_ext * SC;
    const T_int_SVG = T_int * SC;
    const totalWallThick = T_ext_SVG + T_int_SVG;

    // 🟢 MANUAL CONTROLS:
    const WINDOW_SHRINK = 10; 
    const BORDER = 2; 
    const DIVIDER_STROKE = 1.5;

    let x, y, w, h;
    switch (win.wall) {
      case "top":
        x = rx + pos;
        y = ry - T_ext_SVG + (WINDOW_SHRINK / 2);
        w = ww;
        h = totalWallThick - WINDOW_SHRINK;
        break;
      case "bottom":
        x = rx + pos;
        y = ry + rh - T_int_SVG + (WINDOW_SHRINK / 2);
        w = ww;
        h = totalWallThick - WINDOW_SHRINK;
        break;
      case "left":
        x = rx - T_ext_SVG + (WINDOW_SHRINK / 2);
        y = ry + pos;
        w = totalWallThick - WINDOW_SHRINK;
        h = ww;
        break;
      case "right":
        x = rx + rw - T_int_SVG + (WINDOW_SHRINK / 2);
        y = ry + pos;
        w = totalWallThick - WINDOW_SHRINK;
        h = ww;
        break;
    }

    return (
      <g key={`win-${idx}`}>
        {/* 1. Solid Black Border */}
        <rect x={x} y={y} width={w} height={h} fill="#111111" />
        
        {/* 2. White Glass Inset */}
        <rect 
          x={x + BORDER} 
          y={y + BORDER} 
          width={w - BORDER * 2} 
          height={h - BORDER * 2} 
          fill="#FFFFFF" 
        />

        {/* 3. Conditional Bisector (Vertical for Top/Bottom walls, Horizontal for Left/Right walls) */}
        {win.wall === "top" || win.wall === "bottom" ? (
          // ✅ Vertical line splitting Left/Right (for horizontal window frames)
          <line 
            x1={x + w / 2} 
            y1={y + BORDER} 
            x2={x + w / 2} 
            y2={y + h - BORDER} 
            stroke="#111111" 
            strokeWidth={DIVIDER_STROKE} 
          />
        ) : (
          // ✅ Horizontal line splitting Top/Bottom (for vertical window frames)
          <line 
            x1={x + BORDER} 
            y1={y + h / 2} 
            x2={x + w - BORDER} 
            y2={y + h / 2} 
            stroke="#111111" 
            strokeWidth={DIVIDER_STROKE} 
          />
        )}
      </g>
    );
  };

  // ── Unified SVG Content Generator ───────────────────────────────────────
  const renderSVGContent = () => {
    const houseW = (houseRight - houseLeft) * SC;
    const houseH = (houseBottom - houseTop) * SC;

    return (
      <>
        <defs>
          {/* Soft dotted paper texture (replaces ruled grid) */}
          <pattern id="paper-dots" width={SC} height={SC} patternUnits="userSpaceOnUse">
            <rect width={SC} height={SC} fill="var(--paper, #ffffff)" />
            <circle cx={SC / 2} cy={SC / 2} r={0.7} fill="rgba(0,0,0,0.12)" />
          </pattern>
          {/* Dotted rug fill (used under beds and lounge tables) */}
          <pattern id="rug-dots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1.4" cy="1.4" r="0.7" fill="rgba(17,17,17,0.4)" />
          </pattern>
          {/* Arrow markers */}
          <marker id="arr-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 8 5 L 0 8.5 Z" fill="#111111" />
          </marker>
          <marker id="arr-grey" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 1.5 L 8 5 L 0 8.5 Z" fill="#111111" />
          </marker>
          <marker id="arr-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 Z" fill="#111111" />
          </marker>
          <marker id="arr-dim-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 10 1 L 1 5 L 10 9 Z" fill="#111111" />
          </marker>
        </defs>

        {/* Paper background */}
        <rect x={0} y={0} width={viewW} height={viewH} fill="var(--paper, #ffffff)" />

        <g
          transform={
            `translate(${PAD + svgW / 2}, ${PAD + svgH / 2}) ` +
            `rotate(${roadRot}) ` +
            `translate(${-plotSvgW / 2}, ${-plotSvgH / 2})`
          }
        >
          {/* Plot dotted paper texture */}
          <rect width={plotSvgW} height={plotSvgH} fill="url(#paper-dots)" />

          {/* Outer plot boundary */}
          <rect
            x={0}
            y={0}
            width={plotSvgW}
            height={plotSvgH}
            fill="none"
            stroke="#111111"
            strokeWidth={2}
          />

          {/* Build-up area (inside setbacks) — rooms must sit here */}
          {buildUp && (
            <rect
              x={buildUp.x * SC}
              y={buildUp.y * SC}
              width={buildUp.width * SC}
              height={buildUp.height * SC}
              fill="none"
              stroke="#64748B"
              strokeWidth={1.2}
              strokeDasharray="6,4"
            />
          )}

          {/* Outer exterior wall — bold black double-line boundary (like reference plan) */}
          {rooms.length > 0 && (() => {
            const BW = T_ext * SC; // exterior wall 9 inches
            const hx = houseLeft * SC;
            const hy = houseTop * SC;
            const GAP = 4; // gap between the bold wall face and the thin outer line
            return (
              <g>
                {/* Solid black wall band outside house footprint */}
                <rect
                  x={hx - BW}
                  y={hy - BW}
                  width={houseW + BW * 2}
                  height={houseH + BW * 2}
                  fill="#111111"
                  stroke="#111111"
                  strokeWidth={1}
                />
                {/* Thin outer line — creates the "double line" wall edge */}
                <rect
                  x={hx - BW - GAP}
                  y={hy - BW - GAP}
                  width={houseW + BW * 2 + GAP * 2}
                  height={houseH + BW * 2 + GAP * 2}
                  fill="none"
                  stroke="#111111"
                  strokeWidth={1}
                />
                {/* Inner white cutout so rooms sit cleanly inside */}
                <rect
                  x={hx}
                  y={hy}
                  width={houseW}
                  height={houseH}
                  fill="var(--paper, #ffffff)"
                  stroke="none"
                />
                {/* Perimeter tick marks — small dashes every ~2ft along the exterior wall */}
                {(() => {
                  const outerLeft = hx - BW - GAP;
                  const outerRight = hx + houseW + BW + GAP;
                  const outerTop = hy - BW - GAP;
                  const outerBottom = hy + houseH + BW + GAP;
                  const step = 2 * SC; // every 2 feet
                  const tickLen = 5;
                  const ticks: React.JSX.Element[] = [];
                  for (let x = outerLeft; x <= outerRight; x += step) {
                    ticks.push(
                      <line key={`tick-top-${x}`} x1={x} y1={outerTop} x2={x} y2={outerTop - tickLen} stroke="#111111" strokeWidth={1} />
                    );
                    ticks.push(
                      <line key={`tick-bot-${x}`} x1={x} y1={outerBottom} x2={x} y2={outerBottom + tickLen} stroke="#111111" strokeWidth={1} />
                    );
                  }
                  for (let y = outerTop; y <= outerBottom; y += step) {
                    ticks.push(
                      <line key={`tick-left-${y}`} x1={outerLeft} y1={y} x2={outerLeft - tickLen} y2={y} stroke="#111111" strokeWidth={1} />
                    );
                    ticks.push(
                      <line key={`tick-right-${y}`} x1={outerRight} y1={y} x2={outerRight + tickLen} y2={y} stroke="#111111" strokeWidth={1} />
                    );
                  }
                  return <g key="perimeter-ticks">{ticks}</g>;
                })()}
              </g>
            );
          })()}

          {/* ── Solid Structural Walls Background ──
              Gray fill = wall mass. Room floors are drawn on top, inset by
              T_ext (9″) on exterior edges and T_int/2 (3″ each side → 6″) inside.
              The gray strips between rooms ARE the interior walls. */}
          {rooms.length > 0 && (
            <rect
              x={houseLeft * SC}
              y={houseTop * SC}
              width={houseW}
              height={houseH}
              fill="#D6D3D1"
              stroke="#111111"
              strokeWidth={2}
            />
          )}

          {/* ── Room Floors (overlaid on top of wall background) ── */}
          {rooms.map((room, roomIdx) => {
            const s = getStyle(room.id);
            const { leftOffset, rightOffset, topOffset, bottomOffset } = getRoomOffsets(room);
            const rx = (room.x + leftOffset) * SC;
            const ry = (room.y + topOffset) * SC;
            const rw = (room.width - leftOffset - rightOffset) * SC;
            const rh = (room.height - topOffset - bottomOffset) * SC;

            const isSmall = room.width < 5.5 || room.height < 5.5;

            return (
              <g key={`room-grp-${roomIdx}`}>
                {/* Floor Area — classic white room with black wall line */}
                <rect
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  fill="#FFFFFF"
                  stroke="#111111"
                  strokeWidth={1.2}
                />

                {/* Vector CAD Furniture Details */}
                {renderFurniture(room)}

                {/* Staircase treads */}
                {room.id === "staircase" && renderStaircase(room)}

                {/* Text Labels centered inside room floor */}
                {showAnnotations && (() => {
  const minDim = Math.min(room.width, room.height);
  const area = room.width * room.height;

  // Determine font sizes based on actual room size in feet
  let labelSize = 11;
  let dimSize = 8;

  if (minDim < 3 || area < 10) {
    // Too small for any text—skip entirely
    return null;
  } else if (minDim < 5 || area < 30) {
    // Very small (like 4.5x4.5 parking) – tiny text, dimensions always shown
    labelSize = 7;
    dimSize = 6;
  } else if (minDim < 7 || area < 50) {
    labelSize = 9;
    dimSize = 7;
  } else if (minDim < 10 || area < 100) {
    labelSize = 11;
    dimSize = 9;
  } else {
    labelSize = 14;
    dimSize = 10;
  }

  const labelX = rx + rw / 2;
  const labelY = ry + rh / 2;

  return (
    <g className="pointer-events-none select-none" transform={`translate(${labelX}, ${labelY}) rotate(${labelCounterRot})`}>
      {/* Room Label */}
      <text
        x={0}
        y={-4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={s.labelColor}
        fontSize={labelSize}
        fontWeight="700"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {room.label}
      </text>
      {/* Room Dimensions (always shown, scaled down if needed) */}
      <text
        x={0}
        y={labelSize / 2 + 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={s.labelColor}
        fontSize={dimSize}
        fontWeight="500"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {fmt(room.width)} × {fmt(room.height)}
      </text>
    </g>
  );
})()}
              </g>
            );
          })}

          {/* ── Wall Clearing for Doors/Windows ── */}
          {doors.map((door, i) => {
            const room = rooms.find((r) => r.id === door.room);
            return room ? renderDoorClearing(door, room, i) : null;
          })}
          {windows.map((win, i) => {
            const room = rooms.find((r) => r.id === win.room);
            return room ? renderWindowClearing(win, room, i) : null;
          })}

          {/* ── Openings Rendering (Doors/Windows drawn on top of cleared segments) ── */}
          {doors.map((door, i) => {
            const room = rooms.find((r) => r.id === door.room);
            return room ? renderDoor(door, room, i) : null;
          })}
          {windows.map((win, i) => {
            const room = rooms.find((r) => r.id === win.room);
            return room ? renderWindow(win, room, i) : null;
          })}

          {/* ── Outer Boundary Gate (on road edge; rotates with plan) ── */}
          {showAnnotations && (() => {
            const gx = gc.x * SC, gy = gc.y * SC;
            const gateW = 8 * SC;
            const leafW = gateW / 2;

            if (doorWall === "top" || doorWall === "bottom") {
              const wallY = doorWall === "top" ? 0 : plotSvgH;
              const outY = doorWall === "top" ? -leafW : leafW;
              const sweepLeft = doorWall === "top" ? 1 : 0;
              const sweepRight = doorWall === "top" ? 0 : 1;
              return (
                <g key="road-gate">
                  <line x1={gx - leafW} y1={wallY} x2={gx + leafW} y2={wallY} stroke="#F8F6F0" strokeWidth={15} />
                  <rect x={gx - leafW - 6} y={wallY - 6} width={12} height={12} fill="#1E293B" rx={1.5} />
                  <rect x={gx + leafW - 6} y={wallY - 6} width={12} height={12} fill="#1E293B" rx={1.5} />
                  <line x1={gx - leafW} y1={wallY} x2={gx - leafW} y2={wallY + outY} stroke="#16A34A" strokeWidth={2.5} />
                  <line x1={gx + leafW} y1={wallY} x2={gx + leafW} y2={wallY + outY} stroke="#16A34A" strokeWidth={2.5} />
                  <path d={`M ${gx - leafW} ${wallY + outY} A ${leafW} ${leafW} 0 0 ${sweepLeft} ${gx} ${wallY}`} fill="none" stroke="#16A34A" strokeWidth={1.2} strokeDasharray="3,2" opacity={0.6} />
                  <path d={`M ${gx + leafW} ${wallY + outY} A ${leafW} ${leafW} 0 0 ${sweepRight} ${gx} ${wallY}`} fill="none" stroke="#16A34A" strokeWidth={1.2} strokeDasharray="3,2" opacity={0.6} />
                  <g transform={`translate(${gx}, ${wallY + (doorWall === "top" ? -16 : 22)}) rotate(${labelCounterRot})`}>
                    <text x={0} y={0} textAnchor="middle" fill="#15803D" fontSize={14} fontWeight="900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      GATE
                    </text>
                  </g>
                </g>
              );
            }
            const wallX = doorWall === "left" ? 0 : plotSvgW;
            const outX = doorWall === "left" ? -leafW : leafW;
            const sweepTop = doorWall === "left" ? 0 : 1;
            const sweepBottom = doorWall === "left" ? 1 : 0;
            return (
              <g key="road-gate">
                <line x1={wallX} y1={gy - leafW} x2={wallX} y2={gy + leafW} stroke="#F8F6F0" strokeWidth={15} />
                <rect x={wallX - 6} y={gy - leafW - 6} width={12} height={12} fill="#1E293B" rx={1.5} />
                <rect x={wallX - 6} y={gy + leafW - 6} width={12} height={12} fill="#1E293B" rx={1.5} />
                <line x1={wallX} y1={gy - leafW} x2={wallX + outX} y2={gy - leafW} stroke="#16A34A" strokeWidth={2.5} />
                <line x1={wallX} y1={gy + leafW} x2={wallX + outX} y2={gy + leafW} stroke="#16A34A" strokeWidth={2.5} />
                <path d={`M ${wallX + outX} ${gy - leafW} A ${leafW} ${leafW} 0 0 ${sweepTop} ${wallX} ${gy}`} fill="none" stroke="#16A34A" strokeWidth={1.2} strokeDasharray="3,2" opacity={0.6} />
                <path d={`M ${wallX + outX} ${gy + leafW} A ${leafW} ${leafW} 0 0 ${sweepBottom} ${wallX} ${gy}`} fill="none" stroke="#16A34A" strokeWidth={1.2} strokeDasharray="3,2" opacity={0.6} />
                <g transform={`translate(${wallX + (doorWall === "left" ? -16 : 22)}, ${gy}) rotate(${labelCounterRot})`}>
                  <text x={0} y={0} textAnchor="middle" fill="#15803D" fontSize={14} fontWeight="900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    GATE
                  </text>
                </g>
              </g>
            );
          })()}

          {/* ── Entry Path Guide ── */}
          {showAnnotations && md && (
            <polyline
              points={buildEntryPath()}
              fill="none"
              stroke="#16A34A"
              strokeWidth={1.5}
              strokeDasharray="6,4"
              strokeOpacity={0.55}
              markerEnd="url(#arr-green)"
              opacity={0.8}
            />
          )}

          {/* ── Main Door Indicator Tag — label always offset toward road (front) ── */}
          {showAnnotations && md && (() => {
            const dx = md.x * SC, dy = md.y * SC;
            const door = doors.find((d) => d.room === "living");
            if (!door) return null;

            // Offset label toward the road edge so it always reads as "front"
            const off = 28;
                       let tx = dx, ty = dy;
            let anchor: "start" | "end" | "middle" = "middle";
            if (doorWall === "top") {
              ty = dy - off; // toward top (road)
            } else if (doorWall === "bottom") {
              ty = dy + off; // toward bottom (road)
            } else if (doorWall === "left") {
              tx = dx - off;
              anchor = "end";
            } else {
              // doorWall === "right"
              tx = dx + off;
              anchor = "start";
            }

            return (
              <g key="main-door-indicator">
                <circle cx={dx} cy={dy} r={8} fill="#2563EB" opacity={0.15} className="animate-pulse" />
                <circle cx={dx} cy={dy} r={3} fill="#2563EB" />
                <g transform={`translate(${tx}, ${ty}) rotate(${labelCounterRot})`}>
                  <text x={0} y={0} textAnchor={anchor} dominantBaseline="middle" fill="#1D4ED8" fontSize={14} fontWeight="850" style={{ fontFamily: "Outfit, sans-serif", letterSpacing: "0.05em" }}>
                    ★ MAIN DOOR
                  </text>
                </g>
              </g>
            );
          })()}

          {/* ── Vastu 3x3 Overlay Grid ── */}
          {showVastu && (() => {
            // Simplified direction label, with the zone's associated element/deity as a small subtext
            const zones = [
              [{ dir: "NW", note: "Vayu" }, { dir: "N", note: "Kuber" }, { dir: "NE", note: "Pooja" }],
              [{ dir: "W", note: "Varun" }, { dir: "", note: "Brahmasthan" }, { dir: "E", note: "Aditya" }],
              [{ dir: "SW", note: "Master Bed" }, { dir: "S", note: "Yama" }, { dir: "SE", note: "Agni" }],
            ];
            const lineColor = "#94A3B8";
            const textColor = "#64748B";

            return (
              <g key="vastu-grid">
                <line x1={plotSvgW / 3} y1={0} x2={plotSvgW / 3} y2={plotSvgH} stroke={lineColor} strokeWidth={1} opacity={0.5} />
                <line x1={2 * plotSvgW / 3} y1={0} x2={2 * plotSvgW / 3} y2={plotSvgH} stroke={lineColor} strokeWidth={1} opacity={0.5} />
                <line x1={0} y1={plotSvgH / 3} x2={plotSvgW} y2={plotSvgH / 3} stroke={lineColor} strokeWidth={1} opacity={0.5} />
                <line x1={0} y1={2 * plotSvgH / 3} x2={plotSvgW} y2={2 * plotSvgH / 3} stroke={lineColor} strokeWidth={1} opacity={0.5} />
                {zones.map((row, ri) =>
                  row.map((zone, ci) => {
                    // Grid is in plot coords (N at top, y=0). Plan may be rotated
                    // so road is at bottom — counter-rotate labels so they stay upright.
                    const cx = (ci * plotSvgW) / 3 + plotSvgW / 6;
                    const cy = (ri * plotSvgH) / 3 + plotSvgH / 6;
                    return (
                      <g
                        key={`vastu-${ri}-${ci}`}
                        opacity={0.85}
                        transform={`translate(${cx}, ${cy}) rotate(${labelCounterRot})`}
                      >
                        {zone.dir && (
                          <text
                            x={0}
                            y={-7}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={textColor}
                            fontSize={11}
                            fontWeight="700"
                            style={{ fontFamily: "Georgia, serif", letterSpacing: "0.04em" }}
                          >
                            {zone.dir}
                          </text>
                        )}
                        <text
                          x={0}
                          y={zone.dir ? 8 : 0}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={textColor}
                          fontSize={8.5}
                          fontWeight="500"
                          style={{ fontFamily: "Georgia, serif" }}
                        >
                          {zone.note}
                        </text>
                      </g>
                    );
                  })
                )}
              </g>
            );
          })()}
        </g>

        {/* ── Road Indicator — ALWAYS at bottom of diagram ── */}
        {roadFacing && (() => {
          const thickness = 35;
          const gap = 8;
          const rx = PAD;
          const ry = PAD + svgH + gap;
          const rw = svgW;
          const rh = thickness;
          const tx = PAD + svgW / 2;
          const ty = ry + thickness / 2;
          return (
            <g key="road-strip">
              <rect x={rx} y={ry} width={rw} height={rh} fill="#E2E8F0" rx={4} stroke="#111111" strokeWidth={1} />
              <line
                x1={rx + 15}
                y1={ry + rh / 2}
                x2={rx + rw - 15}
                y2={ry + rh / 2}
                stroke="#64748B"
                strokeWidth={1.5}
                strokeDasharray="8,6"
              />
              <text
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#111111"
                fontSize={13}
                fontWeight="800"
                style={{ fontFamily: "Georgia, serif", letterSpacing: "0.12em" }}
              >
                ROAD ACCESS ({roadFacing})
              </text>
            </g>
          );
        })()}

        {/* ── Plot Dimension Rulers (classic CAD arrows) ── */}
        <g key="ruler-width">
          <line
            x1={PAD}
            y1={PAD + svgH + 22}
            x2={PAD + svgW}
            y2={PAD + svgH + 22}
            stroke="#111111"
            strokeWidth={1.2}
            markerStart="url(#arr-dim-start)"
            markerEnd="url(#arr-dim)"
          />
          <line x1={PAD} y1={PAD + svgH + 16} x2={PAD} y2={PAD + svgH + 28} stroke="#111111" strokeWidth={1.2} />
          <line x1={PAD + svgW} y1={PAD + svgH + 16} x2={PAD + svgW} y2={PAD + svgH + 28} stroke="#111111" strokeWidth={1.2} />
          <text x={PAD + svgW / 2} y={PAD + svgH + 40} textAnchor="middle" fill="#111111" fontSize={14} fontWeight="700" style={{ fontFamily: "Georgia, serif" }}>
            {fmt(axesSwapped ? H : W)}'-0"
          </text>
        </g>
        <g key="ruler-height">
          <line
            x1={PAD + svgW + 22}
            y1={PAD}
            x2={PAD + svgW + 22}
            y2={PAD + svgH}
            stroke="#111111"
            strokeWidth={1.2}
            markerStart="url(#arr-dim-start)"
            markerEnd="url(#arr-dim)"
          />
          <line x1={PAD + svgW + 16} y1={PAD} x2={PAD + svgW + 28} y2={PAD} stroke="#111111" strokeWidth={1.2} />
          <line x1={PAD + svgW + 16} y1={PAD + svgH} x2={PAD + svgW + 28} y2={PAD + svgH} stroke="#111111" strokeWidth={1.2} />
          <text x={PAD + svgW + 38} y={PAD + svgH / 2} textAnchor="middle" fill="#111111" fontSize={14} fontWeight="700" transform={`rotate(-90, ${PAD + svgW + 38}, ${PAD + svgH / 2})`} style={{ fontFamily: "Georgia, serif" }}>
            {fmt(axesSwapped ? W : H)}'-0"
          </text>
        </g>

        {/* ── North indicator (true North) ── */}
        <g transform={`translate(${viewW - 48}, ${viewH - 48}) rotate(${roadRot})`} key="compass">
          <line x1={0} y1={10} x2={0} y2={-14} stroke="#111111" strokeWidth={1.5} markerEnd="url(#arr-dim)" />
          <text x={0} y={-18} textAnchor="middle" fill="#111111" fontSize={14} fontWeight="800" style={{ fontFamily: "Georgia, serif" }}>
            N
          </text>
        </g>
      </>
    );
  };

  // ── Download Actions ────────────────────────────────────────────────────
  const downloadSVG = (ref: React.RefObject<SVGSVGElement | null>) => {
    if (!ref.current) return;
    const data = new XMLSerializer().serializeToString(ref.current);
    const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `house_plan_${W}x${H}ft_${roadFacing}_road_floor_${activeFloor}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadPNG = (ref: React.RefObject<SVGSVGElement | null>) => {
    if (!ref.current) return;
    const svgEl = ref.current;
    const width = viewW;
    const height = viewH;
    
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const DOMURL = window.URL || window.webkitURL || window;
    const blobURL = DOMURL.createObjectURL(svgBlob);
    
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(2, 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        
        try {
          const pngURL = canvas.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = pngURL;
          a.download = `house_plan_${W}x${H}ft_${roadFacing}_road_floor_${activeFloor}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (err) {
          console.error("Canvas toDataURL failed:", err);
        }
      }
      DOMURL.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(layout, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="blueprint-corners glow-panel flex flex-col rounded-2xl border border-[var(--hairline)] overflow-hidden flex-1 min-h-[50vh] lg:min-h-0 w-full">
      {/* ── Header Toolbar — title + Vastu Grid toggle only ─────────────── */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-[var(--paper-soft)] border-b border-[var(--hairline)] px-5 py-3 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[var(--pencil-red)]" />
          <h2 className="font-bold text-sm md:text-[15px] text-[var(--ink)] font-display tracking-tight gradient-accent-text">
            {activeFloor === 0 ? "Ground Floor" : `Floor ${activeFloor}`} Draft — {fmt(W)}′ × {fmt(H)}′
            {heightFt ? ` × ${fmt(heightFt)}′H` : ""}{" "}
            <span className="ml-2 text-xs font-normal text-[var(--ink-soft)] font-mono">
              ({W * H} sq ft)
            </span>
            <span className="ml-3 text-[10px] font-normal text-[var(--ink-soft)] font-mono border border-[var(--hairline)] rounded px-1.5 py-0.5">
              Walls Ext 9&quot; · Int 6&quot;
            </span>
          </h2>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <span className="text-xs font-mono font-semibold text-[var(--ink)] tracking-wide">Vastu</span>
          <button
            type="button"
            role="switch"
            aria-checked={showVastu}
            onClick={() => setShowVastu(!showVastu)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pencil-red)]/50 ${
              showVastu
                ? "bg-[var(--pencil-red)]"
                : "bg-[var(--hairline)]"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                showVastu ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <span className="text-xs font-mono font-semibold text-[var(--ink)] tracking-wide">Annotations</span>
          <button
            type="button"
            role="switch"
            aria-checked={showAnnotations}
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pencil-red)]/50 ${
              showAnnotations
                ? "bg-[var(--pencil-red)]"
                : "bg-[var(--hairline)]"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                showAnnotations ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>

        {/* LABEL OFFSET -DEBUG TOOL */}
        {/* <div className="flex items-center gap-3 bg-[var(--paper)] border border-[var(--hairline)] rounded-lg px-3 py-1.5">
          <span className="text-[10px] font-mono font-semibold text-[var(--ink)] tracking-wide">Label Offset</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[var(--ink-soft)]">X</span>
            <input
              type="number"
              value={labelOffsetX}
              onChange={(e) => setLabelOffsetX(Number(e.target.value))}
              className="w-12 text-center text-xs font-mono border border-[var(--hairline)] rounded bg-white outline-none focus:border-[var(--pencil-red)]"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[var(--ink-soft)]">Y</span>
            <input
              type="number"
              value={labelOffsetY}
              onChange={(e) => setLabelOffsetY(Number(e.target.value))}
              className="w-12 text-center text-xs font-mono border border-[var(--hairline)] rounded bg-white outline-none focus:border-[var(--pencil-red)]"
            />
          </div>
        </div> */}
      </div>

      {/* ── Main Canvas Area ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 bg-[var(--paper)] relative overflow-hidden">
        <div className="absolute inset-0 p-4 flex items-center justify-center">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${viewW} ${viewH}`}
            className="w-full h-full max-w-full max-h-full select-none"
          >
            {renderSVGContent()}
          </svg>
        </div>
      </div>

      {/* ── Footer actions (below image) ─────────────────────────────────── */}
      <div className="flex flex-wrap justify-center gap-2 bg-[var(--paper-soft)] border-t border-[var(--hairline)] px-5 py-3 z-10 shrink-0">
        <button
          onClick={() => downloadSVG(svgRef)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--paper)] text-[var(--ink)] border border-[var(--hairline)] hover:bg-[var(--paper-soft)] hover:border-[var(--accent-cyan)]/50 text-xs font-mono font-medium"
        >
          <Download className="w-3.5 h-3.5 text-[var(--accent-cyan)]" /> Export SVG
        </button>
        <button
          onClick={() => downloadPNG(svgRef)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--paper)] text-[var(--ink)] border border-[var(--hairline)] hover:bg-[var(--paper-soft)] hover:border-[var(--accent-cyan)]/50 text-xs font-mono font-medium"
        >
          <Download className="w-3.5 h-3.5 text-[var(--accent-cyan)]" /> Export PNG
        </button>
        <button
          onClick={() => {
            setZoom(1.0);
            setIsFullscreen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--paper)] text-[var(--ink)] border border-[var(--hairline)] hover:bg-[var(--paper-soft)] hover:border-[var(--accent-cyan)]/50 text-xs font-mono font-medium"
        >
          <Maximize2 className="w-3.5 h-3.5 text-[var(--accent-cyan)]" /> Fullscreen
        </button>
      </div>

      {/* Warnings banner hidden per product preference */}
      {/* {false && layout.warnings && layout.warnings.length > 0 && (
        <div className="bg-[var(--paper-soft)] border-y border-[var(--pencil-red)]/40 px-5 py-2 shrink-0 text-xs text-[var(--accent-amber)] font-medium">
          {layout.warnings.map((warn, i) => (
            <div key={i} className="flex items-start gap-1.5 leading-relaxed">
              <span className="shrink-0 font-bold">⚠ Warning:</span>
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )} */}



      {/* ── INTERACTIVE FULLSCREEN MODAL OVERLAY ──────────────────────────── */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#161819] flex flex-col animate-fade-in text-stone-350 select-none">
          {/* Modal Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-[#202224] border-b border-stone-800 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
            <div className="flex items-center gap-3">
              <Compass className="w-5 h-5 text-red-500 animate-spin-slow shrink-0" />
              <div>
                <h3 className="font-extrabold text-sm md:text-base text-white font-display">
                  Interactive Design Draft — {fmt(W)}′ × {fmt(H)}′
                </h3>
                <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                  Zoom: {Math.round(zoom * 100)}% | Use +/- keys to zoom, Esc to exit
                </p>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className="ml-auto sm:hidden p-2 bg-red-950/40 hover:bg-red-900/50 active:bg-red-900 text-red-400 rounded-lg transition-all shrink-0"
                title="Close Fullscreen (Esc)"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Controls */}
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
                className="p-2 bg-stone-800 hover:bg-stone-700 active:bg-stone-600 rounded-lg text-stone-300 transition-all"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(3.0, z + 0.25))}
                className="p-2 bg-stone-800 hover:bg-stone-700 active:bg-stone-600 rounded-lg text-stone-300 transition-all"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(1.0)}
                className="p-2 bg-stone-800 hover:bg-stone-700 active:bg-stone-600 rounded-lg text-stone-300 transition-all flex items-center gap-1 text-xs"
                title="Reset Zoom (0)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Fit
              </button>
              <div className="h-6 w-[1px] bg-stone-800 mx-1 hidden sm:block" />
              <label className="flex items-center gap-2 cursor-pointer select-none px-1">
                <span className="text-xs font-semibold text-stone-300">Vastu</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showVastu}
                  onClick={() => setShowVastu(!showVastu)}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    showVastu ? "bg-violet-600" : "bg-stone-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                      showVastu ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none px-1">
                <span className="text-xs font-semibold text-stone-300">Annotations</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showAnnotations}
                  onClick={() => setShowAnnotations(!showAnnotations)}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    showAnnotations ? "bg-violet-600" : "bg-stone-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                      showAnnotations ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
              <button
                onClick={() => downloadSVG(svgFullscreenRef)}
                className="px-3 py-2 bg-stone-850 border border-stone-700 text-stone-300 hover:bg-stone-800 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">SVG</span>
              </button>
              <button
                onClick={() => downloadPNG(svgFullscreenRef)}
                className="px-3 py-2 bg-stone-850 border border-stone-700 text-stone-300 hover:bg-stone-800 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">PNG</span>
              </button>
              <button
                onClick={copyJSON}
                className="px-3 py-2 bg-stone-850 border border-stone-700 text-stone-300 hover:bg-stone-800 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <FileJson className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Copy JSON</span>
              </button>
              <div className="h-6 w-[1px] bg-stone-800 mx-1 hidden sm:block" />
              <button
                onClick={() => setIsFullscreen(false)}
                className="hidden sm:block p-2 bg-red-950/40 hover:bg-red-900/50 active:bg-red-900 text-red-400 rounded-lg transition-all"
                title="Close Fullscreen (Esc)"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Modal Canvas (With Scrollbars & Dynamic Sizing!) */}
          <div className="flex-1 overflow-auto p-3 sm:p-8 bg-[#18191B] min-h-0 min-w-0 flex">
            <div
              style={{
                width: `${viewW * zoom}px`,
                height: `${viewH * zoom}px`,
                transition: "width 0.1s ease-out, height 0.1s ease-out",
              }}
              className="m-auto relative flex items-center justify-center select-none shadow-2xl bg-[#0f1117] rounded-xl border border-stone-800"
            >
              <svg
                ref={svgFullscreenRef}
                viewBox={`0 0 ${viewW} ${viewH}`}
                className="w-full h-full"
              >
                {renderSVGContent()}
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}