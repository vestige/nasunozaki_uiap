import { afterEach, expect, it, vi } from "vitest";
import { startStandaloneLockCheck } from "../../web/src/dev/standaloneLockCheck";

afterEach(() => vi.useRealTimers());
it("取得の返事がなくても押した直後と2秒後に状況を表示する", async () => {
  vi.useFakeTimers(); const report = vi.fn();
  let ready!: (value: void) => void;
  const check = startStandaloneLockCheck({ available: true, report, withLock: () => new Promise(resolve => { ready = resolve; }) });
  expect(report.mock.calls[0][0]).toBe("requesting");
  await vi.advanceTimersByTimeAsync(2000);
  expect(report.mock.calls.at(-1)?.[1]).toContain("まだ確認できていません");
  ready(); await check.done;
  expect(report.mock.calls.some(([state]) => state === "held")).toBe(false);
});
it("取得したときだけロック中を表示し、終了操作で解放する", async () => {
  vi.useFakeTimers(); const report = vi.fn();
  const check = startStandaloneLockCheck({ available: true, report, withLock: action => action() });
  await vi.advanceTimersByTimeAsync(0);
  expect(report.mock.calls.map(([state]) => state)).toEqual(["requesting", "held"]);
  check.release(); await check.done;
  expect(report.mock.calls.at(-1)?.[0]).toBe("released");
  expect(vi.getTimerCount()).toBe(0);
});
it("対応していない環境では取得成功を装わない", async () => {
  const report = vi.fn(), withLock = vi.fn(async () => {});
  await startStandaloneLockCheck({ available: false, report, withLock }).done;
  expect(report.mock.calls[0][0]).toBe("unsupported"); expect(withLock).not.toHaveBeenCalled();
});
it("取得を拒否された場合は理由を表示する", async () => {
  vi.useFakeTimers(); const report = vi.fn();
  await startStandaloneLockCheck({ available: true, report, withLock: async () => { throw new Error("busy"); } }).done;
  expect(report.mock.calls.at(-1)?.[0]).toBe("error");
  expect(report.mock.calls.at(-1)?.[1]).toContain("busy");
  expect(vi.getTimerCount()).toBe(0);
});
it("手動終了を忘れても60秒で解放する", async () => {
  vi.useFakeTimers(); const report = vi.fn();
  const check = startStandaloneLockCheck({ available: true, report, withLock: action => action() });
  await vi.advanceTimersByTimeAsync(60000); await check.done;
  expect(report.mock.calls.at(-1)?.[0]).toBe("released");
  expect(vi.getTimerCount()).toBe(0);
});
