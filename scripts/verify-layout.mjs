// 검증: (1) 그래프 SVG가 컨테이너 폭에 맞음(가로 스크롤 없음)
//       (2) 하단 토글: 기본 컴팩트(~절반), 펼치기로 커지고 접기로 줄어듦.
// dev 서버가 떠 있는 상태에서 app/ 에서 실행:  node scripts/verify-layout.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.URL || "http://localhost:5173/";
const OUT = "scripts/shots";
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 900 } });
page.on("console", (m) => {
  if (m.type() === "error") errors.push("[console.error] " + m.text());
});
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));

await page.goto(URL, { waitUntil: "load" });
await page.waitForSelector("svg g.node");
await page.waitForTimeout(300);

const read = () =>
  page.evaluate(() => {
    const sc = document.querySelector(".graph-scroll");
    const svg = sc.querySelector("svg");
    const btn = document.querySelector(".resize-toggle-bar");
    return {
      scrollH: sc.clientHeight,
      hasHScroll: sc.scrollWidth > sc.clientWidth + 1,
      svgW: Number(svg.getAttribute("width")),
      clientW: sc.clientWidth,
      btnText: btn ? btn.textContent.trim() : null,
      btnExists: !!btn,
    };
  });

const compact = await read();
await page.screenshot({ path: `${OUT}/10-compact-default.png`, fullPage: true });

await page.locator(".resize-toggle-bar").click();
await page.waitForTimeout(350);
const expanded = await read();
await page.screenshot({ path: `${OUT}/11-expanded.png`, fullPage: true });

await page.locator(".resize-toggle-bar").click();
await page.waitForTimeout(350);
const collapsedAgain = await read();

console.log("RESULT " + JSON.stringify({ compact, expanded, collapsedAgain, errors }, null, 2));
await browser.close();
