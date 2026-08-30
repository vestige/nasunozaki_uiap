import type { useDeviceDiagnostics } from "../useDeviceDiagnostics";
type Props = { diagnostics: ReturnType<typeof useDeviceDiagnostics> };

export function FeatureReportCard({ diagnostics }: Props) {
  const { featureReport: report, readFeature, errorText } = diagnostics;
  const message = readFeature.isError
    ? `読み取れませんでした：${errorText(readFeature.error)}`
    : report
      ? `${report.rawBytes.length}バイトを読み取りました。${report.allZero ? "内容はすべて0で、状態情報は含まれていません。" : "0以外のデータが含まれています。"}フラッシュへの書き込みは行っていません。`
      : "Report ID 0xAAを読み取れます。この操作は書き込みを行いません。";
  return (
    <article className="card border-2 border-neutral bg-base-100 shadow-lg">
      <div className="card-body gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="badge badge-secondary font-bold">READ ONLY</div>
            <h3 className="mt-2 text-xl font-black">
              Feature Reportを読み取る
            </h3>
            <p className="mt-2 text-sm leading-6 text-base-content/65">
              Report ID
              `0xAA`へGET_REPORT相当の読み取りを行います。データ送信やフラッシュ書き込みは行いません。
            </p>
          </div>
          <button
            className="btn btn-secondary btn-lg font-black"
            onClick={() => readFeature.mutate()}
            disabled={readFeature.isPending}
          >
            {readFeature.isPending && (
              <span className="loading loading-spinner" />
            )}
            {readFeature.isPending ? "読み取り中…" : "0xAAを読み取る"}
          </button>
        </div>
        <div
          role="status"
          className={`alert ${readFeature.isError ? "alert-error" : report ? "alert-success" : "alert-info"}`}
        >
          <span>{message}</span>
        </div>
        {report && (
          <div className="mockup-code bg-neutral text-neutral-content">
            <pre data-prefix="raw">
              <code>{report.rawBytes.length} bytes</code>
            </pre>
            <pre data-prefix="payload">
              <code>{report.payloadBytes.length} bytes</code>
            </pre>
            {report.leadingByte !== undefined && (
              <pre data-prefix="leading">
                <code>{report.leadingByte.toString(16).padStart(2, "0")}</code>
              </pre>
            )}
            <pre data-prefix="time">
              <code>{report.readAt}</code>
            </pre>
            <pre data-prefix="hex">
              <code>
                {report.rawBytes
                  .map((byte) => byte.toString(16).padStart(2, "0"))
                  .join(" ") || "(empty)"}
              </code>
            </pre>
          </div>
        )}
      </div>
    </article>
  );
}
