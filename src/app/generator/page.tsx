"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Header from "@/app/Header";
import InputForm from "@/components/InputForm";
import FloorPlanCanvas from "@/components/FloorPlanCanvas";
import VastuReport from "@/components/VastuReport";
import { PlotInputs, FloorPlan } from "@/lib/types";
import {
  getCredits,
  hasEnoughCredits,
  deductCredits,
  INITIAL_CREDITS,
  CREDITS_PER_GENERATION,
} from "@/lib/credits";

const DEFAULT_INPUTS: PlotInputs = {
  lengthFt: 30,
  breadthFt: 40,
  heightFt: 10,
  orientation: "North",
  roadFacing: "North",
  bedrooms: 2,
  masterBedrooms: 1,
  bathrooms: 2,
  parking: false,
  garden: false,
  poojaRoom: true,
  vastu: true,
  floors: 1,
  kitchens: 1,
  servantQuarters: false,
};

/** Map bedrooms count → BHK for the template system (1–6, authoritative). */
function toBhk(bedrooms: number): 1 | 2 | 3 | 4 | 5 | 6 {
  const n = Math.round(Number(bedrooms) || 2);
  if (n <= 1) return 1;
  if (n >= 6) return 6;
  return n as 1 | 2 | 3 | 4 | 5 | 6;
}

