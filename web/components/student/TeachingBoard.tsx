"use client";

import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import AssistantResponse from "@/components/common/AssistantResponse";
import Tooltip from "@/components/common/Tooltip";
import { apiFetch, apiUrl } from "@/lib/api";
import {
  boardSpeechText,
  boardTitleFromMarkdown,
  lessonStepsFromMarkdown,
} from "@/lib/teaching-board";

export default function TeachingBoardButton({ content }: { content: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => lessonStepsFromMarkdown(content), [content]);

  if (!steps.length) return null;
  return (
    <>
      <Tooltip label={t("Teach on board")} side="top">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("Teach on board")}
          className="inline-flex items-center justify-center rounded-md p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]"
        >
          <Presentation size={16} strokeWidth={1.6} />
        </button>
      </Tooltip>
      {open && (
        <TeachingBoard
          title={boardTitleFromMarkdown(content)}
          steps={steps}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function TeachingBoard({
  title,
  steps,
  onClose,
}: {
  title: string;
  steps: string[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [audioState, setAudioState] = useState<"idle" | "loading" | "playing">(
    "idle",
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const atEnd = current === steps.length - 1;

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setAudioState("idle");
  }, []);

  const close = useCallback(() => {
    setPlaying(false);
    stopAudio();
    onClose();
  }, [onClose, stopAudio]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") setCurrent((value) => Math.max(0, value - 1));
      if (event.key === "ArrowRight")
        setCurrent((value) => Math.min(steps.length - 1, value + 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, steps.length]);

  useEffect(() => {
    if (!playing) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(
      () => setCurrent((value) => Math.min(steps.length - 1, value + 1)),
      6500,
    );
    return () => window.clearTimeout(timer);
  }, [atEnd, current, playing, steps.length]);

  useEffect(() => {
    stopAudio();
  }, [current, stopAudio]);

  useEffect(() => stopAudio, [stopAudio]);

  const readCurrentStep = useCallback(async () => {
    if (audioState !== "idle") {
      stopAudio();
      return;
    }
    const text = boardSpeechText(steps[current]);
    if (!text) return;
    setAudioState("loading");
    try {
      const response = await apiFetch(apiUrl("/api/v1/voice/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("tts unavailable");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = stopAudio;
      audio.onerror = stopAudio;
      await audio.play();
      setAudioState("playing");
    } catch {
      stopAudio();
    }
  }, [audioState, current, steps, stopAudio]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("Teaching board")}
      className="fixed inset-0 z-[120] flex flex-col bg-[var(--background)]"
    >
      <header className="flex min-h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 sm:px-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#183b5b] text-white">
          <Presentation size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
            {t("Drona teaching board")}
          </div>
          <h2 className="truncate font-serif text-[17px] font-semibold text-[var(--foreground)] sm:text-[20px]">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={close}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
          aria-label={t("Close board")}
        >
          <X size={19} />
        </button>
      </header>

      <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--card)] px-4 py-2 sm:px-6">
        {steps.map((_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${
              index <= current ? "bg-[var(--primary)]" : "bg-[var(--muted)]"
            }`}
          />
        ))}
        <span className="ml-2 shrink-0 text-[12px] font-semibold text-[var(--muted-foreground)]">
          {current + 1} / {steps.length}
        </span>
      </div>

      <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4 sm:p-8">
        <article className="relative w-full max-w-4xl rounded-xl border-2 border-[#183b5b]/30 bg-[#fffdf7] px-5 py-7 shadow-[0_16px_48px_rgba(46,38,30,0.12)] sm:min-h-[420px] sm:px-10 sm:py-10">
          <div className="absolute inset-x-5 top-0 h-1 rounded-b-full bg-[#183b5b] sm:inset-x-10" />
          <AssistantResponse
            content={steps[current]}
            className="text-[17px] leading-[1.8] text-[#25231f] sm:text-[19px]"
          />
        </article>
      </main>

      <footer className="flex min-h-[76px] items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => setCurrent((value) => Math.max(0, value - 1))}
          disabled={current === 0}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 text-[14px] font-semibold disabled:opacity-40"
        >
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">{t("Previous")}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void readCurrentStep()}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)]"
            aria-label={
              audioState === "playing" ? t("Stop") : t("Read this step aloud")
            }
          >
            {audioState === "loading" ? (
              <Loader2 size={18} className="animate-spin" />
            ) : audioState === "playing" ? (
              <Square size={15} className="fill-current" />
            ) : (
              <Volume2 size={19} />
            )}
          </button>
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]"
            aria-label={playing ? t("Pause") : t("Play")}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setCurrent(0);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)]"
            aria-label={t("Restart")}
          >
            <RotateCcw size={17} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCurrent((value) => Math.min(steps.length - 1, value + 1))}
          disabled={atEnd}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#183b5b] px-4 text-[14px] font-semibold text-white disabled:opacity-40"
        >
          <span className="hidden sm:inline">{t("Next")}</span>
          <ChevronRight size={18} />
        </button>
      </footer>
    </div>
  );
}
