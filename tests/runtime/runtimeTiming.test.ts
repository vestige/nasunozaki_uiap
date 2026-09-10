import { describe, expect, it, vi } from "vitest";
import {
  abortableDelay,
  withRuntimeResponseTimeout,
} from "../../web/src/features/runtime/utils/runtimeTiming";

describe("runtime timing", () => {
  it("応答待ちを指定時間でtimeoutする", async () => {
    vi.useFakeTimers();
    const pending = withRuntimeResponseTimeout(
      new Promise<Uint8Array>(() => {}),
      20,
    );
    const rejection = expect(pending).rejects.toThrow("timeout");
    await vi.advanceTimersByTimeAsync(20);
    await rejection;
    vi.useRealTimers();
  });

  it("正でないtimeoutを拒否する", async () => {
    await expect(withRuntimeResponseTimeout(Promise.resolve(1), 0)).rejects.toThrow(
      "正の数",
    );
  });

  it("待機中でも停止できる", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const pending = abortableDelay(500, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    vi.useRealTimers();
  });
});
