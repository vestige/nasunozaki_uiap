import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { HidDevice, HidNavigator } from "../../device/types/webhid";
import type { ProgramInstruction } from "../utils/program";
import {
  embedStandaloneProgram,
  encodeStandaloneProgram,
} from "../utils/standaloneProgram";
import { loadVerifiedImage } from "../../runtime/components/RuntimeFirmwareInstall";
import flash from "../../runtime/utils/rv003usb_webflasher.js";
import {
  createDiagnosticLogEntry,
  type DiagnosticLogEntry,
} from "../../../diagnosticLog";
import { queryKeys } from "../../../query";
import {
  browserDiagnosticDetails,
  formatVidPid,
  RuntimeDiagnosticError,
  runtimeErrorDetails,
} from "../../runtime/utils/runtimeDiagnostic";

const BOOTLOADER_VENDOR_ID = 0x1209;
const BOOTLOADER_PRODUCT_ID = 0xb803;

type Props = {
  program: ProgramInstruction[];
  disabled: boolean;
};

export function StandaloneProgramInstall({ program, disabled }: Props) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "現在はLED・待機・繰り返し・「ずっと」に対応しています。",
  );

  const appendLog = (
    level: "info" | "success" | "warning" | "error",
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
    let programSlot: Uint8Array;
    try {
      programSlot = encodeStandaloneProgram(program);
    } catch (error) {
      setMessage(errorMessage(error));
      return;
    }
    if (!window.confirm(
      "今のブロックをUIAPduinoへ書き込みます。UIAPduinoに入っているプログラムは置き換わります。続けますか？",
    )) return;

    const hid = (navigator as HidNavigator).hid;
    if (!hid) {
      setMessage("WebHID対応のPC版ChromeまたはEdgeで開いてください。");
      return;
    }

    setBusy(true);
    let device: HidDevice | undefined;
    try {
      appendLog("info", "STANDALONE_ENVIRONMENT", "作品の書き込み環境を確認しました。", {
        ...browserDiagnosticDetails(),
        expectedMode: "bootloader",
        expectedVidPid: "1209:B803",
      });
      let devices: HidDevice[];
      try {
        // Keep device selection as the first awaited operation after the click.
        devices = await hid.requestDevice({
          filters: [{
            vendorId: BOOTLOADER_VENDOR_ID,
            productId: BOOTLOADER_PRODUCT_ID,
          }],
        });
      } catch (error) {
        throw new RuntimeDiagnosticError(
          "DEVICE_CANCELLED",
          "bootloader-select",
          "書き込みモードのUIAPduinoが選ばれませんでした。",
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
      if (device.vendorId !== BOOTLOADER_VENDOR_ID ||
          device.productId !== BOOTLOADER_PRODUCT_ID) {
        throw new Error("対象外のボードが選択されました。");
      }
      appendLog("success", "STANDALONE_BOOTLOADER_SELECTED", "書き込みモードのUIAPduinoを選択しました。", {
        product: device.productName || "名称なし",
        vidPid: formatVidPid(device.vendorId, device.productId),
      });

      setMessage("作品を安全な命令へ変換しています…");
      const baseImage = await loadVerifiedImage();
      const image = embedStandaloneProgram(baseImage, programSlot);
      appendLog("success", "STANDALONE_IMAGE_READY", "作品入りファームウェアを生成しました。", {
        bytes: image.length,
        topLevelInstructions: program.length,
      });

      let lastProgress = -10;
      const succeeded = await flash(image, ({ step, offset, size }) => {
        if (step < 4) setMessage("UIAPduinoを準備しています…");
        else if (step < 6) {
          const progress = Math.min(100, Math.round(offset / size * 100));
          setMessage(`作品を書き込み、照合しています… ${progress}%`);
          if (progress >= lastProgress + 10) {
            lastProgress = Math.floor(progress / 10) * 10;
            appendLog("info", "STANDALONE_WRITE_PROGRESS", "作品の書き込みと照合を進めています。", {
              progress: lastProgress,
            });
          }
        } else setMessage("作品を起動しています…");
      }, device);
      if (!succeeded) {
        throw new RuntimeDiagnosticError(
          "FLASH_FAILED",
          "flash-write",
          "作品の書き込みまたは照合に失敗しました。再試行せず、接続状態を確認してください。",
        );
      }

      setMessage("作品を書き込みました。USBを接続し直すと、ブラウザなしで動きます。");
      appendLog("success", "STANDALONE_WRITE_SUCCESS", "Blockly作品の書き込みと照合が完了しました。", {
        bytes: image.length,
      });
    } catch (error) {
      setMessage(errorMessage(error));
      appendLog("error", "STANDALONE_WRITE_ERROR", "Blockly作品を書き込めませんでした。", {
        ...runtimeErrorDetails(error),
      });
    } finally {
      if (device?.opened && "close" in device) {
        try {
          await (device as HidDevice & { close(): Promise<void> }).close();
        } catch {
          // The bootloader can disconnect after starting the new application.
        }
      }
      setBusy(false);
    }
  };

  return (
    <div className="rounded-box border border-secondary/40 bg-secondary/10 p-4">
      <p className="font-black">ブラウザを閉じても動かす</p>
      <p className="mt-1 text-sm text-base-content/70">
        書き込みモードで接続し、今のブロックをUIAPduinoへ保存します。
      </p>
      <button
        type="button"
        className="btn btn-secondary btn-sm mt-3"
        disabled={disabled || busy || program.length === 0}
        onClick={install}
      >
        {busy && <span className="loading loading-spinner loading-xs" />}
        {busy ? "書き込み中…" : "UIAPduinoへ作品を書き込む"}
      </button>
      <p role="status" className="mt-2 text-sm">{message}</p>
    </div>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
