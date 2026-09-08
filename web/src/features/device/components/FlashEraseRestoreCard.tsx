import type { useDeviceDiagnostics } from "../hooks/useDeviceDiagnostics";
import { FlashRecoveryError } from "../utils/flashRecoveryTransaction";

type Props = { diagnostics: ReturnType<typeof useDeviceDiagnostics> };
const hex32 = (value: number) =>
  `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;

export function FlashEraseRestoreCard({ diagnostics }: Props) {
  const { flashRecoveryResult, eraseAndRestoreFlash, errorText } = diagnostics;
  const canRun = false;

  const run = () => {
    const accepted = window.confirm(
      "実際にflash先頭64バイトを消去し、すぐ元の内容を書き戻します。完了するまでUSBを抜かないでください。実行しますか？",
    );
    if (accepted) eraseAndRestoreFlash.mutate();
  };

  const error = eraseAndRestoreFlash.error;
  const message = eraseAndRestoreFlash.isError
    ? error instanceof FlashRecoveryError && error.restored
      ? "途中で異常がありましたが、元データへの復旧は確認できました。ログをコピーして作業を止めてください。"
      : `復旧を確認できませんでした。USBを抜かず、ログをコピーしてください：${errorText(error)}`
    : flashRecoveryResult
      ? "消去から元データの完全一致確認まで、すべて成功しました。"
      : "実機試験で異常が確認されたため、この操作は停止中です。上の復旧操作だけを使用してください。";

  return (
    <article className="card border-2 border-error bg-base-100 shadow-lg">
      <div className="card-body gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="badge badge-neutral font-bold">SUSPENDED</div>
            <h3 className="mt-2 text-xl font-black">
              先頭64バイトを消去して元に戻す
            </h3>
            <p className="mt-2 text-sm leading-6 text-base-content/65">
              消去、全0xFF確認、元データ書き戻し、完全一致確認を自動で続けて実行します。
            </p>
          </div>
          <button
            className="btn btn-error btn-lg font-black"
            onClick={run}
            disabled={!canRun || eraseAndRestoreFlash.isPending}
          >
            {eraseAndRestoreFlash.isPending && (
              <span className="loading loading-spinner" />
            )}
            {eraseAndRestoreFlash.isPending
              ? "消去・復元中（USBを抜かない）"
              : "消去して元に戻す"}
          </button>
        </div>
        <div
          role={eraseAndRestoreFlash.isError ? "alert" : "status"}
          className={`alert ${eraseAndRestoreFlash.isError ? "alert-error" : flashRecoveryResult ? "border border-info/30 bg-info/10 text-base-content" : "alert-warning"}`}
        >
          <span>{message}</span>
        </div>
        {flashRecoveryResult && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-box bg-base-200 p-4">
              <p className="text-xs font-bold text-base-content/60">対象</p>
              <p className="mt-1 font-black">
                {hex32(flashRecoveryResult.address)}
              </p>
            </div>
            <div className="rounded-box bg-base-200 p-4">
              <p className="text-xs font-bold text-base-content/60">
                erase確認
              </p>
              <p className="mt-1 font-black">全64バイト 0xFF</p>
            </div>
            <div className="rounded-box bg-base-200 p-4">
              <p className="text-xs font-bold text-base-content/60">
                復元CRC32
              </p>
              <p className="mt-1 font-black">
                {hex32(flashRecoveryResult.backupChecksum)}
              </p>
            </div>
          </div>
        )}
        <p className="text-xs font-bold leading-5 text-error">
          実行中はUSBケーブルを抜いたり、ページを閉じたりしないでください。
        </p>
      </div>
    </article>
  );
}
