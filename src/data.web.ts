import type { AppData } from "./types";
import { isValidData } from "./data";
// routing-docs_<날짜> 폴더에서 빌드된 web 전용 데이터(scripts/build-web-data.mjs).
// 실데이터처럼 gitignore되며 predev/prebuild에서 생성된다. 소스 폴더가 없으면
// 빈 시드(generatedAt:"")가 깔리고, 그 경우 isValidData가 false → D_WEB은 null.
import webRaw from "./data.web.json";

// 신규(web 전용) 번들. 유효하지 않으면(미생성) null → 새 라우트에서 안내 화면 표시.
export const D_WEB: AppData | null = isValidData(webRaw)
  ? (webRaw as unknown as AppData)
  : null;
