import type { SupportedLanguage, UserRole } from '@visual-location/shared';

export interface ApiSuccessResponse<T> {
  status: 'success';
  data: T;
}

export interface ApiErrorResponse {
  status: 'error';
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
  lang: SupportedLanguage;
  email: string | null;
  remark: string | null;
  createdAt: string;
  isActive: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}
