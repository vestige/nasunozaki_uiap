import type { useDeviceDiagnostics } from "../useDeviceDiagnostics";
type Props = { diagnostics: ReturnType<typeof useDeviceDiagnostics> };

export function RamRoundTripCard({ diagnostics }: Props) {
  const { roundTripResult: result, roundTrip, errorText } = diagnostics;
  const failed = roundTrip.isError || result?.succeeded === false;
  const message = roundTrip.isError
    ? `往復テストに失敗しました：${errorText(roundTrip.error)}`
    : result?.succeeded
      ? "成功：127バイトがRAMへ届き、同じ内容を読み戻せました。フラッシュは変更していません。"
      : result
        ? `不一致：送信127バイトに対し、payload候補${result.receivedLength}バイトでした。実行マジック値は送っていません。`
        : "未実施です。";
  return (
    <article className="card border-2 border-warning bg-base-100 shadow-lg">
      <div className="card-body gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="badge badge-warning font-bold">RAM ONLY</div>
            <h3 className="mt-2 text-xl font-black">RAM往復テスト</h3>
            <p className="mt-2 text-sm leading-6 text-base-content/65">
              127バイトの固定パターンをscratchpadへ送り、読み戻して一致を確認します。実行用マジック値は送らず、フラッシュにも書き込みません。
            </p>
          </div>
          <button
            className="btn btn-warning btn-lg font-black"
            onClick={() => roundTrip.mutate()}
            disabled={roundTrip.isPending}
          >
            {roundTrip.isPending && (
              <span className="loading loading-spinner" />
            )}
            {roundTrip.isPending ? "確認中…" : "RAM往復を試す"}
          </button>
        </div>
        <div
          role="status"
          className={`alert ${failed ? "alert-error" : result?.succeeded ? "alert-success" : "alert-warning"}`}
        >
          <span>{message}</span>
        </div>
      </div>
    </article>
  );
}
