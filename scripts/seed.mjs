import { writeFileSync } from 'node:fs';
import { id, token, hash, passwordHash, sql, runSql } from './local-db.mjs';
const eventId = id(),
  householdId = id(),
  invitationToken = token(),
  adminId = id(),
  salt = token(),
  password = token();
const stamp = new Date().toISOString();
// Illustrative development date, never an actual private event configuration.
const demoStart = new Date(Date.UTC(new Date().getUTCFullYear(), 11, 21, 23));
if (demoStart.getTime() <= Date.now()) demoStart.setUTCFullYear(demoStart.getUTCFullYear() + 1);
const event = {
  title: 'شب یلدا، شبی برای باهم بودن',
  description: 'بهانه‌ای برای کنار هم بودن، خندیدن و ساختن خاطره‌های تازه.',
  startsAt: demoStart.toISOString(),
  endsAt: new Date(demoStart.getTime() + 5 * 3600000).toISOString(),
  deadline: new Date(demoStart.getTime() - 3 * 86400000).toISOString(),
  venue: 'خانهٔ انار — فضای نمایشی',
  address: 'نشانی نمایشی، تورنتو (برای مسیریابی استفاده نشود)',
  parking: 'اطلاعات پارکینگ را میزبان پیش از رویداد تکمیل می‌کند.',
  entrance: 'جزئیات ورود از طریق میزبان اعلام خواهد شد.',
  dressCode: 'هر طور که راحتید؛ یک تکه قرمز، اگر دوست داشتید.',
  host: 'میزبان نمونه',
  contact: 'راه تماس توسط میزبان تنظیم می‌شود.',
  heroUrl: '',
  status: 'open',
  features: {
    gifts: true,
    pomegranate: true,
    feast: true,
    mystery: false,
    hafez: true,
    guestbook: true,
    card: true,
  },
  pomegranateMultiplier: 3,
  pomegranateMax: 30,
};
let statements = `INSERT INTO events VALUES(${sql(eventId)},${sql(JSON.stringify(event))},${sql(stamp)},${sql(stamp)});\n`;
const guests = [];
for (let i = 0; i < 8; i++) {
  const hid = i === 0 ? householdId : id();
  statements += `INSERT INTO households VALUES(${sql(hid)},${sql(eventId)},${sql(['خانوادهٔ بهار', 'خانوادهٔ سرو', 'دوستان آفتاب', 'خانوادهٔ باران', 'خانوادهٔ نیلوفر', 'دوستان ماه', 'خانوادهٔ مهر', 'خانوادهٔ برف'][i])},${sql('عزیزان، جای شما کنار سفرهٔ یلدای ما خالی است.')},${i === 0 ? 1 : 0},0,0,${sql(stamp)},${sql(stamp)});\n`;
  for (let j = 0; j < (i === 0 ? 3 : 2); j++) {
    const gid = id();
    if (i === 0) guests.push(gid);
    statements += `INSERT INTO guests VALUES(${sql(gid)},${sql(hid)},${sql(i === 0 ? ['بهار', 'آرمان', 'رها'][j] : `مهمان نمونه ${i + 1}-${j + 1}`)},${sql(i === 0 && j === 2 ? 'child' : 'adult')},${sql(i > 1 ? 'attending' : 'pending')},0,${sql(stamp)},${sql(stamp)});\n`;
  }
}
statements += `INSERT INTO invitation_tokens VALUES(${sql(id())},${sql(householdId)},${sql(hash(invitationToken))},NULL,${sql(stamp)},${sql(stamp)});\nINSERT INTO admin_users VALUES(${sql(adminId)},${sql('host-' + adminId.slice(0, 8))},${sql(salt)},${sql(passwordHash(password, salt))},${sql(stamp)},${sql(stamp)});\n`;
const campaignId = id();
for (const [kind, cid, config] of [
  [
    'console',
    campaignId,
    {
      name: 'یک بازی، هزار خاطره',
      product: 'Xbox Series X + GTA VI',
      consoleType: 'Xbox Series X',
      imageUrl: '',
      targetCents: 120000,
      purchaseUrl: 'https://www.bestbuy.ca/en-ca/category/best-buy-gift-cards/20277',
      enabled: true,
      milestones: [
        { percent: 25, label: 'مرحلهٔ اول' },
        { percent: 50, label: 'نیمهٔ راه' },
        { percent: 75, label: 'نزدیک به بازی' },
        { percent: 100, label: 'بازی آغاز شد' },
      ],
    },
  ],
  [
    'mystery',
    id(),
    {
      name: 'جعبهٔ راز یلدا',
      product: 'یک غافلگیری برای دورهمی',
      consoleType: 'Mystery',
      imageUrl: '',
      targetCents: 30000,
      purchaseUrl: '',
      enabled: true,
      milestones: [{ percent: 100, label: 'راز آشکار شد' }],
    },
  ],
]) {
  statements += `INSERT INTO gift_campaigns VALUES(${sql(cid)},${sql(eventId)},${sql(kind)},${sql(JSON.stringify(config))},${sql(stamp)},${sql(stamp)});\n`;
}
for (const [name, unit, quantity] of [
  ['هندوانه', 'عدد', 3],
  ['شیرینی ایرانی', 'جعبه', 4],
  ['آجیل شب یلدا', 'بسته', 4],
  ['دسر خانگی', 'ظرف', 3],
])
  statements += `INSERT INTO registry_items VALUES(${sql(id())},${sql(eventId)},${sql(name)},${sql(unit)},${quantity},${sql(stamp)},${sql(stamp)});\n`;
runSql(statements);
writeFileSync(
  '.local-access.json',
  JSON.stringify(
    {
      eventId,
      householdId,
      guests,
      campaignId,
      token: invitationToken,
      username: 'host-' + adminId.slice(0, 8),
      password,
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
console.log(
  'Fictional event created. Local-only invitation and admin credentials are in .local-access.json (gitignored). Never use this data in production.',
);
