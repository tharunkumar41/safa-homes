"use client";

import React, { useMemo, useState } from "react";
import { FloorPlan } from "@/lib/types";
import { auditVastuChart, VastuAuditItem, Cardinal } from "@/lib/vastu";

const STATUS_STYLES: Record<
  VastuAuditItem["status"],
  { icon: string; text: string; chip: string }
> = {
  aligned: {
    icon: "\u2713",
    text: "text-[var(--accent-green)]",
    chip: "bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/25",
  },
  neutral: {
    icon: "\u2014",
    text: "text-[var(--ink-soft)]",
    chip: "bg-black/[0.04] text-[var(--ink-soft)] border-[var(--bp-line)]",
  },
  avoid: {
    icon: "\u2715",
    text: "text-[var(--pencil-red)]",
    chip: "bg-[var(--pencil-red)]/10 text-[var(--pencil-red)] border-[var(--pencil-red)]/25",
  },
};

interface VastuReportProps {
  layout: FloorPlan;
  roadFacing?: Cardinal;
}

export default function VastuReport({ layout, roadFacing = "North" }: VastuReportProps) {
  const [open, setOpen] = useState(false);

  const audit = useMemo(
    () => auditVastuChart(layout, roadFacing),
    [layout, roadFacing]
  );

  const rows = audit.entrance ? [audit.entrance, ...audit.items] : audit.items;
  if (rows.length === 0) return null;

  const scoreColor =
    audit.score >= 80
      ? "text-[var(--accent-green)]"
      : audit.score >= 50
      ? "text-[var(--accent-amber)]"
      : "text-[var(--pencil-red)]";

  return (
    <div className="rounded-xl border border-[var(--bp-line)] bg-[var(--bp-navy-panel)] overflow-hidden shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left cursor-pointer hover:bg-black/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wide text-[var(--ink)]">
            Vastu Alignment Check
          </span>
          <span className="text-[10px] font-mono text-[var(--ink-soft)]">
            {audit.alignedCount} aligned · {audit.neutralCount} neutral · {audit.avoidCount} to fix
          </span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className={`text-[13px] font-mono font-bold ${scoreColor}`}>
            {audit.score}%
          </span>
          <svg
            className={`w-3.5 h-3.5 text-[var(--ink-soft)] transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--bp-line)] max-h-[240px] overflow-y-auto custom-scrollbar">
          {rows.map((item, idx) => {
            const s = STATUS_STYLES[item.status];
            return (
              <div
                key={`${item.roomId}-${idx}`}
                className="flex items-start gap-3 px-4 py-2.5 border-b border-[var(--bp-line)] last:border-b-0"
              >
                <span
                  className={`shrink-0 mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${s.chip}`}
                >
                  {s.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[12px] font-semibold text-[var(--ink)]">
                      {item.label}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--bp-cyan)]/80">
                      {item.zone}
                    </span>
                  </div>
                  <p className={`text-[11px] leading-snug mt-0.5 ${s.text}`}>
                    {item.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
