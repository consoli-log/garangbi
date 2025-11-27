# 📄 **backend-rules.md**

---

# **백엔드 코딩 규칙 (Backend Rules)**

> 공통 규칙은 `docs/shared/common-rules.md` 우선 적용  
> 이 문서는 **`apps/server` (NestJS + Prisma + PostgreSQL)** 전용 규칙이다.

---

## 1) 범위(Scope)

- Monorepo(pnpm + Turborepo) 환경의 **HTTP API 서버**
- 대상: `apps/server/*`
- 공용 패키지:
  - `packages/types` (`@garangbi/types`, `@types/*`)
  - `packages/config` (`@garangbi/config`, `@config/*`)

---

## 2) 모노레포 전용 규칙

### ✔ 의존성/경계

- `apps/server`에서 import 가능한 것:
  - Node / npm 패키지
  - `packages/types`, `packages/config` 등 `packages/*` 하위 공용 패키지
- **금지**:
  - `apps/web` 코드 import
  - apps ↔ apps, packages ↔ apps 역참조
- 공용 타입은 `packages/types`에서만 barrel export 제공.

### ✔ TS 경로 설정

- 루트 `tsconfig.base.json` 기준:
  - `@types/*` → `packages/types/src/*`
  - `@config/*` → `packages/config/src/*`

- 서버 공통 유틸은 `apps/server/src/common/*`

### ✔ 환경변수/시크릿

- 서버 `.env` 파일은 앱 내부에만 존재:
  - `apps/server/.env.dev`
  - `apps/server/.env.test`
  - `apps/server/.env.prod`

- `NODE_ENV` 값은 **`dev` / `test` / `prod`** 만 사용
- `ConfigModule.forRoot` 설정 예:

  ```ts
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: [`.env.${process.env.NODE_ENV || 'dev'}`],
    load: [appConfig],
    validationSchema,
  });
  ```

- Joi 스키마에서 필수 ENV:
  - `NODE_ENV` (`dev`, `test`, `prod`)
  - `PORT`
  - `DATABASE_URL`
  - 필요 시 `CORS_ORIGIN` 등 추가

### ✔ Prisma 디렉터리

```txt
apps/server/prisma/
  schema.prisma
  migrations/
  seed.ts
```

- Prisma CLI는 항상 `apps/server` 기준으로 실행
- 스키마 인덱스/제약은 schema.prisma에 명시, 비즈니스 제약은 서비스/레포에서 재검증.

---

## 3) 프로젝트 구조 & 네이밍

```txt
apps/server/
  src/
    main.ts
    app.module.ts
    config/
      app.config.ts
      validation.schema.ts
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
      users/
      auth/
      ...
  prisma/
    schema.prisma
    migrations/
    seed.ts
```

- 파일명: `kebab-case.ts` (예: `users.service.ts`)
- 클래스/모듈/서비스: PascalCase (예: `UsersService`)
- DTO: `CreateXDto`, `UpdateXDto`
- Guard/Interceptor/Filter: `XxxGuard`, `XxxInterceptor`, `XxxFilter`

---

## 4) 부트스트랩(main.ts) & 전역 설정

### ✔ Global Prefix

- 모든 API는 `/api/v1` 시작

  ```ts
  app.setGlobalPrefix('api/v1');
  ```

### ✔ ValidationPipe

- 설정 고정:

  ```ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  ```

### ✔ 전역 인터셉터/필터

- 전역 인터셉터: `TransformInterceptor`
  - 성공 응답은 항상 `{ success: true, data }` 형태

- 전역 필터: `HttpExceptionFilter`
  - 실패 응답은 `docs/shared/common-rules.md`의 error 포맷으로 통일

---

## 5) Controller 규칙

- 역할:
  - **라우팅 + DTO 바인딩 + 인증/인가 데코레이터**만 담당
  - 비즈니스 로직, Prisma 호출 직접 금지

- 모든 입력(body, query, param)은 DTO 클래스 + `class-validator` 필수

- 인증/인가:

  ```ts
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin') // Role 기반 데코레이터 사용
  ```

- REST 규칙 예:
  - `GET /users`
  - `GET /users/:id`
  - `POST /users`
  - `PATCH /users/:id`
  - `DELETE /users/:id`

---

## 6) DTO & Validation

- DTO는 항상 **클래스** + `class-validator`, `class-transformer` 사용
- Swagger 사용 시 `@nestjs/swagger` 데코레이터로 예시/스키마 정의

예:

```ts
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;
}
```

---

## 7) Service 규칙

