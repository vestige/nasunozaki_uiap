const SKETCH_ZIP_URL = "/nasunozaki_uiap/workshop-runtime.zip";
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
          Arduino CLIをインストールした後、ZIPを展開したフォルダで次の順に実行します。実機を書き換えるのは最後の
          <code className="mx-1 rounded bg-base-300 px-1">upload</code>
          だけです。
        </p>
        <div className="mockup-code max-w-full overflow-x-auto text-xs">
          <pre data-prefix="0">
            <code>cd workshop-runtime</code>
          </pre>
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
        <p>
          uploadの直前にボタンを押したままUSBへ接続し、約1秒後に離してください。成功したらUSBを外し、ボタンを押さずに接続し直して「通常動作モードを調べる」を押します。
        </p>
        <p>
          詳しい準備とWebHID descriptor補正については同梱READMEを確認してください。
        </p>
        <p className="font-bold text-base-content/70">
          この段階では、ページ内のflash erase実験は使用しません。
        </p>
        <div className="flex flex-wrap gap-3">
          <a className="btn btn-primary btn-sm" href={SKETCH_ZIP_URL} download="workshop-runtime.zip">
            教育用ランタイムをZIPでダウンロード
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
