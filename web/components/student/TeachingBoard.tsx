"use client";

import {
  Loader2,
  Pause,
  Palette,
  Play,
  Presentation,
  RotateCcw,
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
  minimal = false,
  autoPlay = false,
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
  /** Hide navigation chrome (footer, progress bar) — used when there's only
   *  a single placeholder step with no real lesson yet. */
  minimal?: boolean;
  /** Automatically start speaking + advancing when lesson content arrives.
   *  Used in classroom mode so Drona begins the lecture without the student
   *  having to click Play. */
  autoPlay?: boolean;
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
  const stepRefsRef = useRef<Array<HTMLElement | null>>([]);
  const userScrolledUpRef = useRef(false);
  const autoPlayStartedRef = useRef(false);
  const atEnd = current === steps.length - 1;
  const currentStep = steps[current] ?? "";
  const hasRealSteps = steps.length > 0 && !minimal;

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

  // Esc / arrow-key handling for the standalone (non-embedded) dialog.
  useEffect(() => {
    if (embedded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, embedded]);

  // Keep the current step index in range as steps grow during streaming.
  useEffect(() => {
    if (streaming) {
      setCurrent(Math.max(0, steps.length - 1));
      return;
    }
    setCurrent((value) => Math.min(value, Math.max(0, steps.length - 1)));
  }, [steps.length, streaming]);

  // Auto-play: when content arrives and autoPlay is requested, start playing
  // once. This fires when steps first become available (streaming completes
  // and we have real lesson content). The guard prevents re-triggering.
  useEffect(() => {
    if (!autoPlay || autoPlayStartedRef.current) return;
    if (minimal || streaming || steps.length === 0) return;
    autoPlayStartedRef.current = true;
    setPlaying(true);
  }, [autoPlay, minimal, streaming, steps.length]);

  // Pause when a checkpoint asks the student a question.
  useEffect(() => {
    if (checkpointPending) setPlaying(false);
  }, [checkpointPending]);

  // Stop audio whenever the current step changes (the auto-play effect below
  // will start the new step's audio). This prevents overlapping playback.
  useEffect(() => {
    stopAudio();
  }, [current, stopAudio]);

  // --- Auto-play audio flow ------------------------------------------------
  // When `playing` is true and audio is idle, speak the current step. When
  // the audio finishes, advance to the next step (which triggers this effect
  // again via the `current` dependency). When we reach the end, stop playing.
  // This replaces the old fixed 6.5-second timer with audio-completion-driven
  // advancement — the lecture flows at Drona's speaking pace.
  const advanceOrFinish = useCallback(() => {
    setCurrent((prev) => {
      if (prev >= steps.length - 1) {
        setPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [steps.length]);

  const speakStep = useCallback(
    async (stepIndex: number, signal: AbortSignal) => {
      const text = boardSpeechText(steps[stepIndex] ?? "");
      if (!text) {
        // Nothing to read — skip to next step immediately.
        advanceOrFinish();
        return;
      }
      setAudioState("loading");
      const language = i18n.resolvedLanguage || i18n.language || "en";
      try {
        const response = await apiFetch(apiUrl("/api/v1/voice/tts/stream"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language }),
          signal,
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
                // Audio finished → advance to next step (the auto-play
                // effect will pick up the new current and speak it).
                advanceOrFinish();
              }
            });
          return;
        }

        // Fallback: cloud TTS that only returns a completed audio blob.
        const fallback = await apiFetch(apiUrl("/api/v1/voice/tts"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language }),
          signal,
        });
        if (!fallback.ok) throw new Error("tts unavailable");
        const blob = await fallback.blob();
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setAudioState("idle");
          advanceOrFinish();
        };
        audio.onerror = () => {
          setAudioState("idle");
          advanceOrFinish();
        };
        await audio.play();
        setAudioState("playing");
      } catch {
        stopAudio();
        // TTS failed — skip to next step so the lecture doesn't stall.
        advanceOrFinish();
      }
    },
    [advanceOrFinish, i18n.language, i18n.resolvedLanguage, steps, stopAudio],
  );

  // This is the heart of the auto-play flow: when playing is true and audio
  // is idle, speak the current step. The `current` dependency means it re-
  // fires after each advancement, speaking the next section.
  useEffect(() => {
    if (!playing) return;
    if (atEnd && audioState === "idle") {
      // Already at the last step and nothing is playing — we're done.
      // (The advanceOrFinish callback also handles this, but this catches
      // the case where the last step's audio just finished.)
      return;
    }
    if (audioState !== "idle") return;
    const controller = new AbortController();
    audioAbortRef.current = controller;
    void speakStep(current, controller.signal);
    return () => {
      controller.abort();
    };
  }, [atEnd, audioState, current, playing, speakStep]);

  // Cleanup audio on unmount.
  useEffect(() => stopAudio, [stopAudio]);

  // --- Scroll behavior -----------------------------------------------------
  // Track whether the user has manually scrolled up. When true, we stop
  // auto-scrolling so they can read earlier content without the board
  // fighting them. Reset when the current step changes.
  const handleBoardScroll = useCallback(() => {
    const scrollRoot = boardScrollRef.current;
    if (!scrollRoot) return;
    const distanceFromBottom =
      scrollRoot.scrollHeight - scrollRoot.scrollTop - scrollRoot.clientHeight;
    userScrolledUpRef.current = distanceFromBottom > 120;
  }, []);

  useEffect(() => {
    userScrolledUpRef.current = false;
  }, [current]);

  // Auto-scroll the current spoken section into view (smooth). During
  // streaming, follow the latest content at the bottom.
  useEffect(() => {
    const scrollRoot = boardScrollRef.current;
    if (!scrollRoot) return;

    if (streaming) {
      // During streaming, keep the bottom in view so new tokens are visible.
      if (userScrolledUpRef.current) return;
      const frame = window.requestAnimationFrame(() => {
        scrollRoot.scrollTo({
          top: scrollRoot.scrollHeight,
          behavior: "auto",
        });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    // After streaming: scroll the current spoken section into view.
    if (userScrolledUpRef.current) return;
    const targetEl = stepRefsRef.current[current];
    const frame = window.requestAnimationFrame(() => {
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        scrollRoot.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [current, streaming, currentStep]);

  // Manual re-read of the current section (Volume button). Independent of
  // the auto-play flow — useful when the student wants to hear a section
  // again without restarting the whole lecture.
  const readCurrentStep = useCallback(async () => {
    if (audioState !== "idle") {
      stopAudio();
      return;
    }
    const controller = new AbortController();
    audioAbortRef.current = controller;
    await speakStep(current, controller.signal);
  }, [audioState, current, speakStep, stopAudio]);

  const togglePlay = useCallback(() => {
    if (playing) {
      // Pause: stop audio + advancement. Resume will re-trigger the auto-play
      // effect for the current step.
      stopAudio();
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  }, [playing, stopAudio]);

  const restart = useCallback(() => {
    stopAudio();
    setCurrent(0);
    setPlaying(true);
  }, [stopAudio]);

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

      {/* Continuous scrollable transcript — all lesson sections rendered as
          one flowing document, not discrete slides. The current spoken
          section is highlighted with a left accent border and auto-scrolled
          into view. The student can scroll freely to re-read earlier
          sections while Drona continues speaking. */}
      <main
        ref={boardScrollRef}
        onScroll={handleBoardScroll}
        className={`min-h-0 min-w-0 flex-1 overscroll-contain overflow-y-auto overflow-x-hidden ${
          embedded ? "p-2 sm:p-3" : "p-3 sm:p-6"
        }`}
      >
        <div className="mx-auto flex min-h-full w-full min-w-0 max-w-4xl flex-col gap-4">
          <article
            className={`teaching-board-surface relative min-w-0 w-full overflow-x-hidden rounded-xl px-4 py-6 shadow-[0_16px_48px_rgba(46,38,30,0.18)] sm:px-10 sm:py-8 ${
              greenBoard ? "teaching-board-green" : "teaching-board-white"
            }`}
          >
            <div className="flex flex-col gap-6">
              {steps.map((step, index) => {
                const isCurrent = index === current;
                const isPast = index < current;
                return (
                  <section
                    key={index}
                    ref={(el) => {
                      stepRefsRef.current[index] = el;
                    }}
                    className={`teaching-board-step min-w-0 rounded-lg transition-all duration-500 ${
                      isCurrent
                        ? "teaching-board-step-active border-l-[3px] border-current pl-4 opacity-100"
                        : isPast
                          ? "border-l-[3px] border-transparent pl-4 opacity-55"
                          : "border-l-[3px] border-transparent pl-4 opacity-40"
                    }`}
                  >
                    <AssistantResponse
                      content={step}
                      isStreaming={streaming && isCurrent}
                      className="min-w-0 text-[17px] leading-[1.8] sm:text-[19px]"
                    />
                  </section>
                );
              })}
            </div>
            {checkpoint ? (
              <div className="mt-5 min-w-0 border-t border-current/20 pt-4">
                {checkpoint}
              </div>
            ) : null}
          </article>
          {supplementary}
        </div>
      </main>

      {/* Compact footer: Play/Pause + Restart + manual re-read. No prev/next
          buttons — scrolling handles navigation in the continuous transcript. */}
      {!minimal && (
        <footer className="flex min-h-[56px] shrink-0 items-center justify-center gap-3 border-t border-[var(--border)] bg-[var(--card)] px-3 py-2 sm:px-6">
          <button
            type="button"
            onClick={restart}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]/50"
            aria-label={t("Restart")}
            title={t("Restart")}
          >
            <RotateCcw size={17} />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            disabled={checkpointPending}
            className="flex h-11 min-w-[120px] items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-5 text-[14px] font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary)]/90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={playing ? t("Pause") : t("Play")}
          >
            {playing ? (
              <>
                <Pause size={18} />
                <span>{t("Pause")}</span>
              </>
            ) : (
              <>
                <Play size={18} />
                <span>{t("Play")}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => void readCurrentStep()}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]/50"
            aria-label={
              audioState === "playing"
                ? t("Stop")
                : t("Read this section aloud")
            }
            title={
              audioState === "playing"
                ? t("Stop")
                : t("Read this section aloud")
            }
          >
            {audioState === "loading" ? (
              <Loader2 size={17} className="animate-spin" />
            ) : audioState === "playing" ? (
              <Volume2 size={18} className="text-[var(--primary)]" />
            ) : (
              <Volume2 size={18} />
            )}
          </button>
        </footer>
      )}
    </div>
  );
}
