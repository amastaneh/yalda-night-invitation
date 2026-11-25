import type { Metadata } from 'next';
import { Vazirmatn, Lalezar, Geist } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';
const vazir = Vazirmatn({
  subsets: ['arabic', 'latin'],
  variable: '--font-vazir',
  display: 'swap',
});
const lalezar = Lalezar({
  weight: '400',
  subsets: ['arabic', 'latin'],
  variable: '--font-lalezar',
  display: 'swap',
});
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
export const metadata: Metadata = {
  title: 'یلدا | بلندترین شب، کنار هم',
  description: 'دعوتی برای باهم بودن در بلندترین شب سال',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${vazir.variable} ${lalezar.variable} ${geist.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
