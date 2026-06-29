// vite build 산출물(dist/)을 단일 HTML 한 파일로 인라인한다 → dist/api-impact-map.html
// 사내 "HTML 파일 공유"처럼 단일 .html 만 올리는 곳에 그대로 업로드 가능(서버·DB 불필요).
// 의존성 없음. `yarn build:single` 로 실행(= yarn build 후 이 스크립트).
//
// 동작: dist/index.html 의 <script src="./assets/*.js"> 와 <link href="./assets/*.css"> 를
//       실제 파일 내용으로 치환해 외부 자산 참조를 0으로 만든다(우리 앱은 청크가 각 1개).
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");
const ASSETS = join(DIST, "assets");
const OUT = join(DIST, "api-impact-map.html");

if (!existsSync(join(DIST, "index.html")) || !existsSync(ASSETS)) {
  console.error("[singlefile] dist/ 빌드 산출물이 없습니다. 먼저 `yarn build` 하세요.");
  process.exit(1);
}

let html = readFileSync(join(DIST, "index.html"), "utf8");
const files = readdirSync(ASSETS);
const jsFiles = files.filter((f) => f.endsWith(".js"));
const cssFiles = files.filter((f) => f.endsWith(".css"));

// 인라인 <script>/<style> 안에서 종료 토큰이 나오면 파싱이 깨지므로 escape.
const safeJs = (s) => s.replace(/<\/(script)>/gi, "<\\/$1>");
const safeCss = (s) => s.replace(/<\/(style)>/gi, "<\\/$1>");

// 각 js 자산 → 인라인 module script. (해시 파일명이라 정규식으로 매칭)
for (const f of jsFiles) {
  const code = safeJs(readFileSync(join(ASSETS, f), "utf8"));
  const re = new RegExp(`<script[^>]*src="\\.?/?assets/${f}"[^>]*></script>`);
  if (re.test(html)) html = html.replace(re, () => `<script type="module">\n${code}\n</script>`);
}
// 각 css 자산 → 인라인 <style>.
for (const f of cssFiles) {
  const code = safeCss(readFileSync(join(ASSETS, f), "utf8"));
  const re = new RegExp(`<link[^>]*href="\\.?/?assets/${f}"[^>]*>`);
  if (re.test(html)) html = html.replace(re, () => `<style>\n${code}\n</style>`);
}

// 외부 자산 참조가 남아있으면 단일 파일이 아니므로 경고.
const leftover = html.match(/(src|href)="\.?\/?assets\/[^"]+"/g);
if (leftover) {
  console.warn("[singlefile] ⚠ 인라인되지 않은 자산 참조가 남았습니다:", leftover);
}

writeFileSync(OUT, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
const limitMB = 2;
const ok = Buffer.byteLength(html) <= limitMB * 1024 * 1024;
console.log(
  `[singlefile] → dist/api-impact-map.html (${kb}KB)  ${ok ? "✅ 2MB 한도 이내" : "⚠️ 2MB 초과 — 다이어트 필요"}`,
);
