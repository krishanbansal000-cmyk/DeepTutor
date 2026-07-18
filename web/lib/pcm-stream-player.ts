export type PcmStreamPlayback = {
  stop: () => void;
  done: Promise<void>;
};

type PlaybackOptions = {
  onStart?: () => void;
  onEnded?: () => void;
  onError?: (error: unknown) => void;
};

function positiveHeader(response: Response, name: string, fallback: number) {
  const value = Number.parseInt(response.headers.get(name) || "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Schedule little-endian PCM16 chunks as they arrive from the local Piper
 * endpoint. Web Audio handles sample-rate conversion to the user's device.
 */
export function playPcm16Stream(
  response: Response,
  options: PlaybackOptions = {},
): PcmStreamPlayback {
  if (!response.body) throw new Error("Streaming audio is not available.");

  const sampleRate = positiveHeader(response, "X-Audio-Sample-Rate", 22_050);
  const channels = positiveHeader(response, "X-Audio-Channels", 1);
  const sampleWidth = positiveHeader(response, "X-Audio-Sample-Width", 2);
  if (sampleWidth !== 2) throw new Error("Only PCM16 streaming is supported.");

  const AudioContextClass = (
    window as typeof window & { webkitAudioContext?: typeof AudioContext }
  ).AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio is not supported.");

  const context = new AudioContextClass();
  const reader = response.body.getReader();
  const sources = new Set<AudioBufferSourceNode>();
  let nextStart = context.currentTime + 0.035;
  let carry = new Uint8Array(0);
  let started = false;
  let stopped = false;
  let resolveStopped: () => void = () => undefined;
  const stoppedSignal = new Promise<void>((resolve) => {
    resolveStopped = resolve;
  });

  const stop = () => {
    if (stopped) return;
    stopped = true;
    resolveStopped();
    void reader.cancel().catch(() => undefined);
    for (const source of sources) {
      try {
        source.stop();
      } catch {
        // A source that already ended may reject stop(); it is safe to ignore.
      }
    }
    sources.clear();
    void context.close().catch(() => undefined);
  };

  const done = (async () => {
    try {
      await context.resume();
      while (!stopped) {
        const result = await reader.read();
        if (result.done) break;

        const incoming = result.value;
        const bytes = new Uint8Array(carry.length + incoming.length);
        bytes.set(carry);
        bytes.set(incoming, carry.length);
        const frameBytes = sampleWidth * channels;
        const completeLength = bytes.length - (bytes.length % frameBytes);
        carry = bytes.slice(completeLength);
        if (!completeLength) continue;

        const view = new DataView(bytes.buffer, bytes.byteOffset, completeLength);
        const frameCount = completeLength / frameBytes;
        const audioBuffer = context.createBuffer(channels, frameCount, sampleRate);
        for (let channel = 0; channel < channels; channel += 1) {
          const output = audioBuffer.getChannelData(channel);
          for (let frame = 0; frame < frameCount; frame += 1) {
            const offset = (frame * channels + channel) * sampleWidth;
            output[frame] = view.getInt16(offset, true) / 32_768;
          }
        }

        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        sources.add(source);
        source.onended = () => sources.delete(source);
        const startAt = Math.max(nextStart, context.currentTime + 0.015);
        source.start(startAt);
        nextStart = startAt + audioBuffer.duration;
        if (!started) {
          started = true;
          options.onStart?.();
        }
      }

      if (!started && !stopped) throw new Error("Piper returned no audio.");
      const remainingMs = Math.max(0, (nextStart - context.currentTime) * 1000);
      if (!stopped && remainingMs > 0) {
        await Promise.race([
          new Promise<void>((resolve) => window.setTimeout(resolve, remainingMs)),
          stoppedSignal,
        ]);
      }
    } catch (error) {
      if (!stopped) {
        options.onError?.(error);
        throw error;
      }
    } finally {
      if (!stopped) {
        stopped = true;
        void context.close().catch(() => undefined);
        options.onEnded?.();
      }
    }
  })();

  return { stop, done };
}
