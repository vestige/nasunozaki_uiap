'use client';

import { useMemo, useState } from 'react';

type HidCollection = {
  usagePage?: number; usage?: number;
  inputReports?: Array<{ reportId: number; items?: unknown[] }>;
  outputReports?: Array<{ reportId: number; items?: unknown[] }>;
  featureReports?: Array<{ reportId: number; items?: unknown[] }>;
  children?: HidCollection[];
};
type HidDevice = { vendorId: number; productId: number; productName?: string; opened: boolean; collections: HidCollection[]; open(): Promise<void>; close(): Promise<void> };
type HidNavigator = Navigator & { hid?: { requestDevice(options: { filters: Array<{ vendorId: number }> }): Promise<HidDevice[]> } };

const UIAP_VENDOR_ID = 0x1209;
const hex = (value: number) => `0x${value.toString(16).toUpperCase().padStart(4, '0')}`;

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
    setMessage('一覧からUIAPduinoを選んでください。');
    try {
      const devices = await hid.requestDevice({ filters: [{ vendorId: UIAP_VENDOR_ID }] });
      const selected = devices[0];
      if (!selected) {
        setMessage('ボードは選ばれませんでした。USB接続を確認して、もう一度試してください。');
        return;
      }
      if (!selected.opened) await selected.open();
      setDevice(selected);
      setMessage('ボード情報を取得できました。下の結果を記録してください。');
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setMessage(`接続できませんでした：${detail}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <header className="hero">
        <div className="brand"><span>U</span> UIAPduino Workshop</div>
        <div className="phase">PHASE 0 · 実機調査</div>
        <h1>ボードとブラウザの<br />相性をチェックしよう</h1>
        <p className="lead">UIAPduinoをつないでボタンを押すと、WebHIDで使うために必要な情報を確認できます。この画面では、まだLEDの書き換えは行いません。</p>
      </header>

      <section className="workspace" aria-label="接続診断">
        <div className="steps">
          <article><b>1</b><div><h2>USBでつなぐ</h2><p>データ通信できるUSBケーブルを使います。</p></div></article>
          <article><b>2</b><div><h2>Chromeで開く</h2><p>SafariやFirefoxでは接続できません。</p></div></article>
          <article><b>3</b><div><h2>ボードを選ぶ</h2><p>下のボタンからUIAPduinoを選びます。</p></div></article>
        </div>

        <div className="diagnostic-card">
          <div className={`status-dot ${supported ? 'ok' : 'bad'}`} aria-hidden="true" />
          <div><p className="eyebrow">ブラウザ確認</p><h2>{supported ? 'WebHIDを利用できます' : 'WebHIDを利用できません'}</h2></div>
          <button onClick={inspectDevice} disabled={busy || !supported}>{busy ? '確認中…' : 'UIAPduinoを調べる'}</button>
          <p className="message" role="status">{message}</p>
        </div>
      </section>

      <section className="results" aria-labelledby="result-title">
        <div className="section-heading"><p className="eyebrow">DEVICE REPORT</p><h2 id="result-title">調査結果</h2></div>
        {!device ? (
          <div className="empty-result"><div className="board-illustration"><span /></div><p>接続すると、VID・PIDとHIDレポート情報がここに表示されます。</p></div>
        ) : (
          <div className="device-report">
            <dl>
              <div><dt>製品名</dt><dd>{device.productName || '名称なし'}</dd></div>
              <div><dt>Vendor ID</dt><dd>{hex(device.vendorId)}</dd></div>
              <div><dt>Product ID</dt><dd>{hex(device.productId)}</dd></div>
              <div><dt>接続状態</dt><dd>{device.opened ? '接続済み' : '未接続'}</dd></div>
              <div><dt>Collection数</dt><dd>{device.collections.length}</dd></div>
            </dl>
            <pre>{JSON.stringify(device.collections, null, 2)}</pre>
          </div>
        )}
      </section>

      <footer><span>この診断ではデバイスの選択と情報取得だけを行います。</span><a href="https://github.com/vestige/nasunozaki_uiap">GitHubで設計を見る ↗</a></footer>
    </main>
  );
}
