import { useEffect } from "react";
import styled from "styled-components";
import { useTransactionsStore } from "@stores/transactions";

export default function RecentTransactions({ ledgerId }: { ledgerId?: string }) {
  const { recent, fetchRecent } = useTransactionsStore();

  useEffect(() => {
    if (ledgerId) fetchRecent(ledgerId).catch(() => {});
  }, [ledgerId, fetchRecent]);

  return (
    <Card>
      <Header>최근 거래 내역</Header>

      {!recent && <Empty>불러오는 중…</Empty>}
      {recent && recent.length === 0 && <Empty>최근 거래 내역이 없습니다.</Empty>}

      <List>
        {recent?.map((t) => (
          <Item key={t.id}>
            <Left>
              <Type $type={t.type}>
                {t.type === "EXPENSE"
                  ? "지출"
                  : t.type === "INCOME"
                  ? "수입"
                  : "이체"}
              </Type>
              <Main>
                <div className="memo">{t.memo || ""}</div>
                <div className="sub">
                  {new Date(t.date).toLocaleString()}
                  {t.assetName &&
                    (t.type === "TRANSFER"
                      ? ` · ${t.assetName} → ${t.counterAssetName ?? "?"}`
                      : ` · ${t.assetName}`)}
                </div>
              </Main>
            </Left>
            <Right>
              <Amount $type={t.type}>
                {t.type === "EXPENSE"
                  ? "−"
                  : t.type === "INCOME"
                  ? "+"
                  : ""}
                ₩{Number(t.amount).toLocaleString()}
              </Amount>
            </Right>
          </Item>
        ))}
      </List>
    </Card>
  );
}

const Card = styled.div`
  background: var(--card-bg, #fff);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
`;

const Header = styled.h3`
  margin: 0 0 12px;
  font-size: 18px;
`;

const Empty = styled.div`
  color: #777;
  font-size: 14px;
`;

const List = styled.div`
  display: grid;
  gap: 10px;
`;

const Item = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 12px;
`;

const Left = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
`;

const Type = styled.span<{ $type: "EXPENSE" | "INCOME" | "TRANSFER" }>`
  font-size: 12px;
  border-radius: 999px;
  padding: 4px 8px;
  color: #fff;
  background: ${({ $type }) =>
    $type === "EXPENSE"
      ? "#e74c3c"
      : $type === "INCOME"
      ? "#2ecc71"
      : "#3498db"};
`;

const Main = styled.div`
  .memo {
    font-weight: 600;
  }
  .sub {
    font-size: 12px;
    color: #777;
    margin-top: 2px;
  }
`;

const Right = styled.div`
  display: flex;
  align-items: center;
`;

const Amount = styled.div<{ $type: "EXPENSE" | "INCOME" | "TRANSFER" }>`
  font-weight: 700;
  color: ${({ $type }) =>
    $type === "EXPENSE"
      ? "#e74c3c"
      : $type === "INCOME"
      ? "#2ecc71"
      : "#333"};
`;
