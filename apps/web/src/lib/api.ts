export const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8787';
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
  const token = getSession(scope);
  const response = await fetch(`${API}/api${path}`, {
    method: method || (data === undefined ? 'GET' : 'POST'),
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'ارتباط برقرار نشد.' }));
    throw new Error(error.error || 'خطایی رخ داد.');
  }
  if (response.headers.get('Content-Type')?.includes('text/csv'))
    return (await response.text()) as T;
  return response.json();
}
export function download(contents: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
