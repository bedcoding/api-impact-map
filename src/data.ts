import type { AppData, Endpoint, Screen } from "./types";
// 메인 데이터는 routing-docs(web 전용)에서 빌드된 data.web.json — data.web.ts(D_WEB)가 공급한다.
// 여기 D는 그게 없을 때를 위한 폴백 샘플(data.sample.json)이다.
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

// 폴백 기본 데이터셋(샘플). 실제 메인 데이터는 data.web.ts(D_WEB)가 공급한다.
export const D: AppData = sampleData as unknown as AppData;

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
