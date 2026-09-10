import { describe, expect, it, vi } from "vitest";
import type {
  RuntimeHidDevice,
  RuntimeInputReportEvent,
} from "../../web/src/features/runtime/types/transport";
import {
  DEFAULT_RUNTIME_REPORT_ID,
  WebHidRuntimeTransport,
} from "../../web/src/features/runtime/utils/webHidRuntimeTransport";

function fakeDevice() {
  let listener: ((event: RuntimeInputReportEvent) => void) | undefined;
  const sendFeatureReport = vi.fn(async () => undefined);
  const device = {
    vendorId: 0x1209,
    productId: 0xd004,
    productName: "UIAPduino WebHID",
    opened: true,
    collections: [],
    open: async () => undefined,
    receiveFeatureReport: async () => new DataView(new ArrayBuffer(0)),
    sendFeatureReport,
    addEventListener: (_type, next) => {
      listener = next;
    },
    removeEventListener: (_type, current) => {
      if (listener === current) listener = undefined;
    },
  } satisfies RuntimeHidDevice;

  return {
    device,
    sendFeatureReport,
    emit(reportId: number, bytes: number[]) {
      listener?.({
        reportId,
        data: new DataView(Uint8Array.from(bytes).buffer),
      } as RuntimeInputReportEvent);
    },
    hasListener: () => Boolean(listener),
  };
}

describe("WebHidRuntimeTransport", () => {
  it("Report ID 0のFeature Reportとして8バイト命令を送る", async () => {
    const fake = fakeDevice();
    const transport = new WebHidRuntimeTransport(fake.device);
    const message = Uint8Array.from([0x55, 0x49, 0x41, 0x50, 1, 1, 0, 1]);

    await transport.send(message);

    expect(fake.sendFeatureReport).toHaveBeenCalledWith(
      DEFAULT_RUNTIME_REPORT_ID,
      message,
    );
  });

  it("先に届いたInput Reportをキューから受け取る", async () => {
    const fake = fakeDevice();
    const transport = new WebHidRuntimeTransport(fake.device);
    fake.emit(0, [0x55, 0x49, 0x41, 0x50, 1, 0x81, 0, 0]);

    await expect(transport.receive()).resolves.toEqual(
      Uint8Array.from([0x55, 0x49, 0x41, 0x50, 1, 0x81, 0, 0]),
    );
  });

  it("異なるReport IDを無視し、待機中の応答だけを渡す", async () => {
    const fake = fakeDevice();
    const transport = new WebHidRuntimeTransport(fake.device);
    const pending = transport.receive();
    fake.emit(1, new Array(8).fill(0));
    fake.emit(0, [0x55, 0x49, 0x41, 0x50, 1, 0x81, 0, 0]);

    await expect(pending).resolves.toHaveLength(8);
  });

  it("終了時にlistenerを外して待機中の受信を失敗させる", async () => {
    const fake = fakeDevice();
    const transport = new WebHidRuntimeTransport(fake.device);
    const pending = transport.receive();
    const rejection = expect(pending).rejects.toThrow("通信を終了");

    transport.dispose();

    await rejection;
    expect(fake.hasListener()).toBe(false);
  });

  it("8バイト以外の命令と未接続deviceを拒否する", async () => {
    const fake = fakeDevice();
    const transport = new WebHidRuntimeTransport(fake.device);
    await expect(transport.send(new Uint8Array(7))).rejects.toThrow("8バイト");

    fake.device.opened = false;
    await expect(transport.send(new Uint8Array(8))).rejects.toThrow("接続されていません");
  });
});
