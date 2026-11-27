import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { PartyError, type PartyState } from './state';

type SealedState = {
  version: 1;
  encryption: 'aes-256-gcm';
  nonce: string;
  tag: string;
  data: string;
};
const aad = Buffer.from('yalda-responses-v1');
function keyBytes(value: string) {
  const key = Buffer.from(value.trim(), 'base64');
  if (key.length !== 32 || key.toString('base64') !== value.trim())
    throw new PartyError(503, 'کلید ذخیره‌سازی خصوصی درست تنظیم نشده است.');
  return key;
}
export function encryptionReady(value = process.env.PARTY_DATA_ENCRYPTION_KEY) {
  if (!value) return false;
  try {
    keyBytes(value);
    return true;
  } catch {
    return false;
  }
}
export function encodeState(
  state: PartyState,
  value = process.env.PARTY_DATA_ENCRYPTION_KEY,
): PartyState | SealedState {
  if (!value) {
    if (Object.values(state.responses).some((r) => r.vehicle))
      throw new PartyError(503, 'ثبت مشخصات خودرو هنوز آماده نیست؛ لطفاً با میزبان هماهنگ کنید.');
    return state;
  }
  const nonce = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', keyBytes(value), nonce);
  cipher.setAAD(aad);
  const data = Buffer.concat([cipher.update(JSON.stringify(state), 'utf8'), cipher.final()]);
  return {
    version: 1,
    encryption: 'aes-256-gcm',
    nonce: nonce.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  };
}
export function decodeState(
  input: unknown,
  value = process.env.PARTY_DATA_ENCRYPTION_KEY,
): PartyState {
  const file = input as SealedState | PartyState;
  let state: PartyState;
  if (file && 'encryption' in file) {
    if (!value) throw new PartyError(503, 'کلید خواندن اطلاعات خصوصی در سرور تنظیم نشده است.');
    try {
      if (file.encryption !== 'aes-256-gcm') throw new Error('Unsupported format');
      const decipher = createDecipheriv(
        'aes-256-gcm',
        keyBytes(value),
        Buffer.from(file.nonce, 'base64'),
      );
      decipher.setAAD(aad);
      decipher.setAuthTag(Buffer.from(file.tag, 'base64'));
      state = JSON.parse(
        Buffer.concat([
          decipher.update(Buffer.from(file.data, 'base64')),
          decipher.final(),
        ]).toString('utf8'),
      );
    } catch {
      throw new PartyError(503, 'خواندن اطلاعات خصوصی ممکن نشد؛ کلید ذخیره‌سازی را بررسی کنید.');
    }
  } else state = file;
  if (
    !state ||
    state.version !== 1 ||
    !state.responses ||
    typeof state.responses !== 'object' ||
    Array.isArray(state.responses)
  )
    throw new PartyError(503, 'ساختار فایل اطلاعات معتبر نیست.');
  return state;
}
