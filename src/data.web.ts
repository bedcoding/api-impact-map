import type { AppData } from "./types";
import { isValidData } from "./data";
import sampleData from "./data.sample.json";
// routing-docs_<날짜> 폴더에서 빌드된 web 전용 데이터(scripts/build-web-data.mjs).
// gitignore되며 predev/prebuild에서 생성된다. 소스 폴더가 없으면 빈 시드(generatedAt:"")가
// 깔려 isValidData=false → 폴백 샘플을 쓴다.
import webRaw from "./data.web.json";

// 메인(web 전용) 번들. 미생성이면 폴백 샘플.
export const D_WEB: AppData = isValidData(webRaw)
  ? (webRaw as unknown as AppData)
  : (sampleData as unknown as AppData);
