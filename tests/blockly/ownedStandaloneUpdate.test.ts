import { expect, it, vi } from "vitest";
import { prepareOwnedUpdate, readOwnedUpdateSnapshot, StandaloneRecoveryCancelledError, StandaloneRecoveryRequiredError, type OwnedExchange } from "../../web/src/features/blockly/utils/ownedStandaloneUpdate";

function board(kind = 0x72) {
  const token = [11, 12, 13, 14, 15, 16, 17, 18];
  let state = kind;
  const exchange = vi.fn<OwnedExchange>(async (command, payload) => {
    if (command === 0x45) { expect(payload).toEqual([...token, 28, 0]); state = 0x70; return 0; }
    expect(command).toBe(0x44);
    const field = payload[0];
    return field === 0 ? state : field <= 8 ? token[field - 1] : field === 9 ? 28 : 0;
  });
  return { exchange, token };
}

it("対応版の空き状態では新しい所有識別子を作り、旧版には従来方式を残す", async () => {
  const token = await prepareOwnedUpdate(board(0x70).exchange, {});
  expect(token).toHaveLength(8); expect(token?.some(value => value !== 0)).toBe(true);
  expect(await prepareOwnedUpdate(board(1).exchange, {})).toBeNull();
});

it.each([0x71, 0x73])("進行中／旧方式の状態%iを勝手に解除しない", async state => {
  const fake = board(state), confirmRecovery = vi.fn(() => true);
  await expect(prepareOwnedUpdate(fake.exchange, { confirmRecovery })).rejects.toBeInstanceOf(StandaloneRecoveryRequiredError);
  expect(confirmRecovery).not.toHaveBeenCalled();
  expect(fake.exchange.mock.calls.every(([command]) => command === 0x44)).toBe(true);
});

it("期限切れでも確認キャンセル時は照会だけで終わる", async () => {
  const fake = board();
  await expect(prepareOwnedUpdate(fake.exchange, { confirmRecovery: () => false })).rejects.toBeInstanceOf(StandaloneRecoveryCancelledError);
  expect(fake.exchange.mock.calls.every(([command]) => command === 0x44)).toBe(true);
});

it("確認後に識別子と進行位置を指定して1回だけ解除し、空き状態を確認する", async () => {
  const fake = board(), confirmRecovery = vi.fn(async snapshot => { expect(snapshot.offset).toBe(28); return true; });
  expect(await prepareOwnedUpdate(fake.exchange, { confirmRecovery })).toHaveLength(8);
  expect(fake.exchange.mock.calls.filter(([command]) => command === 0x45)).toHaveLength(1);
  expect(fake.exchange.mock.calls.at(-1)).toEqual([0x44, [0]]);
});

it.each(["拒否", "応答喪失"])("解除の%sでは再送も新しいBEGINもしない", async reason => {
  const fake = board();
  const normal = fake.exchange.getMockImplementation()!;
  fake.exchange.mockImplementation(async (command, payload) => {
    if (command === 0x45) { if (reason === "応答喪失") throw new Error("timeout"); return 2; }
    return normal(command, payload);
  });
  await expect(prepareOwnedUpdate(fake.exchange, { confirmRecovery: () => true })).rejects.toThrow();
  expect(fake.exchange.mock.calls.filter(([command]) => command === 0x45)).toHaveLength(1);
  expect(fake.exchange.mock.calls.at(-1)?.[0]).toBe(0x45);
});

it("照会中に状態が変わったら確認画面にも解除にも進まない", async () => {
  const fake = board(); let reads = 0;
  const normal = fake.exchange.getMockImplementation()!;
  fake.exchange.mockImplementation(async (command, payload) => payload[0] === 0 && ++reads > 1 ? 0x71 : normal(command, payload));
  const confirmRecovery = vi.fn(() => true);
  await expect(prepareOwnedUpdate(fake.exchange, { confirmRecovery })).rejects.toThrow("状態が変わりました");
  expect(confirmRecovery).not.toHaveBeenCalled();
});

it("COMMIT済みの識別子と進行位置を未完了の期限切れと区別する", async () => {
  const fake = board(0x74);
  await expect(readOwnedUpdateSnapshot(fake.exchange)).resolves.toEqual({ kind: "committed", token: fake.token, offset: 28 });
});
