# 📚 **README.md**

# 🌧️ 가랑비(v2)

모노레포 기반의 Web + Server 프로젝트입니다.  
`pnpm + Turborepo` 를 사용하며, 백엔드는 NestJS/Prisma, 프론트는 React 기반입니다.

> 🔎 이 레포에서 AI/Codex/ChatGPT를 사용할 때는 **반드시 `docs/ai/agent.md`의 규칙을 먼저 읽고 따를 것.**
>
> - 요청 유형 분류, "분석 끝" 응답, "승인" 전 코드 작성 금지 등.

---

## 📦 Monorepo 구조

```
your-project/
├─ apps/
│  ├─ server/              # NestJS + Prisma 백엔드
│  └─ web/                 # React 프론트엔드
│
├─ packages/
│  ├─ types/               # 프론트/백 공용 타입
│  └─ config/              # 공용 런타임/환경 설정
│
├─ docs/
│  ├─ shared/
│  │  └─ common-rules.md   # 공통 규칙(환경변수/에러/로깅/커밋 등)
│  ├─ backend/
│  │  └─ backend-rules.md  # 백엔드 개발 규칙
│  ├─ frontend/
│  │  └─ frontend-rules.md # 프론트 개발 규칙
│  └─ ai/
│     └─ agent.md          # AI 개발 보조 규칙(Codex/ChatGPT)
│
├─ .vscode/                # (선택) 워크스페이스 설정
├─ .prettierrc
├─ eslint.config.mjs
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
├─ tsconfig.base.json
└─ README.md
```

---

## ⚙️ apps/server (백엔드)

#### ✔ NestJS + Prisma + PostgreSQL

```
apps/server/
├─ src/
│  ├─ main.ts
│  ├─ app.module.ts
│  ├─ config/              # 환경 설정 모듈(Joi 스키마)
│  ├─ common/
│  │  ├─ filters/
│  │  ├─ interceptors/
│  │  ├─ guards/
│  │  ├─ decorators/
│  │  └─ pipes/
│  ├─ prisma/
│  │  ├─ prisma.module.ts
│  │  └─ prisma.service.ts
│  └─ modules/
│     ├─ health/
│     ├─ users/
│     │  ├─ users.module.ts
│     │  ├─ users.controller.ts
│     │  ├─ users.service.ts
│     │  ├─ users.repository.ts
│     │  ├─ dto/
│     │  └─ entities/
│     └─ ...
│
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts
│
├─ test/
├─ nest-cli.json
├─ tsconfig.json
├─ tsconfig.build.json
├─ package.json
├─ .env.dev
├─ .env.test
├─ .env.prod
└─ .env.example
```

---

## 💻 apps/web (프론트엔드)

#### ✔ React + TypeScript + Vite

```
apps/web/
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ pages/
│  ├─ components/
│  ├─ hooks/
│  └─ lib/
├─ index.html
├─ tsconfig.json
├─ vite.config.ts
├─ package.json
├─ .env.dev
├─ .env.test
├─ .env.prod
└─ .env.example
```

---

## 📦 packages/types

#### ✔ 프론트 & 백엔드에서 공유하는 타입/계약

```
packages/types/
├─ src/
│  ├─ api/
│  │  └─ user.ts
│  └─ index.ts
├─ package.json
└─ tsconfig.json
```

---

## ⚙️ packages/config

#### ✔ 런타임/환경 관련 공용 설정

```
packages/config/
├─ src/
│  └─ index.ts
├─ package.json
└─ tsconfig.json
```

---

## 📝 문서 구조

```
docs/
├─ shared/
│  └─ common-rules.md      # 환경변수 / 에러 응답 / 로깅 / 커밋 메시지 규칙
├─ backend/
│  └─ backend-rules.md     # NestJS / Prisma 백엔드 개발 규칙
├─ frontend/
│  └─ frontend-rules.md    # React / Vite 프론트엔드 개발 규칙
└─ ai/
   └─ agent.md             # Codex/ChatGPT 개발 작업 행동 규칙
```

---

## 🚀 개발 실행 방법

### ✔ 서버 + 웹 동시 실행

```bash
pnpm dev
```

### ✔ 서버만 실행

```bash
pnpm dev:server
```

### ✔ 웹만 실행

```bash
pnpm dev:web
```

---

## 🧹 품질 관리

### ✔ 전체 린트

```bash
pnpm lint
```

### ✔ 전체 포맷

```bash
pnpm format
```

---

## 🧪 서버 테스트 실행

```bash
pnpm test --filter server
```

---

## 🚨 기능 개발 흐름

### 1. main 최신으로 맞추기

```bash
git checkout main
git pull origin main
```

### 2. 기능 브랜치 생성

```bash
git checkout -b feat/users-module
```

### 3. 개발

```bash
pnpm dev
# VSCode에서 코딩 + 코덱스/AI 사용
```

### 4. 작업 단위로 커밋

```bash
git add .
git commit -m "feat: users 모듈 기본 CRUD 추가"
```

### 5. 원격에 올리기

```bash
git push -u origin feat/users-module
```

그리고 GitHub에서 feat/users-module → main 으로 PR 만들어서 머지.

---

이 프로젝트에는 AI 작업 규칙 문서가 있어.
docs/ai/agent.md 파일을 먼저 읽고, 거기 적힌 규칙을 네 시스템 프롬프트처럼 항상 지켜줘.
특히:

- 요청 종류를 먼저 묻기
- 내가 코드 보내면 먼저 "분석 끝"만 말하기
- "승인" 또는 "진행해줘" 전에는 코드 작성 금지
  지금 docs/ai/agent.md를 읽고, 핵심 규칙만 요약해봐.

---
