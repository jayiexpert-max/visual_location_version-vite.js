import { apiPost, getErrorMessage } from './apiClient';

export interface AbdulChatResponse {
  intent: string;
  param?: string;
  data: Record<string, string | number | null>[] | null;
  count: number;
  sql_debug?: string;
  response_ms: number;
  question?: string;
  error?: string;
}

export async function askAbdulChat(question: string): Promise<AbdulChatResponse> {
  return apiPost<AbdulChatResponse>('/abdul-chat/ask', { question });
}

export function getAbdulChatErrorMessage(error: unknown, fallback: string): string {
  return getErrorMessage(error, fallback);
}
