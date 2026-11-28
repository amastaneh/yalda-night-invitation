'use client';

let context: AudioContext | undefined;
let muted = false;

export function mutePartyEffects(value: boolean) {
  muted = value;
}

// A tiny paper swish, generated locally and played only after a deliberate action.
export function playCardSound(confirmed = false) {
  if (muted || typeof window === 'undefined' || !window.AudioContext) return;
  try {
    context ??= new AudioContext();
    const audio = context;
    if (audio.state === 'suspended') void audio.resume().catch(() => {});
    const now = audio.currentTime;
    const gain = audio.createGain();
    gain.connect(audio.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(confirmed ? 0.025 : 0.035, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    if (confirmed) {
      const tone = audio.createOscillator();
      tone.type = 'sine';
      tone.frequency.setValueAtTime(660, now);
      tone.frequency.exponentialRampToValueAtTime(990, now + 0.12);
      tone.connect(gain);
      tone.start(now);
      tone.stop(now + 0.18);
      tone.onended = () => {
        tone.disconnect();
        gain.disconnect();
      };
    } else {
      const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.16), audio.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      const source = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(500, now + 0.15);
      filter.Q.value = 0.6;
      source.buffer = buffer;
      source.connect(filter);
      filter.connect(gain);
      source.start(now);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    }
  } catch {
    // Audio is optional; restricted browsers keep the full visual interaction.
  }
}
