# Repository Guidelines

## 프로젝트 구조 및 모듈 구성
이 pnpm/turbo 모노레포는 런타임 기준으로 도메인 코드를 구성합니다. `apps/server`는 NestJS API가 위치하며, Prisma 스키마(`prisma/schema.prisma`)와 일치하는 기능 모듈(`auth`, `budgets`, `transactions` 등)을 포함합니다. `apps/web`은 Vite + React 프런트엔드로, 라우트/도메인 단위로 UI를 나누고 `packages/services`의 HTTP 훅을 재사용하세요. 교차 영역 TypeScript 계약은 `packages/types`에 보관합니다. 공식 문서는 `docs/`에 저장하고, 생성 산출물은 `apps/*/dist`에 생성됩니다(git 무시). 공용 유틸은 `packages/` 아래에 두어 앱별 중복을 피합니다.

## 빌드, 테스트, 개발 명령어
- `pnpm install` — 워크스페이스 의존성을 단일 락파일로 설치합니다.
- `pnpm db:up` / `pnpm db:down` — `docker-compose.yml`의 Postgres 컨테이너를 시작/중지합니다.
- `pnpm prisma db push` — Prisma 스키마 변경을 개발 DB에 반영합니다(루트에서 실행).
- `pnpm dev` — Turbo 워처를 통해 두 앱을 동시에 실행합니다(일상 개발 기본).
- `pnpm --filter @garangbi/server dev` 와 `pnpm --filter @garangbi/web dev` — 단일 앱만 로컬 실행할 때 사용합니다.
- `pnpm build`, `pnpm --filter <package> build` — 서버는 NestJS 빌드를, 웹은 `vite build`를 수행합니다.
- `pnpm lint` — 워크스페이스 전체 ESLint 타겟을 실행합니다.

## 코딩 스타일 및 네이밍
TypeScript는 2칸 들여쓰기와 trailing comma(Prettier 3 기본값)를 따릅니다. Nest 컨벤션에 따라 모듈은 `Module`, 프로바이더는 `Service`, DTO는 `Dto`로 끝나도록 하세요. React 컴포넌트는 `PascalCase.tsx`, 훅은 `useCamelCase.ts` 파일명을 사용하고, 서버 측 파일은 케밥 케이스(`users.service.ts`)를 유지합니다. 푸시 전 `pnpm lint`를 실행하고, 앱 단위로는 `pnpm --filter <package> lint`로 자동 수정할 수 있습니다.

## 테스트 가이드라인
현재 CI에 자동 테스트가 연결되어 있지 않으므로 기능 추가 시 테스트를 함께 작성하세요. API는 각 모듈 옆에 `*.spec.ts` Jest + `@nestjs/testing` 스펙을 추가하고, `pnpm --filter @garangbi/server exec nest test`로 실행합니다(모듈별 스위트 구성). 웹 앱은 React Testing Library 기반 `*.test.tsx`를 컴포넌트 근처에 배치하세요. 신규 모듈은 문장 커버리지 80% 이상을 목표로 하고, 부족할 경우 PR 본문에 사유를 기록합니다.

## 커밋 및 PR 가이드라인
커밋은 Conventional Commit 문법(`type(scope): summary`)을 사용하며, 필요 시 `[ACC-02]`처럼 티켓 태그를 붙입니다. 명령형, 현재형으로 72자 이내 요약을 작성하고 행위 변동은 추가 설명에 명시하세요. PR은 다음을 포함해야 합니다:
- 관련 이슈나 티켓 링크
- 변경 내용, 목적, 검증 방법(명령어, UI 변경 시 스크린샷)
- 스키마 변경과 필요한 환경 변수 업데이트
- 데이터베이스 마이그레이션 또는 시드 변경 시 실행 방법

## 보안 및 환경 노트
환경 변수는 Nest Config와 Vite를 통해 로드되므로 `.env.local` 등 git 제외 파일에 비밀 값을 저장합니다. 로컬 Postgres는 `pnpm db:up`으로 관리하고, 생성된 Prisma 아티팩트는 커밋하지 마세요. 로그 공유 전 API 키를 회전하고, 픽스처에 사용자 식별 정보가 포함되지 않도록 주의합니다.
