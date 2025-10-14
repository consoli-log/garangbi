import httpClient from './httpClient';
import {
  Asset,
  AssetGroup,
  CategoryNode,
  CategoryType,
  CreateLedgerPayload,
  LedgerInvitationSummary,
  LedgerMemberRole,
  LedgerSummary,
  ReorderItemPayload,
} from '@garangbi/types';

export const listLedgers = async () => {
  const response = await httpClient.get<LedgerSummary[]>('/ledgers');
  return response.data;
};

export const createLedger = async (payload: CreateLedgerPayload) => {
  const response = await httpClient.post<LedgerSummary>('/ledgers', payload);
  return response.data;
};

export const updateLedger = async (id: string, payload: Partial<CreateLedgerPayload>) => {
  const response = await httpClient.patch<LedgerSummary>(`/ledgers/${id}`, payload);
  return response.data;
};

export const deleteLedger = async (id: string, confirmName: string) => {
  return httpClient.delete(`/ledgers/${id}`, {
    params: { confirmName },
  });
};

export const setMainLedger = async (id: string) => {
  return httpClient.post(`/ledgers/${id}/set-main`);
};

export const getPendingInvitations = async () => {
  const response = await httpClient.get<LedgerInvitationSummary[]>('/invitations');
  return response.data;
};

export const respondInvitation = async (token: string, accept: boolean) => {
  return httpClient.post('/invitations/respond', { token, accept });
};

export const revokeInvitation = async (id: string) => {
  return httpClient.delete(`/invitations/${id}`);
};

export const sendInvitation = async (
  ledgerId: string,
  payload: { email: string; role: LedgerMemberRole },
) => {
  const response = await httpClient.post(`/ledgers/${ledgerId}/invitations`, payload);
  return response.data;
};

export const getLedgerInvitations = async (ledgerId: string) => {
  const response = await httpClient.get<LedgerInvitationSummary[]>(
    `/ledgers/${ledgerId}/invitations`,
  );
  return response.data;
};

export const getAssetGroups = async (ledgerId: string) => {
  const response = await httpClient.get<AssetGroup[]>(`/ledgers/${ledgerId}/asset-groups`);
  return response.data;
};

export const getCategories = async (
  ledgerId: string,
): Promise<{ income: CategoryNode[]; expense: CategoryNode[] }> => {
  const response = await httpClient.get<{ income: CategoryNode[]; expense: CategoryNode[] }>(
    `/ledgers/${ledgerId}/categories`,
  );
  return response.data;
};

export const createAssetGroup = async (
  ledgerId: string,
  payload: { name: string; type: AssetGroup['type'] },
) => {
  const response = await httpClient.post(`/ledgers/${ledgerId}/asset-groups`, payload);
  return response.data;
};

export const createAsset = async (ledgerId: string, payload: Partial<Asset>) => {
  const response = await httpClient.post(`/ledgers/${ledgerId}/assets`, payload);
  return response.data;
};

export const updateAssetGroup = async (groupId: string, payload: Partial<AssetGroup>) => {
  const response = await httpClient.patch(`/asset-groups/${groupId}`, payload);
  return response.data;
};

export const deleteAssetGroup = async (groupId: string) => {
  return httpClient.delete(`/asset-groups/${groupId}`);
};

export const reorderAssetGroups = async (ledgerId: string, items: ReorderItemPayload[]) => {
  return httpClient.post(`/ledgers/${ledgerId}/asset-groups/reorder`, { items });
};

export const updateAsset = async (assetId: string, payload: Partial<Asset>) => {
  const response = await httpClient.patch(`/assets/${assetId}`, payload);
  return response.data;
};

export const deleteAsset = async (assetId: string) => {
  return httpClient.delete(`/assets/${assetId}`);
};

export const reorderAssets = async (ledgerId: string, items: ReorderItemPayload[]) => {
  return httpClient.post(`/ledgers/${ledgerId}/assets/reorder`, { items });
};

export const createCategory = async (
  ledgerId: string,
  payload: { name: string; type: CategoryType; parentId?: string | null },
) => {
  const response = await httpClient.post(`/ledgers/${ledgerId}/categories`, payload);
  return response.data;
};

export const updateCategory = async (
  categoryId: string,
  payload: { name?: string; parentId?: string | null; sortOrder?: number },
) => {
  const response = await httpClient.patch(`/categories/${categoryId}`, payload);
  return response.data;
};

export const deleteCategory = async (categoryId: string) => {
  return httpClient.delete(`/categories/${categoryId}`);
};

export const reorderCategories = async (ledgerId: string, items: ReorderItemPayload[]) => {
  return httpClient.post(`/ledgers/${ledgerId}/categories/reorder`, { items });
};
