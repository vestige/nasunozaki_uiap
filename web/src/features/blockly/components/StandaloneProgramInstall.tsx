import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ProgramInstruction } from "../utils/program";
import { encodeStandaloneProgram } from "../utils/standaloneProgram";
import { writeStandaloneProgram } from "../utils/writeStandaloneProgram";
import type { RuntimeHidDevice } from "../../runtime/types/transport";
import { requestUiapRuntimeDevice, watchRuntimeDisconnect } from "../../runtime/utils/runtimeDevice";
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
    if (!window.confirm("今のブロックをボードにかきこみます。ボードにある前の作品は置きかわります。続けますか？")) {
      return;
    }

    setBusy(true);
    try {
      // Requesting a device stays directly in the button's user gesture.
      const connected = device?.opened ? device : await requestUiapRuntimeDevice();
      client.setQueryData(queryKeys.runtimeDevice, connected);
      client.setQueryData(queryKeys.runtimeConnectionMessage, "ボードにつながりました。ブロックを画面やボードでためせます。");
      if (!device?.opened) {
        watchRuntimeDisconnect(connected, () => {
          client.setQueryData(queryKeys.runtimeDevice, null);
          client.setQueryData(queryKeys.runtimeConnectionMessage, "ボードとの接続が切れました。もう一度つなぐときは「ボードに接続」を押してください。");
        });
      }
      setMessage("ボードにかきこんでいます…");
      appendLog("info", "STANDALONE_WRITE_START", "通常接続で作品の保存を開始しました。");
      const bank = await writeStandaloneProgram(connected, encoded, (percent) => {
        setMessage(`ボードにかきこんでいます… ${percent}%`);
      });
      setMessage("ボードにかきこみました。つぎに電源を入れたときも動きます。");
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
        aria-label={busy ? "作品をボードに書き込み中" : "作品をボードに書き込む"}
        className="btn btn-secondary btn-sm font-black shadow-md"
        disabled={disabled || busy || program.length === 0}
        onClick={install}
      >
        {busy && <span className="loading loading-spinner loading-xs" />}
        <span aria-hidden="true">↓</span>
        <span>{busy ? "かきこみ中…" : "ボードにかきこむ"}</span>
      </button>
      {message && <p role="status" className="text-sm font-bold text-base-content/70">{message}</p>}
    </div>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
