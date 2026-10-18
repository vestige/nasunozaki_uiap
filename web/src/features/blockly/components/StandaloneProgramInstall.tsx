import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ProgramInstruction } from "../types/program";
import { encodeStandaloneProgram } from "../utils/standaloneProgram";
import { StandaloneBeginRejectedError, writeStandaloneProgram } from "../utils/writeStandaloneProgram";
import { StandaloneRecoveryRequiredError, StandaloneRecoveryCancelledError } from "../utils/ownedStandaloneUpdate";
import type { RuntimeHidDevice } from "../../runtime/types/transport";
import { requestUiapRuntimeDevice, watchRuntimeDisconnect } from "../../runtime/utils/runtimeDevice";
import {
  createDiagnosticLogEntry,
  type DiagnosticLogEntry,
} from "../../../diagnosticLog";
import { queryKeys } from "../../../query";

type Props = {
  program: ProgramInstruction[];
  getCurrentProgram: () => ProgramInstruction[];
  device: RuntimeHidDevice | null;
  disabled: boolean;
};

export function StandaloneProgramInstall({ program, getCurrentProgram, device, disabled }: Props) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showReconnectHelp, setShowReconnectHelp] = useState(false);

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
      const currentProgram = getCurrentProgram();
      if (currentProgram.length === 0) throw new Error("動かすブロックを置いてください。");
      encoded = encodeStandaloneProgram(currentProgram);
    } catch (error) {
      setMessage(errorMessage(error));
      return;
    }
    if (!window.confirm("今のブロックをボードにかきこみます。ボードにある前の作品は置きかわります。続けますか？")) {
      return;
    }

    setBusy(true);
    setShowReconnectHelp(false);
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
      }, (event, details) => appendLog(event === "FAILED" ? "error" : "info", `STANDALONE_${event}`, "作品保存の通信を記録しました。", details), {
        confirmRecovery: () => window.confirm("中断されたかきこみが残っています。途中のデータを取り消して、今の作品をかきこみますか？\nボードに残っている前の作品が動き出すことがあります。ほかの画面でかきこみ中なら、キャンセルしてください。"),
      });
      setMessage("ボードにかきこみました。つぎに電源を入れたときも動きます。");
      appendLog("success", "STANDALONE_WRITE_SUCCESS", "作品を保存し、保存先を確認しました。", {
        bank,
      });
    } catch (error) {
      setShowReconnectHelp((error instanceof StandaloneBeginRejectedError && error.status === 2) ||
        (error instanceof StandaloneRecoveryRequiredError && error.snapshot.kind === "legacy"));
      setMessage(errorMessage(error));
      const cancelled = error instanceof StandaloneRecoveryCancelledError;
      appendLog(cancelled ? "info" : "error", cancelled ? "STANDALONE_RECOVERY_CANCELLED" : "STANDALONE_WRITE_ERROR", cancelled ? "更新状態の解除をキャンセルしました。" : "作品を書き込めませんでした。", {
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
      {showReconnectHelp && (
        <div className="max-w-md rounded-lg border border-base-content/20 bg-base-200 p-3 text-sm">
          <p>前のかきこみが残っている可能性があります。ほかの画面でかきこみ中なら、終わるまで待ってください。</p>
          <details className="mt-2">
            <summary className="cursor-pointer font-bold">つなぎなおしかた</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>ほかの画面で、かきこみ中ではないことをたしかめる。</li>
              <li>USBを抜き、ボタンを押さずにさしなおす。</li>
              <li>このページを読みなおし、ボードにつなぐ。</li>
              <li>もう一度「ボードにかきこむ」を押す。</li>
            </ol>
            <p className="mt-2">電源を入れなおすと、ボードに残っている作品が動き出すことがあります。直らないときは、診断ログを保存してください。</p>
          </details>
        </div>
      )}
    </div>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
