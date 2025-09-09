import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useAssetsStore } from "@stores/assets";
import { toast } from "react-toastify";
import Modal from "../../components/Modal";

const GROUP_TYPE_LABEL: Record<string, string> = {
  ASSET: "자산",
  DEBT: "부채",
};
const ASSET_KIND_LABEL: Record<string, string> = {
  CASH: "현금",
  BANK: "은행",
  CHECK_CARD: "체크카드",
  CREDIT_CARD: "신용카드",
  LOAN: "대출",
  INVESTMENT: "투자",
};
const groupTypeLabel = (t: string) => GROUP_TYPE_LABEL[t] ?? t;
const assetKindLabel = (k: string) => ASSET_KIND_LABEL[k] ?? k;

function useActiveLedgerId() {
  const fromQuery = new URLSearchParams(location.search).get("ledgerId");
  const [ledgerId, setLedgerId] = useState<string | null>(() => {
    return fromQuery || localStorage.getItem("activeLedgerId");
  });

  useEffect(() => {
    if (fromQuery && fromQuery !== ledgerId) {
      setLedgerId(fromQuery);
      localStorage.setItem("activeLedgerId", fromQuery);
    }
  }, [fromQuery]);

  return {
    ledgerId,
    setLedgerId: (v: string) => {
      setLedgerId(v);
      localStorage.setItem("activeLedgerId", v);
    },
  };
}

export default function AssetsPage() {
  const { ledgerId, setLedgerId } = useActiveLedgerId();
  const {
    groups,
    selectedGroupId,
    loading,
    fetch,
    selectGroup,
    addGroup,
    addAsset,
    updateGroup,
    updateAsset,
    removeGroup,
    removeAsset,
  } = useAssetsStore();

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  useEffect(() => {
    if (!ledgerId) return;
    fetch(ledgerId);
  }, [ledgerId, fetch]);

  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [openAssetModal, setOpenAssetModal] = useState(false);

  const [gName, setGName] = useState("");
  const [gType, setGType] = useState<"ASSET" | "DEBT">("ASSET");

  const [aName, setAName] = useState("");
  const [aKind, setAKind] = useState("CASH");
  const [aInit, setAInit] = useState<number>(0);

  const handleCreateGroup = async () => {
    if (!ledgerId) return toast.error("ledgerId가 없습니다.");
    if (!gName.trim()) return toast.error("그룹 이름을 입력하세요.");
    await addGroup({ ledgerId, name: gName.trim(), type: gType });
    setGName("");
    setOpenGroupModal(false);
  };

  const handleCreateAsset = async () => {
    if (!ledgerId) return toast.error("ledgerId가 없습니다.");
    if (!selectedGroup) return toast.error("선택된 그룹이 없습니다.");
    if (!aName.trim()) return toast.error("자산 이름을 입력하세요.");
    await addAsset({
      ledgerId,
      groupId: selectedGroup.id,
      name: aName.trim(),
      kind: aKind,
      initialBalance: aInit || 0,
    });
    setAName("");
    setAInit(0);
    setAKind("CASH");
    setOpenAssetModal(false);
  };

  return (
    <Wrap>
      <Header>
        <h1>자산 관리</h1>
        <LedgerBox>
          <label>Ledger ID</label>
          <input
            placeholder="ledgerId를 입력하거나 ?ledgerId= 로 접속"
            value={ledgerId ?? ""}
            onChange={(e) => setLedgerId(e.target.value)}
          />
        </LedgerBox>
      </Header>

      {!ledgerId ? (
        <Empty>
          좌측 상단에 <b>Ledger ID</b>를 입력해 주세요.
        </Empty>
      ) : (
        <Content>
          <Sidebar>
            <SideHead>
              <span>그룹</span>
              <button onClick={() => setOpenGroupModal(true)}>+ 새 그룹</button>
            </SideHead>

            {loading ? (
              <SideEmpty>불러오는 중…</SideEmpty>
            ) : groups.length === 0 ? (
              <SideEmpty>그룹이 없습니다. “새 그룹”을 눌러 만들어 보세요.</SideEmpty>
            ) : (
              <GroupList>
                {groups
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((g) => (
                    <GroupItem
                      key={g.id}
                      data-active={g.id === selectedGroupId}
                      onClick={() => selectGroup(g.id)}
                    >
                      <div>
                        <strong>{g.name}</strong>
                        <small>{groupTypeLabel(g.type)}</small>
                      </div>
                      <GroupActions>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const name = prompt("그룹명 수정", g.name);
                            if (!name) return;
                            updateGroup(g.id, { name });
                          }}
                        >
                          수정
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                "이 그룹을 삭제할까요? 그룹 내 자산의 그룹 연결이 해제됩니다."
                              )
                            ) {
                              removeGroup(g.id);
                            }
                          }}
                        >
                          삭제
                        </button>
                      </GroupActions>
                    </GroupItem>
                  ))}
              </GroupList>
            )}
          </Sidebar>

          <Main>
            <MainHead>
              <div>
                <h2>{selectedGroup ? selectedGroup.name : "선택된 그룹 없음"}</h2>
                <p>
                  {selectedGroup
                    ? `타입: ${groupTypeLabel(selectedGroup.type)}`
                    : "좌측에서 그룹을 선택하세요."}
                </p>
              </div>
              <div>
                <button disabled={!selectedGroup} onClick={() => setOpenAssetModal(true)}>
                  + 새 자산
                </button>
              </div>
            </MainHead>

            {!selectedGroup ? (
              <Empty>좌측에서 그룹을 선택하세요.</Empty>
            ) : selectedGroup.assets.length === 0 ? (
              <Empty>자산이 없습니다. “새 자산”으로 추가하세요.</Empty>
            ) : (
              <Cards>
                {selectedGroup.assets
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((a) => (
                    <Card key={a.id}>
                      <CardTop>
                        <strong>{a.name}</strong>
                        <span>{assetKindLabel(a.kind)}</span>
                      </CardTop>
                      <CardMid>
                        <dl>
                          <dt>초기 금액</dt>
                          <dd>{a.initialBalance.toLocaleString()}원</dd>
                        </dl>
                        <dl>
                          <dt>현재 잔액</dt>
                          <dd>{a.currentBalance.toLocaleString()}원</dd>
                        </dl>
                        <dl>
                          <dt>순자산 포함</dt>
                          <dd>{a.includeInNetWorth ? "포함" : "제외"}</dd>
                        </dl>
                      </CardMid>
                      <CardActions>
                        <button
                          onClick={() => {
                            const name = prompt("자산명 수정", a.name);
                            if (!name) return;
                            updateAsset(a.id, { name });
                          }}
                        >
                          수정
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("이 자산을 삭제할까요?")) removeAsset(a.id);
                          }}
                        >
                          삭제
                        </button>
                      </CardActions>
                    </Card>
                  ))}
              </Cards>
            )}
          </Main>
        </Content>
      )}

      {/* 그룹 생성 모달 */}
      <Modal open={openGroupModal} onClose={() => setOpenGroupModal(false)} title="새 그룹 만들기">
        <FormRow>
          <label>그룹명</label>
          <input value={gName} onChange={(e) => setGName(e.target.value)} />
        </FormRow>
        <FormRow>
          <label>타입</label>
          <select value={gType} onChange={(e) => setGType(e.target.value as any)}>
            <option value="ASSET">자산</option>
            <option value="DEBT">부채</option>
          </select>
        </FormRow>
        <Actions>
          <button onClick={() => setOpenGroupModal(false)}>취소</button>
          <button onClick={handleCreateGroup}>생성</button>
        </Actions>
      </Modal>

      {/* 자산 생성 모달 */}
      <Modal open={openAssetModal} onClose={() => setOpenAssetModal(false)} title="새 자산 만들기">
        <FormRow>
          <label>자산명</label>
          <input value={aName} onChange={(e) => setAName(e.target.value)} />
        </FormRow>
        <FormRow>
          <label>자산 종류</label>
          <select value={aKind} onChange={(e) => setAKind(e.target.value)}>
            <option value="CASH">현금</option>
            <option value="BANK">은행</option>
            <option value="CHECK_CARD">체크카드</option>
            <option value="CREDIT_CARD">신용카드</option>
            <option value="LOAN">대출</option>
            <option value="INVESTMENT">투자</option>
          </select>
        </FormRow>
        <FormRow>
          <label>초기 금액</label>
          <input
            type="number"
            value={aInit}
            onChange={(e) => setAInit(Number(e.target.value || 0))}
          />
        </FormRow>
        <Actions>
          <button onClick={() => setOpenAssetModal(false)}>취소</button>
          <button onClick={handleCreateAsset}>생성</button>
        </Actions>
      </Modal>
    </Wrap>
  );
}

