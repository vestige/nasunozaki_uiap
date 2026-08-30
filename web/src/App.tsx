import { BrowserConnectionCard } from "./components/BrowserConnectionCard";
import { ConnectionGuide } from "./components/ConnectionGuide";
import { DeviceReport } from "./components/DeviceReport";
import { PageHeader } from "./components/PageHeader";
import { FlashWriteReviewCard } from "./components/FlashWriteReviewCard";
import { DiagnosticLogPanel } from "./components/DiagnosticLogPanel";
import { useDeviceDiagnostics } from "./useDeviceDiagnostics";

export default function App() {
  const diagnostics = useDeviceDiagnostics();
  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <PageHeader />
      <ConnectionGuide />
      <BrowserConnectionCard
        supported={diagnostics.supported}
        message={diagnostics.message}
        connect={diagnostics.connect}
      />
      <section className="mx-auto w-full max-w-6xl px-5 pt-8 sm:px-8">
        <FlashWriteReviewCard diagnostics={diagnostics} />
      </section>
      <DeviceReport diagnostics={diagnostics} />
      <DiagnosticLogPanel diagnostics={diagnostics} />
      <footer className="footer bg-neutral px-5 py-8 text-sm text-neutral-content/70 sm:px-[max(2rem,calc((100%-72rem)/2))]">
        <p>
          この診断は接続、RAM通信、読み取り専用の安全確認を行い、フラッシュは書き換えません。
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