// ============================================================
// Child component that uses useSearchParams (must be wrapped in Suspense)
// ============================================================
function GeneratorContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const { data: session } = useSession();
  const isSignedIn = !!session;

  // Start empty — generation only via /api/generate (template system)
  const [floors, setFloors] = useState<(FloorPlan | null)[]>([
    null,
    null,
    null,
  ]);
  const [activeFloor, setActiveFloor] = useState<number>(0);
  const [inputs, setInputs] = useState<PlotInputs>(DEFAULT_INPUTS);
  const [isLoading, setIsLoading] = useState(false);

  // Project save state
  const [project, setProject] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Guest credits
  const [credits, setCredits] = useState<number | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  // Load guest credit balance (client-only)
  useEffect(() => {
    if (!isSignedIn) {
      setCredits(getCredits());
    }
  }, [isSignedIn]);

  // Load project if projectId is present
  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    }
  }, [projectId]);

  const fetchProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        const projectInputs = data.inputs || {
          lengthFt: data.siteLength,
          breadthFt: data.siteBreadth,
          roadFacing: data.siteFacing,
          orientation: "North",
          bedrooms: 2,
          bathrooms: 2,
          parking: false,
          garden: false,
          poojaRoom: true,
          vastu: true,
          floors: 1,
          kitchens: 1,
          servantQuarters: false,
        };
        setInputs(projectInputs);
        handleGenerate(projectInputs);
      }
    } catch (error) {
      console.error("Failed to load project:", error);
    }
  };

  const handleGenerate = async (newInputs: PlotInputs) => {
    setIsLoading(true);
    setInputs(newInputs);
    setActiveFloor(0);
    setFloors([null, null, null]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lengthFt: newInputs.lengthFt,
          breadthFt: newInputs.breadthFt,
          roadFacing: newInputs.roadFacing || "North",
          bhk: toBhk(newInputs.bedrooms ?? 2),
          setbackFront: (newInputs as any).setbackFront ?? 3,
          setbackBack: (newInputs as any).setbackBack ?? 1,
          setbackLeft: (newInputs as any).setbackLeft ?? 1,
          setbackRight: (newInputs as any).setbackRight ?? 1,
          wantParking: !!newInputs.parking,
          wantPooja: newInputs.poojaRoom !== false,
          wantGarden: !!newInputs.garden,
          masterBedrooms: newInputs.masterBedrooms,
          bathrooms: newInputs.bathrooms,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to generate layout");
      }

      const data = await response.json();
      if (data.success && data.layout) {
        setFloors([data.layout, null, null]);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error: any) {
      console.error("Error generating design plan:", error);
      alert(error?.message || "Failed to generate plan. Check console.");
    } finally {
      setIsLoading(false);
    }
  };

  // Entry point used by the input form's "Generate" submit.
  const handleGenerateClick = (newInputs: PlotInputs) => {
    if (!isSignedIn && !hasEnoughCredits()) {
      setShowCreditsModal(true);
      return;
    }
    if (!isSignedIn) {
      setCredits(deductCredits());
    }
    handleGenerate(newInputs);
  };

  // const handleGenerateClick = (newInputs: PlotInputs) => {
  //   // TEMPORARY: unlimited generation for testing
  //   handleGenerate(newInputs);
  // };

  const handleFloorTabChange = async (floorNum: number) => {
    if (floors[floorNum] !== null) {
      setActiveFloor(floorNum);
      return;
    }

    // Upper floors not yet supported by template system
    alert("Upper floors coming soon with the new template system.");
    setActiveFloor(0);
  };

  const handleSaveProject = async () => {
    if (!projectId) {
      alert("No project loaded to save.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          clientName: project.clientName,
          siteLength: inputs.lengthFt,
          siteBreadth: inputs.breadthFt,
          siteFacing: inputs.roadFacing || "North",
          inputs: inputs,
        }),
      });

      if (res.ok) {
        alert("Project saved successfully!");
      } else {
        throw new Error("Failed to save project");
      }
    } catch (error) {
      console.error("Save project error:", error);
      alert("Failed to save project. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const layout = floors[activeFloor];

  return (
    <div className="flex-1 lg:h-screen w-full text-[var(--ink)] flex flex-col font-sans lg:overflow-hidden bg-[var(--background)]">
      <div className="w-full">
        <Header />
      </div>

      <div className="flex-1 relative lg:min-h-0 lg:overflow-hidden flex justify-center w-full">
        <main className="lg:absolute lg:inset-0 flex flex-col lg:flex-row gap-5 p-4 md:p-6 lg:p-6 max-w-[1440px] mx-auto w-full">
          {/* Left: Input Form */}
          <section className="w-full lg:w-[380px] xl:w-[420px] shrink-0 lg:overflow-y-auto lg:pr-2 pb-4 lg:pb-0 custom-scrollbar lg:min-h-0 flex flex-col">
            <InputForm
              onSubmit={handleGenerateClick}
              isLoading={isLoading}
              initialValues={inputs}
              projectId={projectId}
              onSave={handleSaveProject}
              saving={saving}
            />
          </section>

          {/* Right: Canvas */}
          <section className="flex-1 flex flex-col gap-3 lg:min-h-0 lg:overflow-hidden">
            {layout ? (
              <>
                <div className="flex justify-between items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bp-navy-panel)] border border-[var(--bp-line)] text-[11px] font-mono">
                  <span className="text-[var(--bp-cyan)]/70">
                    PLOT&nbsp;{layout.plotLength}&apos;&nbsp;×&nbsp;
                    {layout.plotBreadth}&apos; &nbsp;(
                    {layout.plotLength * layout.plotBreadth} SQFT)
                    {project && (
                      <span className="ml-3 text-[var(--ink-soft)]">
                        · {project.name}
                      </span>
                    )}
                  </span>
                  {!isSignedIn && credits !== null && (
                    <span className="text-[var(--accent-cyan)] uppercase tracking-wide shrink-0">
                      {credits > 0
                        ? `${credits} free credits left`
                        : "No free credits left"}
                    </span>
                  )}
                </div>

                {inputs.floors && inputs.floors > 1 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-[var(--bp-navy-panel)] border border-[var(--bp-line)] rounded-xl overflow-hidden self-start">
                      {Array.from({ length: inputs.floors }).map((_, idx) => (
                        <button
                          key={idx}
                          disabled={isLoading}
                          onClick={() => handleFloorTabChange(idx)}
                          className={`px-3.5 py-2 text-[11px] font-mono font-semibold uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer border-r border-[var(--bp-line)] last:border-r-0 ${
                            activeFloor === idx
                              ? "bg-[var(--pencil-red)] text-white"
                              : "text-[var(--bp-cyan)]/80 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {idx === 0
                            ? "Ground Fl."
                            : idx === 1
                              ? "First Fl."
                              : "Second Fl."}
                          {floors[idx] === null && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"
                              title="Not generated yet"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <FloorPlanCanvas
                  layout={layout}
                  orientation={inputs.orientation}
                  roadFacing={inputs.roadFacing}
                  activeFloor={activeFloor}
                />
                <VastuReport layout={layout} roadFacing={inputs.roadFacing} />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bp-navy-panel)] border border-[var(--bp-line)] rounded-2xl p-12 text-center overflow-hidden relative blueprint-corners">
                <div className="flex flex-col items-center relative z-10">
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin h-7 w-7 text-[var(--pencil-red)] mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <h3 className="font-semibold text-[var(--ink)] font-display text-lg tracking-tight">
                        Generating plan…
                      </h3>
                      <p className="text-[11px] font-mono text-[var(--bp-cyan)]/70 mt-1 max-w-[220px] uppercase tracking-wide">
                        Applying template &amp; Vastu rules
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-[var(--ink)] font-display text-lg tracking-tight">
                        Ready to generate
                      </h3>
                      <p className="text-[11px] font-mono text-[var(--bp-cyan)]/70 mt-1 max-w-[240px] uppercase tracking-wide">
                        Set plot size &amp; options, then click Generate
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Guest credits exhausted — prompt sign up */}
      {showCreditsModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setShowCreditsModal(false)}
        >
          <div
            className="glass-panel max-w-sm w-full p-8 text-center relative"
            style={{ background: "var(--surface-solid)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowCreditsModal(false)}
              aria-label="Close"
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5 cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <div className="text-4xl mb-3">✨</div>
            <h3
              className="text-xl font-display font-bold mb-2"
              style={{ color: "var(--text)" }}
            >
              You&apos;re out of free credits
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Your {INITIAL_CREDITS} free credits covered{" "}
              {INITIAL_CREDITS / CREDITS_PER_GENERATION} generated designs.
              Create a free account to keep designing.
            </p>
            <Link
              href="/signup"
              className="btn-primary block w-full text-sm py-3"
            >
              Create free account →
            </Link>
            <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
              Already have an account?{" "}
              <Link
                href="/signin"
                className="font-semibold"
                style={{ color: "var(--accent)" }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main page component with Suspense boundary
// ============================================================
export default function GeneratorPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "var(--bg)" }}
        >
          <div className="spinner" />
          <p className="ml-4" style={{ color: "var(--text-muted)" }}>
            Loading generator...
          </p>
        </div>
      }
    >
      <GeneratorContent />
    </Suspense>
  );
}
