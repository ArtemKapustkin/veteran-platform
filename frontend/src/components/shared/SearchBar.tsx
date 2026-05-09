"use client";

import { useEffect, useRef, useState } from "react";
import { MicIcon, SearchIcon } from "@/components/icons";
import { createVoiceRecognizer, isVoiceSupported } from "@/lib/voice";
import { useA11yStore } from "@/lib/store";

export function SearchBar({
  placeholder = "Що шукаєш? Можна голосом",
  initialValue = "",
  onValueChange,
}: {
  placeholder?: string;
  initialValue?: string;
  onValueChange?: (v: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [recording, setRecording] = useState(false);
  const voiceEnabled = useA11yStore((s) => s.voiceInput);
  const recognizerRef = useRef<ReturnType<typeof createVoiceRecognizer> | null>(null);

  useEffect(() => {
    onValueChange?.(value);
  }, [value, onValueChange]);

  const onMic = () => {
    if (!voiceEnabled || !isVoiceSupported()) return;
    if (recording) {
      recognizerRef.current?.stop();
      return;
    }
    const rec = createVoiceRecognizer({
      lang: "uk-UA",
      onResult: (txt) => setValue(txt),
      onEnd: () => setRecording(false),
    });
    if (!rec) return;
    recognizerRef.current = rec;
    rec.start();
    setRecording(true);
  };

  return (
    <div
      className="bg-surface border-border-soft flex h-12 items-center gap-2.5 rounded-2xl border px-3.5 shadow-soft"
    >
      <SearchIcon size={18} stroke="var(--color-text2)" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Пошук подій"
        className="placeholder:text-text-muted text-text flex-1 bg-transparent text-[15px] outline-none"
      />
      <button
        type="button"
        onClick={onMic}
        aria-label={recording ? "Зупинити голосовий ввід" : "Голосовий пошук"}
        aria-pressed={recording}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg"
        style={{
          background: recording ? "#FBE8E8" : "transparent",
          color: recording ? "#C04848" : "var(--color-text2)",
          opacity: voiceEnabled ? 1 : 0.4,
        }}
      >
        <MicIcon size={18} />
        {recording ? (
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-1 rounded-[10px]"
            style={{
              border: "2px solid #C04848",
              animation: "var(--animate-mic-pulse)",
            }}
          />
        ) : null}
      </button>
    </div>
  );
}
