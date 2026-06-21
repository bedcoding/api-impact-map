import { useMemo } from "react";
import type { Edge, Platform, TableTab } from "../types";
import { D } from "../data";
import { PLABEL, PLATFORMS, methodCls } from "../constants";
import { PlatCell } from "./shared";

interface Props {
  tab: TableTab;
  onTab: (t: TableTab) => void;
  query: string;
  onQuery: (q: string) => void;
  activeEdges: Edge[];
  onSelect: (type: "ep" | "screen", id: string) => void;
}

const TABS: [TableTab, string][] = [
  ["screen", "화면 → API"],
  ["api", "API → 화면"],
  ["matrix", "플랫폼 커버리지"],
];

export function Tables({ tab, onTab, query, onQuery, activeEdges, onSelect }: Props) {
  const q = query.trim().toLowerCase();

  const live = useMemo(() => {
    const eps = new Set<string>();
    const scr = new Set<string>();
    activeEdges.forEach((e) => {
      eps.add(e.endpoint);
      scr.add(e.screen);
    });
    return { eps, scr };
  }, [activeEdges]);

  let rowCount = 0;
  let body: React.ReactNode = null;

  if (tab === "screen") {
    const rows = D.screens
      .filter((s) => live.scr.has(s.id))
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    rowCount = rows.length;
    body = (
      <table>
        <thead>
          <tr>
            <th>화면</th>
            <th>code</th>
            <th>플랫폼</th>
            <th>엔드포인트 수</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const n = new Set(
              activeEdges.filter((e) => e.screen === s.id).map((e) => e.endpoint),
            ).size;
            return (
              <tr key={s.id} onClick={() => onSelect("screen", s.id)}>
                <td>
                  <b>{s.name}</b>
                </td>
                <td className="codeline">{s.code}</td>
                <td>
                  <PlatCell plats={s.platforms} />
                </td>
                <td>
                  <span className={`count-tag ${n ? "" : "zero"}`}>{n}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  } else if (tab === "api") {
    const rows = D.endpoints
      .filter((a) => live.eps.has(a.id))
      .filter((a) => !q || a.path.toLowerCase().includes(q) || a.method.toLowerCase().includes(q));
    rowCount = rows.length;
    body = (
      <table>
        <thead>
          <tr>
            <th>method</th>
            <th>path</th>
            <th>ver</th>
            <th>플랫폼</th>
            <th>영향 화면</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const sc = new Set(
              activeEdges.filter((e) => e.endpoint === a.id).map((e) => e.screen),
            );
            return (
              <tr key={a.id} onClick={() => onSelect("ep", a.id)}>
                <td>
                  <span className={`badge ${methodCls(a.method)}`}>{a.method}</span>
                </td>
                <td className="codeline">{a.path}</td>
                <td>
                  <span className={`pill ${a.version}`}>{(a.version || "other").toUpperCase()}</span>
                </td>
                <td>
                  <PlatCell plats={a.platforms} />
                </td>
                <td>
                  <span className={`count-tag ${sc.size ? "" : "zero"}`}>{sc.size}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  } else {
    // 플랫폼 커버리지 매트릭스: 화면 × 어느 플랫폼에 구현됐나.
    // 매트릭스 안정성을 위해 (플랫폼 필터 안 한) 전체 edge 사용.
    const rows = D.screens.filter(
      (s) => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
    );
    rowCount = rows.length;
    const cell = (c: number, p: Platform) =>
      c ? <span className={`pill ${p}`}>{c}</span> : <span className="muted">—</span>;
    body = (
      <table>
        <thead>
          <tr>
            <th>화면</th>
            <th>code</th>
            <th>iOS</th>
            <th>Android</th>
            <th>Web</th>
            <th>공통/차이</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const cnt = (p: Platform) =>
              new Set(
                D.edges
                  .filter((e) => e.screen === s.id && e.platform === p)
                  .map((e) => e.endpoint),
              ).size;
            const c: Record<Platform, number> = {
              ios: cnt("ios"),
              android: cnt("android"),
              web: cnt("web"),
            };
            const present = PLATFORMS.filter((p) => c[p] > 0);
            const note =
              present.length === 3
                ? "전 플랫폼"
                : present.length === 0
                  ? "—"
                  : present.map((p) => PLABEL[p]).join(" · ") + " only";
            return (
              <tr key={s.id} onClick={() => onSelect("screen", s.id)}>
                <td>
                  <b>{s.name}</b>
                </td>
                <td className="codeline">{s.code}</td>
                <td>{cell(c.ios, "ios")}</td>
                <td>{cell(c.android, "android")}</td>
                <td>{cell(c.web, "web")}</td>
                <td className="muted">{note}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <div className="tables">
      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => onTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="table-tools">
        <input
          type="search"
          placeholder="테이블 내 검색…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        <span className="muted">{rowCount}개 행</span>
      </div>
      <div className="table-wrap">{body}</div>
    </div>
  );
}
