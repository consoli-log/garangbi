
# 📄 **common-rules.md**

---

# **공통 규칙 (Common Rules)**

> 전체 프로젝트에 공통 적용되는 규칙.  
> 포맷, 에러 구조, 환경변수, 로깅, 브랜치 전략 등 핵심 기준을 정의한다.

> 상세 백엔드/프론트 규칙은 각 문서 참고:
> - 백엔드: `docs/backend/backend-rules.md`
> - 프론트: `docs/frontend/frontend-rules.md`
> - AI 개발 지원 규칙: `docs/ai/agent.md`

---

## 1) 환경 변수 규칙 (ENV Rules)

### ✔ 원칙

* 앱별로 **독립된 .env 파일**을 사용한다.
  (서버: `apps/server/.env.*`, 웹: 웹 전용 `.env.local` 등)
* **루트에 .env 두는 것 금지** → 앱 간 환경 누수 방지.
* 환경 변수는 실행 시 반드시 **스키마 검증(Joi 등)**을 통과해야 한다.

### ✔ 네이밍 규칙

* 대문자 + 언더스코어
* 예:

  * `DATABASE_URL`
  * `JWT_SECRET`
  * `CORS_ORIGIN`

### ✔ 필수 ENV

* `NODE_ENV=dev|test|prod`
* 서버 기준:

  * `DATABASE_URL`
  * `JWT_SECRET`
  * `PORT`
  * `CORS_ORIGIN` (여러 개일 경우 `,`로 구분)

---

## 2) 에러 규칙 (Error Response Rules)

### ✔ API 실패 응답 기본 구조

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 설명",
    "status": 400
  }
}
```

### ✔ 규칙 요약

* 반드시 `success: false` 포함
* `error.code`: 시스템/도메인 에러 키 (ENUM처럼 사용)
* `error.message`: 사용자에게 보여줄 메시지 또는 배열
* `error.status`: HTTP 상태 코드

### ✔ 금지

* 에러 포맷 케바케 작성
* Express/Nest 기본 에러 그대로 노출
* Prisma/DB 에러 원문 그대로 던지기

---

## 3) 성공 응답 규칙 (Success Response Rules)

### ✔ API 성공 응답 기본 구조

```json
{
  "success": true,
  "data": {}
}
```

* `TransformInterceptor`(server)에서 자동 래핑
* Controller에서 `return this.service.xxx()` 형태만 사용

### ✔ 금지

* 컨트롤러에서 직접 `{ success: true }` 작성
* data 없이 빈 객체 `{}` 대신 null 사용 (필요 시 `{}` 권장)

---

## 4) 로깅 규칙 (Logging Rules)

### ✔ 기본 원칙

* 로깅은 **PII, 민감정보 제거/마스킹 후** 기록

  * 비밀번호: `"******"`
  * 토큰: `"Bearer ****...****"`

### ✔ requestId 전파

* 서버는 요청당 **requestId 생성 및 전파**
* 로깅 시 모든 로그에 포함

### ✔ 레벨 기준

* `debug`: 개발용
* `info`: 정상 동작/상태
* `warn`: 경고
* `error`: 예외, 장애

---

## 5) 커밋 메시지 규칙 (Commit Message Rules)

### ✔ 기본 형식

```
type: 설명
```

### ✔ type 목록

* **feat**: 기능 추가
* **fix**: 버그 수정
* **refactor**: 로직/구조 개선(기능 변화 없음)
* **chore**: 설정/빌드/문서/주석 정리
* **docs**: 문서 작성/수정
* **style**: 코드 포맷팅
* **test**: 테스트 코드
* **build**: 빌드/배포 설정

### ✔ 예시

```
feat: 사용자 회원가입 API 추가
fix: prisma 트랜잭션 오류 수정
chore: 불필요한 주석 제거
```

---

## 6) 브랜치 전략 (Branch Strategy)

### ✔ main

* 배포/운영 기준
* 직접 커밋 금지

### ✔ develop (원하면 사용)

* 기능 통합 브랜치
  (원하지 않으면 생략 가능 — 지금 프로젝트는 **main + feature 브랜치만 사용해도 충분**)

### ✔ feature/*

* 기능 구현 브랜치
* 예:

  * `feature/users-module`
  * `feature/auth-api`

### ✔ hotfix/*

* 운영 긴급 버그 수정

---

## 7) 코드 스타일 공통 규칙

### ✔ 포맷팅

* Prettier + ESLint 통합
* 세미콜론 사용/탭/따옴표 등은 프로젝트 공통 설정

### ✔ 네이밍

* 파일: `kebab-case`
* 클래스: `PascalCase`
* 함수/변수: `camelCase`
* 상수: `UPPER_SNAKE_CASE`

---

## 8) 시크릿/보안 규칙

### ✔ 금지

* 코드에 하드코딩된 비밀번호/토큰
* git에 노출되는 숨김 파일
* 테스트용 크리덴셜 commit

### ✔ 원칙

* 모든 시크릿은 `.env.*`
* 민감정보가 로그에 남지 않도록 필터링
* CORS whitelist만 허용

---

## 9) 테스트/운영 규칙

### ✔ 테스트

* e2e는 별도 DB 사용 (초기화 필수)
* 단위 테스트는 mocking 기반

### ✔ 운영

* 마이그레이션은 배포 전에 반드시 실행
* 장애 발생 시 공통 로그 포맷 유지

---

## 10) 모노레포 규칙 (공통)

### ✔ apps/* 는 서비스

* server
* web

### ✔ packages/* 는 재사용 모듈

* types
* config
* utils (필요 시)

### ✔ 경계 원칙

* apps/web → apps/server 직접 import 금지
* apps → packages import는 가능
* packages에서는 apps import 금지 (**역참조 금지**)

---