import { describe, expect, it, vi } from "vitest";
import { RuntimeBoardAdapter } from "../../web/src/features/runtime/utils/runtimeBoardAdapter";
import type { RuntimeTransport } from "../../web/src/features/runtime/types/transport";

const response = (sequence: number, status = 0) =>
  Uint8Array.from([0x55, 0x49, 0x41, 0x50, 0x01, 0x81, sequence, status]);

function fakeTransport(responses: Uint8Array[]): RuntimeTransport & {
  sent: Uint8Array[];
} {
  const sent: Uint8Array[] = [];
  return {
    sent,
    send: async (message) => void sent.push(message),
    receive: async () => responses.shift() ?? new Promise<Uint8Array>(() => {}),
  };
}

describe("RuntimeBoardAdapter", () => {
  it("LED命令を送り、同じsequenceの成功応答を待つ", async () => {
    const transport = fakeTransport([response(0)]);
    const adapter = new RuntimeBoardAdapter(transport);

    await adapter.setLed(true);

    expect([...transport.sent[0]]).toEqual([
      0x55, 0x49, 0x41, 0x50, 0x01, 0x01, 0x00, 0x01,
    ]);
  });

  it("古いsequenceの応答を無視し、対応する応答を採用する", async () => {
    const transport = fakeTransport([response(0xff), response(0)]);
    const adapter = new RuntimeBoardAdapter(transport);

    await expect(adapter.setLed(false)).resolves.toBeUndefined();
  });

  it("デバイスのエラー応答を利用者向けエラーにする", async () => {
    const adapter = new RuntimeBoardAdapter(fakeTransport([response(0, 2)]));

    await expect(adapter.setLed(true)).rejects.toThrow("invalid-payload");
  });

  it("応答がなければtimeoutする", async () => {
    vi.useFakeTimers();
    const adapter = new RuntimeBoardAdapter(fakeTransport([]), {
      responseTimeoutMs: 20,
    });
    const pending = adapter.setLed(true);
    const rejection = expect(pending).rejects.toThrow("timeout");
    await vi.advanceTimersByTimeAsync(20);
    await rejection;
    vi.useRealTimers();
  });

});
