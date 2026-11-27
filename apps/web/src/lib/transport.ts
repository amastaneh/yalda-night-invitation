export async function requestApi<T>(
  endpoint: string,
  path: string,
  token: string | null,
  data?: unknown,
  method?: string,
): Promise<T> {
  const direct = new URL(endpoint).hostname === 'script.google.com';
  const requestMethod = method || (data === undefined ? 'GET' : 'POST');
  const response = await fetch(direct ? endpoint : `${endpoint}/api${path}`, {
    method: direct ? 'POST' : requestMethod,
    // A simple text POST avoids an unsupported Apps Script OPTIONS preflight.
    headers: direct
      ? { 'Content-Type': 'text/plain;charset=UTF-8' }
      : {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
    body: direct
      ? JSON.stringify({
          path: `/api${path}`,
          method: requestMethod,
          session: token || '',
          body: data,
        })
      : data === undefined
        ? undefined
        : JSON.stringify(data),
    redirect: 'follow',
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  if (!direct && response.ok && response.headers.get('Content-Type')?.includes('text/csv'))
    return (await response.text()) as T;
  const raw: unknown = await response
    .json()
    .catch(() => ({ error: 'ارتباط برقرار نشد. کمی بعد دوباره تلاش کنید.' }));
  const result = raw as { status?: number; error?: string; data?: T & { error?: string } } | null;
  if (!response.ok) throw new Error(result?.error || 'خطایی رخ داد.');
  if (direct) {
    const status = result?.status;
    if (typeof status !== 'number' || !Number.isInteger(status) || status < 200 || status >= 300) {
      if (status === 403) throw new Error('اتصال شیت هنوز به نسخهٔ جدید به‌روزرسانی نشده است.');
      throw new Error(result?.data?.error || result?.error || 'ارتباط با شیت برقرار نشد.');
    }
    return result?.data as T;
  }
  return raw as T;
}
