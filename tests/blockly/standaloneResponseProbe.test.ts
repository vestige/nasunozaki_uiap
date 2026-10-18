import { afterEach, expect, it, vi } from "vitest";
import type { RuntimeHidDevice } from "../../web/src/features/runtime/types/transport";
import { receiveStandaloneWriteResponse } from "../../web/src/features/blockly/utils/standaloneResponseProbe";

afterEach(() => vi.useRealTimers());
const response = (command = 0x40, sequence = 3, status = 0) => Uint8Array.from([0x55, 0x49, 0x41, 0x50, 1, command | 0x80, sequence, status]);
const view = (bytes: Uint8Array) => new DataView(bytes.slice().buffer);
function fake(command = 0x40) {
  let deliver!: (bytes: Uint8Array) => void, reject!: (error: Error) => void;
  const receive = vi.fn(() => new Promise<Uint8Array>((resolve, fail) => { deliver = resolve; reject = fail; }));
  const feature = vi.fn(async () => view(response(command)));
  const resetReceiver = vi.fn(() => reject(new Error("disposed")));
  const trace = vi.fn();
  const start = (timeoutMs = 10000) => receiveStandaloneWriteResponse({
    command, sequence: 3, timeoutMs, receive, resetReceiver, trace,
    device: { receiveFeatureReport: feature } as unknown as RuntimeHidDevice,
  });
  return { start, receive, feature, resetReceiver, trace, deliver: (bytes: Uint8Array) => deliver(bytes) };
}

it("通常応答がすぐ届けばGET_REPORTを追加しない", async () => {
  vi.useFakeTimers(); const board = fake(); const saving = board.start();
  board.deliver(response());
  await expect(saving).resolves.toBe(0);
  expect(board.feature).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it.each([0x40, 0x41, 0x42])("所有権付き命令%iの応答喪失は10秒・2秒を待たず250ms後に確認する", async command => {
  vi.useFakeTimers(); const board = fake(command); const saving = board.start();
  await vi.advanceTimersByTimeAsync(249); expect(board.feature).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  await expect(saving).resolves.toBe(0);
  expect(board.feature).toHaveBeenCalledTimes(1);
  expect(board.resetReceiver).toHaveBeenCalledTimes(1);
});

it("早期キャッシュが古くても元の受信待機を残し、500ms後の正しい通常応答を受ける", async () => {
  vi.useFakeTimers(); const board = fake(); board.feature.mockResolvedValue(view(response(0x40, 2)));
  const saving = board.start();
  await vi.advanceTimersByTimeAsync(250);
  await vi.advanceTimersByTimeAsync(250);
  board.deliver(response());
  await expect(saving).resolves.toBe(0);
  expect(board.receive).toHaveBeenCalledTimes(1);
  expect(board.resetReceiver).not.toHaveBeenCalled();
});

it("早期GET_REPORT中に通常応答が届いても、同じ受信待機で受け取る", async () => {
  vi.useFakeTimers(); const board = fake();
  let finish!: (value: DataView) => void;
  board.feature.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const saving = board.start();
  await vi.advanceTimersByTimeAsync(250);
  await vi.advanceTimersByTimeAsync(150); board.deliver(response());
  await vi.advanceTimersByTimeAsync(100); finish(view(response(0x40, 2)));
  await expect(saving).resolves.toBe(0);
  expect(board.receive).toHaveBeenCalledTimes(1);
  expect(board.resetReceiver).not.toHaveBeenCalled();
});

it("関係ない応答が来ても250msの確認時刻を後ろへずらさない", async () => {
  vi.useFakeTimers(); const board = fake(); const saving = board.start();
  await vi.advanceTimersByTimeAsync(100); board.deliver(response(0x41));
  await vi.advanceTimersByTimeAsync(100); board.deliver(response(0x41));
  await vi.advanceTimersByTimeAsync(49); expect(board.feature).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1); await expect(saving).resolves.toBe(0);
  expect(board.receive).toHaveBeenCalledTimes(3);
});

it("早期確認が非対応でも元の待ち時間を維持する", async () => {
  vi.useFakeTimers(); const board = fake(); board.feature.mockRejectedValue(new Error("unsupported"));
  const saving = board.start();
  await vi.advanceTimersByTimeAsync(700);
  board.deliver(response());
  await expect(saving).resolves.toBe(0);
  expect(board.resetReceiver).not.toHaveBeenCalled();
});

it("早期確認後にACKが作られた場合は本来の期限でもう一度確認する", async () => {
  vi.useFakeTimers(); const board = fake();
  board.feature.mockResolvedValueOnce(view(response(0x40, 2)));
  const saving = board.start(2000);
  await vi.advanceTimersByTimeAsync(2000);
  await expect(saving).resolves.toBe(0);
  expect(board.feature).toHaveBeenCalledTimes(2);
  expect(board.trace.mock.calls.filter(([event]) => event === "FEATURE_READ").map(([, details]) => details.reason)).toEqual(["early", "timeout"]);
});

it("早期GET_REPORT自体が時間切れなら次の転送へ進まない", async () => {
  vi.useFakeTimers(); const board = fake(); board.feature.mockImplementation(() => new Promise(() => {}));
  const failed = board.start().catch(error => String(error));
  await vi.advanceTimersByTimeAsync(1250);
  expect(await failed).toContain("保存を進めず");
  expect(board.feature).toHaveBeenCalledTimes(1);
});

it("一致する拒否ACKを成功0へ置き換えない", async () => {
  vi.useFakeTimers(); const board = fake(); board.feature.mockResolvedValue(view(response(0x40, 3, 2)));
  const saving = board.start(); await vi.advanceTimersByTimeAsync(250);
  await expect(saving).resolves.toBe(2);
});

it.each([0x20, 0x21, 0x22, 0x44])("旧方式・読み取り命令%iへ早期GET_REPORTを追加しない", async command => {
  vi.useFakeTimers(); const board = fake(command); const saving = board.start();
  await vi.advanceTimersByTimeAsync(700); expect(board.feature).not.toHaveBeenCalled();
  board.deliver(response(command)); await expect(saving).resolves.toBe(0);
});
