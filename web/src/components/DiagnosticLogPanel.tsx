import type { useDeviceDiagnostics } from "../useDeviceDiagnostics";
import type { DiagnosticLogLevel } from "../diagnosticLog";

type Props = { diagnostics: ReturnType<typeof useDeviceDiagnostics> };

const levelLabel: Record<DiagnosticLogLevel, string> = {
  info: "INFO",
  success: "OK",
  warning: "注意",
  error: "エラー",
};

const levelClass: Record<DiagnosticLogLevel, string> = {
  info: "badge-info",
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
};

export function DiagnosticLogPanel({ diagnostics }: Props) {
  const { diagnosticLogs, clearLogs, copyLogs, errorText } = diagnostics;
  const entries = [...diagnosticLogs].reverse();

  return (
    <section
      className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8"
      aria-labelledby="diagnostic-log-title"
    >
      <article className="card border-2 border-base-content/20 bg-base-100 shadow-lg">
        <div className="card-body gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex-1">
              <div className="badge badge-neutral font-bold">LOCAL ONLY</div>
              <h2
                id="diagnostic-log-title"
                className="mt-2 text-2xl font-black"
              >
                診断ログ
              </h2>
              <p className="mt-2 text-sm leading-6 text-base-content/65">
                接続や読み取り結果を時刻付きで表示します。ログはこのページを開いている間だけブラウザ内にあり、サーバーへ送信しません。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-outline btn-info"
                onClick={() => copyLogs.mutate()}
                disabled={entries.length === 0 || copyLogs.isPending}
              >
                {copyLogs.isPending ? "コピー中…" : "ログをコピー"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => clearLogs.mutate()}
                disabled={entries.length === 0 || clearLogs.isPending}
              >
                ログを消す
              </button>
            </div>
          </div>
          {copyLogs.isSuccess && (
            <div
              className="alert border border-info/30 bg-info/10 text-base-content"
              role="status"
            >
              <span>診断ログをクリップボードへコピーしました。</span>
            </div>
          )}
          {copyLogs.isError && (
            <div className="alert alert-error" role="alert">
              <span>コピーできませんでした：{errorText(copyLogs.error)}</span>
            </div>
          )}
          <div className="max-h-96 overflow-auto rounded-box bg-neutral p-3 text-neutral-content">
            {entries.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-neutral-content/60">
                操作すると、ここに診断結果が表示されます。
              </p>
            ) : (
              <ol className="space-y-2" aria-label="新しい順の診断ログ">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-box bg-neutral-content/5 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`badge badge-sm ${levelClass[entry.level]}`}
                      >
                        {levelLabel[entry.level]}
                      </span>
                      <code className="text-xs font-bold">{entry.action}</code>
                      <time className="text-xs text-neutral-content/55">
                        {new Date(entry.timestamp).toLocaleString("ja-JP")}
                      </time>
                    </div>
                    <p className="mt-2 text-sm">{entry.message}</p>
                    {entry.details && (
                      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-content/70">
                        {Object.entries(entry.details).map(([key, value]) => (
                          <div key={key} className="flex gap-1">
                            <dt>{key}=</dt>
                            <dd className="font-mono">{String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
