// dev/build 전에 app/src/data.json이 있는지 보장한다.
// 실제 data.json은 gitignore됨(내부 API 맵)이라 막 클론하면 없음 — 그 경우 커밋된 data.sample.json을 복사해 채워서 가짜 데이터로라도 빌드·실행되게 한다.
// predev/prebuild로 자동 실행.
import { existsSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const real = fileURLToPath(new URL("../src/data.json", import.meta.url));
const sample = fileURLToPath(new URL("../src/data.sample.json", import.meta.url));

if (existsSync(real)) {
  process.exit(0);
}
copyFileSync(sample, real);
console.log("[ensure-data] src/data.json was missing → seeded from data.sample.json");
