import { describe, expect, it, vi } from "vitest";
import { RuntimeBoardAdapter } from "../../web/src/features/runtime/utils/runtimeBoardAdapter";
import type { RuntimeTransport } from "../../web/src/features/runtime/types/transport";

const response = (sequence: number, status = 0, command = 0x01) =>
  Uint8Array.from([0x55, 0x49, 0x41, 0x50, 0x01, command | 0x80, sequence, status]);

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

  it("不正な応答を構造化エラーとして区別する", async () => {
    const adapter = new RuntimeBoardAdapter(
      fakeTransport([Uint8Array.from([0, 1, 2])]),
    );

    await expect(adapter.setLed(true)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      phase: "runtime-receive",
    });
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

  it("外付けボタンの押下状態を読み取る", async () => {
    const transport = fakeTransport([
      Uint8Array.from([0x55, 0x49, 0x41, 0x50, 0x01, 0x82, 0x00, 0x01]),
    ]);
    const adapter = new RuntimeBoardAdapter(transport);

    await expect(adapter.isButtonPressed()).resolves.toBe(true);
    expect([...transport.sent[0]]).toEqual([
      0x55, 0x49, 0x41, 0x50, 0x01, 0x02, 0x00, 0x00,
    ]);
  });

  it("NeoPixelの色と明るさを設定して全灯する", async () => {
    const transport = fakeTransport([
      response(0, 0, 0x10),
      response(1, 0, 0x11),
      response(2, 0, 0x12),
      response(3, 0, 0x13),
      response(4, 0, 0x14),
    ]);
    const adapter = new RuntimeBoardAdapter(transport);

    await adapter.fillNeoPixels("#12a0ff", 20);

    expect(transport.sent.map((message) => [message[5], message[7]])).toEqual([
      [0x10, 0x12],
      [0x11, 0xa0],
      [0x12, 0xff],
      [0x13, 20],
      [0x14, 0],
    ]);
  });

  it("NeoPixel番号と明るさの範囲外を送信前に拒否する", async () => {
    const transport = fakeTransport([]);
    const adapter = new RuntimeBoardAdapter(transport);

    await expect(adapter.setNeoPixel(8, "#ffffff", 20)).rejects.toThrow("1から8");
    await expect(adapter.fillNeoPixels("#ffffff", 0)).rejects.toThrow("1から100");
    expect(transport.sent).toHaveLength(0);
  });

});
