import { useEffect, useState } from "react";
import styled from "styled-components";
import TransactionForm from "./TransactionForm";
import RecentTransactions from "./RecentTransactions";

export default function TransactionsPage() {
  const [ledgerId, setLedgerId] = useState<string>("");

  useEffect(() => {
  }, []);

  return (
    <Wrap>
      <Header>
        <h1>거래 입력</h1>
        <p className="desc">
          수입/지출/이체를 기록하면 자산 잔액이 즉시 반영돼요.
        </p>
      </Header>

      <Panel>
        <Label>가계부 ID</Label>
        <Row>
          <Input
            placeholder="e.g., cmfxxxxxxxxxxxxxxxxxxxx"
            value={ledgerId}
            onChange={(e) => setLedgerId(e.target.value)}
          />
          <Hint>임시로 가계부 ID를 직접 입력해요. (차후 가계부 선택 UI로 대체)</Hint>
        </Row>
      </Panel>

      {ledgerId ? (
        <Grid>
          <TransactionForm ledgerId={ledgerId} />
          <RecentTransactions ledgerId={ledgerId} />
        </Grid>
      ) : (
        <Disabled>
          거래 입력 폼을 사용할 수 없어요. 위에 가계부 ID를 입력해 주세요.
        </Disabled>
      )}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: 18px;
`;

const Header = styled.div`
  h1 {
    margin: 0;
    font-size: 22px;
  }
  .desc {
    color: #666;
    margin-top: 4px;
  }
`;

const Panel = styled.div`
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px;
`;

const Label = styled.div`
  font-weight: 600;
  margin-bottom: 8px;
`;

const Row = styled.div`
  display: grid;
  gap: 8px;
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 10px;
`;

const Hint = styled.div`
  color: #888;
  font-size: 12px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 16px;
`;

const Disabled = styled.div`
  color: #777;
  padding: 16px;
  border: 1px dashed #ccc;
  border-radius: 12px;
`;
