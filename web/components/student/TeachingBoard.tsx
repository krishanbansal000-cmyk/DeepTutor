"use client";

import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Palette,
  Play,
  Presentation,
  RotateCcw,
  Square,
  Volume2,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import AssistantResponse from "@/components/common/AssistantResponse";
import Tooltip from "@/components/common/Tooltip";
import { apiFetch, apiUrl } from "@/lib/api";
import {
  playPcm16Stream,
  type PcmStreamPlayback,
} from "@/lib/pcm-stream-player";
import {
  boardSpeechText,
  boardTitleFromMarkdown,
  lessonStepsFromMarkdown,
} from "@/lib/teaching-board";

export default function TeachingBoardButton({
  content,
  variant = "message",
}: {
  content: string;
  variant?: "message" | "composer";
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => lessonStepsFromMarkdown(content), [content]);

  if (!steps.length) return null;
  return (
    <>
      <Tooltip label={t("Open on teaching board")} side="top">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("Open on teaching board")}
          className={
            variant === "composer"
              ? "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]/55 hover:text-[var(--foreground)]"
              : "inline-flex items-center justify-center rounded-md p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]"
          }
        >
          <Presentation size={16} strokeWidth={1.6} />
          {variant === "composer" && <span>{t("Board")}</span>}
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

export function TeachingBoard({
  title,
  steps,
  onClose,
  embedded = false,
  streaming = false,
  checkpoint,
  checkpointPending = false,
  activity,
  supplementary,
}: {
  title: string;
  steps: string[];
  onClose?: () => void;
  embedded?: boolean;
  streaming?: boolean;
  checkpoint?: ReactNode;
  checkpointPending?: boolean;
  activity?: ReactNode;
  supplementary?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [greenBoard, setGreenBoard] = useState(true);
  const [audioState, setAudioState] = useState<"idle" | "loading" | "playing">(
    "idle",
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const streamPlaybackRef = useRef<PcmStreamPlayback | null>(null);
  const audioAbortRef = useRef<AbortController | null>(null);
  const boardScrollRef = useRef<HTMLElement | null>(null);
  const atEnd = current === steps.length - 1;
  const currentStep = steps[current] ?? "";

  const stopAudio = useCallback(() => {
    audioAbortRef.current?.abort();
    audioAbortRef.current = null;
    streamPlaybackRef.current?.stop();
    streamPlaybackRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setAudioState("idle");
  }, []);

  const close = useCallback(() => {
    setPlaying(false);
    stopAudio();
    onClose?.();
  }, [onClose, stopAudio]);

  useEffect(() => {
    if (embedded) return;
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
  }, [close, embedded, steps.length]);

  useEffect(() => {
    if (streaming) {
      setCurrent(Math.max(0, steps.length - 1));
      return;
    }
    setCurrent((value) => Math.min(value, Math.max(0, steps.length - 1)));
  }, [steps.length, streaming]);

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
    if (checkpointPending) setPlaying(false);
  }, [checkpointPending]);

  useEffect(() => {
    stopAudio();
  }, [current, stopAudio]);

  useEffect(() => {
    const scrollRoot = boardScrollRef.current;
    if (!scrollRoot) return;

    // Keep live tokens visible without moving the surrounding chat page. Once
    // generation finishes (or the student changes slides), return to the top
    // of that board step so every lesson remains easy to navigate.
    const frame = window.requestAnimationFrame(() => {
      scrollRoot.scrollTo({
        top: streaming || checkpointPending ? scrollRoot.scrollHeight : 0,
        behavior: streaming || checkpointPending ? "auto" : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [checkpointPending, current, currentStep, streaming]);

  useEffect(() => stopAudio, [stopAudio]);

  const readCurrentStep = useCallback(async () => {
    if (audioState !== "idle") {
      stopAudio();
      return;
    }
    const text = boardSpeechText(steps[current]);
    if (!text) return;
    setAudioState("loading");
    const controller = new AbortController();
    audioAbortRef.current = controller;
    const language = i18n.resolvedLanguage || i18n.language || "en";
    try {
      const response = await apiFetch(apiUrl("/api/v1/voice/tts/stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
        signal: controller.signal,
      });
      if (response.ok && response.body) {
        const playback = playPcm16Stream(response, {
          onStart: () => setAudioState("playing"),
        });
        streamPlaybackRef.current = playback;
        void playback.done
          .catch(() => undefined)
          .finally(() => {
            if (streamPlaybackRef.current === playback) {
              streamPlaybackRef.current = null;
              audioAbortRef.current = null;
              setAudioState("idle");
            }
          });
        return;
      }

      // Preserve compatibility when an administrator switches to a cloud TTS
      // provider that only supports completed audio responses.
      const fallback = await apiFetch(apiUrl("/api/v1/voice/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
        signal: controller.signal,
      });
      if (!fallback.ok) throw new Error("tts unavailable");
      const blob = await fallback.blob();
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
  }, [audioState, current, i18n.language, i18n.resolvedLanguage, steps, stopAudio]);

  return (
    <div
      role={embedded ? "region" : "dialog"}
      aria-modal={embedded ? undefined : true}
      aria-label={t("Teaching board")}
      className={
        embedded
          ? "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-sm"
          : "fixed inset-0 z-[120] flex flex-col bg-[var(--background)]"
      }
    >
      <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3 sm:min-h-16 sm:px-6">
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
          onClick={() => setGreenBoard((value) => !value)}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[13px] font-semibold text-[var(--foreground)]"
          aria-label={t("Change board colour")}
          title={t("Change board colour")}
        >
          <Palette size={17} />
          <span className="hidden sm:inline">
            {greenBoard ? t("White board") : t("Green board")}
          </span>
        </button>
        {!embedded && (
          <button
            type="button"
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
            aria-label={t("Close board")}
          >
            <X size={19} />
          </button>
        )}
      </header>

      {activity ? (
        <div
          className={`shrink-0 overflow-y-auto border-b border-[var(--border)] bg-[var(--card)] px-3 pt-1 sm:px-6 ${
            embedded ? "max-h-[112px]" : "max-h-[34%]"
          }`}
        >
          {activity}
        </div>
      ) : null}

      <div className="flex shrink-0 items-center gap-1.5 border-b border-[var(--border)] bg-[var(--card)] px-3 py-1.5 sm:px-6">
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

      <main
        ref={boardScrollRef}
        className={`min-h-0 min-w-0 flex-1 overscroll-contain overflow-y-auto overflow-x-hidden ${
          embedded ? "p-2 sm:p-3" : "p-3 sm:p-6"
        }`}
      >
        <div className="mx-auto flex min-h-full w-full min-w-0 max-w-4xl flex-col gap-4">
          <article
            className={`teaching-board-surface relative min-h-full min-w-0 w-full shrink-0 overflow-x-hidden rounded-xl px-4 py-6 shadow-[0_16px_48px_rgba(46,38,30,0.18)] sm:px-10 sm:py-8 ${
              greenBoard ? "teaching-board-green" : "teaching-board-white"
            }`}
          >
            <section
              key={current}
              className="teaching-board-step teaching-board-step-active min-w-0"
            >
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.09em] opacity-65">
                <span>{t("Step")}</span>
                <span>{current + 1}</span>
              </div>
              <AssistantResponse
                content={currentStep}
                isStreaming={streaming}
                className="min-w-0 text-[17px] leading-[1.8] sm:text-[19px]"
              />
              {checkpoint ? (
                <div className="mt-5 min-w-0 border-t border-current/20 pt-2">
                  {checkpoint}
                </div>
              ) : null}
            </section>
          </article>
          {supplementary}
        </div>
      </main>

      <footer className="flex min-h-[60px] shrink-0 items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--card)] px-3 py-2 sm:px-6">
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
            disabled={checkpointPending}
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-40"
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
