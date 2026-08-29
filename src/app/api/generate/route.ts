import { NextRequest, NextResponse } from "next/server";
import { generateFromTemplate } from "@/lib/templates/generateFromTemplate";
import { Cardinal, BhkLevel } from "@/lib/templates/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      lengthFt,
      breadthFt,
      roadFacing = "North",
      bhk = 2,
      setbackFront,
      setbackBack,
      setbackLeft,
      setbackRight,
      wantParking, // default: false (parking removed from layout)
      wantPooja,
      wantGarden = false,
      masterBedrooms,
      bathrooms,
    } = body;

    const L = Number(lengthFt);
    const B = Number(breadthFt);
    const area = L * B;

    if (!Number.isFinite(L) || !Number.isFinite(B) || area < 600 || area > 4900) {
      return NextResponse.json(
        { error: "Plot area must be between 600 and 4900 sq ft" },
        { status: 400 }
      );
    }

    const bhkNum = Math.round(Number(bhk));
    if (![1, 2, 3, 4, 5, 6].includes(bhkNum)) {
      return NextResponse.json(
        { error: "BHK must be between 1 and 6" },
        { status: 400 }
      );
    }

    const facing = (
      ["North", "South", "East", "West"].includes(roadFacing) ? roadFacing : "North"
    ) as Cardinal;

    const result = generateFromTemplate({
      lengthFt: L,
      breadthFt: B,
      roadFacing: facing,
      bhk: bhkNum as BhkLevel,
      setbackFront: setbackFront != null ? Number(setbackFront) : undefined,
      setbackBack: setbackBack != null ? Number(setbackBack) : undefined,
      setbackLeft: setbackLeft != null ? Number(setbackLeft) : undefined,
      setbackRight: setbackRight != null ? Number(setbackRight) : undefined,
      wantParking: wantParking != null ? !!wantParking : false, // parking off by default
      wantPooja: wantPooja ?? bhkNum > 1,
      wantGarden: !!wantGarden,
      masterBedrooms: masterBedrooms != null ? Number(masterBedrooms) : undefined,
      bathrooms: bathrooms != null ? Number(bathrooms) : undefined,
    });

    const layout = {
      plotLength: result.plotLength,
      plotBreadth: result.plotBreadth,
      roadFacing: result.roadFacing,
      buildUp: result.buildUp,
      bhk: result.bhk,
      rooms: result.rooms.map((r) => ({
        id: r.id,
        label: r.label,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      })),
      doors: result.doors,
      windows: result.windows,
      explanation: `Template: ${result.templateName} | Vastu: ${
        result.isVastuCompliant ? "Compliant" : "Issues found"
      }`,
      vastuIssues: result.vastuIssues,
      warnings: result.warnings ?? [],
    };

    return NextResponse.json({ success: true, layout });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate plan";
    console.error("Generate error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}