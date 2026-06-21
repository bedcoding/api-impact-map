import type { Platform } from "../types";
import { PLABEL, PCOLOR, PLATFORMS } from "../constants";

/** 항목이 속한 플랫폼을 색 점으로 표시 (상세 패널용). */
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

/** 표에서 쓰는 P / A / W on-off 박스. */
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
