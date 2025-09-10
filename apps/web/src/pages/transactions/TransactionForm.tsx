import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { z } from "zod";
import { toast } from "react-toastify";

import { useAssetsStore } from "@stores/assets";
import { useTransactionsStore } from "@stores/transactions";

const schema = z.object({
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"], {
    required_error: "거래 유형을 선택해주세요.",
    invalid_type_error: "유효하지 않은 거래 유형입니다.",
  }),
  date: z.string().min(1, "날짜와 시간을 선택해주세요."),
  amount: z
    .number({ invalid_type_error: "금액은 숫자여야 합니다." })
    .int("금액은 정수여야 합니다.")
    .positive("금액은 0보다 커야 합니다."),
  assetId: z.string().optional(),
  counterAssetId: z.string().optional(),
  memo: z.string().optional(),
});

type FormState = {
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  date: string;
  amount: number | "";
  assetId?: string;
  counterAssetId?: string;
  memo?: string;
};

export default function TransactionForm({ ledgerId }: { ledgerId?: string }) {
  const { assets, fetch: fetchAssets } = useAssetsStore();
  const { createTransaction } = useTransactionsStore();

  const [state, setState] = useState<FormState>({
    type: "EXPENSE",
    date: new Date().toISOString().slice(0, 16),
    amount: "",
    assetId: undefined,
    counterAssetId: undefined,
    memo: "",
  });

  useEffect(() => {
    fetchAssets().catch(() => {});
  }, [fetchAssets]);

  const assetOptions = useMemo(
    () => assets.map((a) => ({ id: a.id, name: a.name })),
    [assets]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!ledgerId) {
        toast.error("가계부 ID를 입력해주세요.");
        return;
      }

      const payload = schema.parse({
        ...state,
        amount:
          typeof state.amount === "string"
            ? Number(state.amount)
            : state.amount,
      });

      if (payload.type === "TRANSFER") {
        if (!payload.assetId || !payload.counterAssetId) {
          toast.error("이체는 출금/입금 자산을 모두 선택해야 합니다.");
          return;
        }
      } else {
        if (!payload.assetId) {
          toast.error("자산을 선택해주세요.");
          return;
        }
      }

      await createTransaction(ledgerId, {
        type: payload.type,
        date: new Date(payload.date).toISOString(),
        amount: payload.amount,
        assetId: payload.assetId,
        counterAssetId: payload.counterAssetId,
        memo: payload.memo,
      });

      setState((s) => ({ ...s, amount: "", memo: "" }));
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.message ||
        err?.message ||
        "거래 저장에 실패했습니다.";
      toast.error(msg);
    }
  };

  const isTransfer = state.type === "TRANSFER";

  return (
    <Card>
      <Header>Record Transaction</Header>

      <Tabs>
        <Tab
          $active={state.type === "EXPENSE"}
          onClick={() => setState((s) => ({ ...s, type: "EXPENSE" }))}
        >
          Expense
        </Tab>
        <Tab
          $active={state.type === "INCOME"}
          onClick={() => setState((s) => ({ ...s, type: "INCOME" }))}
        >
          Income
        </Tab>
        <Tab
          $active={state.type === "TRANSFER"}
          onClick={() => setState((s) => ({ ...s, type: "TRANSFER" }))}
        >
          Transfer
        </Tab>
      </Tabs>

      <form onSubmit={onSubmit}>
        <Row>
          <Label>날짜/시간</Label>
          <Input
            type="datetime-local"
            value={state.date}
            onChange={(e) => setState((s) => ({ ...s, date: e.target.value }))}
            required
          />
        </Row>

        <Row>
          <Label>금액</Label>
          <Input
            type="number"
            min={1}
            step={1}
            value={state.amount}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                amount: e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
            required
          />
        </Row>

        {!isTransfer && (
          <Row>
            <Label>자산</Label>
            <Select
              value={state.assetId ?? ""}
              onChange={(e) =>
                setState((s) => ({ ...s, assetId: e.target.value || undefined }))
              }
              required
            >
              <option value="">선택</option>
              {assetOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Row>
        )}

        {isTransfer && (
          <>
            <Row>
              <Label>보내는 자산</Label>
              <Select
                value={state.assetId ?? ""}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    assetId: e.target.value || undefined,
                  }))
                }
                required
              >
                <option value="">선택</option>
                {assetOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Row>

            <Row>
              <Label>받는 자산</Label>
              <Select
                value={state.counterAssetId ?? ""}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    counterAssetId: e.target.value || undefined,
                  }))
                }
                required
              >
                <option value="">선택</option>
                {assetOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Row>
          </>
        )}

        <Row>
          <Label>
            메모 <Small>(선택)</Small>
          </Label>
          <Input
            type="text"
            value={state.memo ?? ""}
            onChange={(e) => setState((s) => ({ ...s, memo: e.target.value }))}
            placeholder="선택 입력"
          />
        </Row>

        <Actions>
          <Primary type="submit">저장</Primary>
        </Actions>
      </form>
    </Card>
  );
}

const Card = styled.div`
  background: var(--card-bg, #fff);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
`;

const Header = styled.h2`
  margin: 0 0 12px;
  font-size: 20px;
`;

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

const Tab = styled.button<{ $active?: boolean }>`
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid #ddd;
  background: ${({ $active }) => ($active ? "#111" : "#fff")};
  color: ${({ $active }) => ($active ? "#fff" : "#111")};
  cursor: pointer;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr;
  align-items: center;
  gap: 12px;
  margin: 10px 0;
`;

const Label = styled.label`
  color: #444;
  font-size: 14px;
`;

const Small = styled.span`
  color: #888;
  font-weight: 400;
  font-size: 12px;
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 10px;
`;

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 10px;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
`;

const Primary = styled.button`
  background: #111;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  cursor: pointer;
`;
