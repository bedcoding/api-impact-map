import type { Edge, Platform, Selection } from "../types";
import { epById, screenById } from "../data";
import { PLABEL, PLATFORMS, methodCls } from "../constants";
import { PlatDots } from "./shared";

interface Props {
  selected: Selection;
  activeEdges: Edge[];
  platforms: Set<Platform>;
  onSelect: (type: "ep" | "screen", id: string) => void;
  expanded: boolean;
}

// 그래프 카드의 측정 높이에 맞춰 두 컬럼 바닥이 정렬되게 함.
const COMPACT_H = 367;
const EXPANDED_H = 747;

export function DetailPanel({ selected, activeEdges, platforms, onSelect, expanded }: Props) {
  return (
    <div className="panel" style={{ height: expanded ? EXPANDED_H : COMPACT_H }}>
      <div className="card-head">상세 / 영향 분석</div>
      <div className="pbody">
        {!selected ? (
          <Empty />
        ) : selected.type === "ep" ? (
          <EpPanel id={selected.id} activeEdges={activeEdges} onSelect={onSelect} />
        ) : (
          <ScreenPanel
            id={selected.id}
            activeEdges={activeEdges}
            platforms={platforms}
            onSelect={onSelect}
          />
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="empty">
      <b>사용 방법</b>
      <br />· <b>엔드포인트 노드</b> 클릭 → 이 API 변경 시 영향받는 화면(플랫폼별)
      <br />· <b>화면 노드</b> 클릭 → 그 화면이 호출하는 엔드포인트
      <br />· 상단 <b>플랫폼 필터</b>로 iOS/Android/Web 토글
      <br />· 노드 안 색 점 = 해당 항목을 사용하는 플랫폼
      <br />
      <br />
      <b>플랫폼 범례</b>
      <br />
      {PLATFORMS.map((p) => (
        <span className={`badge ${p}`} key={p}>
          {PLABEL[p]}
        </span>
      ))}
    </div>
  );
}

function EpPanel({
  id,
  activeEdges,
  onSelect,
}: {
  id: string;
  activeEdges: Edge[];
  onSelect: (type: "ep" | "screen", id: string) => void;
}) {
  const a = epById.get(id);
  if (!a) return null;
  const edges = activeEdges.filter((e) => e.endpoint === id);
  const byScreen = new Map<string, Platform[]>();
  edges.forEach((e) => {
    const arr = byScreen.get(e.screen) ?? [];
    arr.push(e.platform);
    byScreen.set(e.screen, arr);
  });

  return (
    <>
      <p className="ptitle">
        <span className={`badge ${methodCls(a.method)}`}>{a.method}</span>
        {a.path}
      </p>
      <div className="pmeta">
        <span className={`badge ${a.version}`}>{(a.version || "other").toUpperCase()}</span>
        호출 플랫폼 <PlatDots plats={a.platforms} /> · 영향화면 {byScreen.size}개
      </div>
      <div className="section-h">영향받는 화면 · {byScreen.size}개</div>
      {byScreen.size === 0 ? (
        <div className="muted">활성 플랫폼에서 이 엔드포인트를 쓰는 화면이 없습니다.</div>
      ) : (
        <ul className="plain">
          {[...byScreen.entries()].map(([sid, plats]) => {
            const s = screenById.get(sid);
            if (!s) return null;
            return (
              <li key={sid}>
                <span className="row-link" onClick={() => onSelect("screen", sid)}>
                  <b>{s.name}</b> <span className="muted codeline">[{s.code}]</span>
                </span>{" "}
                <PlatDots plats={[...new Set(plats)]} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function ScreenPanel({
  id,
  activeEdges,
  platforms,
  onSelect,
}: {
  id: string;
  activeEdges: Edge[];
  platforms: Set<Platform>;
  onSelect: (type: "ep" | "screen", id: string) => void;
}) {
  const s = screenById.get(id);
  if (!s) return null;
  const edges = activeEdges.filter((e) => e.screen === id);

  return (
    <>
      <p className="ptitle">{s.name}</p>
      <div className="pmeta">
        code <code>{s.code}</code> · 플랫폼 <PlatDots plats={s.platforms} />
      </div>

      <div className="section-h">플랫폼별 화면 명</div>
      <ul className="plain">
        {PLATFORMS.filter((p) => s.aliases[p]).map((p) => (
          <li key={p}>
            <span className={`badge ${p}`}>{PLABEL[p]}</span> {s.aliases[p]}
          </li>
        ))}
      </ul>

      {PLATFORMS.filter((p) => platforms.has(p)).map((p) => {
        const eps = [...new Set(edges.filter((e) => e.platform === p).map((e) => e.endpoint))];
        if (eps.length === 0) return null;
        return (
          <div key={p}>
            <div className="section-h">
              <span className={`badge ${p}`}>{PLABEL[p]}</span> 엔드포인트 · {eps.length}개
            </div>
            <ul className="plain">
              {eps.map((eid) => {
                const a = epById.get(eid);
                if (!a) return null;
                return (
                  <li key={eid}>
                    <span className="row-link" onClick={() => onSelect("ep", eid)}>
                      <span className={`badge ${methodCls(a.method)}`}>{a.method}</span>{" "}
                      <span className="codeline">{a.path}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
}