const Wrap = styled.div`
  padding: 16px 20px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 12px;
  h1 {
    font-size: 20px;
    margin: 0;
  }
`;

const LedgerBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  label {
    font-weight: 600;
  }
  input {
    width: 360px;
    max-width: 60vw;
    padding: 8px 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
  }
`;

const Content = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  min-height: calc(100vh - 140px);
`;

const Sidebar = styled.div`
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px;
`;

const SideHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  span {
    font-weight: 700;
  }
  button {
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fff;
  }
`;

const SideEmpty = styled.div`
  color: #888;
  padding: 24px 8px;
  text-align: center;
`;

const GroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const GroupItem = styled.button`
  width: 100%;
  text-align: left;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #eee;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  &[data-active="true"] {
    border-color: #6c8cff;
    box-shadow: 0 0 0 3px rgba(108, 140, 255, 0.2);
  }
  small {
    color: #888;
    margin-left: 6px;
  }
`;

const GroupActions = styled.div`
  display: flex;
  gap: 6px;
  button {
    font-size: 12px;
    padding: 6px 8px;
    border: 1px solid #ddd;
    background: #fff;
    border-radius: 8px;
  }
`;

const Main = styled.div`
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px;
`;

const MainHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f1f1;
  padding-bottom: 8px;
  margin-bottom: 12px;
  h2 {
    margin: 0;
    font-size: 18px;
  }
  p {
    margin: 2px 0 0;
    color: #888;
    font-size: 12px;
  }
  button {
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fff;
  }
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
`;

const Card = styled.div`
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
`;

const CardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  strong {
    font-size: 16px;
  }
  span {
    color: #666;
    font-size: 12px;
  }
`;

const CardMid = styled.div`
  margin-top: 8px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  dl {
    margin: 0;
  }
  dt {
    color: #888;
    font-size: 12px;
  }
  dd {
    margin: 2px 0 0;
    font-weight: 600;
  }
`;

const CardActions = styled.div`
  margin-top: 10px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  button {
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fff;
  }
`;

const Empty = styled.div`
  padding: 32px;
  text-align: center;
  color: #888;
  border: 1px dashed #ddd;
  border-radius: 12px;
  background: #fdfdfd;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
  input,
  select {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
  button {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fff;
  }
`;
