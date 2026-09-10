export function withRuntimeResponseTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return Promise.reject(new Error("応答timeoutは正の数で指定してください。"));
  }

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("UIAPduinoからの応答がtimeoutしました。")),
      milliseconds,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function abortableDelay(
  milliseconds: number,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(new DOMException("停止しました", "AbortError"));
  }

  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener("abort", abort, { once: true });

    function finish() {
      signal.removeEventListener("abort", abort);
      resolve();
    }

    function abort() {
      clearTimeout(timer);
      reject(new DOMException("停止しました", "AbortError"));
    }
  });
}
