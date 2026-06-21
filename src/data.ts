import type { AppData, Endpoint, Screen } from "./types";
// Self-contained: the app reads its OWN copy of the data at app/src/data.json —
// it never reaches outside this folder. That file is gitignored (it holds the
// internal API map). On a fresh checkout it is absent, so `predev`/`prebuild`
// seeds it from the committed data.sample.json (safe placeholder). To use real
// data, drop your exported data.json in at app/src/data.json. See app/README.md.
import raw from "./data.json";

export const D = raw as unknown as AppData;

export const epById: Map<string, Endpoint> = new Map(
  D.endpoints.map((a) => [a.id, a]),
);
export const screenById: Map<string, Screen> = new Map(
  D.screens.map((s) => [s.id, s]),
);
