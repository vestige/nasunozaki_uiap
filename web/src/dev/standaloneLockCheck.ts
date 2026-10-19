import { withStandaloneWriteLock } from "../features/blockly/utils/standaloneWriteLock";

export type LockCheckState = "requesting" | "held" | "released" | "error" | "unsupported";
export function startStandaloneLockCheck(options: {
  report: (state: LockCheckState, message: string) => void;
  available?: boolean;
  withLock?: (action: () => Promise<void>) => Promise<void>;
  durationMs?: number;
}) {
  const { report, durationMs = 60000 } = options;
  const available = options.available ?? typeof globalThis.navigator?.locks?.request === "function";
  if (!available) {
    report("unsupported", "この環境はタブ間の保存ロックに対応していません。ロックを取れたとは扱いません。");
    return { done: Promise.resolve(), release() {} };
  }
  const lock = options.withLock ?? (action => withStandaloneWriteLock(action));
  let release: (() => void) | undefined, earlyRelease = false;
  let holdingTimer: ReturnType<typeof setTimeout> | undefined;
  report("requesting", "ブラウザへ保存ロックを要求しています。ボードへ命令は送っていません。");
  const waitingTimer = setTimeout(() => report("requesting", "ブラウザからロック取得の返事がありません。この表示を共有してください。ロック中とはまだ確認できていません。"), 2000);
  const done = Promise.resolve().then(() => lock(async () => {
    clearTimeout(waitingTimer);
    report("held", "保存のロック中です。60秒以内に、別タブのブロック画面で保存を試してください。ボードへ命令は送っていません。");
    await new Promise<void>(resolve => {
      release = resolve;
      if (earlyRelease) resolve();
      else holdingTimer = setTimeout(resolve, durationMs);
    });
    report("released", "保存のロックを解除しました。通常の保存を試せます。");
  })).catch(error => report("error", String(error))).finally(() => {
    clearTimeout(waitingTimer); clearTimeout(holdingTimer); release = undefined;
  });
  return { done, release() { earlyRelease = true; release?.(); } };
}
