import type { HidCollection } from "../../device/types/webhid";
import { assessRuntimeCompatibility } from "../utils/runtimeCompatibility";

type Props = { collections: HidCollection[] };

const hex = (value: number) => `0x${value.toString(16).toUpperCase()}`;
const reportList = (values: number[]) =>
  values.length > 0 ? values.map(hex).join(", ") : "なし";

export function RuntimeCompatibilityCard({ collections }: Props) {
  const result = assessRuntimeCompatibility(collections);
  const content = copy[result.mode];

  return (
    <article className="card border-2 border-neutral bg-base-100 shadow-lg">
      <div className="card-body gap-5">
        <div>
          <div className={`badge ${content.badgeClass} font-bold`}>
            READ ONLY
          </div>
          <h3 className="mt-2 text-xl font-black">実行モードを確認</h3>
          <p className="mt-2 text-sm leading-6 text-base-content/65">
            接続時にブラウザが取得したHID情報だけを確認します。ボードへの送信は行いません。
          </p>
        </div>
        <div className={`alert ${content.alertClass}`} role="status">
          <span>
            <strong>{content.title}</strong>
            <br />
            {content.description}
          </span>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <ReportItem
            label="Input Report"
            value={reportList(result.inputReportIds)}
          />
          <ReportItem
            label="Output Report"
            value={reportList(result.outputReportIds)}
          />
          <ReportItem
            label="Feature Report"
            value={reportList(result.featureReportIds)}
          />
        </dl>
      </div>
    </article>
  );
}

function ReportItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-box bg-base-200 p-4">
      <dt className="font-bold text-base-content/60">{label}</dt>
      <dd className="mt-1 font-mono text-base font-black">{value}</dd>
    </div>
  );
}

const copy = {
  bootloader: {
    badgeClass: "badge-info",
    alertClass: "alert-info",
    title: "書き込み用モードとして接続されています。",
    description:
      "Report ID 0xAAのFeature Reportだけが見つかりました。現在の接続は調査・書き込み用で、BlocklyのLED命令を直接実行する教育用ランタイムはまだ確認できません。",
  },
  "runtime-candidate": {
    badgeClass: "badge-warning",
    alertClass: "alert-warning",
    title: "教育用ランタイムの候補があります。",
    description:
      "InputまたはOutput Reportが見つかりました。ただし、命令形式を確定するにはファームウェア仕様との照合が必要です。まだ命令は送信しません。",
  },
  unknown: {
    badgeClass: "badge-warning",
    alertClass: "alert-warning",
    title: "実行モードを判定できませんでした。",
    description:
      "教育用ランタイムとして必要なReportを確認できません。HID情報とファームウェア仕様を追加調査します。",
  },
} as const;
