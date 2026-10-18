import { describe, expect, it, vi } from "vitest";
import type {
  RuntimeHidDevice,
  RuntimeInputReportEvent,
} from "../../web/src/features/runtime/types/transport";
import { encodeStandaloneProgram } from "../../web/src/features/blockly/utils/standaloneProgram";
import { readStandaloneStatus, writeStandaloneProgram } from "../../web/src/features/blockly/utils/writeStandaloneProgram";

function fakeRuntime(initialStatus: number, capability: number | null = 1, options: { drop?: number[]; lateBeginOnAbort?: boolean; dropRecoveryStatus?: boolean; beginSnapshot?: number; featureCache?: boolean; corruptCache?: boolean; reportIdPrefix?: boolean } = {}) {
  let listener: ((event: RuntimeInputReportEvent) => void) | undefined;
  let status = initialStatus;
  const commands: Uint8Array[] = [];
  let updating = false;
  let listeners = 0;
  const drops = [...options.drop ?? []];
  let lastResponse = new Uint8Array(0);
  let featureReads = 0;
  const device = {
    vendorId: 0x1209,
    productId: 0xd004,
    productName: "UIAPduino WebHID",
    opened: true,
    collections: [],
    open: async () => undefined,
    receiveFeatureReport: async () => {
      ++featureReads;
      if (!options.featureCache) return new DataView(new ArrayBuffer(0));
      const cached = lastResponse.slice();
      if (options.corruptCache) cached[6] ^= 1;
      const framed = options.reportIdPrefix ? Uint8Array.from([0, ...cached]) : cached;
      return new DataView(framed.buffer);
    },
    sendFeatureReport: vi.fn(async (_id: number, data: BufferSource) => {
      const bytes = new Uint8Array(data as Uint8Array).slice();
      commands.push(bytes);
      if (bytes[5] === 0x25 && capability === null) return;
      let result = 0;
      if (bytes[5] === 0x20) { result = updating ? 2 : 0; updating = true; }
      if (bytes[5] === 0x23) updating = false;
      if (bytes[5] === 0x22) { status = status === 0x41 ? 0x42 : 0x41; updating = false; }
      const response = Uint8Array.from([
        0x55, 0x49, 0x41, 0x50, 1, bytes[5] | 0x80, bytes[6],
        bytes[5] === 0x26 ? options.beginSnapshot ?? 1 : bytes[5] === 0x25 ? capability! : bytes[5] === 0x24 ? status : bytes[5] === 0x20 && initialStatus === 1 ? 1 : result,
      ]);
      lastResponse = response.slice();
      const dropIndex = drops.indexOf(bytes[5]);
      if (dropIndex >= 0) { drops.splice(dropIndex, 1); return; }
      if (bytes[5] === 0x24 && options.dropRecoveryStatus && commands.some(c => c[5] === 0x22)) return;
      if (bytes[5] === 0x23 && options.lateBeginOnAbort) {
        const begin = commands.find(command => command[5] === 0x20)!;
        const late = Uint8Array.from([0x55, 0x49, 0x41, 0x50, 1, 0xa0, begin[6], 0]);
        listener?.({ reportId: 0, data: new DataView(late.buffer) } as RuntimeInputReportEvent);
      }
      listener?.({ reportId: 0, data: new DataView(response.buffer) } as RuntimeInputReportEvent);
    }),
    addEventListener: (_type: "inputreport", next: (event: RuntimeInputReportEvent) => void) => {
      listener = next;
      ++listeners;
    },
    removeEventListener: (_type: "inputreport", next: (event: RuntimeInputReportEvent) => void) => {
      if (listener === next) listener = undefined;
      --listeners;
    },
  } satisfies RuntimeHidDevice;
  return { device, commands, get updating() { return updating; }, get listeners() { return listeners; }, get featureReads() { return featureReads; } };
}

