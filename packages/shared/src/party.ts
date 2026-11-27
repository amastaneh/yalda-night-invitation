// Fixed presentation and party choices live in code, not in editable guest data.
export const giftOptions = [
  {
    id: 'pomegranate',
    title: 'دسر انار',
    note: 'یک ظرف برای پذیرایی؛ پیشنهاد ما انار دانه‌شده است.',
    capacity: 5,
    emoji: '🍎',
  },
  {
    id: 'gift-card',
    title: 'کارت هدیه',
    note: 'آمازون کانادا · کارت دیجیتال ۲۵ دلاری',
    capacity: 20,
    emoji: '🎁',
  },
  {
    id: 'pastry',
    title: 'شیرینی',
    note: 'یک بسته؛ لطفاً برای نوع شیرینی هماهنگ کنید.',
    capacity: 4,
    emoji: '🍰',
  },
  {
    id: 'pin',
    title: 'پین شیر و خورشید',
    note: 'یکی کافیه.',
    capacity: 1,
    emoji: '🎗️',
  },
] as const;
export type GiftKind = (typeof giftOptions)[number]['id'];
export const birthdayGift = {
  amount: 25,
  email: 'amastaneh@gmail.com',
  shopUrl: 'https://www.amazon.ca/gift-cards/b?node=9230166011',
  digitalUrl: 'https://www.amazon.ca/dp/B0F2N3HK6N',
};
export const giftDetailOptions = {
  pomegranate: ['انار دانه‌شده', 'انار قاچ‌شده', 'ژله انار', 'چیزکیک انار', 'دسر اناری دیگر'],
  pastry: [
    'باقلوای پسته‌ای',
    'باسلوق گردویی',
    'شیرینی ناپلئونی',
    'شیرینی لطیفه',
    'شیرینی نخودچی',
    'سایر شیرینی‌ها',
    'قطاب یزدی',
    'شیرینی دانمارکی',
  ],
} as const;
export type GiftDetails = Partial<Record<keyof typeof giftDetailOptions, string>>;
export type GiftChoice = { kind: GiftKind; reserved: number; mine: boolean; detail?: string };
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
export const partyHosts = 'امیر و فی';
export function householdTitle(name: string, memberCount: number) {
  const clean = name.trim().replace(/^خانواده[ٔ‌ی‌]*\s+/u, '');
  return memberCount > 1 ? `خانوادهٔ نازنین ${clean}` : clean;
}
export function torontoDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
