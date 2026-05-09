"use client";

/**
 * Thin wrapper over the browser SpeechRecognition API. Used by the search bar
 * mic button. Falls back gracefully when the API is unavailable (Firefox, some
 * mobile browsers) — callers should also check `isVoiceSupported()`.
 */

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEvent extends Event {
  results: ArrayLike<SpeechRecognitionResult>;
  resultIndex: number;
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: ((e: Event) => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognition;

function getCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isVoiceSupported(): boolean {
  return getCtor() != null;
}

export interface VoiceRecognizerOptions {
  lang?: string;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (e: Event) => void;
  onEnd?: () => void;
}

export function createVoiceRecognizer(opts: VoiceRecognizerOptions): {
  start: () => void;
  stop: () => void;
} | null {
  const Ctor = getCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = opts.lang ?? "uk-UA";
  rec.continuous = false;
  rec.interimResults = true;
  rec.onresult = (e) => {
    let txt = "";
    let isFinal = false;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      txt += r[0].transcript;
      if (r.isFinal) isFinal = true;
    }
    opts.onResult(txt, isFinal);
  };
  rec.onerror = (e) => opts.onError?.(e);
  rec.onend = () => opts.onEnd?.();
  return {
    start: () => {
      try {
        rec.start();
      } catch {
        /* already started or blocked */
      }
    },
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* not started */
      }
    },
  };
}
