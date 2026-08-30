import type { useDeviceDiagnostics } from "../useDeviceDiagnostics";

type Props = { diagnostics: ReturnType<typeof useDeviceDiagnostics> };
const hex32 = (value: number) =>
  `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;

export function FlashSafetyCard({ diagnostics }: Props) {
  const { flashSafety: result, inspectFlashSafety, errorText } = diagnostics;
  const message = inspectFlashSafety.isError
    ? `確認できませんでした：${errorText(inspectFlashSafety.error)}`
    : result?.readProtected
      ? "read protectionが有効です。書き込み処理へ進めません。"
      : result?.locked
        ? "flashはロック中で、read protectionは検出されませんでした。これは通常の安全な待機状態です。"
        : result
          ? "flashはすでにunlock状態です。意図しない状態のため、再接続してから再確認してください。"
          : "CTLRとread protection状態を読み取り専用stubで確認します。";
  const statusClass = inspectFlashSafety.isError
    ? "alert-error"
    : result?.readProtected || (result && !result.locked)
      ? "alert-warning"
      : result
        ? "alert-success"
        : "alert-info";

  return (
    <article className="card border-2 border-info bg-base-100 shadow-lg">
      <div className="card-body gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="badge badge-info font-bold">READ ONLY</div>
            <h3 className="mt-2 text-xl font-black">
              flashの安全状態を確認する
            </h3>
            <p className="mt-2 text-sm leading-6 text-base-content/65">
              ロック状態とread
              protectionを読み取ります。unlock・erase・writeは行いません。
            </p>
          </div>
          <button
            className="btn btn-info btn-lg font-black"
            onClick={() => inspectFlashSafety.mutate()}
            disabled={inspectFlashSafety.isPending}
          >
            {inspectFlashSafety.isPending && (
              <span className="loading loading-spinner" />
            )}
            {inspectFlashSafety.isPending ? "確認中…" : "安全状態を読む"}
          </button>
        </div>
        <div role="status" className={`alert ${statusClass}`}>
          <span>{message}</span>
        </div>
        {result && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-box bg-base-200 p-4">
              <p className="text-xs font-bold text-base-content/60">CTLR</p>
              <p className="mt-1 font-black">{hex32(result.controlValue)}</p>
            </div>
            <div className="rounded-box bg-base-200 p-4">
              <p className="text-xs font-bold text-base-content/60">OBTKEYR</p>
              <p className="mt-1 font-black">{hex32(result.protectionValue)}</p>
            </div>
            <div className="rounded-box bg-base-200 p-4">
              <p className="text-xs font-bold text-base-content/60">
                flash lock
              </p>
              <p className="mt-1 font-black">
                {result.locked ? "ロック中" : "unlock済み"}
              </p>
            </div>
            <div className="rounded-box bg-base-200 p-4">
              <p className="text-xs font-bold text-base-content/60">
                read protection
              </p>
              <p className="mt-1 font-black">
                {result.readProtected ? "有効" : "検出なし"}
              </p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
