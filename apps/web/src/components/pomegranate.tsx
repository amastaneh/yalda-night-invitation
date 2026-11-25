'use client';
import * as motion from 'motion/react-m';
import { number } from '../../../../packages/shared/src';
export function Pomegranate({ count, celebrate = false }: { count: number; celebrate?: boolean }) {
  const seeds = Array.from({ length: Math.min(count, 90) }, (_, i) => {
    const a = i * 2.39996323;
    const r = Math.sqrt((i + 0.5) / Math.max(1, Math.min(count, 90))) * 79;
    return { x: 120 + Math.cos(a) * r, y: 136 + Math.sin(a) * r };
  });
  return (
    <div className={`pomegranate ${celebrate ? 'celebrate' : ''}`}>
      <svg
        viewBox="0 0 240 255"
        role="img"
        aria-label={`${number(count)} مهمان تأییدشده، هر نفر یک دانه انار`}
      >
        <defs>
          <radialGradient id="fruit">
            <stop stopColor="#7b203b" />
            <stop offset="1" stopColor="#391423" />
          </radialGradient>
          <radialGradient id="seed">
            <stop stopColor="#f99a92" />
            <stop offset=".4" stopColor="#d53458" />
            <stop offset="1" stopColor="#8e163b" />
          </radialGradient>
        </defs>
        <path d="M102 40 92 10 111 23 120 5 130 23 150 10 139 40" fill="#b58a52" />
        <path
          d="M120 36C173 23 219 71 219 133c0 64-37 108-99 108S21 197 21 133C21 71 67 23 120 36Z"
          fill="url(#fruit)"
          stroke="#b25b6a"
          strokeWidth="1"
        />
        <path
          d="M120 48v179M37 117l83 29 83-29M64 202l56-56 56 56"
          stroke="#b9787f"
          strokeOpacity=".2"
          fill="none"
        />
        {seeds.map((s, i) => (
          <motion.ellipse
            key={i}
            cx={s.x}
            cy={s.y}
            rx="5.8"
            ry="8"
            fill="url(#seed)"
            transform={`rotate(${i * 43} ${s.x} ${s.y})`}
            initial={celebrate ? { opacity: 0, scale: 0.1 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.025, 1.5) }}
          />
        ))}
      </svg>
    </div>
  );
}