describe("writeStandaloneProgram", () => {
  it.each([false, true])("Flash命令のInput応答だけ失われてもGET_REPORTで同じACKを確認し、書込み命令を再送しない: %s", async reportIdPrefix => {
    vi.useFakeTimers();
    try {
      const fake = fakeRuntime(0x41, 0x56, { drop: [0x20, 0x21, 0x22], featureCache: true, reportIdPrefix });
      const slot = encodeStandaloneProgram([{ type: "led", on: true, blockId: "led" }]);
      const trace = vi.fn();
      const result = writeStandaloneProgram(fake.device, slot, () => {}, trace).then(bank => ({ bank }), error => ({ error }));
      await vi.runAllTimersAsync();
      expect(await result).toEqual({ bank: "B" });
      expect(fake.commands.map(c => c[5])).toEqual([0x24, 0x20, 0x21, 0x22, 0x24]);
      expect(fake.featureReads).toBe(3);
      expect(trace.mock.calls.filter(([event]) => event === "FEATURE_RESPONSE")).toHaveLength(3);
      expect(fake.listeners).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it("キャッシュのsequenceが違う場合は成功扱いせず復帰し、正常経路ではキャッシュを読まない", async () => {
    vi.useFakeTimers();
    try {
      const fake = fakeRuntime(0x41, 0x56, { drop: [0x21], featureCache: true, corruptCache: true });
      const slot = encodeStandaloneProgram([{ type: "led", on: true, blockId: "led" }]);
      const result = writeStandaloneProgram(fake.device, slot, () => {}).catch(error => String(error));
      await vi.runAllTimersAsync();
      expect(await result).toMatch(/DATA:.*解除を確認/);
      expect(fake.commands.at(-1)?.[5]).toBe(0x23);
      const normal = fakeRuntime(0x41, 0x56, { featureCache: true });
      await expect(writeStandaloneProgram(normal.device, slot, () => {})).resolves.toBe("B");
      expect(normal.featureReads).toBe(0);
    } finally { vi.useRealTimers(); }
  });
  it("BEGINは受理されたが応答だけ失われた場合、ABORTの応答を正しく受けて次の保存へ復帰する", async () => {
    vi.useFakeTimers();
    try {
      const fake = fakeRuntime(0x41, 0x56, { drop: [0x20], lateBeginOnAbort: true, beginSnapshot: 0xe8 });
      const slot = encodeStandaloneProgram([{ type: "led", on: true, blockId: "led" }]);
      const trace = vi.fn();
      const failed = writeStandaloneProgram(fake.device, slot, () => {}, trace).then(() => "unexpected success", error => String(error));
      await vi.runAllTimersAsync();
      expect(fake.commands.map(c => c[5])).toEqual([0x24, 0x20, 0x23]);
      expect(fake.updating).toBe(false);
      expect(await failed).toMatch(/BEGIN:.*更新状態の解除を確認/);
      expect(fake.listeners).toBe(0);
      expect(trace.mock.calls.some(([event, details]) => event === "FAILED" && details.command === "BEGIN")).toBe(true);
      await expect(writeStandaloneProgram(fake.device, slot, () => {})).resolves.toBe("B");
      expect(fake.listeners).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it.each([0x21, 0x23])("DATAまたは復帰応答喪失でも自動で消去を繰り返さず失敗段階を残す: %i", async command => {
    vi.useFakeTimers();
    try {
      const fake = fakeRuntime(0x41, 0x56, { drop: command === 0x23 ? [0x20, 0x23] : [0x21] });
      const slot = encodeStandaloneProgram([{ type: "led", on: true, blockId: "led" }]);
      const failure = expect(writeStandaloneProgram(fake.device, slot, () => {})).rejects.toThrow(command === 0x23 ? "解除を確認できません" : "DATA:");
      await vi.runAllTimersAsync(); await failure;
      expect(fake.commands.filter(c => c[5] === 0x20)).toHaveLength(1);
      expect(fake.commands.filter(c => c[5] === 0x22)).toHaveLength(0);
      expect(fake.commands.at(-1)?.[5]).toBe(0x23);
      expect(fake.listeners).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it("COMMIT応答だけの喪失はSTATUSで保存先を確認し、COMMIT再送やABORTをしない", async () => {
    vi.useFakeTimers();
    try {
      const fake = fakeRuntime(0x41, 0x56, { drop: [0x22] });
      const slot = encodeStandaloneProgram([{ type: "led", on: true, blockId: "led" }]);
      const result = writeStandaloneProgram(fake.device, slot, () => {}).then(bank => ({ bank }), error => ({ error }));
      await vi.runAllTimersAsync();
      await expect(result).resolves.toEqual({ bank: "B" });
      expect(fake.commands.map(c => c[5])).toEqual([0x24, 0x20, 0x21, 0x22, 0x24]);
      expect(fake.listeners).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it("COMMITと確認応答の両方が失われたら結果不明とし、保存命令を自動再送しない", async () => {
    vi.useFakeTimers();
    try {
      const fake = fakeRuntime(0x41, 0x56, { drop: [0x22], dropRecoveryStatus: true });
      const slot = encodeStandaloneProgram([{ type: "led", on: true, blockId: "led" }]);
      const result = writeStandaloneProgram(fake.device, slot, () => {}).catch(error => String(error));
      await vi.runAllTimersAsync();
      expect(await result).toMatch(/COMMIT:.*保存結果を確認できません/);
      expect(fake.commands.map(c => c[5])).toEqual([0x24, 0x20, 0x21, 0x22, 0x24]);
      expect(fake.listeners).toBe(0);
    } finally { vi.useRealTimers(); }
  });
  it("色変数は形式5では消去を始めず、形式6で保存できる", async () => {
    const slot = encodeStandaloneProgram([{ type: "setVariable", id: "c", value: { type: "color", value: "#123456" }, blockId: "c" }]);
    const old = fakeRuntime(0x41, 0x55);
    await expect(writeStandaloneProgram(old.device, slot, () => undefined)).rejects.toThrow("更新");
    expect(old.commands.map(c => c[5])).toEqual([0x24, 0x25]);
    const current = fakeRuntime(0x41, 0x56);
    await expect(writeStandaloneProgram(current.device, slot, () => undefined)).resolves.toBe("B");
    expect(current.commands.find(c => c[5] === 0x20)?.[8]).toBe(6);
  });
  it("音は形式4では消去を始めず、形式5で保存できる", async () => {
    const slot = encodeStandaloneProgram([{ type: "tone", frequency: 440, milliseconds: 500, wait: false, blockId: "tone" }]);
    const old = fakeRuntime(0x41, 0x54);
    await expect(writeStandaloneProgram(old.device, slot, () => undefined)).rejects.toThrow("更新");
    expect(old.commands.map(c => c[5])).toEqual([0x24, 0x25]);
    const current = fakeRuntime(0x41, 0x55);
    await expect(writeStandaloneProgram(current.device, slot, () => undefined)).resolves.toBe("B");
    expect(current.commands.find(c => c[5] === 0x20)?.[8]).toBe(5);
  });
  it("動的明るさは形式3ではBEGINせず、形式4で保存できる", async () => {
    const slot = encodeStandaloneProgram([{ type: "neoPixelLightValue", pixel: null, color: "#00ff00", brightness: { type: "number", value: 15 }, blockId: "brightness" }]);
    const old = fakeRuntime(0x41, 0x53);
    await expect(writeStandaloneProgram(old.device, slot, () => undefined)).rejects.toThrow("更新");
    expect(old.commands.map(c => c[5])).toEqual([0x24, 0x25]);
    const current = fakeRuntime(0x41, 0x54);
    await expect(writeStandaloneProgram(current.device, slot, () => undefined)).resolves.toBe("B");
    expect(current.commands.find(c => c[5] === 0x20)?.[8]).toBe(4);
  });
  it("形式2のファームには加減算作品を送らず、形式3対応なら送れる", async () => {
    const slot = encodeStandaloneProgram([{ type: "setVariable", id: "n", blockId: "sum", value: {
      type: "arithmetic", op: "ADD", left: { type: "number", value: 1 }, right: { type: "number", value: 2 },
    } }]);
    const old = fakeRuntime(0x41, 0x52);
    await expect(writeStandaloneProgram(old.device, slot, () => undefined)).rejects.toThrow("更新");
    expect(old.commands.map(c => c[5])).toEqual([0x24, 0x25]);
    const current = fakeRuntime(0x41, 0x53);
    await expect(writeStandaloneProgram(current.device, slot, () => undefined)).resolves.toBe("B");
    expect(current.commands.find(c => c[5] === 0x20)?.[8]).toBe(3);
  });
  it("対応問い合わせが無応答なら保存を始めず終了する", async () => {
    vi.useFakeTimers();
    try {
      const fake = fakeRuntime(0x41, null);
      const slot = encodeStandaloneProgram([{ type: "led", on: true, blockId: "led" }]);
      slot[4] = 2;
      const failed = expect(writeStandaloneProgram(fake.device, slot, () => undefined)).rejects.toThrow();
      await vi.runAllTimersAsync();
      await failed;
      expect(fake.commands.map((command) => command[5])).toEqual([0x24, 0x25]);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([1, 0x51, 2, 0])("非対応・不正な応答(%i)では新形式のBEGINを送らない", async (capability) => {
    const fake = fakeRuntime(0x41, capability);
    const slot = encodeStandaloneProgram([{ type: "led", on: true, blockId: "led" }]);
    slot[4] = 2; // Transfer negotiation fixture, not a version 2 encoder.
    await expect(writeStandaloneProgram(fake.device, slot, () => undefined)).rejects.toThrow();
    expect(fake.commands.map((command) => command[5])).toEqual([0x24, 0x25]);
  });

  it("新形式の対応を確認してから作品自身のversionでBEGINする", async () => {
    const fake = fakeRuntime(0x41, 0x52);
    const slot = encodeStandaloneProgram([{ type: "led", on: true, blockId: "led" }]);
    slot[4] = 2;
    await expect(writeStandaloneProgram(fake.device, slot, () => undefined)).resolves.toBe("B");
    expect(fake.commands.map((command) => command[5])).toEqual([0x24, 0x25, 0x20, 0x21, 0x22, 0x24]);
    expect(fake.commands[2][8]).toBe(2);
  });

  it("未知の作品形式は通信前に拒否する", async () => {
    const fake = fakeRuntime(0x41, 0x5f);
    const slot = encodeStandaloneProgram([{ type: "led", on: true, blockId: "led" }]);
    slot[4] = 99;
    await expect(writeStandaloneProgram(fake.device, slot, () => undefined)).rejects.toThrow("作品形式");
    expect(fake.commands).toEqual([]);
  });
  it("STATUSだけで旧ランタイムへの非対応を判定する", async () => {
    const fake = fakeRuntime(1);
    await expect(readStandaloneStatus(fake.device)).resolves.toEqual({
      supported: false,
      activeBank: null,
    });
    expect(fake.commands.map((command) => command[5])).toEqual([0x24]);
  });

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
