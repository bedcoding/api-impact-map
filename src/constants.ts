import type { Platform } from "./types";

export const PLATFORMS: Platform[] = ["ios", "android", "web"];

export const PLABEL: Record<Platform, string> = {
  ios: "iOS",
  android: "Android",
  web: "Web",
};

export const PCOLOR: Record<Platform, string> = {
  ios: "#0a84ff",
  android: "#21b573",
  web: "#f59e0b",
};

export const methodCls = (m: string): string => "m-" + (m || "").toLowerCase();

export const trunc = (str: string, n: number): string =>
  str.length > n ? str.slice(0, n - 1) + "…" : str;
