export type Platform = "ios" | "android" | "web";

export interface Endpoint {
  id: string;
  method: string;
  path: string;
  version: string; // 버전 — "v1" | "v2" | "v3" | "other"
  platforms: Platform[];
  screens: string[];
  displayPaths: string[];
  homepage?: string[]; // 이 API가 실제 호출되는 레진 라이브 웹 URL(들). 없을 수 있음.
}

export interface Screen {
  id: string;
  code: string;
  name: string;
  aliases: Partial<Record<Platform, string>>;
  platforms: Platform[];
  endpoints: string[];
  url?: string; // 라이브 페이지 URL(routing-docs 신규 데이터). 전역/legacy 화면엔 없을 수 있음.
  section?: { order: number; title: string }; // routing-docs 섹션(화면 카드 정렬·그룹핑용). legacy엔 없음.
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
  source?: string; // 출처 표식("routing-docs" = web 전용 신규 데이터)
  mobilePending?: boolean; // iOS/Android 미수집 — UI에서 "추후 추가 예정" 표시
}

/** 그래프/표에서의 현재 선택. */
export type Selection =
  | { type: "ep"; id: string }
  | { type: "screen"; id: string }
  | null;

export type TableTab = "screen" | "api" | "matrix";
