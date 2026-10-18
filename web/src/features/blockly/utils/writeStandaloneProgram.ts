import type { RuntimeHidDevice } from "../../runtime/types/transport";
import { WebHidRuntimeTransport } from "../../runtime/utils/webHidRuntimeTransport";
import { withRuntimeResponseTimeout } from "../../runtime/utils/runtimeTiming";
import { RuntimeDiagnosticError } from "../../runtime/utils/runtimeDiagnostic";
import {
  crc16Ccitt,
  STANDALONE_PROGRAM_HEADER_SIZE,
} from "./standaloneProgram";
import {
  buildStandaloneUpdateAbort,
  buildStandaloneUpdateBegin,
  buildStandaloneUpdateCommit,
  buildStandaloneUpdateData,
  buildStandaloneUpdateStatus,
  buildStandaloneCapabilities,
  buildStandaloneBeginDiagnostics,
  standaloneSupportedVersion,
  parseStandaloneUpdateResponse,
  STANDALONE_UPDATE_COMMAND_ABORT,
  STANDALONE_UPDATE_COMMAND_BEGIN,
  STANDALONE_UPDATE_COMMAND_COMMIT,
  STANDALONE_UPDATE_COMMAND_DATA,
  STANDALONE_UPDATE_COMMAND_STATUS,
  STANDALONE_UPDATE_DATA_SIZE,
} from "./standaloneUpdateProtocol";

const MAX_BANK_PROGRAM_SIZE = 1008;
export type StandaloneWriteTrace = (event: string, details: Record<string, string | number | boolean>) => void;
const commandNames: Record<number, string> = { 0x24: "STATUS", 0x25: "CAPABILITIES", 0x26: "BEGIN_DIAGNOSTICS", 0x20: "BEGIN", 0x21: "DATA", 0x22: "COMMIT", 0x23: "ABORT" };

export async function readStandaloneStatus(device: RuntimeHidDevice) {
  if (device.vendorId !== 0x1209 || device.productId !== 0xd004 || !device.opened) {
    throw new Error("通常接続のUIAPduinoを接続してください。");
  }
  const transport = new WebHidRuntimeTransport(device);
  try {
    await transport.send(buildStandaloneUpdateStatus(0));
    const response = await withRuntimeResponseTimeout(transport.receive(), 2_000);
    const status = parseStandaloneUpdateResponse(response, STANDALONE_UPDATE_COMMAND_STATUS, 0);
    return status >= 0x40 && status <= 0x42
      ? { supported: true, activeBank: status === 0x40 ? null : status === 0x41 ? "A" : "B" }
      : { supported: false, activeBank: null };
  } finally {
    transport.dispose();
  }
}

