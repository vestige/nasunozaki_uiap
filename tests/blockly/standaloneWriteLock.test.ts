import { expect, it, vi } from "vitest";
import { StandaloneWriteBusyError, withStandaloneWriteLock } from "../../web/src/features/blockly/utils/standaloneWriteLock";

it("同じページの保存が終わるまで次の保存を送信せず、終了後に再保存できる", async () => {
  let finish!: () => void;
  const first = withStandaloneWriteLock(() => new Promise<void>(resolve => { finish = resolve; }), undefined);
  const action = vi.fn(async () => "second");
  await expect(withStandaloneWriteLock(action, undefined)).rejects.toBeInstanceOf(StandaloneWriteBusyError);
  expect(action).not.toHaveBeenCalled();
  finish(); await first;
  await expect(withStandaloneWriteLock(action, undefined)).resolves.toBe("second");
});

it("別タブがロック中なら待ち行列に保存を積まず、通信前に案内する", async () => {
  const request = vi.fn(async (_name, options, callback) => {
    expect(options).toEqual({ mode: "exclusive", ifAvailable: true });
    return callback(null);
  });
  const action = vi.fn(async () => undefined);
  await expect(withStandaloneWriteLock(action, { request } as unknown as LockManager)).rejects.toBeInstanceOf(StandaloneWriteBusyError);
  expect(action).not.toHaveBeenCalled();
  await expect(withStandaloneWriteLock(async () => "next", undefined)).resolves.toBe("next");
});

it("同一サイトの共有名で排他し、処理完了までロックを保持する", async () => {
  let held = false;
  const request = vi.fn(async (name, _options, callback) => {
    expect(name).toBe("uiapduino:standalone-program-write:1209:d004");
    held = true;
    try { return await callback({ name }); } finally { held = false; }
  });
  await withStandaloneWriteLock(async () => { await Promise.resolve(); expect(held).toBe(true); }, { request } as unknown as LockManager);
  expect(held).toBe(false);
});

it.each(["処理の失敗", "ロック要求の失敗"])("%sでも次の保存を妨げない", async phase => {
  const fail = async () => { throw new Error(phase); };
  const locks = phase === "ロック要求の失敗" ? { request: fail } as unknown as LockManager : undefined;
  await expect(withStandaloneWriteLock(fail, locks)).rejects.toThrow(phase);
  await expect(withStandaloneWriteLock(async () => "ok", undefined)).resolves.toBe("ok");
});
