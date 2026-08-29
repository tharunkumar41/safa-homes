"use client";

import React, { useState, useEffect } from "react";
import { PlotInputs } from "@/lib/types";
import { resolveBhkConfig, maxBhkForArea } from "@/lib/bhk";
import { ChevronDown, ChevronUp, Sparkles, Sliders } from "lucide-react";
import {
  EXTERIOR_WALL_INCHES,
  INTERIOR_WALL_INCHES,
  EXTERIOR_WALL_FT,
  INTERIOR_WALL_FT,
} from "@/lib/vastu";

interface InputFormProps {
  onSubmit: (inputs: PlotInputs) => void;
  isLoading: boolean;
  initialValues?: PlotInputs;
  projectId?: string | null;
  onSave?: () => void;
  saving?: boolean;
}

export default function InputForm({
  onSubmit,
  isLoading,
  initialValues,
  projectId,
  onSave,
  saving,
}: InputFormProps) {
  const defaults = initialValues || {
    lengthFt: 30,
    breadthFt: 40,
    orientation: "North" as const,
    roadFacing: "North" as const,
    bedrooms: 2,
    masterBedrooms: 1,
    bathrooms: 2,
    parking: false, // 1BHK default; enabled for 2BHK+ via applyAccessories
    garden: false,
    poojaRoom: true,
    vastu: true,
    floors: 1,
    kitchens: 1,
    servantQuarters: false,
  };

  // Plot: width = frontage (along road), depth = into the plot
  const [lengthFt, setLengthFt] = useState<number | string>(defaults.lengthFt || 30);
  const [breadthFt, setBreadthFt] = useState<number | string>(defaults.breadthFt || 40);
  const [roadFacing, setRoadFacing] = useState<string>(defaults.roadFacing || "North");

  // Setbacks (ft) — front 3, others 1 by default
  const [setbackFront, setSetbackFront] = useState<number | string>(defaults.setbackFront ?? 3);
  const [setbackBack, setSetbackBack] = useState<number | string>(defaults.setbackBack ?? 1);
  const [setbackLeft, setSetbackLeft] = useState<number | string>(defaults.setbackLeft ?? 1);
  const [setbackRight, setSetbackRight] = useState<number | string>(defaults.setbackRight ?? 1);

  // Customization section toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Customizations — BHK is authoritative once the user picks it (or on first load).
  // Plot-size changes must NEVER overwrite a manual selection.
  const [bhkMode, setBhkMode] = useState<"recommended" | "manual">("recommended");
  const [bedrooms, setBedrooms] = useState<number>(defaults.bedrooms ?? 2);
  const [masterBedrooms, setMasterBedrooms] = useState<number>(defaults.masterBedrooms ?? 1);
  const [bathrooms, setBathrooms] = useState<number>(defaults.bathrooms ?? 2);
  const [kitchens, setKitchens] = useState<number>(defaults.kitchens ?? 1);
  const [parking, setParking] = useState(defaults.parking ?? false);
  const [garden, setGarden] = useState(defaults.garden ?? false);
  const [poojaRoom, setPoojaRoom] = useState(defaults.poojaRoom ?? true);
  const [vastu, setVastu] = useState(defaults.vastu ?? true);
  const [floors, setFloors] = useState<number>(defaults.floors ?? 1);
  const [servantQuarters, setServantQuarters] = useState(defaults.servantQuarters ?? false);

  // 🔄 Sync internal state with initialValues when they change (e.g., loading a project)
  useEffect(() => {
    if (initialValues) {
      setLengthFt(initialValues.lengthFt ?? 30);
      setBreadthFt(initialValues.breadthFt ?? 40);
      setRoadFacing(initialValues.roadFacing ?? "North");
      setSetbackFront(initialValues.setbackFront ?? 3);
      setSetbackBack(initialValues.setbackBack ?? 1);
      setSetbackLeft(initialValues.setbackLeft ?? 1);
      setSetbackRight(initialValues.setbackRight ?? 1);
      setBedrooms(initialValues.bedrooms ?? 2);
      setMasterBedrooms(initialValues.masterBedrooms ?? 1);
      setBathrooms(initialValues.bathrooms ?? 2);
      setKitchens(initialValues.kitchens ?? 1);
      setParking(initialValues.parking ?? false);
      setGarden(initialValues.garden ?? false);
      setPoojaRoom(initialValues.poojaRoom ?? true);
      setVastu(initialValues.vastu ?? true);
      setFloors(initialValues.floors ?? 1);
      setServantQuarters(initialValues.servantQuarters ?? false);
    }
  }, [initialValues]);

  /**
   * Only update accessory options when plot changes.
   * NEVER overwrite bedrooms / BHK when the user is in manual mode.
   * In recommended mode, sync BHK to the soft recommendation.
   */
  const applyAccessoriesFromArea = (w: number, h: number) => {
    const cfg = resolveBhkConfig(w * h);
    if (!cfg.allowGarden) setGarden(false);
    if (!cfg.allowPooja) setPoojaRoom(false);
    if (!cfg.allowServant) setServantQuarters(false);
    // Auto-select BHK from plot size unless user locked manual mode
    if (bhkMode === "recommended") {
      setBedrooms(cfg.recommendedBhk);
      setMasterBedrooms(cfg.recommendedBhk >= 2 ? 1 : 0);
      setBathrooms(cfg.bathrooms);
      setKitchens(cfg.kitchens);
      // Parking stays off unless the user turns it on
      setParking(false);
      if (cfg.allowPooja) setPoojaRoom(cfg.recommendedBhk > 1);
      else setPoojaRoom(false);
    } else {
      // Manual BHK: still enforce no parking on 1BHK
      setParking((prev) => (bedrooms > 1 ? prev : false));
    }
  };

  const plotArea = (Number(lengthFt) || 30) * (Number(breadthFt) || 40);
  const maxBhk = maxBhkForArea(plotArea);
  const suggested = resolveBhkConfig(plotArea);
  const currentCfg = resolveBhkConfig(plotArea, bedrooms);

  const sf = Number(setbackFront) || 3;
  const sb = Number(setbackBack) || 1;
  const sl = Number(setbackLeft) || 1;
  const sr = Number(setbackRight) || 1;
  const buildUpW = Math.max(1, (Number(lengthFt) || 30) - sl - sr);
  const buildUpD = Math.max(1, (Number(breadthFt) || 40) - sf - sb);

  // Plot area must be 600–4900 sq ft. Side lengths 15–120 ft allow common aspect ratios.
  const lenNum = Number(lengthFt);
  const brdNum = Number(breadthFt);
  const isLengthInvalid =
    !isNaN(lenNum) && lengthFt !== "" && (lenNum < 15 || lenNum > 120);
  const isWidthInvalid =
    !isNaN(brdNum) && breadthFt !== "" && (brdNum < 15 || brdNum > 120);
  const isAreaInvalid =
    !isNaN(plotArea) && (plotArea < 600 || plotArea > 4900);
  const canGenerate = !isLengthInvalid && !isWidthInvalid && !isAreaInvalid && plotArea > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const L = Number(lengthFt) || 0;
    const B = Number(breadthFt) || 0;
    const area = L * B;
    if (L < 15 || L > 120 || B < 15 || B > 120) {
      alert("Each side must be between 15 and 120 ft.");
      return;
    }
    if (area < 600 || area > 4900) {
      alert(`Plot area must be between 600 and 4900 sq ft. Current: ${area} sq ft.`);
      return;
    }
    onSubmit({
      lengthFt: L,
      breadthFt: B,
      widthFt: L,
      depthFt: B,
      orientation: "North",
      roadFacing: roadFacing as PlotInputs["roadFacing"],
      setbackFront: sf,
      setbackBack: sb,
      setbackLeft: sl,
      setbackRight: sr,
      bedrooms,
      masterBedrooms: bedrooms >= 2 ? Math.min(masterBedrooms, bedrooms) : 1,
      bathrooms,
      kitchens,
      parking: false, // car parking disabled — layout uses full build-up
      garden,
      poojaRoom,
      vastu,
      floors,
      servantQuarters,
    });
  };

  const segBtn = (active: boolean) =>
    `py-1.5 text-[10px] sm:text-xs font-mono font-semibold uppercase tracking-wide transition-all rounded-md ${active
      ? "bg-[var(--pencil-red)] text-white"
      : "text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-black/[0.04]"
    }`;

  return (
    <form
      onSubmit={handleSubmit}
      className="blueprint-corners glow-panel flex flex-col gap-6 rounded-2xl border border-[var(--hairline)] p-6 flex-1 text-[var(--ink)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[var(--hairline)] pb-4">
        <div>
          <h2 className="text-lg font-bold font-display tracking-tight gradient-accent-text">Layout Brief</h2>
          <p className="text-[11px] text-[var(--ink-soft)] mt-1">Tell us the plot and rooms — we’ll draft the floor plan.</p>
        </div>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-[var(--pencil-red)] border border-[var(--pencil-red)]/30 bg-[var(--pencil-red)]/5 rounded-full px-2.5 py-1">
          Sheet&nbsp;01
        </span>
      </div>

      {/* Plot dimensions */}
      <div className="flex flex-col gap-4">
        <label className="text-[10px] font-mono font-semibold text-[var(--ink-soft)] uppercase tracking-wider">
          Plot Size (ft)
        </label>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">
              Length{" "}
              <span className="text-[var(--ink-soft)] font-normal text-xs ml-1">(frontage along road, ft)</span>
            </span>
            <input
              type="number"
              min={15}
              max={120}
              value={lengthFt}
              onChange={(e) => setLengthFt(e.target.value)}
              onBlur={() => {
                const w = Math.max(15, Math.min(120, Number(lengthFt) || 15));
                setLengthFt(w);
                applyAccessoriesFromArea(w, Number(breadthFt) || 40);
              }}
              className="w-20 text-right font-mono text-sm font-bold border border-[var(--hairline)] rounded-lg px-2 py-1.5 focus:border-[var(--pencil-red)] focus:ring-1 focus:ring-[var(--pencil-red)] outline-none text-[var(--ink)] bg-[var(--paper-soft)] transition-all"
            />
          </div>
          <input
            type="range"
            min={15}
            max={120}
            value={lengthFt}
            onChange={(e) => {
              const w = Number(e.target.value);
              setLengthFt(w);
              applyAccessoriesFromArea(w, Number(breadthFt) || 40);
            }}
            className="w-full accent-[var(--pencil-red)] h-1.5 rounded-full bg-[var(--hairline)] appearance-none cursor-pointer"
          />
          {isLengthInvalid && (
            <p className="text-[10px] text-red-500 font-mono mt-0.5">
              Length must be between 15 and 120 ft.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">
              Width{" "}
              <span className="text-[var(--ink-soft)] font-normal text-xs ml-1">(into plot, ft)</span>
            </span>
            <input
              type="number"
              min={15}
              max={120}
              value={breadthFt}
              onChange={(e) => setBreadthFt(e.target.value)}
              onBlur={() => {
                const h = Math.max(15, Math.min(120, Number(breadthFt) || 15));
                setBreadthFt(h);
                applyAccessoriesFromArea(Number(lengthFt) || 30, h);
              }}
              className="w-20 text-right font-mono text-sm font-bold border border-[var(--hairline)] rounded-lg px-2 py-1.5 focus:border-[var(--pencil-red)] focus:ring-1 focus:ring-[var(--pencil-red)] outline-none text-[var(--ink)] bg-[var(--paper-soft)] transition-all"
            />
          </div>
          <input
            type="range"
            min={15}
            max={120}
            value={breadthFt}
            onChange={(e) => {
              const h = Number(e.target.value);
              setBreadthFt(h);
              applyAccessoriesFromArea(Number(lengthFt) || 30, h);
            }}
            className="w-full accent-[var(--pencil-red)] h-1.5 rounded-full bg-[var(--hairline)] appearance-none cursor-pointer"
          />
          {isWidthInvalid && (
            <p className="text-[10px] text-red-500 font-mono mt-0.5">
              Width must be between 15 and 120 ft.
            </p>
          )}
        </div>

        <p
          className={`text-[10px] font-mono ${
            isAreaInvalid ? "text-red-500 font-semibold" : "text-[var(--ink-soft)]"
          }`}
        >
          Plot {Number(lengthFt) || 0}′ × {Number(breadthFt) || 0}′ = {plotArea} sq ft
          <span className="text-[var(--ink-soft)] font-normal"> (allowed 600–4900)</span>
        </p>
        {isAreaInvalid && (
          <p className="text-[10px] text-red-500 font-mono">
            {plotArea < 600
              ? `Area too small (${plotArea} sq ft). Minimum is 600 sq ft.`
              : `Area too large (${plotArea} sq ft). Maximum is 4900 sq ft.`}
          </p>
        )}
      </div>

      {/* Setbacks */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono font-semibold text-[var(--ink-soft)] uppercase tracking-wider">
          Setbacks (ft)
        </label>
        <p className="text-[10px] text-[var(--ink-soft)]">
          Front (road) 3 ft · all other sides 1 ft by default. Build-up area is inside these margins.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["Front (F)", setbackFront, setSetbackFront],
              ["Back (B)", setbackBack, setSetbackBack],
              ["Left (L)", setbackLeft, setSetbackLeft],
              ["Right (R)", setbackRight, setSetbackRight],
            ] as const
          ).map(([label, val, setVal]) => (
            <div key={label} className="flex items-center justify-between gap-2 border border-[var(--hairline)] rounded-lg px-2.5 py-1.5 bg-[var(--paper-soft)]">
              <span className="text-[11px] font-medium text-[var(--ink)]">{label}</span>
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onBlur={() => {
                  const n = Math.max(0, Math.min(20, Number(val) || 0));
                  setVal(n);
                }}
                className="w-14 text-right font-mono text-xs font-bold bg-transparent outline-none text-[var(--ink)]"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1 text-center text-[9px] font-mono text-[var(--ink-soft)]">
          <span>N = {roadFacing === "North" ? sf : roadFacing === "South" ? sb : roadFacing === "East" ? sl : sr}′</span>
          <span>S = {roadFacing === "South" ? sf : roadFacing === "North" ? sb : roadFacing === "East" ? sr : sl}′</span>
          <span>E = {roadFacing === "East" ? sf : roadFacing === "West" ? sb : roadFacing === "North" ? sr : sl}′</span>
          <span>W = {roadFacing === "West" ? sf : roadFacing === "East" ? sb : roadFacing === "North" ? sl : sr}′</span>
        </div>
        <p className="text-[10px] font-mono text-[var(--accent-cyan)]">
          Build-up ≈ {buildUpW.toFixed(0)}′ × {buildUpD.toFixed(0)}′ ({Math.round(buildUpW * buildUpD)} sq ft)
        </p>
      </div>

      {/* Wall thickness */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono font-semibold text-[var(--ink-soft)] uppercase tracking-wider">
          Wall thickness
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5 border border-[var(--hairline)] rounded-lg px-2.5 py-2 bg-[var(--paper-soft)]">
            <span className="text-[10px] text-[var(--ink-soft)]">Exterior</span>
            <span className="text-sm font-mono font-bold text-[var(--ink)]">
              {EXTERIOR_WALL_INCHES}&quot; <span className="text-[10px] font-normal text-[var(--ink-soft)]">({EXTERIOR_WALL_FT.toFixed(2)} ft)</span>
            </span>
          </div>
          <div className="flex flex-col gap-0.5 border border-[var(--hairline)] rounded-lg px-2.5 py-2 bg-[var(--paper-soft)]">
            <span className="text-[10px] text-[var(--ink-soft)]">Interior</span>
            <span className="text-sm font-mono font-bold text-[var(--ink)]">
              {INTERIOR_WALL_INCHES}&quot; <span className="text-[10px] font-normal text-[var(--ink-soft)]">({INTERIOR_WALL_FT.toFixed(2)} ft)</span>
            </span>
          </div>
        </div>
        <p className="text-[10px] text-[var(--ink-soft)]">
          Standard for Indian homes 600–4900 sq ft · shown on the floor plan
        </p>
      </div>

      {/* Road Access Side */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono font-semibold text-[var(--ink-soft)] uppercase tracking-wider">
          Road Access Side
        </label>
        <p className="text-[10px] text-[var(--ink-soft)]">
          Plan is always drawn with the road at the bottom of the diagram.
        </p>
        <div className="grid grid-cols-4 gap-1 bg-[var(--paper-soft)] p-1 border border-[var(--hairline)] rounded-lg">
          {["North", "East", "South", "West"].map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => setRoadFacing(side)}
              className={segBtn(roadFacing === side)}
            >
              {side}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Customizations Panel */}
      <div className="border-t border-[var(--hairline)] pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex justify-between items-center w-full text-left font-semibold text-sm font-display px-3 py-2 -mx-3 rounded-lg hover:bg-black/[0.04] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-[var(--ink-soft)]" />
            Customize Rooms
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="flex flex-col gap-4 mt-4 bg-[var(--paper-soft)] border border-[var(--hairline)] rounded-xl p-4 transition-all duration-300">
            {/* Number inputs */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-[10px] font-mono font-semibold text-[var(--ink-soft)] uppercase tracking-wider">
                  BHK — recommended {suggested.recommendedBhk} for {plotArea} sq ft (max feasible {maxBhk})
                </span>
                <div className="flex gap-1 mb-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setBhkMode("recommended");
                      const cfg = resolveBhkConfig(plotArea);
                      setBedrooms(cfg.recommendedBhk);
                      setMasterBedrooms(cfg.recommendedBhk >= 2 ? 1 : 0);
                      setBathrooms(cfg.bathrooms);
                      setKitchens(cfg.kitchens);
                    }}
                    className={`flex-1 py-1.5 text-[10px] font-mono font-semibold rounded-md border transition-all ${
                      bhkMode === "recommended"
                        ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border-[var(--accent-cyan)]/40"
                        : "border-[var(--hairline)] text-[var(--ink-soft)]"
                    }`}
                  >
                    Recommended
                  </button>
                  <button
                    type="button"
                    onClick={() => setBhkMode("manual")}
                    className={`flex-1 py-1.5 text-[10px] font-mono font-semibold rounded-md border transition-all ${
                      bhkMode === "manual"
                        ? "bg-[var(--pencil-red)]/15 text-[var(--pencil-red)] border-[var(--pencil-red)]/40"
                        : "border-[var(--hairline)] text-[var(--ink-soft)]"
                    }`}
                  >
                    Manual
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((n) => {
                    const overMax = n > maxBhk;
                    const active = bedrooms === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setBhkMode("manual");
                          // Manual selection is authoritative — do not clamp via resolveBhkConfig.
                          setBedrooms(n);
                          setMasterBedrooms(n >= 2 ? 1 : 1);
                          const cfg = resolveBhkConfig(plotArea, n);
                          // 1BHK → 1 bath; else (bhk-1) attached + 1 common
                          setBathrooms(cfg.bathrooms);
                          setKitchens(cfg.kitchens);
                          // Parking from 2BHK only
                          setParking(n > 1);
                        }}
                        className={`flex-1 py-2 text-xs font-mono font-semibold rounded-lg border transition-all ${
                          active
                            ? "bg-[var(--pencil-red)] text-white border-transparent"
                            : overMax
                              ? "opacity-50 border-dashed border-[var(--hairline)] text-[var(--ink-soft)] hover:opacity-80"
                              : "border-[var(--hairline)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-black/[0.04]"
                        }`}
                        title={
                          overMax
                            ? `${n}BHK may not fit this plot — generator will error if build-up is too small`
                            : undefined
                        }
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] text-[var(--ink-soft)] mt-1">
                  {bhkMode === "manual" ? "Manual" : "Recommended"}: {bedrooms}BHK selected
                  {bedrooms > maxBhk
                    ? ` · may not fit (max feasible ~${maxBhk})`
                    : ` · suggested ${suggested.recommendedBhk}BHK`}
                </span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-mono font-semibold text-[var(--ink-soft)] uppercase tracking-wider">Bedrooms</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={bedrooms}
                  onChange={(e) => {
                    const n = Math.min(6, Math.max(1, Number(e.target.value) || 1));
                    setBhkMode("manual");
                    setBedrooms(n);
                    setMasterBedrooms((m) => (n === 1 ? 1 : Math.min(Math.max(1, m), n)));
                    const cfg = resolveBhkConfig(plotArea, n);
                    setBathrooms(cfg.bathrooms);
                    setKitchens(cfg.kitchens);
                  }}
                  className="w-full bg-[var(--paper)] border border-[var(--hairline)] rounded-lg px-3 py-2 text-sm font-mono font-semibold outline-none focus:border-[var(--pencil-red)]"
                />
              </label>
              {bedrooms >= 2 && (
                <label className="flex flex-col gap-1 col-span-2">
                  <span className="text-[10px] font-mono font-semibold text-[var(--ink-soft)] uppercase tracking-wider">
                    Master bedrooms (attached toilet)
                  </span>
                  <div className="flex gap-1.5">
                    {Array.from({ length: bedrooms }, (_, i) => i + 1).map((n) => {
                      const active = masterBedrooms === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setMasterBedrooms(n);
                            // 1BHK → 1; secondary beds → masters+1 common; all masters → n attached
                            if (bedrooms === 1) setBathrooms(1);
                            else if (n < bedrooms) setBathrooms(n + 1);
                            else setBathrooms(n);
                          }}
                          className={`flex-1 py-2 text-xs font-mono font-semibold rounded-lg border transition-all ${active
                            ? "bg-[var(--pencil-red)] text-white border-transparent"
                            : "border-[var(--hairline)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-black/[0.04]"
                            }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-[var(--ink-soft)] mt-1">
                    {masterBedrooms} master suite{masterBedrooms > 1 ? "s" : ""} with attached bathroom
                    {bedrooms - masterBedrooms > 0
                      ? ` · ${bedrooms - masterBedrooms} secondary (share 1 common bath)`
                      : " · no common needed (all masters)"}
                  </span>
                </label>
              )}
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-mono font-semibold text-[var(--ink-soft)] uppercase tracking-wider">Bathrooms</span>
                <input
                  type="number"
                  min={1}
                  max={bedrooms === 1 ? 1 : bedrooms + 1}
                  value={
                    bedrooms === 1
                      ? 1
                      : bathrooms
                  }
                  onChange={(e) => {
                    if (bedrooms === 1) {
                      setBathrooms(1);
                      return;
                    }
                    const v = Math.max(1, Number(e.target.value) || 1);
                    setBathrooms(Math.min(bedrooms + 1, v));
                  }}
                  className="w-full bg-[var(--paper)] border border-[var(--hairline)] rounded-lg px-3 py-2 text-sm font-mono font-semibold outline-none focus:border-[var(--pencil-red)]"
                />
                <span className="text-[10px] text-[var(--ink-soft)] mt-1">
                  {bedrooms === 1
                    ? "1BHK → 1 common bathroom only"
                    : masterBedrooms < bedrooms
                      ? `${masterBedrooms} attached + 1 common = ${masterBedrooms + 1} (or set total above)`
                      : `${masterBedrooms} attached (one per master suite)`}
                </span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-mono font-semibold text-[var(--ink-soft)] uppercase tracking-wider">Kitchens</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, suggested.kitchens)}
                  value={kitchens}
                  onChange={(e) =>
                    setKitchens(
                      Math.min(suggested.kitchens, Math.max(1, Number(e.target.value) || 1))
                    )
                  }
                  className="w-full bg-[var(--paper)] border border-[var(--hairline)] rounded-lg px-3 py-2 text-sm font-mono font-semibold outline-none focus:border-[var(--pencil-red)]"
                />
              </label>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-3 border-t border-[var(--hairline)] pt-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={vastu}
                  onChange={(e) => setVastu(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--pencil-red)] cursor-pointer"
                />
                <span className="text-xs font-medium">Apply Vastu</span>
              </label>

              {/* Car parking disabled — removed so layout uses full build-up */}
              {/* <label className="flex items-center gap-2 select-none opacity-50 cursor-not-allowed">
                <input
                  type="checkbox"
                  checked={false}
                  disabled
                  className="w-4 h-4 rounded accent-[var(--accent-blue)] cursor-not-allowed"
                />
                <span className="text-xs font-medium">Car Parking (off)</span>
              </label> */}

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={garden}
                  onChange={(e) => setGarden(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--accent-green)] cursor-pointer"
                />
                <span className="text-xs font-medium">Garden</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={poojaRoom}
                  onChange={(e) => setPoojaRoom(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--accent-amber)] cursor-pointer"
                />
                <span className="text-xs font-medium">Pooja Room</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none col-span-2">
                <input
                  type="checkbox"
                  checked={servantQuarters}
                  onChange={(e) => setServantQuarters(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--pencil-red)] cursor-pointer"
                />
                <span className="text-xs font-medium">Servant Quarters</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Submit and Save buttons */}
      <div className="flex flex-col gap-2 mt-auto">
        <button
          type="submit"
          disabled={isLoading || !canGenerate}
          className="w-full py-3.5 rounded-xl bg-[var(--pencil-red)] hover:bg-[var(--pencil-red-deep)] text-white font-display font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.99] disabled:opacity-50 shadow-sm"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Designing layout...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Design Plan
            </>
          )}
        </button>

        {projectId && onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] font-display font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "💾 Save Project"}
          </button>
        )}
      </div>

      <div className="flex justify-center gap-4 mt-1 font-mono text-[9px] uppercase tracking-wider text-[var(--ink-soft)]">
        <span>Instant</span>
        <span>·</span>
        <span>Vastu-ready</span>
      </div>
    </form>
  );
}