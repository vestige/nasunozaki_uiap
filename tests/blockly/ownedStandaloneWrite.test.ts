import { expect, it, vi } from "vitest";
import type { RuntimeHidDevice, RuntimeInputReportEvent } from "../../web/src/features/runtime/types/transport";
import { encodeStandaloneProgram } from "../../web/src/features/blockly/utils/standaloneProgram";
import { writeStandaloneProgram } from "../../web/src/features/blockly/utils/writeStandaloneProgram";

function ownedBoard(initial = 0x70, options: { drop?: number; feature?: boolean; wrongCommitOwner?: boolean } = {}) {
  let listener: ((event: RuntimeInputReportEvent) => void) | undefined;
  let state = initial, bank = 0x41, offset = 28;
  let token = [1, 2, 3, 4, 5, 6, 7, 8];
  let last = new Uint8Array(0), dropped = false, listeners = 0;
  const commands: number[] = [], bytes: number[] = [];
  const device: RuntimeHidDevice = {
    vendorId: 0x1209, productId: 0xd004, productName: "UIAPduino WebHID", opened: true, collections: [],
    open: async () => {},
    receiveFeatureReport: async () => new DataView((options.feature ? last : new Uint8Array(0)).slice().buffer),
    sendFeatureReport: async (_id, data) => {
      const message = new Uint8Array(data as Uint8Array), command = message[5], payload = Array.from(message.slice(8, 8 + message[7]));
      commands.push(command);
      let status = 0;
      const matches = () => payload.slice(0, 8).every((value, i) => value === token[i]);
      if (command === 0x24) status = bank;
      else if (command === 0x25) status = 0x56;
      else if (command === 0x44) status = payload[0] === 0 ? state : payload[0] <= 8 ? token[payload[0] - 1] : payload[0] === 9 ? offset & 0xff : offset >> 8;
      else if (command === 0x45) {
        if (state !== 0x72 || !matches() || (payload[8] | payload[9] << 8) !== offset) status = 2;
        else state = 0x70;
      } else if (command === 0x40) {
        if (state === 0x71 || state === 0x72) status = 2;
        else { token = payload.slice(0, 8); state = 0x71; offset = 0; }
      } else if (command === 0x41) {
        if (state !== 0x71 || !matches()) status = 2;
        else { bytes.push(...payload.slice(10)); offset += payload.length - 10; }
      } else if (command === 0x42) {
        if (!matches()) status = 2;
        else { state = 0x74; bank = 0x42; if (options.wrongCommitOwner) token[0] ^= 1; }
      } else if (command === 0x43) {
        if (!matches() || state !== 0x71) status = 2;
        else state = 0x70;
      } else throw new Error(`unexpected command ${command}`);
      last = Uint8Array.from([0x55, 0x49, 0x41, 0x50, 1, command | 0x80, message[6], status]);
      if (options.drop === command && !dropped) { dropped = true; return; }
      listener?.({ reportId: 0, data: new DataView(last.slice().buffer) } as RuntimeInputReportEvent);
    },
    addEventListener: (_type, next) => { listener = next; ++listeners; },
    removeEventListener: (_type, previous) => { if (listener === previous) listener = undefined; --listeners; },
  };
  return { device, commands, bytes, changeOwner() { token[0] ^= 1; state = 0x71; }, get listeners() { return listeners; } };
}
const slot = () => encodeStandaloneProgram([{ type: "led", on: true, blockId: "led" }]);

it("所有権付きの保存で全バイトを転送し、確定した所有者と保存先を確認する", async () => {
  const fake = ownedBoard(), encoded = slot();
  await expect(writeStandaloneProgram(fake.device, encoded, () => {})).resolves.toBe("B");
  const length = 16 + (encoded[6] | encoded[7] << 8);
  expect(fake.bytes).toEqual(Array.from(encoded.slice(0, length)));
  expect(fake.commands).toContain(0x40); expect(fake.commands).not.toContain(0x20);
  expect(fake.listeners).toBe(0);
});

it("期限切れ状態から確認付きで解除して保存できる", async () => {
  const fake = ownedBoard(0x72), confirmRecovery = vi.fn(() => true);
  await expect(writeStandaloneProgram(fake.device, slot(), () => {}, undefined, { confirmRecovery })).resolves.toBe("B");
  expect(confirmRecovery).toHaveBeenCalledTimes(1);
  expect(fake.commands.filter(command => command === 0x45)).toHaveLength(1);
  expect(fake.commands.indexOf(0x45)).toBeLessThan(fake.commands.indexOf(0x40));
});

it("確認中に所有者が変わった場合は解除も新しい保存も行わない", async () => {
  const fake = ownedBoard(0x72);
  await expect(writeStandaloneProgram(fake.device, slot(), () => {}, undefined, { confirmRecovery: () => { fake.changeOwner(); return true; } })).rejects.toThrow("解除せず");
  expect(fake.commands).not.toContain(0x40); expect(fake.commands).not.toContain(0x43);
  expect(fake.listeners).toBe(0);
});

it("確認キャンセルではBEGINも解除も送信せずロックを解放する", async () => {
  const fake = ownedBoard(0x72);
  await expect(writeStandaloneProgram(fake.device, slot(), () => {}, undefined, { confirmRecovery: () => false })).rejects.toThrow("とりやめ");
  expect(fake.commands.every(command => command === 0x24 || command === 0x44)).toBe(true);
  await expect(writeStandaloneProgram(ownedBoard().device, slot(), () => {})).resolves.toBe("B");
});

it.each([{ drop: 0x41, feature: true }, { drop: 0x42, feature: false }])("所有権付き命令の応答喪失でも再送せず回復する: %o", async options => {
  vi.useFakeTimers();
  try {
    const fake = ownedBoard(0x70, options);
    const result = writeStandaloneProgram(fake.device, slot(), () => {}).then(bank => ({ bank }), error => ({ error }));
    await vi.runAllTimersAsync();
    expect(await result).toEqual({ bank: "B" });
    expect(fake.commands.filter(command => command === 0x40)).toHaveLength(1);
    expect(fake.commands.filter(command => command === 0x42)).toHaveLength(1);
    expect(fake.commands).not.toContain(0x43);
  } finally { vi.useRealTimers(); }
});

it("bankだけ一致しても別の所有者のCOMMITを自分の成功にしない", async () => {
  const fake = ownedBoard(0x70, { wrongCommitOwner: true });
  await expect(writeStandaloneProgram(fake.device, slot(), () => {})).rejects.toThrow("所有識別子");
  expect(fake.commands).not.toContain(0x43);
  expect(fake.listeners).toBe(0);
});
