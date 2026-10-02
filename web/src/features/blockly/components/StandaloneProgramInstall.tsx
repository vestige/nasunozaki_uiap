import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ProgramInstruction } from "../utils/program";
import { encodeStandaloneProgram } from "../utils/standaloneProgram";
import { writeStandaloneProgram } from "../utils/writeStandaloneProgram";
import type { RuntimeHidDevice } from "../../runtime/types/transport";
import { requestUiapRuntimeDevice } from "../../runtime/utils/runtimeDevice";
import {
  createDiagnosticLogEntry,
  type DiagnosticLogEntry,
} from "../../../diagnosticLog";
import { queryKeys } from "../../../query";

type Props = {
  program: ProgramInstruction[];
  device: RuntimeHidDevice | null;
  disabled: boolean;
};

export function StandaloneProgramInstall({ program, device, disabled }: Props) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const appendLog = (
    level: "info" | "success" | "error",
    action: string,
    text: string,
    details?: Record<string, string | number | boolean>,
  ) => client.setQueryData<DiagnosticLogEntry[]>(
    queryKeys.diagnosticLog,
    (entries = []) => [...entries, createDiagnosticLogEntry(level, action, text, details)],
  );

  const install = async () => {
    let encoded: Uint8Array;
    try {
      encoded = encodeStandaloneProgram(program);
    } catch (error) {
      setMessage(errorMessage(error));
      return;
    }
    if (!window.confirm("今のブロックをUIAPduinoへ保存します。現在の作品は置き換わります。続けますか？")) {
      return;
    }

    setBusy(true);
    try {
      // Requesting a device stays directly in the button's user gesture.
      const connected = device?.opened ? device : await requestUiapRuntimeDevice();
      client.setQueryData(queryKeys.runtimeDevice, connected);
      setMessage("作品を書き込んでいます…");
      appendLog("info", "STANDALONE_WRITE_START", "通常接続で作品の保存を開始しました。");
      const bank = await writeStandaloneProgram(connected, encoded, (percent) => {
        setMessage(`作品を書き込んでいます… ${percent}%`);
      });
      setMessage("作品を書き込みました。USBを外しても動きます。");
      appendLog("success", "STANDALONE_WRITE_SUCCESS", "作品を保存し、保存先を確認しました。", {
        bank,
      });
    } catch (error) {
      setMessage(errorMessage(error));
      appendLog("error", "STANDALONE_WRITE_ERROR", "作品を書き込めませんでした。", {
        error: errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-2 lg:items-end">
      <button
        type="button"
        className="btn btn-secondary btn-sm font-black shadow-md"
        disabled={disabled || busy || program.length === 0}
        onClick={install}
      >
        {busy && <span className="loading loading-spinner loading-xs" />}
        {busy ? "書き込み中…" : "UIAPduinoに書き込む"}
      </button>
      {message && <p role="status" className="text-sm font-bold text-base-content/70">{message}</p>}
    </div>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
