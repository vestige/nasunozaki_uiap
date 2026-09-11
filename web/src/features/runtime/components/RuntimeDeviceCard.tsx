import { useRuntimeDeviceDiagnostics } from "../hooks/useRuntimeDeviceDiagnostics";
import { assessRuntimeCompatibility } from "../utils/runtimeCompatibility";
import {
  UIAP_RUNTIME_PRODUCT_ID,
  UIAP_RUNTIME_VENDOR_ID,
} from "../utils/runtimeDevice";
import { RuntimeFirmwareGuide } from "./RuntimeFirmwareGuide";

const hex = (value: number) =>
  `0x${value.toString(16).toUpperCase().padStart(4, "0")}`;

export function RuntimeDeviceCard() {
  const diagnostics = useRuntimeDeviceDiagnostics();
  const device = diagnostics.device;
  const compatibility = device
    ? assessRuntimeCompatibility(device.collections)
    : null;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-8 sm:px-8">
      <article className="card border-2 border-primary/40 bg-base-100 shadow-lg">
        <div className="card-body min-w-0 gap-5">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <div className="badge badge-info font-bold">READ ONLY</div>
              <h2 className="mt-2 text-2xl font-black">
                通常動作モードを調べる
              </h2>
              <p className="mt-2 text-sm leading-6 text-base-content/65">
                ワークショップ用ファームウェアを書き込んだ後の接続を確認します。
                対象は {hex(UIAP_RUNTIME_VENDOR_ID)}:{hex(UIAP_RUNTIME_PRODUCT_ID)}
                です。この確認ではLED命令を送りません。
              </p>
            </div>
            <button
              className="btn btn-primary w-full font-black sm:w-auto lg:shrink-0"
              disabled={diagnostics.connect.isPending}
              onClick={() => diagnostics.connect.mutate()}
            >
              {diagnostics.connect.isPending && (
                <span className="loading loading-spinner" />
              )}
              {diagnostics.connect.isPending ? "確認中…" : "通常動作モードを調べる"}
            </button>
          </div>

          <div className="alert alert-info" role="status">
            <span>{diagnostics.message}</span>
          </div>

          <RuntimeFirmwareGuide />

          {device && compatibility?.mode === "runtime-candidate" && (
            <div className="rounded-box border border-success/40 bg-success/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-black">LEDの通信を確認する</h3>
                  <p className="mt-1 text-sm leading-6 text-base-content/70">
                    LEDを約0.4秒点灯して消灯し、2回の8バイト応答を診断ログへ記録します。
                  </p>
                </div>
                <button
                  className="btn btn-success w-full font-black sm:w-auto sm:shrink-0"
                  disabled={diagnostics.ledCheck.isPending}
                  onClick={() => diagnostics.ledCheck.mutate()}
                >
                  {diagnostics.ledCheck.isPending && (
                    <span className="loading loading-spinner" />
                  )}
                  {diagnostics.ledCheck.isPending
                    ? "確認中…"
                    : "LEDを1回光らせる"}
                </button>
              </div>
            </div>
          )}

          {device && (
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)]">
              <dl className="grid gap-3 rounded-box bg-base-200 p-4 text-sm sm:grid-cols-2 lg:grid-cols-1">
                <Result label="製品名" value={device.productName || "名称なし"} />
                <Result label="Vendor ID" value={hex(device.vendorId)} />
                <Result label="Product ID" value={hex(device.productId)} />
                <Result
                  label="Report判定"
                  value={
                    compatibility?.mode === "runtime-candidate"
                      ? "ランタイム候補"
                      : "要確認"
                  }
                />
              </dl>
              <div className="mockup-code min-w-0 max-w-full max-h-80 overflow-auto bg-neutral text-neutral-content">
                <pre data-prefix="">
                  <code>{JSON.stringify(device.collections, null, 2)}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-bold text-base-content/55">{label}</dt>
      <dd className="font-mono text-base font-black">{value}</dd>
    </div>
  );
}
