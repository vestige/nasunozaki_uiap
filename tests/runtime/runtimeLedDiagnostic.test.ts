import { describe, expect, it, vi } from "vitest";
import type {
  RuntimeHidDevice,
  RuntimeInputReportEvent,
} from "../../web/src/features/runtime/types/transport";
import {
  formatRuntimeBytes,
  runRuntimeLedDiagnostic,
} from "../../web/src/features/runtime/utils/runtimeLedDiagnostic";

function createRespondingDevice() {
  let listener: ((event: RuntimeInputReportEvent) => void) | undefined;
  const sent: Uint8Array[] = [];
  const device = {
    vendorId: 0x1209,
    productId: 0xd004,
    productName: "UIAPduino WebHID",
    opened: true,
    collections: [],
    open: async () => undefined,
    receiveFeatureReport: async () => new DataView(new ArrayBuffer(0)),
    sendFeatureReport: vi.fn(async (_reportId: number, data: BufferSource) => {
      const message = new Uint8Array(
        data instanceof ArrayBuffer ? data : data.buffer,
        data instanceof ArrayBuffer ? 0 : data.byteOffset,
        data instanceof ArrayBuffer ? data.byteLength : data.byteLength,
      ).slice();
      sent.push(message);
      queueMicrotask(() =>
        listener?.({
          reportId: 0,
          data: new DataView(
            Uint8Array.from([
              0x55,
              0x49,
              0x41,
              0x50,
              1,
              0x81,
              message[6],
              0,
            ]).buffer,
          ),
        } as RuntimeInputReportEvent),
      );
    }),
    addEventListener: (_type, next) => {
      listener = next;
    },
    removeEventListener: (_type, current) => {
      if (listener === current) listener = undefined;
    },
  } satisfies RuntimeHidDevice;
  return { device, sent, hasListener: () => Boolean(listener) };
}

describe("runtime LED diagnostic", () => {
  it("LEDを点灯してから消灯し、2つの応答を記録する", async () => {
    const fake = createRespondingDevice();

    const result = await runRuntimeLedDiagnostic(fake.device, 0);

    expect(fake.sent.map((message) => message[7])).toEqual([1, 0]);
    expect(result.received).toHaveLength(2);
    expect(result.received.map((message) => message[6])).toEqual([0, 1]);
    expect(fake.hasListener()).toBe(false);
  });

  it("診断ログ用に8バイトを16進数へ整形する", () => {
    expect(formatRuntimeBytes(Uint8Array.from([0x00, 0x0a, 0xff]))).toBe(
      "00 0A FF",
    );
  });
});
