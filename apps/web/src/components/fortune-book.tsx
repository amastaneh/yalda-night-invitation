'use client';
import { useEffect, useRef, useState } from 'react';

export function FortuneBook({ opening }: { opening: boolean }) {
  const [peeking, setPeeking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function peek() {
    if (timer.current) clearTimeout(timer.current);
    setPeeking(true);
    timer.current = setTimeout(() => setPeeking(false), 1600);
  }
  return (
    <div
      className={`fortune-book ${opening || peeking ? 'book-peeking' : ''}`}
      aria-hidden="true"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') peek();
      }}
      onPointerDown={peek}
    >
      <div className="fortune-book-frame">
        <div className="fortune-book-paper paper-back" />
        <div className="fortune-book-paper paper-turn">
          <span>✧</span>
        </div>
        <div className="fortune-book-cover">
          <span>✺</span>
          <strong>
            دیوان
            <br />
            حافظ
          </strong>
          <span>✧</span>
        </div>
      </div>
      <span className="book-spark spark-one">✦</span>
      <span className="book-spark spark-two">✧</span>
    </div>
  );
}
