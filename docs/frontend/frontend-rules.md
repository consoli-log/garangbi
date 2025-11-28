# 📄 **frontend-rules.md**

---

# **프론트엔드 코딩 규칙 (Frontend Rules)**

> 공통 규칙은 `docs/shared/common-rules.md` 우선 적용  
> 이 문서는 **`apps/web` (Vite + React + TypeScript)** 전용 규칙이다.

---

## 1) UI 기술 스택 (고정)

- 프레임워크: React + Vite
- 스타일: Tailwind CSS
- 컴포넌트: shadcn/ui (Radix UI 기반)
- 아이콘: shadcn/ui 기본 권장(예: lucide-react), 별도 아이콘 셋 추가 시 문서화 필수

### ✔ 규칙:

- 새로운 화면/컴포넌트는 **항상 Tailwind + shadcn/ui 조합**을 기본으로 사용한다.
- 별도 UI 라이브러리(Material UI, AntD 등)는 사용하지 않는다. 필요한 컴포넌트는 shadcn/ui 확장 또는 커스텀으로 해결한다.

---

## 2) 범위(Scope)

- 대상: `apps/web/*`
- 빌드/번들: Vite
- 언어: TypeScript + React
- 공용 패키지 사용:
  - `@garangbi/types` (`@types/*`)
  - `@garangbi/config` (`@config/*`)

---

## 3) 기본 폴더 구조

```txt
apps/web/src/
  main.tsx
  App.tsx
  pages/
  components/
  hooks/
  lib/
  styles/
```

- `pages/` : 라우팅 기준 화면 단위
- `components/` : 재사용 가능한 UI 컴포넌트
- `hooks/` : 커스텀 훅
- `lib/` : API 클라이언트, 유틸, 포맷터 등
- `styles/` : 전역 스타일, 테마(사용 시)

---

## 4) 네이밍 & 스타일

- 파일명:
  - 컴포넌트: `PascalCase.tsx` (예: `UserProfileCard.tsx`)
  - 훅: `useXxx.ts` (예: `useUser.ts`)
  - 유틸: `camelCase.ts` (예: `formatDate.ts`)

- 컴포넌트:
  - 함수형 컴포넌트만 사용
  - 기본 형태:

    ```tsx
    type Props = {
      // ...
    };

    export function ComponentName(props: Props) {
      return <div>...</div>;
    }
    ```

---

## 5) 타입 규칙

- 모든 컴포넌트/함수는 **반드시 TS 타입 명시** (Props, 리턴 타입 등)
- API 관련 타입은 가능하면 공용 타입 사용:
  - `@garangbi/types` (`@types/api/...`) 기준

예:

```ts
import type { ApiSuccess } from '@types/api/common';

type User = {
  id: string;
  email: string;
};

type GetUserResponse = ApiSuccess<User>;
```

---

## 6) 환경/설정 사용 규칙

- API Base URL, 환경 구분값 등은 **하드코딩 금지**
  - `@garangbi/config` 활용

예:

```ts
import { API_BASE_PATH, APP_ENV } from '@config';

console.log(API_BASE_PATH); // "/api/v1"
console.log(APP_ENV); // "dev" | "test" | "prod"
```

- 브라우저 전용 ENV는 Vite 규칙에 맞게 `import.meta.env.VITE_XXX` 사용

---

## 7) API 호출 규칙

- API 호출 코드는 `lib/api/` 아래에서 관리
  (예: `lib/api/http.ts`, `lib/api/userApi.ts`)

- 공통 HTTP 클라이언트 예시:

  ```ts
  // lib/api/http.ts
  import { API_BASE_PATH } from '@config';
  import type { ApiErrorResponse } from '@types/api/common';

  export async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE_PATH}${path}`, {
      credentials: 'include',
    });

    const json = await res.json();

    if (!res.ok || json.success === false) {
      const err = json as ApiErrorResponse;
      throw err;
    }

    return json.data as T;
  }
  ```

- 각 도메인별 파일 예:
  - `lib/api/userApi.ts`
  - `lib/api/projectApi.ts`

---

## 8) 상태 관리 (초기 규칙)

- 초기 버전:
  - React 내부 state + `useState`, `useReducer`, `useContext` 정도로 해결

- 외부 상태관리 라이브러리(Redux, Zustand 등)는 **필요해질 때 도입**

---

## 9) 에러 처리 UX

- API 에러는 최소한:
  - 사용자 메시지 (토스트/알림)
  - 콘솔 로그(개발 모드)로 디버깅용 정보 출력

- `ApiErrorResponse` 구조에 맞춰 처리:

```ts
try {
  const data = await apiGet<User>('/users/me');
} catch (err) {
  // ApiErrorResponse 기준
  console.error(err);
  // TODO: 사용자에게 알림 표시
}
```

---

## 10) 디자인 컨셉: 네오브루탈리즘

- 전반적인 톤
  - 밝은 솔리드 배경 + 강한 컬러 대비 사용
  - 컬러 수는 최소화(핵심 포인트 컬러 1~2개 + 중립색 위주)

- 레이아웃 / 박스
  - 굵은 테두리: 기본 `border-2` 이상, 명확한 구분
  - 모서리: 기본 `rounded-none` ~ `rounded-md` (과도하게 둥근 모서리 지양)
  - 여백: card/block 단위로 `p-4` 이상, 답답하지 않게

- 타이포그래피
  - 기본 폰트: 시스템 폰트 또는 프로젝트 공통 폰트(예: Pretendard) 사용
  - 제목/본문 계층은 Tailwind 텍스트 스케일에 맞춰 3단계 이상 분리 (`text-xl`, `text-lg`, `text-sm` 등)

- 상태 표현
  - Hover/Active 상태는 색 대비 또는 테두리 두께 변화로 명확하게 표현
  - 에러/경고/성공 색상 팔레트는 공통 토큰으로 관리 (예: `text-destructive`, `bg-destructive/10` 등)

---

## 11) 금지 사항

- `any` 무분별 사용
- API base URL 하드코딩 (`http://localhost:3000/api/v1` 등)
- 서버 응답 포맷을 프론트 단에서 제멋대로 가정 (`data` 대신 `result` 등)
- 비즈니스 로직을 컴포넌트 안에 과도하게 집어넣기
  - 복잡한 로직은 `hooks/` 또는 `lib/`로 분리

---

## 12) 린트 / 포맷 규칙

- 프론트엔드는 루트의 공통 설정을 사용한다.
  - ESLint: `eslint.config.mjs`
  - Prettier: `.prettierrc`
- `apps/web` 내부에 별도 ESLint / Prettier 설정 파일을 추가하지 않는다.
- 린트 / 포맷 명령:
  - `pnpm lint` (루트에서 전체 검사)
  - `pnpm format` (루트에서 전체 포맷)

---

## 13) PR 기준 (프론트 전용 체크리스트)

- [ ] 컴포넌트/함수에 타입 명시
- [ ] 공용 타입이 필요한 곳은 `@garangbi/types` 사용
- [ ] API Base, 환경 값은 `@garangbi/config` 또는 ENV에서 가져옴
- [ ] 에러 핸들링 최소한의 UX 반영
- [ ] 불필요한 콘솔/주석/죽은 코드 제거

---
