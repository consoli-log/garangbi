import { create } from "zustand";
import { toast } from "react-toastify";
import assetsApi, { Asset, AssetGroup, ReorderItem } from "@services/assets";

interface AssetsState {
  groups: AssetGroup[];
  selectedGroupId: string | null;
  loading: boolean;
  error: string | null;

  fetch: (ledgerId: string) => Promise<void>;
  selectGroup: (id: string | null) => void;

  addGroup: (input: { ledgerId: string; name: string; type?: "ASSET" | "DEBT" }) => Promise<void>;
  updateGroup: (id: string, data: { name?: string; type?: "ASSET" | "DEBT" }) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  reorderGroups: (ledgerId: string, items: ReorderItem[]) => Promise<void>;

  addAsset: (input: {
    ledgerId: string;
    groupId?: string | null;
    name: string;
    kind: string;
    initialBalance?: number;
    includeInNetWorth?: boolean;
    cardBillingDay?: number | null;
    nextBillingAmount?: number | null;
  }) => Promise<void>;
  updateAsset: (id: string, data: Partial<Omit<Asset, "id" | "ledgerId">>) => Promise<void>;
  removeAsset: (id: string) => Promise<void>;
  reorderAssets: (ledgerId: string, items: ReorderItem[]) => Promise<void>;
}

export const useAssetsStore = create<AssetsState>((set, get) => ({
  groups: [],
  selectedGroupId: null,
  loading: false,
  error: null,

  async fetch(ledgerId) {
    set({ loading: true, error: null });
    try {
      const groups = await assetsApi.getAssetTree(ledgerId);
      set({
        groups,
        loading: false,
        selectedGroupId: groups[0]?.id ?? null,
      });
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? "자산을 불러오지 못했습니다." });
      toast.error("자산을 불러오지 못했습니다.");
    }
  },

  selectGroup(id) {
    set({ selectedGroupId: id });
  },

  async addGroup(input) {
    const created = await assetsApi.createGroup(input);
    set((s) => ({ groups: [...s.groups, { ...created, assets: created.assets ?? [] }] }));
    toast.success("그룹이 생성되었습니다.");
  },

  async updateGroup(id, data) {
    const updated = await assetsApi.updateGroup(id, data);
    set((s) => ({
      groups: s.groups.map((g) => (g.id === id ? { ...g, ...updated } : g)),
    }));
    toast.success("그룹이 수정되었습니다.");
  },

  async removeGroup(id) {
    await assetsApi.deleteGroup(id);
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== id),
      selectedGroupId: (s.selectedGroupId === id ? null : s.selectedGroupId),
    }));
    toast.success("그룹이 삭제되었습니다.");
  },

  async reorderGroups(ledgerId, items) {
    const prev = get().groups;
    const reordered = [...prev].sort((a, b) => {
      const oa = items.find((i) => i.id === a.id)?.order ?? a.order;
      const ob = items.find((i) => i.id === b.id)?.order ?? b.order;
      return oa - ob;
    });
    set({ groups: reordered });
    try {
      await assetsApi.reorderGroups(ledgerId, items);
    } catch {
      set({ groups: prev });
      toast.error("그룹 순서 저장에 실패했습니다.");
    }
  },

  async addAsset(input) {
    const a = await assetsApi.createAsset(input);
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === (a.groupId ?? input.groupId) ? { ...g, assets: [...g.assets, a] } : g
      ),
    }));
    toast.success("자산이 생성되었습니다.");
  },

  async updateAsset(id, data) {
    const updated = await assetsApi.updateAsset(id, data);
    set((s) => ({
      groups: s.groups.map((g) => ({
        ...g,
        assets: g.assets.map((a) => (a.id === id ? { ...a, ...updated } : a)),
      })),
    }));
    toast.success("자산이 수정되었습니다.");
  },

  async removeAsset(id) {
    await assetsApi.deleteAsset(id);
    set((s) => ({
      groups: s.groups.map((g) => ({ ...g, assets: g.assets.filter((a) => a.id !== id) })),
    }));
    toast.success("자산이 삭제되었습니다.");
  },

  async reorderAssets(ledgerId, items) {
    const prev = get().groups;
    const patched = prev.map((g) => {
      const mapped = [...g.assets];
      mapped.sort((a, b) => {
        const oa = items.find((i) => i.id === a.id)?.order ?? a.order;
        const ob = items.find((i) => i.id === b.id)?.order ?? b.order;
        return oa - ob;
      });
      return { ...g, assets: mapped };
    });
    set({ groups: patched });
    try {
      await assetsApi.reorderAssets(ledgerId, items);
    } catch {
      set({ groups: prev });
      toast.error("자산 순서 저장에 실패했습니다.");
    }
  },
}));
