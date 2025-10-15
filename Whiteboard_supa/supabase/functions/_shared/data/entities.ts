import { Database } from "./types.ts";

// Typed entities from the database
export type BoardHistory =
    Database["public"]["Tables"]["boardhistory"]["Row"];
