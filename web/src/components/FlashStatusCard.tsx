import type { useDeviceDiagnostics } from "../useDeviceDiagnostics";

type Props = { diagnostics: ReturnType<typeof useDeviceDiagnostics> };
const hex32 = (value: number) =>
  `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;

export function FlashStatusCard({ diagnostics }: Props) {
  const { flashStatus: result, inspectFlashStatus, errorText } = diagnostics;
  const needsAttention = Boolean(result?.busy || result?.writeProtectionError);
  const message = inspectFlashStatus.isError
    ? `確認できませんでした：${errorText(inspectFlashStatus.error)}`
    : needsAttention
      ? "処理中または書き込み保護エラーを検出しました。eraseを試さず、下のログを確認してください。"
      : result
        ? "BUSYと書き込み保護エラーは検出されませんでした。"
        : "現在のflash制御状態を読み取ります。flashの内容は変更しません。";

  return (
    <article className="card border-2 border-info bg-base-100 shadow-lg">
      <div className="card-body gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="badge badge-info font-bold">READ ONLY</div>
            <h3 className="mt-2 text-xl font-black">flash statusを診断する</h3>
            <p className="mt-2 text-sm leading-6 text-base-content/65">
              BUSY、書き込み保護エラー、処理完了フラグを確認します。unlock・erase・writeは行いません。
            </p>
          </div>
          <button
            className="btn btn-info btn-lg font-black"
            onClick={() => inspectFlashStatus.mutate()}
            disabled={inspectFlashStatus.isPending}
          >
            {inspectFlashStatus.isPending && (
              <span className="loading loading-spinner" />
            )}
            {inspectFlashStatus.isPending ? "診断中…" : "flash statusを読む"}
          </button>
        </div>
        <div
          role={
            inspectFlashStatus.isError || needsAttention ? "alert" : "status"
          }
          className={`alert ${inspectFlashStatus.isError ? "alert-error" : needsAttention ? "alert-warning" : result ? "alert-success" : "alert-info"}`}
        >
          <span>{message}</span>
        </div>
        {result && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatusItem label="CTLR" value={hex32(result.controlValue)} />
            <StatusItem label="STATR" value={hex32(result.statusValue)} />
            <StatusItem label="OBTKEYR" value={hex32(result.protectionValue)} />
            <StatusItem
              label="BUSY"
              value={result.busy ? "処理中" : "検出なし"}
            />
            <StatusItem
              label="書き込み保護エラー"
              value={result.writeProtectionError ? "検出" : "検出なし"}
            />
            <StatusItem
              label="処理完了フラグ"
              value={result.endOfOperation ? "あり" : "なし"}
            />
          </div>
        )}
      </div>
    </article>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-box bg-base-200 p-4">
      <p className="text-xs font-bold text-base-content/60">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}
