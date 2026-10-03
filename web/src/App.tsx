import { BrowserConnectionCard } from "./features/device/components/BrowserConnectionCard";
import { DeviceReport } from "./features/device/components/DeviceReport";
import { PageHeader } from "./components/PageHeader";
import { DiagnosticLogPanel } from "./features/device/components/DiagnosticLogPanel";
import { useDeviceDiagnostics } from "./features/device/hooks/useDeviceDiagnostics";
import { BlocklyStudio } from "./features/blockly/components/BlocklyStudio";
import { RuntimeDeviceCard } from "./features/runtime/components/RuntimeDeviceCard";

export default function App() {
  const diagnostics = useDeviceDiagnostics();
  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <PageHeader />
      <BlocklyStudio />
      <RuntimeDeviceCard />
      <section
        className="mx-auto w-full max-w-6xl px-5 pb-12 pt-8 sm:px-8"
        aria-label="困ったときと詳しい情報"
      >
        <details className="rounded-box border border-base-300 bg-base-100 shadow-sm">
          <summary className="cursor-pointer p-5 text-lg font-black">困ったとき・くわしい情報</summary>
          <p className="px-5 text-sm text-base-content/70">接続できないときや、ボードの詳しい状態を調べたいときに開いてください。</p>
          <BrowserConnectionCard
            supported={diagnostics.supported}
            message={diagnostics.message}
            connect={diagnostics.connect}
          />
          <DeviceReport diagnostics={diagnostics} />
          <DiagnosticLogPanel diagnostics={diagnostics} />
        </details>
      </section>
      <footer className="footer bg-neutral px-5 py-8 text-sm text-neutral-content/70 sm:px-[max(2rem,calc((100%-72rem)/2))]">
        <p>
          UIAPduinoの設計や詳しい接続情報は、下のリンクから確認できます。
        </p>
        <a
          className="link link-warning font-bold"
          href="https://github.com/vestige/nasunozaki_uiap"
        >
          GitHubで設計を見る ↗
        </a>
      </footer>
    </main>
  );
}
