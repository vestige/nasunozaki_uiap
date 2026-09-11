const SKETCH_URL =
  "https://github.com/vestige/nasunozaki_uiap/raw/refs/heads/main/firmware/workshop-runtime/workshop-runtime.ino";
const CORE_GUIDE_URL = "https://github.com/tarosay/board_manager_files";

export function RuntimeFirmwareGuide() {
  return (
    <details className="collapse-arrow collapse border border-base-300 bg-base-200">
      <summary className="collapse-title font-black">
        はじめて通常動作モードを使うとき
      </summary>
      <div className="collapse-content space-y-4 text-sm leading-6">
        <div className="alert alert-warning">
          <span>
            この手順は現在のプログラムを教育用ランタイムへ置き換えます。必要なプログラムや退避ファイルがある場合は、先に保存してください。
          </span>
        </div>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Arduino IDE 2.xへ「UIAPduino HID」core 1.2.14を追加します。</li>
          <li>教育用ランタイムのスケッチをダウンロードして開きます。</li>
          <li>
            Boardを「HID ProMicro CH32V003」、USBを「WebHID
            Only」、Optimizeを「Smallest (-Os) with LTO」にします。
          </li>
          <li>
            ボタンを押したままUSBを接続し、1秒待ってから離して、Arduino
            IDEの「Upload」を実行します。
          </li>
          <li>
            Upload成功後にUSBを通常どおり接続し直し、「通常動作モードを調べる」を押します。
          </li>
        </ol>
        <p className="font-bold text-base-content/70">
          この段階では、ページ内のflash erase実験は使用しません。
        </p>
        <div className="flex flex-wrap gap-3">
          <a className="btn btn-primary btn-sm" href={SKETCH_URL}>
            スケッチをダウンロード
          </a>
          <a
            className="btn btn-outline btn-sm"
            href={CORE_GUIDE_URL}
            rel="noreferrer"
            target="_blank"
          >
            coreの導入手順を見る ↗
          </a>
        </div>
      </div>
    </details>
  );
}
