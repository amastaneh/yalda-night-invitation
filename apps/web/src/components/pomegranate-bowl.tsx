import { useId } from 'react';

export function PomegranateBowl() {
  const id = `bowl-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const bowl = 'M25 56C28 111 56 136 100 136S172 111 175 56Z';
  return (
    <svg className="pomegranate-bowl" viewBox="0 0 200 160" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-seed`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ff7d89" />
          <stop offset=".45" stopColor="#cf294a" />
          <stop offset="1" stopColor="#821a34" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#e4f6e7" stopOpacity=".72" />
          <stop offset=".2" stopColor="#f7fff4" stopOpacity=".08" />
          <stop offset=".7" stopColor="#fffef0" stopOpacity=".04" />
          <stop offset="1" stopColor="#c6e3cc" stopOpacity=".65" />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#ffffee" />
          <stop offset="1" stopColor="#aecbb3" />
        </linearGradient>
        <pattern
          id={`${id}-seeds`}
          width="19"
          height="17"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-13)"
        >
          <rect width="19" height="17" fill="#8f203b" />
          <path
            d="M3 2Q9-1 10 5L9 10Q6 14 2 10L1 6Z"
            fill={`url(#${id}-seed)`}
            stroke="#f08483"
            strokeWidth=".6"
          />
          <path d="M13 9Q19 7 19 13L17 17H12L11 13Z" fill={`url(#${id}-seed)`} />
          <path
            d="M4 3L7 3M13 11L15 10"
            stroke="#ffc5b4"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity=".8"
          />
        </pattern>
        <clipPath id={`${id}-inside`}>
          <path d={bowl} />
        </clipPath>
        <clipPath id={`${id}-top`}>
          <ellipse cx="100" cy="55" rx="72" ry="25" />
        </clipPath>
      </defs>
      <ellipse cx="100" cy="148" rx="68" ry="7" fill="#263e2a" opacity=".12" />
      <g className="bowl-vessel">
        <ellipse
          cx="100"
          cy="138"
          rx="25"
          ry="5"
          fill="#d5e4cb"
          stroke="#96ac8d"
          strokeWidth="1.5"
        />
        <g clipPath={`url(#${id}-inside)`}>
          <rect x="23" y="52" width="154" height="86" fill={`url(#${id}-seeds)`} />
          <path
            d="M28 61C34 105 55 131 100 135C145 131 167 106 172 61"
            fill="none"
            stroke="#4f1a31"
            strokeWidth="13"
            opacity=".13"
          />
        </g>
        <path d={bowl} fill={`url(#${id}-glass)`} stroke={`url(#${id}-rim)`} strokeWidth="3" />
        <ellipse
          cx="100"
          cy="55"
          rx="74"
          ry="27"
          fill={`url(#${id}-seeds)`}
          stroke="#d5e4cb"
          strokeWidth="2.5"
        />
        <g className="bowl-powder-sift" clipPath={`url(#${id}-top)`}>
          <ellipse cx="103" cy="52" rx="32" ry="9" fill="#9aa356" opacity=".42" />
          {Array.from({ length: 60 }, (_, i) => (
            <ellipse
              key={i}
              cx={47 + ((i * 23) % 109)}
              cy={34 + ((i * 11) % 40)}
              rx={i % 3 === 0 ? 2.8 : 1.7}
              ry="1.2"
              fill={i % 3 === 0 ? '#587935' : '#a4ad60'}
              transform={`rotate(${i * 29} ${47 + ((i * 23) % 109)} ${34 + ((i * 11) % 40)})`}
            />
          ))}
        </g>
        <path
          d="M29 58C55 84 145 84 171 58"
          fill="none"
          stroke="#fffde7"
          strokeWidth="3"
          opacity=".8"
        />
        <path
          d="M37 80C42 103 51 116 67 122"
          fill="none"
          stroke="#fffef1"
          strokeWidth="6"
          strokeLinecap="round"
          opacity=".55"
        />
        <path
          d="M159 84C154 104 146 115 136 120"
          fill="none"
          stroke="#e0f6dd"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity=".7"
        />
        <path
          className="bowl-glint"
          d="M59 48L61 42L63 48L69 50L63 52L61 58L59 52L53 50Z"
          fill="#fff6cd"
        />
        <path
          className="bowl-glint bowl-glint-second"
          d="M139 65L141 61L143 65L147 67L143 69L141 73L139 69L135 67Z"
          fill="#fff6cd"
        />
        {[0, 1, 2, 3].map((i) => (
          <circle
            className="bowl-herb-drift"
            key={i}
            cx={80 + i * 13}
            cy={28 + i * 3}
            r="1.5"
            fill="#79924c"
            style={{ animationDelay: `${i * -0.9}s` }}
          />
        ))}
        {[
          { x: 75, y: 43 },
          { x: 103, y: 36 },
          { x: 130, y: 48 },
        ].map((seed, i) => (
          <g key={seed.x} transform={`translate(${seed.x} ${seed.y})`}>
            <g className="bowl-seed-hop" style={{ animationDelay: `${i * -1.3}s` }}>
              <path
                d="M-4-3Q0-7 4-3L4 2Q0 7-4 2Z"
                fill={`url(#${id}-seed)`}
                stroke="#ffc0b5"
                strokeWidth=".7"
              />
              <path d="M-1-3L1-3" stroke="#ffe3ce" strokeWidth="1.3" strokeLinecap="round" />
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}
