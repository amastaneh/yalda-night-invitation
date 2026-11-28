import { requestApi } from './transport';
export const API =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? '/api/party' : 'http://127.0.0.1:8787');
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export type Scope = 'guest' | 'admin';
export function getSession(scope: Scope) {
  return sessionStorage.getItem(`yalda-${scope}`);
}
export function saveSession(scope: Scope, value: string) {
  sessionStorage.setItem(`yalda-${scope}`, value);
}
export async function api<T>(
  path: string,
  scope: Scope = 'guest',
  data?: unknown,
  method?: string,
): Promise<T> {
  if (scope === 'admin' && (API === '/api/party' || new URL(API).hostname === 'script.google.com'))
    throw new Error('مدیریت دعوت‌ها در گوگل‌شیت انجام می‌شود.');
  const endpoint =
    scope === 'guest' && /\/invite\/[0-9]{6}\/?$/.test(window.location.pathname)
      ? '/api/party'
      : API;
  return requestApi<T>(endpoint, path, getSession(scope), data, method);
}
export function download(contents: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
