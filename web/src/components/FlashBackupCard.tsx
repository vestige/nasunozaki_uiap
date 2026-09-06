import type { ChangeEvent } from "react";
import type { useDeviceDiagnostics } from "../useDeviceDiagnostics";
import { formatHexDump } from "../webhid/flashBackup";

type Props = { diagnostics: ReturnType<typeof useDeviceDiagnostics> };
const hex32 = (value: number) =>
  `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;

export function FlashBackupCard({ diagnostics }: Props) {
  const {
    flashUnlockResult,
    flashBackupResult,
    flashBackupVerification,
    backupFlashBlock,
    downloadFlashBackup,
    verifyFlashBackup,
    errorText,
  } = diagnostics;
  const canRead = flashUnlockResult?.after.locked === false;

  const message = backupFlashBlock.isError
    ? `退避できませんでした：${errorText(backupFlashBlock.error)}`
    : flashBackupResult
      ? "先頭64バイトをブラウザのメモリーへ退避しました。flash内容は変更していません。"
      : canRead
        ? "erase前の復元元として、flash先頭blockを読み取ります。"
        : "先にflash unlock後の状態確認を完了してください。";

  const onSelectBackup = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) verifyFlashBackup.mutate(file);
  };

  return (
    <article className="card border-2 border-info bg-base-100 shadow-lg">
      <div className="card-body gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="badge badge-info font-bold">READ ONLY</div>
            <h3 className="mt-2 text-xl font-black">
              flash先頭blockを退避する
            </h3>
            <p className="mt-2 text-sm leading-6 text-base-content/65">
              `0x08000000`から64バイトを読み取り、内容とCRC32を表示します。erase・writeは行いません。
            </p>
          </div>
          <button
            className="btn btn-info btn-lg font-black"
            onClick={() => backupFlashBlock.mutate()}
            disabled={!canRead || backupFlashBlock.isPending}
          >
            {backupFlashBlock.isPending && (
              <span className="loading loading-spinner" />
            )}
            {backupFlashBlock.isPending ? "退避中…" : "64バイトを退避"}
          </button>
        </div>
        <div
          role="status"
          className={`alert ${backupFlashBlock.isError ? "alert-error" : "border border-info/30 bg-info/10 text-base-content"}`}
        >
          <span>{message}</span>
        </div>
        {flashBackupResult && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-box bg-base-200 p-4">
                <p className="text-xs font-bold text-base-content/60">
                  開始address
                </p>
                <p className="mt-1 font-black">
                  {hex32(flashBackupResult.address)}
                </p>
              </div>
              <div className="rounded-box bg-base-200 p-4">
                <p className="text-xs font-bold text-base-content/60">CRC32</p>
                <p className="mt-1 font-black">
                  {hex32(flashBackupResult.checksum)}
                </p>
              </div>
              <div className="rounded-box bg-base-200 p-4">
                <p className="text-xs font-bold text-base-content/60">内容</p>
                <p className="mt-1 font-black">
                  {flashBackupResult.allErased ? "すべて 0xFF" : "データあり"}
                </p>
              </div>
            </div>
            <div className="mockup-code overflow-auto bg-neutral text-neutral-content">
              <pre data-prefix="">
                <code>{formatHexDump(flashBackupResult.bytes)}</code>
              </pre>
            </div>
            <div className="rounded-box border border-base-content/20 bg-base-200 p-4">
              <h4 className="font-black">復旧用ファイルをPCへ残す</h4>
              <p className="mt-1 text-sm leading-6 text-base-content/65">
                64バイトをbinファイルとして保存し、同じファイルを選び直して内容が一致することを確認します。
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  className="btn btn-outline btn-info"
                  onClick={() => downloadFlashBackup.mutate()}
                  disabled={downloadFlashBackup.isPending}
                >
                  {downloadFlashBackup.isPending
                    ? "保存中…"
                    : "退避ファイルを保存"}
                </button>
                <input
                  className="file-input file-input-bordered w-full max-w-sm"
                  type="file"
                  accept=".bin,application/octet-stream"
                  onChange={onSelectBackup}
                  disabled={verifyFlashBackup.isPending}
                  aria-label="保存した退避ファイルを選ぶ"
                />
              </div>
              {flashBackupVerification && (
                <div
                  className={`alert mt-4 ${flashBackupVerification.matches ? "border border-info/30 bg-info/10 text-base-content" : "alert-error"}`}
                  role="status"
                >
                  <span>
                    {flashBackupVerification.matches
                      ? `一致しました（CRC32 ${hex32(flashBackupVerification.checksum)}）。`
                      : "一致しません。別のファイルを選ばず、ここで作業を止めてください。"}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
