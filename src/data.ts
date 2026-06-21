import type { AppData, Endpoint, Screen } from "./types";
// 데이터 우선순위: 실데이터(data.json)를 먼저 쓰되, 내용이 깨졌으면(빈 객체·배열 누락 등) 가짜 샘플(data.sample.json)로 폴백한다.
//  · 파일이 아예 없는 경우 → predev/prebuild의 ensure-data.mjs가 빌드 전에 샘플을 복사하므로 import 자체는 항상 성공한다.
//  · 파일은 있는데 형식이 잘못된 경우 → 아래 isValidData()가 런타임에 샘플로 폴백.
// (data.json은 gitignore되는 내부 API 맵. 실데이터로 보려면 app/src/data.json에 내보낸 data.json을 덮어쓰면 된다. app/README.md 참고)
import realData from "./data.json";
import sampleData from "./data.sample.json";

function isValidData(d: unknown): d is AppData {
  const x = d as Partial<AppData> | null;
  return (
    !!x &&
    Array.isArray(x.endpoints) &&
    Array.isArray(x.screens) &&
    Array.isArray(x.edges) &&
    typeof x.stats === "object" &&
    x.stats !== null
  );
}

// 실데이터가 유효하면 그걸, 아니면 샘플을 사용.
export const D: AppData = isValidData(realData)
  ? (realData as unknown as AppData)
  : (sampleData as unknown as AppData);

if (import.meta.env.DEV && !isValidData(realData)) {
  console.warn("[data] data.json 형식이 올바르지 않아 data.sample.json 으로 폴백했습니다.");
}

export const epById: Map<string, Endpoint> = new Map(
  D.endpoints.map((a) => [a.id, a]),
);
export const screenById: Map<string, Screen> = new Map(
  D.screens.map((s) => [s.id, s]),
);
