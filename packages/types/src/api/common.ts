export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorInfo {
  code: string;
  message: string | string[];
  status?: number;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorInfo;
}
