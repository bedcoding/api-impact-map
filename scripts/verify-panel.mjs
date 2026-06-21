// Verifies: clicking a node no longer shifts the layout (panel is fixed-height),
// and the expand/collapse toggle resizes BOTH columns to equal height.
// Run from app/ with the dev server listening:  node scripts/verify-panel.mjs
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
// click a screen node (screens are rendered after endpoints) → fills the panel
await page.locator("svg g.node").last().click();
await page.waitForTimeout(250);
const afterClick = await snap();
await page.screenshot({ path: `${OUT}/13-panel-compact.png`, fullPage: true });

// expand → both columns grow together
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