- Service는 **도메인 비즈니스 로직의 중심 계층**
- DB 접근은 기본적으로 `PrismaService` 사용
- 트랜잭션 경계는 Service에서 정의 (`prisma.$transaction`)
- 외부 API 호출, 도메인 이벤트 발행도 Service에서 조정
- 예외는 Nest 예외(`BadRequestException`, `NotFoundException` 등)를 던지고
  전역 필터가 공통 에러 포맷으로 변환

---

## 8) Prisma & Repository

### ✔ 기본 접근

- 초기 단계:
  - `Service` → `PrismaService` 직접 사용

- 아래 조건 만족 시 **Repository 레이어** 도입 고려

### ✔ Repository 도입 기준

1. 동일/유사 Prisma 쿼리가 여러 Service에서 반복
2. 한 요청에 2개 이상 테이블 쓰기 (트랜잭션 경계 복잡)
3. 복잡 조인/집계, 읽기/쓰기 분리 필요
4. 단위 테스트 시 DB mocking을 강하게 원할 때

### ✔ Prisma 쿼리 작성 규칙

- `select` / `include`는 필요한 필드만
- N+1 쿼리 방지를 위해 관계 로딩은 명시적 `include` 사용
- 인덱스/유니크는 schema.prisma에 정의
- 유니크 제약 경합은 낙관적 처리 + 재시도 정책 고려
- 제약 위반 등은 예외 캐치 후 도메인 에러로 변환

---

## 9) 타입/공용 타입 배치

### ✔ 공용 타입 (`packages/types`)

- 프론트와 공유해야 하는 타입/인터페이스:
  - API 응답/요청 타입
  - 공용 enum/상수 타입

- 예: `ApiSuccess<T>`, `ApiErrorResponse` 등

  ```ts
  import type { ApiSuccess } from '@types/api/common';
  ```

### ✔ 서버 내부 전용 타입

- Nest DTO (`class-validator`, `@nestjs/swagger` 붙은 것들)
- Prisma 모델 타입 (`@prisma/client`)
- Guard/Interceptor/Filter용 내부 타입

### ✔ 금지/주의

- packages/types에서 서버 코드(Nest/Prisma) import 금지
- 데코레이터가 붙은 DTO 클래스를 packages/types로 이동 금지
- Prisma 모델을 그대로 공용 타입으로 노출 금지

---

## 10) 인증/인가

- 인증: `@nestjs/passport` + `passport-jwt`
- 토큰 전략:
  - Access Token + (필요 시) Refresh Token

- 인가:
  - `@Roles()` + `RolesGuard`
  - 필요 시 RBAC/권한 테이블 도입

- 현재 사용자:
  - `@CurrentUser()` 데코레이터로 주입

---

## 11) API 설계 (페이징/정렬/검색)

- Base Path: `/api/v1`

- 공통 쿼리 파라미터:
  - `page`: 기본 1
  - `limit`: 기본 20, 최대 100
  - `sort`: 예) `-createdAt,name`
  - `q`: 검색 키워드

- 성공 응답:
  - { "success": true, "data": { ... } }

- 실패 응답:
  - docs/shared/common-rules.md 포맷 준수

- 페이징 응답 예:

  ```json
  {
    "success": true,
    "data": {
      "items": [],
      "page": 1,
      "limit": 20,
      "total": 0
    }
  }
  ```

---

## 12) 보안

- 기본적으로 다음 미들웨어/기능 적용 (구체 구현은 추후):
  - Helmet
  - Rate Limit
  - CORS 화이트리스트

- 파일 업로드:
  - 확장자/Content-Type 화이트리스트
  - 사이즈 제한
  - 임시 디렉터리 분리

- 비밀번호 해시:
  - Argon2id 권장 (또는 bcrypt/scrypt)

- 로그에 민감정보 노출 금지 (PII/시크릿 금지, 필요시 마스킹)

- 시크릿/토큰 하드코딩 금지

---

## 13) Swagger

- `@nestjs/swagger`로 자동 문서화
- 인증 필요 엔드포인트는 BearerAuth 스키마 명시
- DTO / 응답 / 에러 예시를 Swagger에 함께 정의

---

## 14) 테스트

- 단위 테스트: Service/Guard/Pipe 기준(Jest)
- e2e:
  - `@nestjs/testing` + 별도 테스트 DB/스키마

- 최소 기준:
  - 핵심 도메인 플로우 e2e 1개 이상

---

## 15) 금지 사항

- 컨트롤러에서 비즈니스 로직/복잡 Prisma 직접 호출
- DTO/Validation 없이 body 사용
- 공통 응답 포맷({ success, data / error }) 임의 변경
- 시크릿/DB URL을 코드에 직접 하드코딩
- 사용하지 않는 코드/파일 방치

---
