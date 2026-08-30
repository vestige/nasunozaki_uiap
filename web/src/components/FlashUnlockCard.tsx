import type { useDeviceDiagnostics } from "../useDeviceDiagnostics";

type Props = { diagnostics: ReturnType<typeof useDeviceDiagnostics> };
const hex32 = (value: number) =>
  `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;

export function FlashUnlockCard({ diagnostics }: Props) {
  const { flashSafety, flashUnlockResult, unlockFlash, errorText } =
    diagnostics;
  const canUnlock = flashSafety?.safeToUnlock === true;

  const runUnlock = () => {
    const accepted = window.confirm(
      "flashのロックだけを一時的に解除します。消去・書き込みは行いません。続けますか？",
    );
    if (accepted) unlockFlash.mutate();
  };

  const message = unlockFlash.isError
    ? `unlockを完了できませんでした：${errorText(unlockFlash.error)}`
    : flashUnlockResult
      ? "unlock後の読み直しに成功しました。flash内容の消去・書き込みは行っていません。"
      : canUnlock
        ? "直前の安全確認をもう一度行ってから、6個のunlock packetを送信します。"
        : "先に「安全状態を読む」を実行し、ロック中・read protectionなしを確認してください。";

  return (
    <article className="card border-2 border-warning bg-base-100 shadow-lg">
      <div className="card-body gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="badge badge-warning font-bold">CHANGES STATE</div>
            <h3 className="mt-2 text-xl font-black">flash unlockを確認する</h3>
            <p className="mt-2 text-sm leading-6 text-base-content/65">
              flashのロック状態だけを一時的に変更し、直後にCTLRを読み直します。erase・writeは行いません。
            </p>
          </div>
          <button
            className="btn btn-warning btn-lg font-black"
            onClick={runUnlock}
            disabled={!canUnlock || unlockFlash.isPending}
          >
            {unlockFlash.isPending && (
              <span className="loading loading-spinner" />
            )}
            {unlockFlash.isPending ? "unlock確認中…" : "unlockして読み直す"}
          </button>
        </div>
        <div
          role="status"
          className={`alert ${unlockFlash.isError ? "alert-error" : flashUnlockResult ? "border border-info/30 bg-info/10 text-base-content" : "alert-warning"}`}
        >
          <span>{message}</span>
        </div>
        {flashUnlockResult && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-box bg-base-200 p-4">
              <p className="text-xs font-bold text-base-content/60">
                unlock前 CTLR
              </p>
              <p className="mt-1 font-black">
                {hex32(flashUnlockResult.before.controlValue)}
              </p>
            </div>
            <div className="rounded-box bg-base-200 p-4">
              <p className="text-xs font-bold text-base-content/60">
                unlock後 CTLR
              </p>
              <p className="mt-1 font-black">
                {hex32(flashUnlockResult.after.controlValue)}
              </p>
            </div>
            <div className="rounded-box bg-base-200 p-4">
              <p className="text-xs font-bold text-base-content/60">
                完了packet
              </p>
              <p className="mt-1 font-black">
                {flashUnlockResult.completedPackets} / 6
              </p>
            </div>
          </div>
        )}
        <p className="text-xs leading-5 text-base-content/55">
          USBを抜いてブートローダーモードで接続し直すと、通常のロック状態へ戻る想定です。
        </p>
      </div>
    </article>
  );
}
