import { useMemo, useState } from 'react';

type HidCollection = {
  usagePage?: number;
  usage?: number;
  type?: number;
  inputReports?: Array<{ reportId: number; items?: unknown[] }>;
  outputReports?: Array<{ reportId: number; items?: unknown[] }>;
  featureReports?: Array<{ reportId: number; items?: unknown[] }>;
  children?: HidCollection[];
};

type HidDevice = {
  vendorId: number;
  productId: number;
  productName?: string;
  opened: boolean;
  collections: HidCollection[];
  open(): Promise<void>;
};

type HidNavigator = Navigator & {
  hid?: {
    requestDevice(options: { filters: Array<{ vendorId: number }> }): Promise<HidDevice[]>;
  };
};

const UIAP_VENDOR_ID = 0x1209;
const hex = (value: number) => `0x${value.toString(16).toUpperCase().padStart(4, '0')}`;

const connectionSteps = [
  ['1', 'ボタンを押し続ける', 'UIAPduinoのボタンを押したままにします。'],
  ['2', 'USBをつなぐ', 'ボタンから指を離さず、PCへ接続します。'],
  ['3', '1秒待って離す', '接続後に1秒数えてから、ボタンを離します。'],
  ['4', 'ボードを選ぶ', '下のボタンを押し、表示された32V003を選びます。'],
];

export default function App() {
  const [device, setDevice] = useState<HidDevice | null>(null);
  const [message, setMessage] = useState('まだボードを調べていません。');
  const [busy, setBusy] = useState(false);
  const supported = useMemo(() => typeof navigator !== 'undefined' && 'hid' in navigator, []);

  async function inspectDevice() {
    const hid = (navigator as HidNavigator).hid;
    if (!hid) {
      setMessage('このブラウザはWebHIDに対応していません。PC版ChromeまたはEdgeで開いてください。');
      return;
    }

    setBusy(true);
    setMessage('一覧から「32V003」を選んでください。');
    try {
      const devices = await hid.requestDevice({ filters: [{ vendorId: UIAP_VENDOR_ID }] });
      const selected = devices[0];
      if (!selected) {
        setMessage('ボードは選ばれませんでした。接続手順を確認して、もう一度試してください。');
        return;
      }
      if (!selected.opened) await selected.open();
      setDevice(selected);
      setMessage('ボード情報を取得できました。Phase 0の接続確認は成功です。');
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setMessage(`接続できませんでした：${detail}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <header className="hero-grid bg-neutral text-neutral-content">
        <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="navbar min-h-0 px-0">
            <div className="flex-1 gap-3 font-black tracking-wide">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-xl text-primary-content">U</span>
              UIAPduino Workshop
            </div>
            <div className="badge badge-warning badge-outline font-bold">PHASE 0</div>
          </div>

          <div className="max-w-3xl pb-8 pt-16 sm:pt-24">
            <p className="mb-3 font-black tracking-[.22em] text-warning">実機調査</p>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              ボードとブラウザの<br />相性をチェックしよう
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-neutral-content/75 sm:text-lg">
              正しい順番でUIAPduinoをつなぎ、WebHIDで使うための情報を確認します。
              この診断ではLEDやプログラムの書き換えは行いません。
            </p>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto -mt-8 w-full max-w-6xl px-5 sm:px-8" aria-labelledby="steps-title">
        <h2 id="steps-title" className="sr-only">接続手順</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {connectionSteps.map(([number, title, detail]) => (
            <article className="card border-2 border-neutral bg-base-100 shadow-[5px_5px_0_#172638]" key={number}>
              <div className="card-body flex-row gap-4 p-5">
                <div className="badge badge-warning size-10 shrink-0 rounded-full border-0 text-lg font-black">{number}</div>
                <div><h3 className="font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-base-content/65">{detail}</p></div>
              </div>
            </article>
          ))}
        </div>

        <div role="alert" className="alert mt-6 border-2 border-neutral bg-warning text-warning-content shadow-[4px_4px_0_#172638]">
          <span className="text-2xl" aria-hidden="true">☝️</span>
          <div><h3 className="font-black">先にUSBをつながないでね</h3><p className="text-sm">ボタンを押したままUSBをつなぎ、1秒待ってから指を離します。</p></div>
        </div>

        <div className="card mt-7 border-2 border-neutral bg-base-100 shadow-xl">
          <div className="card-body gap-5 sm:flex-row sm:items-center">
            <div className={`status ${supported ? 'status-success' : 'status-error'} status-xl shrink-0`} aria-hidden="true" />
            <div className="flex-1">
              <div className="text-xs font-black tracking-[.16em] text-primary">ブラウザ確認</div>
              <h2 className="mt-1 text-xl font-black sm:text-2xl">{supported ? 'WebHIDを利用できます' : 'WebHIDを利用できません'}</h2>
              <p className="mt-2 text-sm text-base-content/65" role="status">{message}</p>
            </div>
            <button className="btn btn-primary btn-lg font-black" onClick={inspectDevice} disabled={busy || !supported}>
              {busy && <span className="loading loading-spinner" />}
              {busy ? '確認中…' : 'UIAPduinoを調べる'}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8" aria-labelledby="result-title">
        <p className="text-xs font-black tracking-[.18em] text-primary">DEVICE REPORT</p>
        <h2 id="result-title" className="mt-1 text-3xl font-black">調査結果</h2>

        {!device ? (
          <div className="hero mt-6 min-h-72 rounded-box border-2 border-dashed border-base-content/30 bg-base-100/60">
            <div className="hero-content flex-col text-center">
              <div className="mockup-code min-w-56 bg-neutral text-left text-neutral-content shadow-lg"><pre data-prefix="$"><code>waiting for 32V003...</code></pre></div>
              <p className="max-w-md text-base-content/60">接続すると、製品名・VID・PID・HIDレポート情報がここに表示されます。</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
            <div className="stats stats-vertical border-2 border-neutral bg-base-100 shadow-lg">
              <div className="stat"><div className="stat-title">製品名</div><div className="stat-value text-2xl">{device.productName || '名称なし'}</div></div>
              <div className="stat"><div className="stat-title">Vendor ID</div><div className="stat-value text-2xl">{hex(device.vendorId)}</div></div>
              <div className="stat"><div className="stat-title">Product ID</div><div className="stat-value text-2xl">{hex(device.productId)}</div></div>
              <div className="stat"><div className="stat-title">接続状態</div><div className="stat-value text-2xl text-success">{device.opened ? '接続済み' : '未接続'}</div></div>
              <div className="stat"><div className="stat-title">Collection数</div><div className="stat-value text-2xl">{device.collections.length}</div></div>
            </div>
            <div className="mockup-code max-h-[520px] overflow-auto bg-neutral text-neutral-content shadow-lg">
              <pre data-prefix=""><code>{JSON.stringify(device.collections, null, 2)}</code></pre>
            </div>
          </div>
        )}
      </section>

      <footer className="footer bg-neutral px-5 py-8 text-sm text-neutral-content/70 sm:px-[max(2rem,calc((100%-72rem)/2))]">
        <p>この診断ではデバイスの選択と情報取得だけを行います。</p>
        <a className="link link-warning font-bold" href="https://github.com/vestige/nasunozaki_uiap">GitHubで設計を見る ↗</a>
      </footer>
    </main>
  );
}
