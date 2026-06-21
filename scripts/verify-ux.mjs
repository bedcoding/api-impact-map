// Verifies the two UX changes:
//   (1) selecting a node must NOT move the graph scroll
//   (2) the toolbar search must FILTER the graph
// Run from app/ with the dev server listening:  node scripts/verify-ux.mjs
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
await page.waitForSelector("svg g.node");

const nodeFull = await page.locator("svg g.node").count();

// ---- REQUEST 2: toolbar search filters the graph ----
const search = page.locator(".toolbar input[type=search]");
await search.fill("billing");
await page.waitForTimeout(300);
const nodeFiltered = await page.locator("svg g.node").count();
const matchCount = await page.locator("svg g.node.match").count();
const linkFiltered = await page.locator("svg path.link").count();
await page.screenshot({ path: `${OUT}/06-search-billing.png`, fullPage: true });

// zero-result case → empty graph + message
await search.fill("zzzznotfound");
await page.waitForTimeout(200);
const nodeZero = await page.locator("svg g.node").count();
const emptyMsg = await page
  .locator("svg text", { hasText: "검색 결과가 없습니다" })
  .count();
await page.screenshot({ path: `${OUT}/07-search-empty.png`, fullPage: true });

await search.fill(""); // clear → full graph restored
await page.waitForTimeout(200);
const nodeRestored = await page.locator("svg g.node").count();

// ---- REQUEST 1: selection does not move the graph scroll ----
const scroll = page.locator(".graph-scroll");

// (a) selecting via a TABLE ROW used to force graph scrollTop=0
await scroll.evaluate((el) => (el.scrollTop = 1200));
await page.waitForTimeout(100);
const beforeScrollTable = await scroll.evaluate((el) => el.scrollTop);
await page.locator("table tbody tr").first().click();
await page.waitForTimeout(300);
const afterScrollTable = await scroll.evaluate((el) => el.scrollTop);
const selAfterTable = await page.locator("svg g.node.sel").count();
await page.screenshot({ path: `${OUT}/08-select-keeps-scroll.png`, fullPage: true });

// (b) clicking a graph node in view keeps scroll + still highlights
await scroll.evaluate((el) => (el.scrollTop = 700));
const beforeScrollNode = await scroll.evaluate((el) => el.scrollTop);
const clicked = await page.evaluate(() => {
  const sc = document.querySelector(".graph-scroll");
  const r = sc.getBoundingClientRect();
  for (const n of document.querySelectorAll("svg g.node")) {
    const b = n.getBoundingClientRect();
    if (b.top >= r.top + 20 && b.bottom <= r.bottom - 20) {
      n.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return true;
    }
  }
  return false;
});
await page.waitForTimeout(200);
const afterScrollNode = await scroll.evaluate((el) => el.scrollTop);
const selAfterNode = await page.locator("svg g.node.sel").count();

// ---- interaction: select a node THEN search — filtered matches must NOT be
// dimmed by the stale selection (the major review finding) ----
await search.fill("");
await page.waitForTimeout(100);
await page.locator("table tbody tr").first().click(); // make a selection
await page.waitForTimeout(150);
const selBeforeSearch = await page.locator("svg g.node.sel").count();
await search.fill("billing");
await page.waitForTimeout(300);
const dimDuringSearch = await page.locator("svg g.node.dim").count();
const selDuringSearch = await page.locator("svg g.node.sel").count();
const matchDuringSearch = await page.locator("svg g.node.match").count();
await page.screenshot({ path: `${OUT}/09-select-then-search.png`, fullPage: true });
await search.fill("");

const summary = {
  request2_filter: {
    nodeFull,
    nodeFiltered,
    matchCount,
    linkFiltered,
    nodeZero,
    emptyMsg,
    nodeRestored,
  },
  request1_scroll: {
    table: { before: beforeScrollTable, after: afterScrollTable, selected: selAfterTable },
    node: { clicked, before: beforeScrollNode, after: afterScrollNode, selected: selAfterNode },
  },
  interaction_select_then_search: {
    selBeforeSearch,
    dimDuringSearch,
    selDuringSearch,
    matchDuringSearch,
  },
  errors,
};
console.log("RESULT " + JSON.stringify(summary, null, 2));
await browser.close();
