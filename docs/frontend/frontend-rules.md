# 📄 **frontend-rules.md**

---

# **프론트엔드 코딩 규칙 (Frontend Rules)**

> 공통 규칙은 `docs/shared/common-rules.md` 우선 적용  
> 이 문서는 **`apps/web` (Vite + React + TypeScript)** 전용 규칙이다.

---

## 1) 범위(Scope)

- 대상: `apps/web/*`
- 빌드/번들: Vite
- 언어: TypeScript + React
- 공용 패키지 사용:
  - `@garangbi/types` (`@types/*`)
  - `@garangbi/config` (`@config/*`)

---

## 2) 기본 폴더 구조

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

## 3) 네이밍 & 스타일

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

## 4) 타입 규칙

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

## 5) 환경/설정 사용 규칙

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

## 6) API 호출 규칙

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

## 7) 상태 관리 (초기 규칙)

- 초기 버전:
  - React 내부 state + `useState`, `useReducer`, `useContext` 정도로 해결

- 외부 상태관리 라이브러리(Redux, Zustand 등)는 **필요해질 때 도입**

---

## 8) 에러 처리 UX

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

## 9) 스타일/디자인 (초기)

- 초기에는 간단한 CSS/유틸 사용 후,
  - 필요 시 UI 라이브러리/디자인 시스템 도입

- CSS 방법론(예: Tailwind, CSS-in-JS 등)은 확정 전까지 **과도한 의존 줄이기**

---

## 10) 금지 사항

- `any` 무분별 사용
- API base URL 하드코딩 (`http://localhost:3000/api/v1` 등)
- 서버 응답 포맷을 프론트 단에서 제멋대로 가정 (`data` 대신 `result` 등)
- 비즈니스 로직을 컴포넌트 안에 과도하게 집어넣기
  - 복잡한 로직은 `hooks/` 또는 `lib/`로 분리

---

## 11) PR 기준 (프론트 전용 체크리스트)

- [ ] 컴포넌트/함수에 타입 명시
- [ ] 공용 타입이 필요한 곳은 `@garangbi/types` 사용
- [ ] API Base, 환경 값은 `@garangbi/config` 또는 ENV에서 가져옴
- [ ] 에러 핸들링 최소한의 UX 반영
- [ ] 불필요한 콘솔/주석/죽은 코드 제거

---
