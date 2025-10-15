# P1 도메인 데이터 모델 계획

남은 P1 범위(TRN-01/02, RPT-01, PLN-01, UX-03, UX-04 등)를 구현하기 위해 `schema.prisma`에 추가해야 할 핵심 엔티티와 관계를 정리한 문서입니다. 현재 스키마에 없는 거래·태그·예산·목표 관련 구조를 중심으로 정리했습니다.

## 1. 핵심 가계부 엔티티

기존 가계부/멤버십 관계를 확장합니다.

| 엔티티 | 용도 | 주요 필드 및 메모 |
| --- | --- | --- |
| `Transaction` | 수입·지출·이체 단일 거래 레코드 | `ledgerId`, `assetId`, `type(enum)`, `direction(INCOME/EXPENSE/TRANSFER)`, `amount`, `transactionDate`, `memo`, `photoUrl`, `receiptId`, `createdById`, `splitParentId`, `status(ACTIVE, SOFT_DELETED)` |
| `TransactionSplit` | 거래 쪼개기(TRN-01) 항목 | `transactionId`, `categoryId`, `amount`, `memo` |
| `TransactionTag` | 거래-태그 다대다 연결 | `transactionId`, `tagId` (복합 Unique) |
| `Tag` | 태그 리포트(RPT-04)용 사용자 정의 라벨 | `ledgerId`, `name`, `type`(향후 시스템 태그 대비), `usageCount` |
| `TransactionAttachment` | 영수증 이미지 등 첨부 | `transactionId`, `fileUrl`, `thumbnailUrl`, `mimeType`, `size` |

### ENUM 제안

- `TransactionType`: `INCOME`, `EXPENSE`, `TRANSFER`
- `TransactionStatus`: `ACTIVE`, `ARCHIVED`, `SOFT_DELETED`

이체의 경우 자산 이동이 2개의 영향을 갖기 때문에 `relatedAssetId` 등을 둬서 단일 엔티티 내에서 처리하고, 서비스 레이어에서 잔액 검증을 수행합니다.

## 2. 예산 & 목표(PLN-01/02)

| 엔티티 | 용도 | 주요 필드 |
| --- | --- | --- |
| `Goal` | 목표 달성 카드 | `ledgerId`, `assetId`, `name`, `targetAmount`, `currentAmount`, `targetDate`, `status`, `achievedAt`, `coverImageUrl` |
| `GoalContribution` | 자산 입금과 목표 연결 | `goalId`, `transactionId`, `amount` |
| `Budget` | 월별 예산 루트(기준 모드별) | `ledgerId`, `year`, `month`, `basis(enum)`, `currency` |
| `BudgetItem` | 예산 항목(대/소분류, 자산 등) | `budgetId`, `categoryId`, `assetId`, `amount`, `path`(계층 계산용), `sortOrder` |
| `BudgetSnapshot` *(선택)* | 보고서용 사전 집계 값 | `budgetId`, `actualAmount`, `remainingAmount` |

ENUM 제안:

- `BudgetBasis`: `CATEGORY`, `ASSET`, `CATEGORY_ASSET`
- `GoalStatus`: `ACTIVE`, `ACHIEVED`, `ARCHIVED`

## 3. 반복 거래 규칙(PLN-03)

| 엔티티 | 용도 | 주요 필드 |
| --- | --- | --- |
| `RecurringRule` | 반복 생성 규칙 본문 | `ledgerId`, `assetId`, `categoryId`, `amount`, `type`, `interval(enum)`, `dayOfMonth`, `dayOfWeek`, `monthOfYear`, `startDate`, `endDate`, `leadTimeDays`, `note`, `isActive`, `createdById` |
| `RecurringInstance` *(선택)* | 생성된 거래 추적용 | `ruleId`, `transactionId`, `scheduledDate`, `status` |

ENUM 제안:

- `RecurringInterval`: `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`
- `RecurringStatus`: `SCHEDULED`, `POSTED`, `SKIPPED`

## 4. 활동 로그 & 알림(SET-04, NTF-02)

기존 초대 테이블 외에 추가합니다.

| 엔티티 | 용도 |
| --- | --- |
| `LedgerActivityLog` | 거래/예산/멤버 변경 등 활동 기록 (`type`, `actorId`, `payload JSON`, `createdAt`) |
| `UserNotificationSetting` | 주간/월간 요약 알림 On/Off |
| `ScheduledDigest` *(선택)* | 생성된 알림 요약 데이터 저장 |

## 5. 관계 요약

- `Ledger` 1—N `Transaction`, `Goal`, `Budget`, `RecurringRule`, `LedgerActivityLog`
- `Transaction` 1—N `TransactionSplit`, `TransactionAttachment`, `GoalContribution`
- `Transaction` N—M `Tag` (`TransactionTag` 연결)
- `Budget` 1—N `BudgetItem` (계층은 `parentItemId` 혹은 `path`로 추적)

## 6. API 초안

NestJS에서 신규 컨트롤러/핸들러가 필요합니다.

- `POST /ledgers/:id/transactions` : 거래 생성(스플릿·태그 포함)
- `GET /ledgers/:id/transactions` : 거래 목록/필터 조회
- `PATCH /transactions/:id`, `DELETE /transactions/:id`
- `POST /ledgers/:id/transactions/import` *(CSV 업로드 대비)*
- `POST /ledgers/:id/goals`, `PATCH`, `GET` (목표 관리)
- `POST /ledgers/:id/budgets`, `GET /budgets/:budgetId` 등
- `POST /ledgers/:id/recurring-rules`
- `GET /ledgers/:id/reports/dashboard` (대시보드 위젯)

실제 구현 전, 위 내용을 기반으로 Prisma 스키마와 마이그레이션을 작성하면서 세부 필드를 확정하면 됩니다.
