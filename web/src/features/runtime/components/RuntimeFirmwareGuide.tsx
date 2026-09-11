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
        <p>
          Arduino IDEがない場合は、リポジトリ直下で次の順に実行できます。実機を書き換えるのは最後の
          <code className="mx-1 rounded bg-base-300 px-1">upload</code>
          だけです。
        </p>
        <div className="mockup-code max-w-full overflow-x-auto text-xs">
          <pre data-prefix="1">
            <code>./scripts/workshop-runtime.sh setup</code>
          </pre>
          <pre data-prefix="2">
            <code>./scripts/workshop-runtime.sh build</code>
          </pre>
          <pre data-prefix="3">
            <code>./scripts/workshop-runtime.sh upload</code>
          </pre>
        </div>
        <p className="font-bold">Arduino IDEを使う場合の手順</p>
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
