/**
 * POS Sound Effects
 *
 * Uses Web Audio API for instant, low-latency audio feedback.
 * Industry-standard POS systems provide audio cues for:
 * - Successful barcode scan (beep)
 * - Sale completed (chime)
 * - Error / product not found (error tone)
 * - Cash drawer open (click)
 */

type SoundType = "scan" | "success" | "error" | "drawer" | "keypress";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.3): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available — silently fail
  }
}

function playMultiTone(tones: Array<{ freq: number; start: number; duration: number; type?: OscillatorType }>, volume = 0.3): void {
  try {
    const ctx = getAudioContext();

    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = tone.type || "sine";
      osc.frequency.setValueAtTime(tone.freq, ctx.currentTime + tone.start);
      gain.gain.setValueAtTime(volume, ctx.currentTime + tone.start);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + tone.start + tone.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + tone.start);
      osc.stop(ctx.currentTime + tone.start + tone.duration);
    }
  } catch {
    // Audio not available
  }
}

const SOUNDS: Record<SoundType, () => void> = {
  /** Short beep — barcode scanned successfully */
  scan: () => playTone(1200, 0.1, "square", 0.2),

  /** Ascending chime — sale completed */
  success: () => playMultiTone([
    { freq: 523, start: 0, duration: 0.15 },     // C5
    { freq: 659, start: 0.1, duration: 0.15 },   // E5
    { freq: 784, start: 0.2, duration: 0.25 },   // G5
  ], 0.25),

  /** Descending buzz — error / product not found */
  error: () => playMultiTone([
    { freq: 400, start: 0, duration: 0.15, type: "sawtooth" },
    { freq: 300, start: 0.15, duration: 0.2, type: "sawtooth" },
  ], 0.2),

  /** Click — cash drawer */
  drawer: () => playTone(800, 0.05, "square", 0.15),

  /** Soft tap — keypress / button */
  keypress: () => playTone(600, 0.03, "sine", 0.1),
};

/** Play a POS sound effect */
export function playSound(type: SoundType): void {
  SOUNDS[type]?.();
}

/** Initialize audio context (call on first user interaction) */
export function initAudio(): void {
  getAudioContext();
}
