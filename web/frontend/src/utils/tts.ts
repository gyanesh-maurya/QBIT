/**
 * TTS for user poke notifications using the Web Speech API (SpeechSynthesis).
 * Only speaks when the browser supports it; uses detected language for voice selection.
 */

const SS = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

/** Detect language code from text using script heuristics (no external deps). */
function detectLang(text: string): string {
  if (!text || !text.trim()) return 'en';
  const t = text.trim();
  // Hangul
  if (/[\uac00-\ud7af]/.test(t)) return 'ko';
  // Hiragana / Katakana
  if (/[\u3040-\u30ff]/.test(t)) return 'ja';
  // CJK Unified
  if (/[\u4e00-\u9fff]/.test(t)) return 'zh-CN';
  // Cyrillic
  if (/[\u0400-\u04ff]/.test(t)) return 'ru';
  // Arabic
  if (/[\u0600-\u06ff]/.test(t)) return 'ar';
  // Thai
  if (/[\u0e00-\u0e7f]/.test(t)) return 'th';
  // Hebrew
  if (/[\u0590-\u05ff]/.test(t)) return 'he';
  return 'en';
}

let voicesCache: SpeechSynthesisVoice[] | null = null;

function getVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!SS) return Promise.resolve([]);
  if (voicesCache && voicesCache.length > 0) return Promise.resolve(voicesCache);
  const list = SS.getVoices();
  if (list.length > 0) {
    voicesCache = list;
    return Promise.resolve(list);
  }
  return new Promise((resolve) => {
    const onVoices = () => {
      SS.removeEventListener('voiceschanged', onVoices);
      voicesCache = SS.getVoices();
      resolve(voicesCache || []);
    };
    SS.addEventListener('voiceschanged', onVoices);
    // Some browsers fire synchronously; re-check after a tick
    const sync = SS.getVoices();
    if (sync.length > 0) {
      SS.removeEventListener('voiceschanged', onVoices);
      voicesCache = sync;
      resolve(sync);
    }
  });
}

/** Pick a voice that supports the given language (lang e.g. 'en', 'zh-CN'). */
function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const primary = voices.find((v) => v.lang === lang || v.lang.startsWith(lang + '-'));
  if (primary) return primary;
  const fallback = voices.find((v) => v.lang.startsWith(lang.split('-')[0]));
  return fallback || voices[0] || null;
}

/**
 * Whether the environment supports TTS (Web Speech API available).
 * Call this to decide whether to attempt speaking.
 */
export function isTTSSupported(): boolean {
  return Boolean(SS);
}

/**
 * Speak the given text using the Web Speech API.
 * Uses detected language from text to choose a voice when available.
 * No-op if TTS is not supported or no voices are available.
 */
export function speakPokeMessage(from: string, text: string): void {
  if (!SS) return;
  const full = text.trim() ? `Poke from ${from}. ${text}` : `Poke from ${from}.`;
  getVoices().then((voices) => {
    if (voices.length === 0) return;
    const lang = detectLang(full);
    const voice = pickVoice(voices, lang);
    SS.cancel();
    const u = new SpeechSynthesisUtterance(full);
    u.lang = lang;
    if (voice) u.voice = voice;
    SS.speak(u);
  });
}
