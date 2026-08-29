import { TemplateRoom } from "./types";
/** Deprecated compatibility shim. V5 never remaps room identities after placement. */
export function remapRoomsToVastu(rooms: TemplateRoom[]): TemplateRoom[] { return rooms.map((room) => ({ ...room })); }
