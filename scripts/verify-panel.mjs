// 검증: 노드 클릭이 레이아웃을 안 밀고(패널 고정 높이), 펼치기/접기 토글이 좌우 두 컬럼을 같은 높이로 리사이즈하는지.
// dev 서버가 떠 있는 상태에서 app/ 에서 실행:  node scripts/verify-panel.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.URL || "http://localhost:5173/";
const OUT = "scripts/shots";
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
page.on("console", (m) => {
  if (m.type() === "error") errors.push("[console.error] " + m.text());
});
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));

await page.goto(URL, { waitUntil: "load" });
await page.waitForSelector("svg g.node");
await page.waitForTimeout(300);

const snap = () =>
  page.evaluate(() => ({
    graph: document.querySelector(".graph-card").offsetHeight,
    panel: document.querySelector(".panel").offsetHeight,
    tableTop: Math.round(document.querySelector(".tables").getBoundingClientRect().top),
  }));

const beforeClick = await snap();
// 화면 노드 클릭(화면은 엔드포인트 뒤에 렌더됨) → 패널 채움
await page.locator("svg g.node").last().click();
await page.waitForTimeout(250);
const afterClick = await snap();
await page.screenshot({ path: `${OUT}/13-panel-compact.png`, fullPage: true });

// 펼치기 → 두 컬럼이 같이 커짐
await page.locator(".resize-toggle-bar").click();
await page.waitForTimeout(300);
const afterExpand = await snap();
await page.screenshot({ path: `${OUT}/14-panel-expanded.png`, fullPage: true });

const result = {
  beforeClick,
  afterClick,
  afterExpand,
  noJumpOnClick: beforeClick.tableTop === afterClick.tableTop,
  heightsMatchCompact: Math.abs(afterClick.graph - afterClick.panel) <= 1,
  heightsMatchExpanded: Math.abs(afterExpand.graph - afterExpand.panel) <= 1,
  errors,
};
console.log("RESULT " + JSON.stringify(result, null, 2));
await browser.close();
