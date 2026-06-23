import type { Endpoint, Screen } from "../../types";

// 리소스맵 뷰의 "도메인 카드"를 만들기 위한 그룹핑 유틸.
// 데이터에 명시적 카테고리 필드가 없어서, API는 path에서 도메인을 추출하고
// 화면은 이름 prefix로 느슨하게 묶는다(묶이는 건 묶고 나머지는 단독 카드).

export interface Group<T> {
  key: string;
  label: string;
  items: T[];
}

// path 세그먼트 중 버전(v1·v2·api·숫자)·동적({}·:id·@Url)은 도메인이 아니므로 건너뛴다.
const isVersionSeg = (s: string): boolean => /^v\d+$/i.test(s) || s === "api" || /^\d+$/.test(s);
const isDynamicSeg = (s: string): boolean => s.includes("{") || s.startsWith(":") || s.includes("@");

// API 도메인 = 버전·동적 세그먼트를 벗긴 첫 의미 세그먼트. 예: /v2/contents/{}/episodes → "contents"
export function apiDomain(path: string): string {
  const segs = (path || "").split("/").filter(Boolean);
  for (const s of segs) {
    if (!isVersionSeg(s) && !isDynamicSeg(s)) return s;
  }
  return segs[0] || "기타";
}

// 화면 그룹 = 이름의 첫 토큰(·, -, :, (, / 구분자 앞). 예: "내 서재 - 노벨" → "내 서재"
export function screenGroup(name: string): string {
  const head = (name || "").split(/[·:(/]|\s-\s/)[0].trim();
  return head || "기타";
}

// 공통 그룹핑: 크기 내림차순 → 같으면 라벨 오름차순으로 카드 순서를 안정화.
export function groupBy<T>(items: T[], keyOf: (t: T) => string): Group<T>[] {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = keyOf(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return [...m.entries()]
    .map(([key, arr]) => ({ key, label: key, items: arr }))
    .sort((a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label));
}

export const groupEndpoints = (eps: Endpoint[]): Group<Endpoint>[] =>
  groupBy(eps, (e) => apiDomain(e.path));

export const groupScreens = (screens: Screen[]): Group<Screen>[] =>
  groupBy(screens, (s) => screenGroup(s.name));
