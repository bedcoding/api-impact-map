import { createContext, useContext } from "react";
import type { AppData, Endpoint, Screen } from "./types";

// 현재 활성 데이터셋과 그 id→객체 조회 맵을 하위 컴포넌트에 공급한다.
// (데이터셋을 런타임에 교체하므로 정적 import 대신 컨텍스트를 쓴다.)
export interface DataCtx {
  data: AppData;
  epById: Map<string, Endpoint>;
  screenById: Map<string, Screen>;
}

export const DataContext = createContext<DataCtx | null>(null);

export function useData(): DataCtx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData 는 DataContext.Provider 안에서만 쓸 수 있습니다.");
  return ctx;
}
