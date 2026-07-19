"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetch, apiUrl } from "@/lib/api";

export type RecorderState = "idle" | "recording" | "transcribing";

export type VoiceChatMode = "stt" | "direct";

export interface VoiceChatResult {
  mode: VoiceChatMode;
  text: string;
}

/**
 * Microphone capture → backend voice chat. Records via MediaRecorder, posts
 * the clip to ``/api/v1/voice/chat``. When the active LLM supports audio
 * (Gemma 4 E4B on DeepInfra), the backend forwards the audio directly to the
 * model and returns ``{mode: "direct", text: <LLM response>}``. Otherwise it
 * transcribes via the configured STT provider and returns
 * ``{mode: "stt", text: <transcript>}``.
 *
 * The ``onResult`` callback receives the mode + text so the caller can decide
 * whether to append a transcript to the composer (STT mode) or surface the
 * direct LLM response (direct mode).
 */
export function useVoiceRecorder(
  onResult: (result: VoiceChatResult) => void,
  /** Optional prompt prepended to the audio when the model supports direct
   * audio input. Ignored in STT-fallback mode. */
  prompt?: string,
) {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const onResultRef = useRef(onResult);
  const promptRef = useRef(prompt);
  onResultRef.current = onResult;
  promptRef.current = prompt;

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    setError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Recording is not supported in this browser.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone permission denied.");
      return;
    }
    streamRef.current = stream;
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      const mimeType = recorder.mimeType || "audio/webm";
      releaseStream();
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      if (!blob.size) {
        setState("idle");
        return;
      }
      setState("transcribing");
      try {
        const ext = mimeType.includes("ogg")
          ? "ogg"
          : mimeType.includes("mp4")
            ? "mp4"
            : "webm";
        const form = new FormData();
        form.append("file", blob, `recording.${ext}`);
        const activePrompt = promptRef.current?.trim() || "";
        if (activePrompt) form.append("prompt", activePrompt);
        const resp = await apiFetch(apiUrl("/api/v1/voice/chat"), {
          method: "POST",
          body: form,
        });
        if (!resp.ok) {
          const detail = (await resp.json().catch(() => null)) as {
            detail?: string;
          } | null;
          throw new Error(
            detail?.detail || `Voice chat failed (HTTP ${resp.status}).`,
          );
        }
        const data = (await resp.json()) as VoiceChatResult;
        const text = (data.text || "").trim();
        if (text) onResultRef.current({ mode: data.mode || "stt", text });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Voice chat failed.");
      } finally {
        setState("idle");
      }
    };
    recorder.start();
    recorderRef.current = recorder;
    setState("recording");
  }, [releaseStream, state]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop(); // fires onstop → voice chat
    }
  }, []);

  const toggle = useCallback(() => {
    if (state === "recording") stop();
    else if (state === "idle") void start();
  }, [start, state, stop]);

  // Stop the mic if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { state, error, toggle, start, stop };
}
