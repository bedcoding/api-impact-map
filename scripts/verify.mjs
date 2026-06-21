// React 뷰어 헤드리스 검증: Playwright로 dev 서버를 구동하며 주요 상호작용을 스크린샷 찍고 콘솔/페이지 에러를 보고한다.
// dev 서버(:5173)가 떠 있는 상태에서 app/ 에서 실행:
//   node scripts/verify.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.URL || "http://localhost:5173/";
const OUT = "scripts/shots";
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on("console", (m) => {
  if (m.type() === "error") errors.push("[console.error] " + m.text());
});
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));

await page.goto(URL, { waitUntil: "load" });
await page.waitForSelector("svg g.node", { timeout: 15000 });

// 1. 초기 렌더
await page.screenshot({ path: `${OUT}/01-initial.png`, fullPage: true });
const statCount = await page.locator("header .stat").count();
const nodeCount0 = await page.locator("svg g.node").count();
const linkCount0 = await page.locator("svg path.link").count();

// 2. 첫 엔드포인트 노드 클릭 (DOM 순서상 엔드포인트가 화면보다 먼저 렌더됨)
const epNode = page.locator("svg g.node").first();
const epLabel = ((await epNode.locator("text").textContent()) || "").trim();
await epNode.click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/02-endpoint-selected.png`, fullPage: true });
const selCount = await page.locator("svg g.node.sel").count();
const dimCount = await page.locator("svg g.node.dim").count();
const activeLinks = await page.locator("svg path.link.active").count();
const panelTitle = (
  (await page.locator(".panel .ptitle").first().textContent().catch(() => "")) || ""
).trim();

// 3. 선택 해제(빈 svg 영역 클릭) 후 iOS 플랫폼 필터 off
await page.locator("svg").click({ position: { x: 520, y: 6 } });
await page.locator(".pfilter label", { hasText: "iOS" }).click();
await page.waitForTimeout(300);
const iosOff = await page.locator(".pfilter label.off", { hasText: "iOS" }).count();
const nodeCountIosOff = await page.locator("svg g.node").count();
await page.screenshot({ path: `${OUT}/03-ios-filtered-off.png`, fullPage: true });
await page.locator(".pfilter label", { hasText: "iOS" }).click(); // 복원

// 4. 테이블 탭
await page.locator(".tabs button", { hasText: "API → 화면" }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/04-table-api.png`, fullPage: true });
const apiRows = await page.locator("table tbody tr").count();

await page.locator(".tabs button", { hasText: "플랫폼 커버리지" }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/05-table-matrix.png`, fullPage: true });
const matrixRows = await page.locator("table tbody tr").count();

// 5. 테이블 검색 필터
await page.locator(".table-tools input").fill("billing");
await page.waitForTimeout(200);
const matrixRowsFiltered = await page.locator("table tbody tr").count();

const summary = {
  statCount,
  nodeCount0,
  linkCount0,
  clickedEndpoint: epLabel,
  selCount,
  dimCount,
  activeLinks,
  panelTitle: panelTitle.slice(0, 90),
  iosOff,
  nodeCountIosOff,
  apiRows,
  matrixRows,
  matrixRowsFiltered,
  errors,
};
console.log("RESULT " + JSON.stringify(summary, null, 2));
await browser.close();
