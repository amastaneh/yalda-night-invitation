// Fixed presentation and party choices live in code, not in editable guest data.
export const giftOptions = [
  { id: 'pomegranate', title: 'انار', note: 'یک ظرف انار دون‌شده', capacity: 4, emoji: '🍎' },
  {
    id: 'gift-card',
    title: 'کارت هدیه',
    note: 'Best Buy · مبلغ به انتخاب شما',
    capacity: 6,
    emoji: '🎁',
  },
  { id: 'pastry', title: 'شیرینی', note: 'یک جعبه برای سفرهٔ یلدا', capacity: 3, emoji: '🍰' },
  {
    id: 'pin',
    title: 'پین شیر و خورشید',
    note: 'برای این شب، فقط یک عدد کافی‌ست',
    capacity: 1,
    emoji: '🎗️',
  },
] as const;
export type GiftKind = (typeof giftOptions)[number]['id'];
export type GiftChoice = { kind: GiftKind; reserved: number; mine: boolean };
export const fortunes = [
  { poem: 'بر سر آنم که گر ز دست برآید\nدست به کاری زنم که غصه سر آید', ghazal: 232 },
  { poem: 'یوسف گمگشته بازآید به کنعان غم مخور\nکلبهٔ احزان شود روزی گلستان غم مخور', ghazal: 255 },
  {
    poem: 'درخت دوستی بنشان که کام دل به بار آرد\nنهال دشمنی برکن که رنج بی‌شمار آرد',
    ghazal: 115,
  },
  { poem: 'رسید مژده که ایام غم نخواهد ماند\nچنان نماند چنین نیز هم نخواهد ماند', ghazal: 179 },
  { poem: 'به حسن و خلق و وفا کس به یار ما نرسد\nتو را در این سخن انکار کار ما نرسد', ghazal: 153 },
] as const;
export type DailyFortune = { day: string; index: number };
export function torontoDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
