import { RuntimeFirmwareInstall } from "./RuntimeFirmwareInstall";
import { ConnectionGuide } from "../../device/components/ConnectionGuide";

const SKETCH_ZIP_URL = "/nasunozaki_uiap/workshop-runtime.zip";

export function RuntimeFirmwareGuide() {
  return (
    <details className="collapse-arrow collapse border border-base-300 bg-base-200">
      <summary className="collapse-title font-black">
        はじめての準備（最初の1回だけ）
      </summary>
      <div className="collapse-content space-y-4 text-sm leading-6">
        <div className="alert alert-warning">
          <span>
            この準備をすると、ボードに入っている前のプログラムは消えます。必要なら先生や保護者といっしょに、先に保存してください。
          </span>
        </div>
        <p>ボードをはじめて使うときは、動かすための準備を一度だけ行います。おとなといっしょに進めてください。</p>
        <ConnectionGuide />
        <RuntimeFirmwareInstall />
        <p className="font-bold text-base-content/70">終わったらUSBを抜き、ボタンを押さずにつなぎ直して「ボードに接続」を押してください。</p>
        <details className="rounded-box border border-base-300 bg-base-100 p-3">
          <summary className="cursor-pointer font-bold">先生・保護者向け：準備用ファイル</summary>
          <div className="mt-3 flex flex-wrap gap-3">
            <a className="btn btn-primary btn-sm" href={SKETCH_ZIP_URL} download="workshop-runtime.zip">
              完成済みファームウェアをZIPで保存
            </a>
          </div>
        </details>
      </div>
    </details>
  );
}
