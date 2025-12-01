import { API_BASE_PATH } from '@config/api';
import type { ApiErrorResponse } from '@zzogaebook/types';

export class ApiClientError extends Error {
  response?: ApiErrorResponse;

  constructor(message: string, response?: ApiErrorResponse) {
    super(message);
    this.name = 'ApiClientError';
    this.response = response;
  }
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_PATH}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = await parseJson(response);

    if (!response.ok || payload?.success === false) {
      const apiError: ApiErrorResponse =
        payload && payload.success === false
          ? payload
          : {
              success: false,
              error: {
                code: 'NETWORK_ERROR',
                message: '요청을 처리하지 못했습니다.',
                status: response.status,
              },
            };

      throw new ApiClientError(
        typeof apiError.error.message === 'string' ? apiError.error.message : apiError.error.message?.join(', '),
        apiError,
      );
    }

    return (payload?.data ?? null) as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    throw new ApiClientError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  }
}
