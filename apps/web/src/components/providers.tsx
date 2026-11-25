'use client';
import { MotionConfig, LazyMotion, domAnimation } from 'motion/react';
import { Toaster } from 'sonner';
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
      <Toaster
        dir="rtl"
        position="top-center"
        toastOptions={{
          style: {
            background: '#fff5e6',
            color: '#30202a',
            borderColor: '#d4af70',
            fontFamily: 'var(--font-vazir)',
          },
        }}
      />
    </MotionConfig>
  );
}
