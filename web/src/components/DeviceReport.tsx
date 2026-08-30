import type { useDeviceDiagnostics } from "../useDeviceDiagnostics";
import { FeatureReportCard } from "./FeatureReportCard";
import { RamRoundTripCard } from "./RamRoundTripCard";
import { ChipIdentityCard } from "./ChipIdentityCard";
type Props = { diagnostics: ReturnType<typeof useDeviceDiagnostics> };
const hex = (value: number) =>
  `0x${value.toString(16).toUpperCase().padStart(4, "0")}`;

export function DeviceReport({ diagnostics }: Props) {
  const { device } = diagnostics;
  return (
    <section
      className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8"
      aria-labelledby="result-title"
    >
      <p className="text-xs font-black tracking-[.18em] text-primary">
        DEVICE REPORT
      </p>
      <h2 id="result-title" className="mt-1 text-3xl font-black">
        調査結果
      </h2>
      {!device ? (
        <div className="hero mt-6 min-h-72 rounded-box border-2 border-dashed border-base-content/30 bg-base-100/60">
          <div className="hero-content flex-col text-center">
            <div className="mockup-code min-w-56 bg-neutral text-left text-neutral-content shadow-lg">
              <pre data-prefix="$">
                <code>waiting for 32V003...</code>
              </pre>
            </div>
            <p className="max-w-md text-base-content/60">
              接続すると、製品名・VID・PID・HIDレポート情報がここに表示されます。
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
            <div className="stats stats-vertical border-2 border-neutral bg-base-100 shadow-lg">
              <div className="stat">
                <div className="stat-title">製品名</div>
                <div className="stat-value text-2xl">
                  {device.productName || "名称なし"}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Vendor ID</div>
                <div className="stat-value text-2xl">
                  {hex(device.vendorId)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Product ID</div>
                <div className="stat-value text-2xl">
                  {hex(device.productId)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">接続状態</div>
                <div className="stat-value text-2xl text-success">
                  {device.opened ? "接続済み" : "未接続"}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Collection数</div>
                <div className="stat-value text-2xl">
                  {device.collections.length}
                </div>
              </div>
            </div>
            <div className="mockup-code max-h-[520px] overflow-auto bg-neutral text-neutral-content shadow-lg">
              <pre data-prefix="">
                <code>{JSON.stringify(device.collections, null, 2)}</code>
              </pre>
            </div>
          </div>
          <FeatureReportCard diagnostics={diagnostics} />
          <RamRoundTripCard diagnostics={diagnostics} />
          <ChipIdentityCard diagnostics={diagnostics} />
        </div>
      )}
    </section>
  );
}
