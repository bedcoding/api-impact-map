import type { Platform } from "../types";
import { PLABEL, PCOLOR, PLATFORMS } from "../constants";

/** Inline colored dots for the platforms a thing belongs to (detail panel). */
export function PlatDots({ plats }: { plats: Platform[] }) {
  return (
    <span className="platdots">
      {PLATFORMS.filter((p) => plats.includes(p)).map((p) => (
        <span
          key={p}
          className="pd"
          style={{ background: PCOLOR[p] }}
          title={PLABEL[p]}
        />
      ))}
    </span>
  );
}

/** P / A / W on-off boxes used in the tables. */
export function PlatCell({ plats }: { plats: Platform[] }) {
  return (
    <span className="pcell">
      {PLATFORMS.map((p) => (
        <span key={p} className={`pb ${plats.includes(p) ? "on-" + p : "off"}`}>
          {PLABEL[p][0]}
        </span>
      ))}
    </span>
  );
}
