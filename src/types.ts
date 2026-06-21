export type Platform = "ios" | "android" | "web";

export interface Endpoint {
  id: string;
  method: string;
  path: string;
  version: string; // "v1" | "v2" | "v3" | "other"
  platforms: Platform[];
  screens: string[];
  displayPaths: string[];
}

export interface Screen {
  id: string;
  code: string;
  name: string;
  aliases: Partial<Record<Platform, string>>;
  platforms: Platform[];
  endpoints: string[];
}

export interface Edge {
  screen: string;
  endpoint: string;
  platform: Platform;
}

export interface Stats {
  screens: number;
  endpoints: number;
  edges: number;
  iosScreens: number;
  androidScreens: number;
  webScreens: number;
}

export interface AppData {
  generatedAt: string;
  platforms: Platform[];
  stats: Stats;
  endpoints: Endpoint[];
  screens: Screen[];
  edges: Edge[];
}

/** Current selection in the graph / tables. */
export type Selection =
  | { type: "ep"; id: string }
  | { type: "screen"; id: string }
  | null;

export type TableTab = "screen" | "api" | "matrix";
