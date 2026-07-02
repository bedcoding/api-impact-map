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

// 배지 표시용 축약: 긴 메소드는 3글자 약어로(폭 통일). 색 클래스는 원본 method(methodCls)로 유지.
const METHOD_ABBR: Record<string, string> = { DELETE: "DEL", PATCH: "PAT", OPTIONS: "OPT" };
export const methodLabel = (m: string): string => METHOD_ABBR[(m || "").toUpperCase()] ?? m;

export const trunc = (str: string, n: number): string =>
  str.length > n ? str.slice(0, n - 1) + "…" : str;
