export const id = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
export async function hash(s: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
export async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode(salt),
          iterations: 100000,
          hash: 'SHA-256',
        },
        key,
        256,
      ),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
export function equal(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
