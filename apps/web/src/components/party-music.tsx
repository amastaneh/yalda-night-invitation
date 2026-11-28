'use client';

import { useEffect, useRef, useState } from 'react';
import { Shuffle, Volume2, VolumeX } from 'lucide-react';
import { basePath } from '@/lib/api';
import { mutePartyEffects } from '@/lib/party-sound';

const tracks = [
  { title: 'خونهٔ ما', artist: 'مرجان فرساد', file: 'khooneye-ma.mp3' },
  { title: 'خواب پاییزی', artist: 'فریبرز لاچینی', file: 'autumn-slumber.mp3' },
];

export function PartyMusic() {
  const audio = useRef<HTMLAudioElement>(null);
  const wantsMusic = useRef(true);
  const [track, setTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    player.src = `${basePath}/audio/${tracks[0].file}`;
    player.volume = 0.2;
    const start = () => {
      if (wantsMusic.current && player.paused) void player.play().catch(() => {});
    };
    const startOnInteraction = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('.party-music')) return;
      start();
    };
    start();
    window.addEventListener('pointerdown', startOnInteraction);
    window.addEventListener('keydown', startOnInteraction);
    return () => {
      window.removeEventListener('pointerdown', startOnInteraction);
      window.removeEventListener('keydown', startOnInteraction);
      player.pause();
    };
  }, []);

  function toggle() {
    const player = audio.current;
    if (!player) return;
    if (!player.paused) {
      wantsMusic.current = false;
      mutePartyEffects(true);
      player.pause();
    } else {
      wantsMusic.current = true;
      mutePartyEffects(false);
      if (failed) player.load();
      setFailed(false);
      void player.play().catch(() => {});
    }
  }

  function switchTrack() {
    const player = audio.current;
    if (!player) return;
    const next = (track + 1) % tracks.length;
    setTrack(next);
    setFailed(false);
    player.src = `${basePath}/audio/${tracks[next].file}`;
    if (wantsMusic.current) void player.play().catch(() => {});
  }

  return (
    <aside className={`party-music ${playing ? 'is-playing' : ''}`} aria-label="موسیقی مهمانی">
      <audio
        ref={audio}
        preload="none"
        onEnded={switchTrack}
        onPlay={() => {
          setPlaying(true);
          setFailed(false);
        }}
        onPause={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setFailed(true);
        }}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'قطع موسیقی' : 'پخش موسیقی'}
        title={playing ? 'قطع موسیقی' : 'پخش موسیقی'}
      >
        {playing ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
      <span className="sr-only" aria-live="polite">
        {tracks[track].title}، {tracks[track].artist}
        {failed ? '؛ برای تلاش دوباره، پخش را بزنید' : ''}
      </span>
      <button type="button" onClick={switchTrack} aria-label="تعویض آهنگ" title="اون یکی آهنگ 🎶">
        <Shuffle size={17} />
      </button>
    </aside>
  );
}
