import httpClient from './httpClient';
import {
  Asset,
  AssetGroup,
  CategoryNode,
  CreateLedgerPayload,
  InvitationStatus,
  LedgerInvitationSummary,
  LedgerMemberRole,
  LedgerSummary,
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
