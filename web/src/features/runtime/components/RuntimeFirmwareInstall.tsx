import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { HidDevice, HidNavigator } from "../../device/types/webhid";
import {
  createDiagnosticLogEntry,
  type DiagnosticLogEntry,
  type DiagnosticLogLevel,
} from "../../../diagnosticLog";
import { queryKeys } from "../../../query";
import flash from "../utils/rv003usb_webflasher.js";
import {
  browserDiagnosticDetails,
  formatVidPid,
  RuntimeDiagnosticError,
  runtimeErrorDetails,
} from "../utils/runtimeDiagnostic";

const BASE = "/nasunozaki_uiap/";
const BOOTLOADER_VENDOR_ID = 0x1209;
const BOOTLOADER_PRODUCT_ID = 0xb803;

type BuildInfo = { binary_sha256: string };

export async function loadVerifiedImage(): Promise<Uint8Array> {
  let infoResponse: Response;
  let imageResponse: Response;
  try {
    [infoResponse, imageResponse] = await Promise.all([
      fetch(`${BASE}workshop-runtime.json`, { cache: "no-store" }),
      fetch(`${BASE}workshop-runtime.bin`, { cache: "no-store" }),
    ]);
  } catch (error) {
    throw new RuntimeDiagnosticError(
      "FIRMWARE_FETCH_FAILED",
      "firmware-fetch",
      "ファームウェアを取得できませんでした。",
      error,
    );
  }
  if (!infoResponse.ok || !imageResponse.ok) {
    throw new RuntimeDiagnosticError(
      "FIRMWARE_FETCH_FAILED",
      "firmware-fetch",
      `ファームウェアを取得できませんでした（設定 ${infoResponse.status} / 本体 ${imageResponse.status}）。`,
    );
  }
  const info = (await infoResponse.json()) as BuildInfo;
  const image = new Uint8Array(await imageResponse.arrayBuffer());
  if (image.length === 0 || image.length > 16384) throw new Error("ファームウェアの容量が対象ボードに合いません。");
  const digest = await crypto.subtle.digest("SHA-256", image);
  const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (actual !== info.binary_sha256) {
    throw new RuntimeDiagnosticError(
      "FIRMWARE_HASH_MISMATCH",
      "firmware-verify",
      "ファームウェアの照合に失敗しました。ページを再読み込みしてください。",
    );
  }
  return image;
}

export function RuntimeFirmwareInstall() {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("書き込みモードのUIAPduinoを接続してから開始してください。");

  const appendLog = (
    level: DiagnosticLogLevel,
    action: string,
    text: string,
    details?: Record<string, string | number | boolean>,
  ) =>
    client.setQueryData<DiagnosticLogEntry[]>(
      queryKeys.diagnosticLog,
      (entries = []) => [
        ...entries,
        createDiagnosticLogEntry(level, action, text, details),
      ],
    );

  const install = async () => {
    const hid = (navigator as HidNavigator).hid;
    if (!hid) {
      setMessage("WebHID対応のPC版ChromeまたはEdgeで開いてください。");
      appendLog("error", "FIRMWARE_ENVIRONMENT", "WebHIDを利用できません。", {
        ...browserDiagnosticDetails(),
        ...runtimeErrorDetails(
          new RuntimeDiagnosticError(
            "WEBHID_UNSUPPORTED",
            "environment",
            "WebHIDを利用できません。",
          ),
        ),
      });
      return;
    }
    setBusy(true);
    let device: HidDevice | undefined;
    try {
      appendLog("info", "FIRMWARE_ENVIRONMENT", "書き込み環境を確認しました。", {
        ...browserDiagnosticDetails(),
        expectedMode: "bootloader",
        expectedVidPid: "1209:B803",
      });
      appendLog("info", "BOOTLOADER_CHOOSER_OPEN", "書き込みモードのデバイス選択を開始しました。");
      // Device selection must be the first awaited operation after the click.
      let devices: HidDevice[];
      try {
        devices = await hid.requestDevice({ filters: [{ vendorId: BOOTLOADER_VENDOR_ID, productId: BOOTLOADER_PRODUCT_ID }] });
      } catch (error) {
        throw new RuntimeDiagnosticError(
          "DEVICE_CANCELLED",
          "bootloader-select",
          "書き込みモードのデバイス選択がキャンセルまたは拒否されました。",
          error,
        );
      }
      device = devices[0];
      if (!device) {
        throw new RuntimeDiagnosticError(
          "DEVICE_CANCELLED",
          "bootloader-select",
          "ボードが選択されませんでした。書き込みモードを確認してください。",
        );
      }
      if (device.vendorId !== BOOTLOADER_VENDOR_ID || device.productId !== BOOTLOADER_PRODUCT_ID) {
        throw new Error("対象外のボードが選択されました。");
      }
      appendLog("success", "BOOTLOADER_SELECTED", "書き込みモードのUIAPduinoを選択しました。", {
        product: device.productName || "名称なし",
        vidPid: formatVidPid(device.vendorId, device.productId),
        opened: device.opened,
        collections: device.collections.length,
      });
      setMessage("ファームウェアを照合しています…");
      appendLog("info", "FIRMWARE_FETCH_START", "公開ファームウェアを取得して照合します。");
      const image = await loadVerifiedImage();
      appendLog("success", "FIRMWARE_HASH_OK", "ファームウェアのSHA-256照合に成功しました。", {
        bytes: image.length,
      });
      let lastProgress = -10;
      const succeeded = await flash(image, ({ step, offset, size }) => {
        if (step < 4) setMessage("ボードを準備しています…");
        else if (step < 6) {
          const progress = Math.min(100, Math.round(offset / size * 100));
          setMessage(`書き込みと照合中… ${progress}%`);
          if (progress >= lastProgress + 10) {
            lastProgress = Math.floor(progress / 10) * 10;
            appendLog("info", "FLASH_WRITE_PROGRESS", "書き込みと照合を進めています。", {
              progress: lastProgress,
              offset,
              size,
            });
          }
        }
        else setMessage("起動を確認しています…");
      }, device);
      if (!succeeded) {
        throw new RuntimeDiagnosticError(
          "FLASH_FAILED",
          "flash-write",
          "書き込みまたは照合に失敗しました。再試行せず、接続状態を確認してください。",
        );
      }
      setMessage("書き込みと照合が完了しました。USBを接続し直し、通常動作モードを調べてください。");
      appendLog("success", "FLASH_VERIFY_SUCCESS", "書き込み、照合、アプリ起動命令が完了しました。", {
        bytes: image.length,
      });
      appendLog("warning", "WAITING_FOR_USB_RECONNECT", "USBを抜き、ボタンを押さずに接続し直してください。", {
        nextMode: "runtime",
        expectedVidPid: "1209:D004",
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "書き込みを完了できませんでした。");
      appendLog("error", "FIRMWARE_INSTALL_ERROR", "教育用ランタイムの書き込みを完了できませんでした。", runtimeErrorDetails(error));
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
