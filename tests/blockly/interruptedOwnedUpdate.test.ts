import { expect, it, vi } from "vitest";
import { beginInterruptedOwnedUpdate } from "../../web/src/dev/interruptedOwnedUpdate";
import type { OwnedExchange } from "../../web/src/features/blockly/utils/ownedStandaloneUpdate";

it("有効作品を確認して反対側のBEGINだけを行い、確定も解除もしない", async () => {
  const exchange = vi.fn<OwnedExchange>(async command => command === 0x24 ? 0x41 : command === 0x44 ? 0x70 : 0);
  await expect(beginInterruptedOwnedUpdate(exchange)).resolves.toBe("A");
  expect(exchange.mock.calls.map(([command]) => command)).toEqual([0x24, 0x44, 0x40]);
  expect(exchange.mock.calls.at(-1)?.[1]).toHaveLength(13);
});

it.each([0x40, 1])("有効な作品がない状態%iではBEGINしない", async bank => {
  const exchange = vi.fn<OwnedExchange>(async () => bank);
  await expect(beginInterruptedOwnedUpdate(exchange)).rejects.toThrow("保存済み");
  expect(exchange.mock.calls).toHaveLength(1);
});

it.each([1, 0x73, 0x71])("非対応・旧方式・進行中の状態%iは変更しない", async state => {
  const exchange = vi.fn<OwnedExchange>(async (command, payload) => command === 0x24 ? 0x41 : payload[0] === 0 ? state : 0);
  await expect(beginInterruptedOwnedUpdate(exchange)).rejects.toThrow("変更せず");
  expect(exchange.mock.calls.every(([command]) => command === 0x24 || command === 0x44)).toBe(true);
});

it("BEGINの応答不明でも消去の再送や自動解除はしない", async () => {
  const exchange = vi.fn<OwnedExchange>(async command => {
    if (command === 0x40) throw new Error("timeout");
    return command === 0x24 ? 0x41 : 0x70;
  });
  await expect(beginInterruptedOwnedUpdate(exchange)).rejects.toThrow("timeout");
  expect(exchange.mock.calls.map(([command]) => command)).toEqual([0x24, 0x44, 0x40]);
});
