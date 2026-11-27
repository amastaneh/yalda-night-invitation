'use client';
import Image from 'next/image';
import { ArrowDown } from 'lucide-react';
import { basePath } from '@/lib/api';

// A single 3:2 canvas holds the image and its overlays. Cover scaling crops that
// canvas as a whole, preserving flame/tea alignment even in portrait viewports.
export function LivingPhoto({ onReady }: { onReady: () => void }) {
  return (
    <div className="winter-hero-art">
      <div className="living-photo-canvas">
        <Image
          src={`${basePath}/images/yalda-dusk.webp`}
          alt="سفرهٔ یلدا با انار، هندوانه، شیرینی، آجیل، حافظ و شاهنامه در نور گرم غروب کنار پنجرهٔ برفی"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'contain' }}
          unoptimized
          onLoad={onReady}
          onError={onReady}
        />
        <svg
          className="living-photo-effects"
          viewBox="0 0 1536 1024"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <radialGradient id="candle-glow">
              <stop stopColor="#ffe6ab" stopOpacity=".42" />
              <stop offset="1" stopColor="#f0b367" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="candle-flame" x1="0" y1="1" x2="0" y2="0">
              <stop stopColor="#ffd08b" stopOpacity=".4" />
              <stop offset=".45" stopColor="#fff1cd" stopOpacity=".68" />
              <stop offset="1" stopColor="#fffbe8" stopOpacity=".38" />
            </linearGradient>
            <filter id="candle-softness" x="-40%" y="-15%" width="180%" height="130%">
              <feGaussianBlur stdDeviation=".65" />
            </filter>
            <filter id="tea-softness" x="-80%" y="-30%" width="260%" height="170%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          {[
            { x: 1076, y: 214, s: 1 },
            { x: 1172, y: 288, s: 0.85 },
            { x: 1130, y: 365, s: 0.93 },
          ].map((c, i) => (
            <g key={c.x} transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
              <ellipse
                className="candle-halo"
                cx="0"
                cy="-24"
                rx="28"
                ry="42"
                fill="url(#candle-glow)"
                style={{ animationDelay: `-${i * 0.7}s` }}
              />
              <path
                className="candle-flame"
                d="M0 0 C-14 -7 -13 -26 -4 -43 C-2 -48 -1 -52 0 -55 C3 -46 5 -40 8 -32 C16 -17 14 -5 0 0Z"
                fill="url(#candle-flame)"
                filter="url(#candle-softness)"
                style={{ animationDelay: `-${i * 0.43}s`, animationDuration: `${2.7 + i * 0.4}s` }}
              />
            </g>
          ))}
          {[
            { x: 1250, y: 786 },
            { x: 1370, y: 746 },
          ].map((cup, i) => (
            <g key={cup.x} transform={`translate(${cup.x} ${cup.y})`} filter="url(#tea-softness)">
              {[0, 1, 2].map((j) => (
                <path
                  key={j}
                  className="tea-steam"
                  d={`M${j * 8 - 8} 0 C${-22 + j * 5} -28 ${23 + j * 5} -48 ${j * 8 - 10} -75 S${j * 5 - 15} -103 ${j * 7 + 5} -125`}
                  fill="none"
                  stroke="#fff5e3"
                  strokeWidth={5 - j * 0.5}
                  strokeLinecap="round"
                  style={{ animationDelay: `-${i * 2 + j * 1.8}s`, animationDuration: `${6 + j}s` }}
                />
              ))}
            </g>
          ))}
        </svg>
      </div>
      <div className="living-photo-snow" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 37 + 3) % 100}%`,
              width: `${2 + (i % 4)}px`,
              height: `${2 + (i % 4)}px`,
              animationDelay: `-${i * 1.7}s`,
              animationDuration: `${13 + (i % 9)}s`,
            }}
          />
        ))}
      </div>
      <a className="photo-scroll-cue" href="#invitation-intro">
        ادامهٔ دعوت‌نامه <ArrowDown size={16} />
      </a>
    </div>
  );
}