export async function writeStandaloneProgram(
  device: RuntimeHidDevice,
  encodedSlot: Uint8Array,
  onProgress: (percent: number) => void,
  trace: StandaloneWriteTrace = () => {},
) {
  if (device.vendorId !== 0x1209 || device.productId !== 0xd004 || !device.opened) {
    throw new Error("通常接続のUIAPduinoを接続してください。");
  }
  const payloadLength = encodedSlot[6] | (encodedSlot[7] << 8);
  const length = STANDALONE_PROGRAM_HEADER_SIZE + payloadLength;
  if (length < STANDALONE_PROGRAM_HEADER_SIZE + 1 ||
      length > MAX_BANK_PROGRAM_SIZE || length > encodedSlot.length) {
    throw new Error("この作品は保存領域へ収まりません。命令を少し減らしてください。");
  }
  const bytes = encodedSlot.slice(0, length);
  const formatVersion = encodedSlot[4];
  if (formatVersion !== 1 && formatVersion !== 2 && formatVersion !== 3 && formatVersion !== 4 && formatVersion !== 5 && formatVersion !== 6) {
    throw new Error("この作品形式には対応していません。");
  }
  let transport = new WebHidRuntimeTransport(device);
  let sequence = 0;
  let beginMayBeActive = false;
  let commitMayBeApplied = false;
  let before = 0;
  let phase = "STATUS";
  const resetReceiver = () => {
    // A timeout races receive(), but does not cancel its pending FIFO entry.
    // Retire it before recovery, or it will swallow the recovery response.
    transport.dispose();
    transport = new WebHidRuntimeTransport(device);
  };
  const exchange = async (message: Uint8Array, timeoutMs = 2_000) => {
    const command = message[5];
    const expectedSequence = message[6];
    const name = commandNames[command] ?? String(command);
    phase = name;
    const started = Date.now();
    let sent = false;
    trace("SEND", { command: name, sequence: expectedSequence, bytes: message.length,
      ...(command === 0x21 ? { offset: message[8] | message[9] << 8 } : {}) });
    try {
      await transport.send(message);
      sent = true;
      trace("SENT", { command: name, sequence: expectedSequence, elapsedMs: Date.now() - started });
      const deadline = Date.now() + timeoutMs;
      for (let ignored = 0; ignored < 8; ignored++) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error("応答待ちの制限時間を超えました。");
        const response = await withRuntimeResponseTimeout(transport.receive(), remaining);
        if (response[5] !== (command | 0x80) || response[6] !== expectedSequence) {
          trace("IGNORED", { command: name, sequence: expectedSequence, responseCommand: response[5] ?? -1, responseSequence: response[6] ?? -1 });
          continue;
        }
        const status = parseStandaloneUpdateResponse(response, command, expectedSequence);
        trace("RESPONSE", { command: name, sequence: expectedSequence, status, elapsedMs: Date.now() - started });
        return status;
      }
      throw new Error("UIAPduinoから対応する応答を受け取れませんでした。");
    } catch (error) {
      // Flash can finish while its interrupt Input Report is lost. The core
      // retains that same 8-byte response for read-only HID GET_REPORT.
      // Never replay a mutating command to obtain its ACK.
      if (sent && [0x20, 0x21, 0x22].includes(command) &&
          error instanceof RuntimeDiagnosticError && error.code === "RESPONSE_TIMEOUT") {
        resetReceiver();
        trace("FEATURE_READ", { command: name, sequence: expectedSequence });
        try {
          const view = await withRuntimeResponseTimeout(device.receiveFeatureReport(0), 1_000);
          let cached = new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice();
          // Chromium may include the zero report ID; accept only that exact
          // framing, not an arbitrary scan for bytes that resemble an ACK.
          if (cached.length === 9 && cached[0] === 0) cached = cached.slice(1);
          const status = parseStandaloneUpdateResponse(cached, command, expectedSequence);
          trace("FEATURE_RESPONSE", { command: name, sequence: expectedSequence, status, elapsedMs: Date.now() - started });
          return status;
        } catch (cachedError) {
          trace("FEATURE_FAILED", { command: name, sequence: expectedSequence,
            error: cachedError instanceof Error ? cachedError.message : String(cachedError) });
        }
      }
      trace("FAILED", { command: name, sequence: expectedSequence, elapsedMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };
  const next = () => (sequence++ & 0xff);

  try {
    before = await exchange(buildStandaloneUpdateStatus(next()));
    if (before < 0x40 || before > 0x42) {
      throw new Error("作品だけを書き込めるランタイムが必要です。最初に教育用ランタイムを更新してください。");
    }
    // Version 1 keeps the legacy transfer path. Check newer formats before
    // BEGIN, which stops the current program and erases the inactive bank.
    if (formatVersion > 1) {
      const supportedVersion = standaloneSupportedVersion(
        await exchange(buildStandaloneCapabilities(next())),
      );
      if (formatVersion > supportedVersion) {
        throw new Error("この作品を使うには、最初にボードの教育用ランタイムを更新してください。");
      }
    }
    // Delivery is uncertain until an ACK arrives, not until send() resolves.
    beginMayBeActive = true;
    const begin = await exchange(buildStandaloneUpdateBegin(
      next(), length, crc16Ccitt(bytes), formatVersion,
    ), 10_000);
    if (begin !== 0) {
      beginMayBeActive = false;
      throw new Error(`作品の保存を開始できませんでした（${begin}）。`);
    }

    for (let offset = 0; offset < length; offset += STANDALONE_UPDATE_DATA_SIZE) {
      const chunk = bytes.slice(offset, offset + STANDALONE_UPDATE_DATA_SIZE);
      const result = await exchange(buildStandaloneUpdateData(next(), offset, chunk));
      if (result !== 0) throw new Error(`作品の保存中にエラーが起きました（${result}）。`);
      onProgress(Math.round((offset + chunk.length) / length * 100));
    }

    commitMayBeApplied = true;
    const commit = await exchange(buildStandaloneUpdateCommit(next()), 10_000);
    commitMayBeApplied = false;
    if (commit !== 0) throw new Error(`保存した作品を検証できませんでした（${commit}）。`);
    beginMayBeActive = false;
    const after = await exchange(buildStandaloneUpdateStatus(next()));
    const expectedBank = before === 0x41 ? 0x42 : 0x41;
    if (after !== expectedBank) {
      throw new Error("保存後の作品領域を確認できませんでした。USBを抜かずに状態を確認してください。");
    }
    return after === 0x41 ? "A" : "B";
  } catch (error) {
    const failedPhase = phase;
    let recovery = "未実施";
    if (failedPhase === "BEGIN" && beginMayBeActive) {
      resetReceiver();
      try {
        const snapshot = await exchange(buildStandaloneBeginDiagnostics(next()));
        trace("BEGIN_STATE", { raw: snapshot, supported: snapshot >= 0x10,
          stage: snapshot >> 4 & 7, updateActive: Boolean(snapshot & 0x80),
          responseQueued: Boolean(snapshot & 8), txBusy: Boolean(snapshot & 4), result: snapshot & 3 });
      } catch { trace("BEGIN_STATE", { supported: false, error: "診断応答を確認できません" }); }
    }
    if (commitMayBeApplied) {
      resetReceiver();
      try {
        const status = await exchange(buildStandaloneUpdateStatus(next()));
        const expected = before === 0x41 ? 0x42 : 0x41;
        if (status === expected) {
          // Do not replay COMMIT or stop a program that was already committed.
          trace("COMMIT_CONFIRMED", { bank: status === 0x41 ? "A" : "B" });
          return status === 0x41 ? "A" : "B";
        }
        if (status !== before) {
          beginMayBeActive = false;
          recovery = "保存結果を確認できません。再書き込みせず接続状態を確認してください";
        }
      } catch {
        beginMayBeActive = false;
        recovery = "保存結果を確認できません。再書き込みせず接続状態を確認してください";
      }
    }
    if (beginMayBeActive) {
      resetReceiver();
      try {
        const aborted = await exchange(buildStandaloneUpdateAbort(next()));
        recovery = aborted === 0 ? "更新状態の解除を確認しました" : `更新状態の解除に失敗しました（${aborted}）`;
      } catch { recovery = "更新状態の解除を確認できません。再書き込みせず接続状態を確認してください"; }
    }
    trace("RECOVERY", { failedPhase, result: recovery });
    throw new Error(`${failedPhase}: ${error instanceof Error ? error.message : String(error)}${recovery === "未実施" ? "" : ` ${recovery}`}`);
  } finally {
    transport.dispose();
  }
}
