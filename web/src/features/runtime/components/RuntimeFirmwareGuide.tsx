import { RuntimeFirmwareInstall } from "./RuntimeFirmwareInstall";

const SKETCH_ZIP_URL = "/nasunozaki_uiap/workshop-runtime.zip";

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
        <p>完成済みファームウェアをブラウザから書き込めます。Arduino CLIのインストールは不要です。</p>
        <p>
          ボタンを押したままUSBへ接続し、約1秒後に離して書き込みモードにします。下のボタンから書き込み、成功したらUSBを接続し直して「通常動作モードを調べる」を押します。
        </p>
        <RuntimeFirmwareInstall />
        <p className="font-bold text-base-content/70">
          この段階では、ページ内のflash erase実験は使用しません。
        </p>
        <div className="flex flex-wrap gap-3">
          <a className="btn btn-primary btn-sm" href={SKETCH_ZIP_URL} download="workshop-runtime.zip">
            完成済みファームウェアをZIPで保存
          </a>
        </div>
      </div>
    </details>
  );
}
