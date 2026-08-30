import type { ChangeEvent } from "react";
import type { useDeviceDiagnostics } from "../useDeviceDiagnostics";

type Props = { diagnostics: ReturnType<typeof useDeviceDiagnostics> };
const hex = (value: number) =>
  `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;

export function FlashWriteReviewCard({ diagnostics }: Props) {
  const { flashWriteReview: review, reviewFlashWrite, errorText } = diagnostics;
  const onSelectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) reviewFlashWrite.mutate(file);
  };
  const message = reviewFlashWrite.isError
    ? `確認できませんでした：${errorText(reviewFlashWrite.error)}`
    : review
      ? "書き込み計画を作成しました。これは確認だけで、ボードへの送信・消去・書き込みは行いません。"
      : "binファイルを選ぶと、書き込み前に対象範囲と手順を確認できます。";

  return (
    <article className="card border-2 border-error bg-base-100 shadow-lg">
      <div className="card-body gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="badge badge-error font-bold">DRY RUN ONLY</div>
            <h3 className="mt-2 text-xl font-black">書き込み前の確認</h3>
            <p className="mt-2 text-sm leading-6 text-base-content/65">
              ファイルをPC内だけで確認し、64バイトblock単位の安全な書き込み計画を表示します。
            </p>
          </div>
          <input
            className="file-input file-input-error w-full max-w-xs font-bold"
            type="file"
            accept=".bin,application/octet-stream"
            onChange={onSelectFile}
            disabled={reviewFlashWrite.isPending}
            aria-label="確認するbinファイルを選ぶ"
          />
        </div>
        <div
          role="status"
          className={`alert ${reviewFlashWrite.isError ? "alert-error" : review ? "alert-success" : "alert-info"}`}
        >
          <span>
            {reviewFlashWrite.isPending ? "書き込み計画を確認中…" : message}
          </span>
        </div>
        {review && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-box bg-base-200 p-4">
              <p className="text-xs font-bold text-base-content/60">ファイル</p>
              <p className="mt-1 break-all font-black">{review.fileName}</p>
            </div>
            <div className="rounded-box bg-base-200 p-4">
              <p className="text-xs font-bold text-base-content/60">容量</p>
              <p className="mt-1 font-black">
                {review.plan.targetLength.toLocaleString()} bytes
              </p>
            </div>
            <div className="rounded-box bg-base-200 p-4">
              <p className="text-xs font-bold text-base-content/60">
                書き込み先
              </p>
              <p className="mt-1 font-black">
                {hex(review.plan.targetAddress)}
              </p>
            </div>
            <div className="rounded-box bg-base-200 p-4">
              <p className="text-xs font-bold text-base-content/60">
                対象block
              </p>
              <p className="mt-1 font-black">{review.plan.blocks.length} 個</p>
            </div>
          </div>
        )}
        {review && (
          <p className="text-sm leading-6 text-base-content/65">
            手順: preflight → unlock → backup → merge → erase → write → verify
          </p>
        )}
      </div>
    </article>
  );
}
