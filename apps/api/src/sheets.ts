type SheetsEnv = { SHEETS_WEBHOOK_URL?: string; SHEETS_WEBHOOK_SECRET?: string };
export async function sheetsRoute(
  req: Request,
  env: SheetsEnv,
  readBody: (request: Request) => Promise<unknown>,
) {
  if (!env.SHEETS_WEBHOOK_URL) return null;
  const path = new URL(req.url).pathname;
  // The spreadsheet itself is the host interface in this mode; never show stale D1 administration.
  if (path.startsWith('/api/admin/') || path === '/api/auth/admin')
    return Response.json({ error: 'مدیریت این رویداد در گوگل‌شیت انجام می‌شود.' }, { status: 409 });
  const allowed = [
    '/api/auth/invite',
    '/api/invitation',
    '/api/guest/rsvp',
    '/api/guest/gift-choice',
    '/api/guest/fortune',
  ];
  if (!allowed.includes(path))
    return path.startsWith('/api/guest/')
      ? Response.json({ error: 'این بخش در حالت شیت فعال نیست.' }, { status: 404 })
      : null;
  const url = new URL(env.SHEETS_WEBHOOK_URL);
  if (
    url.origin !== 'https://script.google.com' ||
    !/^\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(url.pathname) ||
    !env.SHEETS_WEBHOOK_SECRET
  )
    throw new Error('Invalid Sheets backend configuration');
  const session = req.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1] || '';
  try {
    const result = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        secret: env.SHEETS_WEBHOOK_SECRET,
        path,
        method: req.method,
        session,
        body: req.method === 'POST' ? await readBody(req) : undefined,
      }),
    });
    const payload = (await result.json()) as { status: number; data: unknown };
    if (!Number.isInteger(payload.status) || payload.status < 200 || payload.status > 599)
      throw new Error('Invalid Sheets response');
    return Response.json(payload.data, { status: payload.status });
  } catch {
    return Response.json(
      { error: 'ارتباط با گوگل‌شیت برقرار نشد. کمی بعد دوباره تلاش کنید.' },
      { status: 502 },
    );
  }
}
