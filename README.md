# API ↔ 화면 영향도 맵 · `api-impact-map`

**엔드포인트 변경 시 영향받는 화면을 플랫폼별로 시각화.**
iOS · Android · Web 세 클라이언트가 호출하는 **API 엔드포인트 ↔ 화면(screen)** 의존 관계를 보는
**Vite + React + TypeScript** 단독 앱입니다. 이 폴더만으로 독립 실행됩니다.

> 로드맵: 연도별 API 변화 추적(예정).

## 실행

```bash
npm install        # 최초 1회
npm run dev        # 개발 서버 (http://localhost:5173)
npm run build      # 프로덕션 빌드 → dist/
npm run preview    # 빌드 결과 미리보기
npm run typecheck  # tsc 타입 검사 (빌드는 esbuild라 타입체크 별도)
```

## 데이터

이 앱은 **외부 폴더를 일절 참조하지 않습니다.** 데이터는 앱 안의 `src/data.json` 한 곳에서 옵니다
(`src/data.ts`가 `./data.json`을 import → Vite가 번들에 포함).

- **`src/data.json`** — 실제 데이터(내부 API 맵). **gitignore 처리**되어 저장소에 올라가지 않습니다.
- **`src/data.sample.json`** — 같은 스키마의 **가짜 샘플**(커밋됨). 실데이터가 없을 때 대체.
- `npm run dev` / `npm run build` 직전 `scripts/ensure-data.mjs`(predev/prebuild)가 실행되어,
  `src/data.json`이 없으면 **샘플을 복사**해 둡니다. → 막 클론한 상태에서도 바로 빌드·실행됨(샘플 데이터로).

### 실제 데이터로 보기 / 갱신

내보낸 `data.json`을 **`src/data.json`에 덮어쓰면** 됩니다. (스키마는 `src/types.ts`의 `AppData` 참고)
`npm run dev` 실행 중이면 파일 저장 시 Vite HMR로 자동 리로드됩니다.

> 스키마: `{ generatedAt, platforms, stats, endpoints[], screens[], edges[] }`

## 구조

```
app/
  index.html              Vite 엔트리 (#root)
  vite.config.ts          plugin-react · base './'
  scripts/
    ensure-data.mjs       data.json 없으면 data.sample.json 복사 (predev/prebuild)
    verify-*.mjs          Playwright 동작 검증 스크립트
  src/
    main.tsx              ReactDOM 부트스트랩 + styles.css
    App.tsx               전역 상태(검색·플랫폼필터·선택·테이블탭) + 레이아웃
    types.ts              AppData / Endpoint / Screen / Edge / Selection 타입
    constants.ts          PLATFORMS · PLABEL · PCOLOR · methodCls · trunc
    data.ts               ./data.json import → D, epById, screenById
    data.json             실제 데이터 (gitignored)
    data.sample.json      가짜 샘플 데이터 (committed)
    styles.css            전역 스타일
    components/
      Header.tsx           헤더 + 통계 칩
      Toolbar.tsx          검색 + 플랫폼 필터
      Graph.tsx            이분 SVG 의존성 그래프(반응형 폭 · 펼치기/접기 높이)
      DetailPanel.tsx      엔드포인트/화면 상세·영향 분석
      Tables.tsx           화면→API / API→화면 / 플랫폼 커버리지 3탭
      shared.tsx           PlatDots · PlatCell 공용 헬퍼
```

## 동작 메모

- 그래프는 선언형 JSX SVG. 레이아웃은 `useMemo`로 계산하고 강조(선택/검색)는 렌더타임 className.
- 검색은 그래프를 **필터링**(매칭 + 1-hop 이웃). 노드 선택은 제자리 하이라이트(스크롤·정렬 고정).
- 그래프 폭은 컨테이너에 반응형으로 맞고(가로 스크롤 없음), 높이는 하단 **펼치기/접기** 버튼으로 토글.
