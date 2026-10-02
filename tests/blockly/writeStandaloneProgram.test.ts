import { describe, expect, it, vi } from "vitest";
import type {
  RuntimeHidDevice,
  RuntimeInputReportEvent,
} from "../../web/src/features/runtime/types/transport";
import { encodeStandaloneProgram } from "../../web/src/features/blockly/utils/standaloneProgram";
import { writeStandaloneProgram } from "../../web/src/features/blockly/utils/writeStandaloneProgram";

function fakeRuntime(initialStatus: number) {
  let listener: ((event: RuntimeInputReportEvent) => void) | undefined;
  let status = initialStatus;
  const commands: Uint8Array[] = [];
  const device = {
    vendorId: 0x1209,
    productId: 0xd004,
    productName: "UIAPduino WebHID",
    opened: true,
    collections: [],
    open: async () => undefined,
    receiveFeatureReport: async () => new DataView(new ArrayBuffer(0)),
    sendFeatureReport: vi.fn(async (_id: number, data: BufferSource) => {
      const bytes = new Uint8Array(data as Uint8Array).slice();
      commands.push(bytes);
      if (bytes[5] === 0x22) status = status === 0x41 ? 0x42 : 0x41;
      const response = Uint8Array.from([
        0x55, 0x49, 0x41, 0x50, 1, bytes[5] | 0x80, bytes[6],
        bytes[5] === 0x24 ? status : bytes[5] === 0x20 && initialStatus === 1 ? 1 : 0,
      ]);
      listener?.({ reportId: 0, data: new DataView(response.buffer) } as RuntimeInputReportEvent);
    }),
    addEventListener: (_type: "inputreport", next: (event: RuntimeInputReportEvent) => void) => {
      listener = next;
    },
    removeEventListener: (_type: "inputreport", next: (event: RuntimeInputReportEvent) => void) => {
      if (listener === next) listener = undefined;
    },
  } satisfies RuntimeHidDevice;
  return { device, commands };
}

describe("writeStandaloneProgram", () => {
  it("通常接続でSTATUS、BEGIN、連番DATA、COMMIT、STATUSを送る", async () => {
    const fake = fakeRuntime(0x40);
    const slot = encodeStandaloneProgram([{ type: "led", on: true, blockId: "led" }]);
    const progress = vi.fn();

    await expect(writeStandaloneProgram(fake.device, slot, progress)).resolves.toBe("A");

    expect(fake.commands.map((command) => command[5])).toEqual([0x24, 0x20, 0x21, 0x22, 0x24]);
    expect(fake.commands.every((command) => command.length === 32)).toBe(true);
    expect(fake.commands.map((command) => command[6])).toEqual([0, 1, 2, 3, 4]);
    expect(progress).toHaveBeenLastCalledWith(100);
  });

  it("更新非対応ランタイムにはBEGINを送らない", async () => {
    const fake = fakeRuntime(1);
    const slot = encodeStandaloneProgram([{ type: "led", on: true, blockId: "led" }]);

    await expect(writeStandaloneProgram(fake.device, slot, () => undefined)).rejects.toThrow("ランタイムを更新");
    expect(fake.commands.map((command) => command[5])).toEqual([0x24]);
  });
});
