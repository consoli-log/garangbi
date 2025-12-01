-- 쪼개부기 PostgreSQL 기본 스키마

-- 1. 사용자 / 계정 관련

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 사용자
CREATE TABLE users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email            CITEXT UNIQUE NOT NULL,
    email_verified_at TIMESTAMPTZ,
    password_hash    TEXT NOT NULL,
    nickname         VARCHAR(50) NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'active', -- active, locked, pending, deleted
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at    TIMESTAMPTZ
);

-- 소셜 로그인 연동 (구글/카카오 등)
CREATE TABLE user_social_accounts (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider           VARCHAR(30) NOT NULL, -- google, kakao 등
    provider_user_id   TEXT NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id),
    UNIQUE (user_id, provider)
);

-- 이메일 인증 토큰
CREATE TABLE email_verification_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 비밀번호 재설정 토큰
CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 가계부(책) 및 공유

-- 가계부(책) 단위
CREATE TABLE books (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name          VARCHAR(100) NOT NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'KRW',
    color_theme   VARCHAR(30),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 가계부 멤버 + 권한
CREATE TABLE book_members (
    book_id    UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL, -- owner, editor, viewer 등
    status     VARCHAR(20) NOT NULL DEFAULT 'active', -- active, invited, removed 등
    invited_at TIMESTAMPTZ,
    joined_at  TIMESTAMPTZ,
    PRIMARY KEY (book_id, user_id)
);

-- 3. 자산/부채

-- 자산/부채 그룹
CREATE TABLE asset_groups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id     UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    kind        VARCHAR(20) NOT NULL, -- asset, liability
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 개별 자산/부채
CREATE TABLE assets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id             UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    group_id            UUID REFERENCES asset_groups(id) ON DELETE SET NULL,
    name                VARCHAR(100) NOT NULL,
    asset_type          VARCHAR(30) NOT NULL, -- cash, bank_account, card, loan, investment ...
    currency_code       CHAR(3) NOT NULL DEFAULT 'KRW',
    balance             NUMERIC(18,2) NOT NULL DEFAULT 0,
    is_in_net_worth     BOOLEAN NOT NULL DEFAULT TRUE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order          INT NOT NULL DEFAULT 0,
    external_account_id UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. 카테고리 & 예산

-- 카테고리
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id     UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
    name        VARCHAR(100) NOT NULL,
    kind        VARCHAR(20) NOT NULL, -- income / expense / transfer 등
    sort_order  INT NOT NULL DEFAULT 0,
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 예산 헤더
CREATE TABLE budgets (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id        UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    period_start   DATE NOT NULL,
    period_end     DATE NOT NULL,
    carryover_mode VARCHAR(20) NOT NULL DEFAULT 'none',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (book_id, period_start, period_end)
);

-- 예산 항목
CREATE TABLE budget_items (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id        UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category_id      UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    planned_amount   NUMERIC(18,2) NOT NULL,
    carryover_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    memo             TEXT,
    UNIQUE (budget_id, category_id)
);

-- 5. 거래 & 쪼개기

-- 거래(원장)
CREATE TABLE transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id             UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    asset_id            UUID REFERENCES assets(id) ON DELETE SET NULL,
    counter_asset_id    UUID REFERENCES assets(id) ON DELETE SET NULL,
    transaction_date    DATE NOT NULL,
    posted_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    amount              NUMERIC(18,2) NOT NULL,
    currency_code       CHAR(3) NOT NULL DEFAULT 'KRW',
    memo                TEXT,
    raw_text            TEXT,
    source              VARCHAR(20) NOT NULL DEFAULT 'manual',
    bank_transaction_id TEXT,
    is_confirmed        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (book_id, bank_transaction_id)
        DEFERRABLE INITIALLY DEFERRED
);

-- 거래 쪼개기
CREATE TABLE transaction_splits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    amount          NUMERIC(18,2) NOT NULL,
    memo            TEXT
);

-- 6. 금융 연동

-- 사용자-금융사 연결
CREATE TABLE bank_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    connected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_synced_at  TIMESTAMPTZ,
    error_code      VARCHAR(100),
    error_message   TEXT
);

-- 금융 계좌/카드
CREATE TABLE bank_accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_connection_id  UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    external_account_id TEXT NOT NULL,
    name                VARCHAR(100) NOT NULL,
    account_number_mask VARCHAR(50),
    currency_code       CHAR(3) NOT NULL DEFAULT 'KRW',
    kind                VARCHAR(20) NOT NULL,
    linked_asset_id     UUID REFERENCES assets(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (bank_connection_id, external_account_id)
);

-- 동기화 로그
CREATE TABLE bank_sync_logs (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at        TIMESTAMPTZ,
    status             VARCHAR(20) NOT NULL,
    message            TEXT
);

-- 7. 구독/플랜

CREATE TABLE plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(50) NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    price_month NUMERIC(18,2) NOT NULL DEFAULT 0,
    currency    CHAR(3) NOT NULL DEFAULT 'KRW',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id        UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    status         VARCHAR(20) NOT NULL,
    started_at     TIMESTAMPTZ NOT NULL,
    canceled_at    TIMESTAMPTZ,
    expires_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscription_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    paid_at         TIMESTAMPTZ NOT NULL,
    amount          NUMERIC(18,2) NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'KRW',
    method          VARCHAR(30),
    external_id     TEXT,
    status          VARCHAR(20) NOT NULL
);
