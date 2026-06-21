// Ensures app/src/data.json exists before dev/build. The real data.json is
// gitignored (internal API map), so on a fresh checkout it is missing — in that
// case we seed it from the committed data.sample.json so the app still builds
// and runs with safe placeholder data. Runs automatically via predev/prebuild.
import { existsSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const real = fileURLToPath(new URL("../src/data.json", import.meta.url));
const sample = fileURLToPath(new URL("../src/data.sample.json", import.meta.url));

if (existsSync(real)) {
  process.exit(0);
}
copyFileSync(sample, real);
console.log("[ensure-data] src/data.json was missing → seeded from data.sample.json");
