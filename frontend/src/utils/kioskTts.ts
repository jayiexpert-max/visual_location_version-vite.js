/**
 * Thin wrapper — delegates to PHP's window.TtsVoicePicker (public/assets/tts-voice-picker.js).
 * Loaded synchronously from index.html before React, same as layout_3d.php / tv_display.php.
 */

let cachedVoices: SpeechSynthesisVoice[] = [];

function picker(): Window['TtsVoicePicker'] {
  return typeof window !== 'undefined' ? window.TtsVoicePicker : undefined;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function loadVoicesCache(): SpeechSynthesisVoice[] {
  const p = picker();
  cachedVoices = p ? p.loadVoices() : [];
  return cachedVoices;
}

export function initKioskVoices(): void {
  if (!isSpeechSynthesisSupported()) return;

  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      loadVoicesCache();
    };
  }

  loadVoicesCache();
}

export function loadKioskVoices(): SpeechSynthesisVoice[] {
  return cachedVoices.length ? cachedVoices : loadVoicesCache();
}

export function cancelKioskSpeech(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function readKioskAudioEnabled(
  storageKey: string,
  searchParams?: URLSearchParams,
  legacyKeys: string[] = [],
): boolean {
  const param = searchParams?.get('sound');
  if (param === '1' || param === 'true') return true;
  if (param === '0' || param === 'false') return false;
  if (localStorage.getItem(storageKey) === 'true') return true;
  for (const key of legacyKeys) {
    if (localStorage.getItem(key) === '1') return true;
  }
  return false;
}

export function writeKioskAudioEnabled(storageKey: string, enabled: boolean): void {
  localStorage.setItem(storageKey, enabled ? 'true' : 'false');
}

function toggleTestMessage(turningOn: boolean, lang: string, context: 'tv' | '3d'): string {
  const forThai = lang.startsWith('th');
  if (turningOn) {
    return forThai
      ? context === '3d'
        ? 'ระบบเสียง 3D พร้อมใช้งาน'
        : 'ระบบเสียงพร้อมใช้งาน'
      : context === '3d'
        ? '3D Audio Online'
        : 'Audio Online';
  }
  return forThai ? 'ปิดเสียงแล้ว' : 'Sound disabled';
}

/** PHP toggleAudio() — TtsVoicePicker.speak on enable, cancel on disable. */
export function speakKioskToggleTest(
  turningOn: boolean,
  lang: string,
  context: 'tv' | '3d' = 'tv',
): void {
  const p = picker();
  if (!p) {
    console.error('[TTS] TtsVoicePicker not loaded — check index.html script tag');
    return;
  }

  initKioskVoices();

  if (!turningOn) {
    cancelKioskSpeech();
    return;
  }

  let voices = loadKioskVoices();
  if (!voices.length) voices = loadVoicesCache();

  const forThai = lang.startsWith('th');
  const testMsg = toggleTestMessage(true, lang, context);
  
  playAlertBeep();
  
  // Defer past click handler — avoids Chrome eating speech after user gesture.
  // Delay 500ms to allow alert beep to play first.
  window.setTimeout(() => {
    const thRate = p.THAI_SPEECH_RATE ?? 0.42;
    const enRate = p.EN_SPEECH_RATE ?? 0.65;
    p.speak(testMsg, voices, forThai, { rate: forThai ? thRate : enRate });
  }, 500);
}

export function unlockKioskAudio(lang: string, context: 'tv' | '3d' = 'tv'): void {
  speakKioskToggleTest(true, lang, context);
}

/** PHP speak() for highlight announcements. */
export function speakKiosk(text: string, lang: string, enabled: boolean, retry = 0): void {
  if (!enabled || !text) return;

  const p = picker();
  if (!p || !isSpeechSynthesisSupported()) return;

  initKioskVoices();

  if (loadKioskVoices().length === 0) {
    loadVoicesCache();
    if (loadKioskVoices().length === 0 && retry < 8) {
      setTimeout(() => speakKiosk(text, lang, enabled, retry + 1), 500);
      return;
    }
  }

  const forThai = lang.startsWith('th');
  const voices = loadKioskVoices();
  
  playAlertBeep();
  
  window.setTimeout(() => {
    const thRate = p.THAI_SPEECH_RATE ?? 0.42;
    const enRate = p.EN_SPEECH_RATE ?? 0.65;
    p.speak(text, voices, forThai, { rate: forThai ? thRate : enRate });
  }, 500);
}

export function logKioskVoices(): void {
  const p = picker();
  const voices = loadKioskVoices();
  if (p) p.logVoices(voices, 'th');
}

let audioCtx: AudioContext | null = null;

function ensureAudio(): AudioContext | null {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  }
  try {
    audioCtx = new AudioContext();
    return audioCtx;
  } catch {
    return null;
  }
}

export function playAlertBeep(): void {
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  [880, 1175].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    const t0 = now + i * 0.22;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    osc.start(t0);
    osc.stop(t0 + 0.18);
  });
}
