import { useState } from "react";
import type { HidDevice, HidNavigator } from "../../device/types/webhid";
import flash from "../utils/rv003usb_webflasher.js";

const BASE = "/nasunozaki_uiap/";
const BOOTLOADER_VENDOR_ID = 0x1209;
const BOOTLOADER_PRODUCT_ID = 0xb803;

type BuildInfo = { binary_sha256: string };

export async function loadVerifiedImage(): Promise<Uint8Array> {
  const [infoResponse, imageResponse] = await Promise.all([
    fetch(`${BASE}workshop-runtime.json`, { cache: "no-store" }),
    fetch(`${BASE}workshop-runtime.bin`, { cache: "no-store" }),
  ]);
  if (!infoResponse.ok || !imageResponse.ok) throw new Error("ファームウェアを取得できませんでした。");
  const info = (await infoResponse.json()) as BuildInfo;
  const image = new Uint8Array(await imageResponse.arrayBuffer());
  if (image.length === 0 || image.length > 16384) throw new Error("ファームウェアの容量が対象ボードに合いません。");
  const digest = await crypto.subtle.digest("SHA-256", image);
  const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (actual !== info.binary_sha256) throw new Error("ファームウェアの照合に失敗しました。ページを再読み込みしてください。");
  return image;
}

export function RuntimeFirmwareInstall() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("書き込みモードのUIAPduinoを接続してから開始してください。");

  const install = async () => {
    const hid = (navigator as HidNavigator).hid;
    if (!hid) {
      setMessage("WebHID対応のPC版ChromeまたはEdgeで開いてください。");
      return;
    }
    setBusy(true);
    let device: HidDevice | undefined;
    try {
      // Device selection must be the first awaited operation after the click.
      const devices = await hid.requestDevice({ filters: [{ vendorId: BOOTLOADER_VENDOR_ID, productId: BOOTLOADER_PRODUCT_ID }] });
      device = devices[0];
      if (!device) {
        setMessage("ボードが選択されませんでした。書き込みモードを確認してください。");
        return;
      }
      if (device.vendorId !== BOOTLOADER_VENDOR_ID || device.productId !== BOOTLOADER_PRODUCT_ID) {
        throw new Error("対象外のボードが選択されました。");
      }
      setMessage("ファームウェアを照合しています…");
      const image = await loadVerifiedImage();
      const succeeded = await flash(image, ({ step, offset, size }) => {
        if (step < 4) setMessage("ボードを準備しています…");
        else if (step < 6) setMessage(`書き込みと照合中… ${Math.min(100, Math.round(offset / size * 100))}%`);
        else setMessage("起動を確認しています…");
      }, device);
      if (!succeeded) throw new Error("書き込みまたは照合に失敗しました。再試行せず、接続状態を確認してください。");
      setMessage("書き込みと照合が完了しました。USBを接続し直し、通常動作モードを調べてください。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "書き込みを完了できませんでした。");
    } finally {
      if (device?.opened && "close" in device) {
        try {
          await (device as HidDevice & { close(): Promise<void> }).close();
        } catch {
          // The bootloader may disconnect when the newly installed app starts.
        }
      }
      setBusy(false);
    }
  };

  return (
    <div className="rounded-box border border-warning/40 bg-warning/10 p-4">
      <p className="font-bold">ブラウザから書き込む</p>
      <p className="mt-1 text-sm">現在のプログラムを置き換えます。必要なプログラムや退避ファイルを先に保存してください。</p>
      <button className="btn btn-warning btn-sm mt-3" disabled={busy} onClick={install}>
        {busy ? "書き込み中…" : "教育用ランタイムを書き込む"}
      </button>
      <p role="status" className="mt-3 text-sm">{message}</p>
    </div>
  );
}
