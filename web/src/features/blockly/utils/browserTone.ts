// Browser-only preview: never sends a hardware command. One voice, low fixed
// gain; each request replaces the last. The execution owner closes the context
// on completion, cancellation, error or unmount.
export function createBrowserTone(enabled: boolean) {
  const context = enabled ? new AudioContext() : null;
  let oscillator: OscillatorNode | null = null;
  let releaseGain: (() => void) | null = null;
  const stop = () => {
    if (!oscillator || !context) return;
    oscillator.onended = null;
    oscillator.stop();
    oscillator.disconnect();
    releaseGain?.();
    releaseGain = null;
    oscillator = null;
  };
  return {
    async ready(signal?: AbortSignal) {
      if (context) {
        let onAbort: (() => void) | undefined;
        try {
          await new Promise<void>((resolve, reject) => {
            onAbort = () => reject(new DOMException("停止しました", "AbortError"));
            if (signal?.aborted) { onAbort(); return; }
            signal?.addEventListener("abort", onAbort, { once: true });
            context.resume().then(resolve, reject);
          });
        } catch (error) { await context.close(); throw error; }
        finally { if (onAbort) signal?.removeEventListener("abort", onAbort); }
        if (context.state !== "running") {
          await context.close();
          throw new Error("画面の音を使えません。音をオフにしてためしてください。");
        }
      }
    },
    play(frequency: number, milliseconds: number) {
      stop();
      if (!context) return;
      const voice = context.createOscillator();
      const gain = context.createGain();
      gain.gain.value = 0.025;
      voice.type = "square";
      voice.frequency.value = frequency;
      voice.connect(gain);
      gain.connect(context.destination);
      oscillator = voice;
      releaseGain = () => gain.disconnect();
      voice.onended = () => {
        voice.disconnect();
        gain.disconnect();
        if (oscillator === voice) { oscillator = null; releaseGain = null; }
      };
      voice.start();
      voice.stop(context.currentTime + milliseconds / 1000);
    },
    stop,
    async close() {
      stop();
      if (context && context.state !== "closed") await context.close();
    },
  };
}
