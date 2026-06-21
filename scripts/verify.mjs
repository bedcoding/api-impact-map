// Headless verification of the React viewer: drives the live dev server with
// Playwright, screenshots key interactions, and reports console/page errors.
// Run from app/ with the dev server already listening on :5173:
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

// 1. Initial render
await page.screenshot({ path: `${OUT}/01-initial.png`, fullPage: true });
const statCount = await page.locator("header .stat").count();
const nodeCount0 = await page.locator("svg g.node").count();
const linkCount0 = await page.locator("svg path.link").count();

// 2. Click first endpoint node (DOM order renders endpoints before screens)
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

// 3. Clear selection (click empty svg area), then toggle iOS platform filter off
await page.locator("svg").click({ position: { x: 520, y: 6 } });
await page.locator(".pfilter label", { hasText: "iOS" }).click();
await page.waitForTimeout(300);
const iosOff = await page.locator(".pfilter label.off", { hasText: "iOS" }).count();
const nodeCountIosOff = await page.locator("svg g.node").count();
await page.screenshot({ path: `${OUT}/03-ios-filtered-off.png`, fullPage: true });
await page.locator(".pfilter label", { hasText: "iOS" }).click(); // restore

// 4. Table tabs
await page.locator(".tabs button", { hasText: "API → 화면" }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/04-table-api.png`, fullPage: true });
const apiRows = await page.locator("table tbody tr").count();

await page.locator(".tabs button", { hasText: "플랫폼 커버리지" }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/05-table-matrix.png`, fullPage: true });
const matrixRows = await page.locator("table tbody tr").count();

// 5. Table search filter
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
