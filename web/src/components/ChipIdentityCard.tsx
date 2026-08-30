import type { useDeviceDiagnostics } from "../useDeviceDiagnostics";

type Props = { diagnostics: ReturnType<typeof useDeviceDiagnostics> };
const hex32 = (value: number) =>
  `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;

export function ChipIdentityCard({ diagnostics }: Props) {
  const { chipIdentity: result, identifyChip, errorText } = diagnostics;
  const message = identifyChip.isError
    ? `読み取りに失敗しました：${errorText(identifyChip.error)}`
    : result
      ? `成功：${hex32(result.address)}から${hex32(result.value)}を読み取りました（確認${result.attempts}回）。`
      : "未実施です。RAM上の読み取り処理を実行しますが、フラッシュの消去・書き込みは行いません。";

  return (
    <article className="card border-2 border-info bg-base-100 shadow-lg">
      <div className="card-body gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="badge badge-info font-bold">READ EXEC</div>
            <h3 className="mt-2 text-xl font-black">チップ識別値を読み取る</h3>
            <p className="mt-2 text-sm leading-6 text-base-content/65">
              参照実装と同じ読み取り専用RISC-V
              stubをRAMで実行し、CH32V003の識別領域を4バイト読みます。
            </p>
          </div>
          <button
            className="btn btn-info btn-lg font-black"
            onClick={() => identifyChip.mutate()}
            disabled={identifyChip.isPending}
          >
            {identifyChip.isPending && (
              <span className="loading loading-spinner" />
            )}
            {identifyChip.isPending ? "読み取り中…" : "識別値を読む"}
          </button>
        </div>
        <div
          role="status"
          className={`alert ${identifyChip.isError ? "alert-error" : result ? "alert-success" : "alert-info"}`}
        >
          <span>{message}</span>
        </div>
      </div>
    </article>
  );
}
