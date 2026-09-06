import type { ChangeEvent } from "react";
import type { useDeviceDiagnostics } from "../useDeviceDiagnostics";

type Props = { diagnostics: ReturnType<typeof useDeviceDiagnostics> };
const hex32 = (value: number) =>
  `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;

export function EmergencyFlashRecoveryCard({ diagnostics }: Props) {
  const {
    flashSafety,
    emergencyRecoveryFile,
    emergencyRecoveryResult,
    loadEmergencyRecoveryFile,
    restoreFromEmergencyFile,
    errorText,
  } = diagnostics;
  const unlocked =
    flashSafety && !flashSafety.locked && !flashSafety.readProtected;
  const canRestore = Boolean(unlocked && emergencyRecoveryFile);

  const onSelectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) loadEmergencyRecoveryFile.mutate(file);
  };

  const runRestore = () => {
    if (
      window.confirm(
        "保存済みの復旧用binをflash先頭64バイトへ書き戻します。完了までUSBを抜かないでください。実行しますか？",
      )
    ) {
      restoreFromEmergencyFile.mutate();
    }
  };

  return (
    <article className="card border-4 border-error bg-error/10 shadow-xl">
      <div className="card-body gap-5">
        <div>
          <div className="badge badge-error font-bold">RECOVERY</div>
          <h3 className="mt-2 text-2xl font-black">保存したbinから復旧する</h3>
          <p className="mt-2 leading-7">
            保存済みの <strong>CRC32 BED6A734</strong>{" "}
            のbinを選び、先頭64バイトへ書き戻します。新しいeraseは行いません。
          </p>
        </div>
        <div className="alert alert-warning">
          <span>
            先に「安全状態を読む」を押してください。CTLRが0x00000200なら、そのまま復旧できます。ロック中ならunlockしてから進めます。
          </span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            className="file-input file-input-error w-full max-w-md"
            type="file"
            accept=".bin,application/octet-stream"
            onChange={onSelectFile}
            disabled={loadEmergencyRecoveryFile.isPending}
            aria-label="保存済みの復旧用binファイルを選ぶ"
          />
          <button
            className="btn btn-error btn-lg font-black"
            onClick={runRestore}
            disabled={
              !canRestore ||
              restoreFromEmergencyFile.isPending ||
              Boolean(emergencyRecoveryResult)
            }
          >
            {restoreFromEmergencyFile.isPending && (
              <span className="loading loading-spinner" />
            )}
            {restoreFromEmergencyFile.isPending
              ? "復旧中（USBを抜かない）"
              : "元の64バイトを書き戻す"}
          </button>
        </div>
        {emergencyRecoveryFile && (
          <p className="text-sm font-bold">
            確認済み: {emergencyRecoveryFile.fileName} /{" "}
            {hex32(emergencyRecoveryFile.checksum)}
          </p>
        )}
        {loadEmergencyRecoveryFile.isError && (
          <div className="alert alert-error" role="alert">
            <span>
              ファイルを確認できません：
              {errorText(loadEmergencyRecoveryFile.error)}
            </span>
          </div>
        )}
        {restoreFromEmergencyFile.isError && (
          <div className="alert alert-error" role="alert">
            <span>
              復旧できませんでした。USBを抜かずログを送ってください：
              {errorText(restoreFromEmergencyFile.error)}
            </span>
          </div>
        )}
        {emergencyRecoveryResult && (
          <div
            className="alert border border-info/30 bg-info/10 text-base-content"
            role="status"
          >
            <span>
              復旧成功：64バイト完全一致、CRC32{" "}
              {hex32(emergencyRecoveryResult.checksum)}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
