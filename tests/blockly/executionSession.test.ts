import { describe, expect, it, vi } from "vitest";
import type {
  RuntimeHidDevice,
  RuntimeInputReportEvent,
} from "../../web/src/features/runtime/types/transport";
import { createBoardExecutionSession } from "../../web/src/features/blockly/utils/executionSession";

const neoPixelSimulator = {
  setSimulatorNeoPixel: () => undefined,
  fillSimulatorNeoPixels: () => undefined,
  clearSimulatorNeoPixels: () => undefined,
};

function respondingRuntimeDevice() {
  let listener: ((event: RuntimeInputReportEvent) => void) | undefined;
  const payloads: number[] = [];
  const commands: number[] = [];
  const device = {
    vendorId: 0x1209,
    productId: 0xd004,
    productName: "UIAPduino WebHID",
    opened: true,
    collections: [],
    open: async () => undefined,
    receiveFeatureReport: async () => new DataView(new ArrayBuffer(0)),
    sendFeatureReport: vi.fn(async (_reportId: number, data: BufferSource) => {
      const message = new Uint8Array(data as ArrayBufferView<ArrayBuffer>);
      payloads.push(message[7]);
      commands.push(message[5]);
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
              message[5] | 0x80,
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
  return { device, payloads, commands, hasListener: () => Boolean(listener) };
}

describe("board execution session", () => {
  it("画面実行ではsimulatorのLED状態を更新する", async () => {
    const states: boolean[] = [];
    const session = createBoardExecutionSession({
      target: "simulator",
      runtimeDevice: null,
      setSimulatorLed: (on) => states.push(on),
      ...neoPixelSimulator,
      getSimulatorButton: () => true,
    });

    await session.board.setLed(true);
    await session.close(true);

    expect(states).toEqual([true, false]);
  });

  it("実機実行を安全終了すると消灯してlistenerを外す", async () => {
    const fake = respondingRuntimeDevice();
    const session = createBoardExecutionSession({
      target: "uiapduino",
      runtimeDevice: fake.device,
      setSimulatorLed: () => undefined,
      ...neoPixelSimulator,
      getSimulatorButton: () => false,
    });

    await session.board.setLed(true);
    await session.close(true);

    expect(fake.commands).toEqual([0x01, 0x01, 0x15]);
    expect(fake.payloads).toEqual([1, 0, 0]);
    expect(fake.hasListener()).toBe(false);
  });

  it("未接続では実機sessionを作らない", () => {
    expect(() =>
      createBoardExecutionSession({
        target: "uiapduino",
        runtimeDevice: null,
        setSimulatorLed: () => undefined,
        ...neoPixelSimulator,
        getSimulatorButton: () => false,
      }),
    ).toThrow("接続されていません");
  });

  it("実機sessionを正常終了しても最後のLED状態は変更しない", async () => {
    const fake = respondingRuntimeDevice();
    const session = createBoardExecutionSession({
      target: "uiapduino",
      runtimeDevice: fake.device,
      setSimulatorLed: () => undefined,
      ...neoPixelSimulator,
      getSimulatorButton: () => false,
    });

    await session.board.setLed(true);
    await session.close(false);

    expect(fake.payloads).toEqual([1]);
    expect(fake.hasListener()).toBe(false);
  });
});
