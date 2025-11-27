# 가랑비(v2)

Monorepo 구조

- apps/server: NestJS + Prisma + PostgreSQL
- apps/web: React + TypeScript
- packages/types: 공용 타입
- packages/config: 공용 설정

your-project/
apps/
server/ # NestJS + Prisma 백엔드
web/ # React 프론트엔드
packages/
types/ # 프론트/백 공용 타입
config/ # 환경/런타임 공용 설정
eslint-config/ # 공용 ESLint 설정(선택)
tsconfig/ # 공용 TS 설정 베이스
docs/
shared/
common-rules.md # 공통 규칙(환경변수/에러/로깅/커밋 등)
backend/
backend-rules.md # 지금처럼 백엔드 규칙
frontend/
frontend-rules.md # 프론트 규칙
.vscode/ # (선택) 워크스페이스 설정
package.json
pnpm-workspace.yaml
turbo.json
tsconfig.base.json
README.md
.env.example # 루트용은 "공통 아님" 안내만, 실제 키는 각 앱 내부에

apps/server/
src/
main.ts
app.module.ts
config/ # 환경 설정 모듈/Joi 스키마
common/
filters/
interceptors/
guards/
decorators/
pipes/
types/
prisma/
prisma.module.ts
prisma.service.ts
modules/
health/
health.module.ts
health.controller.ts
users/
users.module.ts
users.controller.ts
users.service.ts
users.repository.ts
dto/
create-user.dto.ts
update-user.dto.ts
entities/
user.entity.ts
prisma/
schema.prisma
migrations/
seed.ts
test/
nest-cli.json
tsconfig.json
tsconfig.build.json
package.json
.env.dev
.env.test
.env.prod

apps/web/
src/
main.tsx
App.tsx
pages/
components/
hooks/
lib/
index.html
tsconfig.json
vite.config.ts
package.json

packages/types/
src/
api/
user.ts # API 요청/응답 인터페이스 등
index.ts
package.json
tsconfig.json

packages/config/
src/
index.ts # 공용 설정(예: api base url, feature flags 등)
package.json
tsconfig.json

docs/
shared/
common-rules.md # 환경변수, 에러 포맷, 로깅, 커밋 메시지 공통
backend/
backend-rules.md # 지금 작성한 NestJS/Prisma 규칙 여기
frontend/
frontend-rules.md # React 코드 규칙
ai/
agent.md # 코덱스/AI 개발 지원 작업 규칙(앞에 얘기한 그거)
