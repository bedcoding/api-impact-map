import type { AppData, Endpoint, Screen } from "./types";
// 데이터 우선순위: 실데이터(data.json)를 먼저 쓰되, 내용이 깨졌으면(빈 객체·배열 누락 등) 가짜 샘플(data.sample.json)로 폴백한다.
//  · 파일이 아예 없는 경우 → predev/prebuild의 ensure-data.mjs가 빌드 전에 샘플을 복사하므로 import 자체는 항상 성공한다.
//  · 파일은 있는데 형식이 잘못된 경우 → 아래 isValidData()가 런타임에 샘플로 폴백.
// (data.json은 gitignore되는 내부 API 맵. 실데이터로 보려면 app/src/data.json에 내보낸 data.json을 덮어쓰면 된다. app/README.md 참고)
import realData from "./data.json";
import sampleData from "./data.sample.json";

// 업로드된 JSON도 같은 검사로 거른다(파일 선택 시 재사용). generatedAt은 스냅샷
// 구분 키로 쓰이므로 비어 있지 않은 문자열이어야 한다.
export function isValidData(d: unknown): d is AppData {
  const x = d as Partial<AppData> | null;
  return (
    !!x &&
    typeof x.generatedAt === "string" &&
    x.generatedAt !== "" &&
    // 렌더 코드가 가드 없이 역참조하는 필드(platforms·aliases 등)까지 원소 단위로 확인해,
    // 깨진 업로드/localStorage 데이터가 통과한 뒤 화면에서 크래시하는 걸 막는다.
    Array.isArray(x.endpoints) &&
    x.endpoints.every((e) => !!e && typeof e.id === "string" && Array.isArray(e.platforms)) &&
    Array.isArray(x.screens) &&
    x.screens.every(
      (s) =>
        !!s &&
        typeof s.id === "string" &&
        Array.isArray(s.platforms) &&
        typeof s.aliases === "object" &&
        s.aliases !== null,
    ) &&
    Array.isArray(x.edges) &&
    x.edges.every(
      (e) =>
        !!e &&
        typeof e.platform === "string" &&
        typeof e.screen === "string" &&
        typeof e.endpoint === "string",
    ) &&
    typeof x.stats === "object" &&
    x.stats !== null
  );
}

// 번들 기본 데이터셋. 실데이터가 유효하면 그걸, 아니면 샘플을 사용.
export const D: AppData = isValidData(realData)
  ? (realData as unknown as AppData)
  : (sampleData as unknown as AppData);

if (import.meta.env.DEV && !isValidData(realData)) {
  console.warn("[data] data.json 형식이 올바르지 않아 data.sample.json 으로 폴백했습니다.");
}

// 데이터셋은 런타임에 교체될 수 있으므로 id→객체 조회 맵을 그때그때 만든다.
export function indexData(data: AppData): {
  epById: Map<string, Endpoint>;
  screenById: Map<string, Screen>;
} {
  return {
    epById: new Map(data.endpoints.map((a) => [a.id, a])),
    screenById: new Map(data.screens.map((s) => [s.id, s])),
  };
}
