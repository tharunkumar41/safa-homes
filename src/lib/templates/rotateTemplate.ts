import { FloorTemplate } from "./types";
/** Deprecated compatibility shim. V5 never rotates templates. */
export function rotateTemplateToFacing(template: FloorTemplate): FloorTemplate { return { ...template, rooms: template.rooms.map((r) => ({ ...r })) }; }
