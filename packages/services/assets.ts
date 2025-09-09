import { api } from './httpClient';

export type AssetKindString =
  | "CASH"
  | "BANK"
  | "CHECK_CARD"
  | "CREDIT_CARD"
  | "LOAN"
  | "INVESTMENT"
  | string;

export interface Asset {
  id: string;
  ledgerId: string;
  groupId: string | null;
  name: string;
  kind: AssetKindString;
  initialBalance: number;
  currentBalance: number;
  includeInNetWorth: boolean;
  cardBillingDay?: number | null;
  nextBillingAmount?: number | null;
  order: number;
}

export interface AssetGroup {
  id: string;
  ledgerId: string;
  name: string;
  type: "ASSET" | "DEBT";
  order: number;
  assets: Asset[];
}

export interface ReorderItem {
  id: string;
  order: number;
}

const assetsApi = {
  async getAssetTree(ledgerId: string): Promise<AssetGroup[]> {
    const res = await api.get("/assets", { params: { ledgerId } });
    return res.data;
  },

  async createGroup(input: {
    ledgerId: string;
    name: string;
    type?: "ASSET" | "DEBT";
  }): Promise<AssetGroup> {
    const res = await api.post("/assets/groups", input);
    return res.data;
  },

  async updateGroup(id: string, data: { name?: string; type?: "ASSET" | "DEBT" }) {
    const res = await api.patch(`/assets/groups/${id}`, data);
    return res.data;
  },

  async deleteGroup(id: string) {
    const res = await api.delete(`/assets/groups/${id}`);
    return res.data;
  },

  async reorderGroups(ledgerId: string, items: ReorderItem[]) {
    const res = await api.post(`/assets/groups/reorder`, { ledgerId, items });
    return res.data;
  },

  async createAsset(input: {
    ledgerId: string;
    groupId?: string | null;
    name: string;
    kind: AssetKindString;
    initialBalance?: number;
    includeInNetWorth?: boolean;
    cardBillingDay?: number | null;
    nextBillingAmount?: number | null;
  }): Promise<Asset> {
    const res = await api.post("/assets", input);
    return res.data;
  },

  async updateAsset(id: string, data: Partial<Omit<Asset, "id" | "ledgerId">>) {
    const res = await api.patch(`/assets/${id}`, data);
    return res.data;
  },

  async deleteAsset(id: string) {
    const res = await api.delete(`/assets/${id}`);
    return res.data;
  },

  async reorderAssets(ledgerId: string, items: ReorderItem[]) {
    const res = await api.post(`/assets/reorder`, { ledgerId, items });
    return res.data;
  },
};

export default assetsApi;
