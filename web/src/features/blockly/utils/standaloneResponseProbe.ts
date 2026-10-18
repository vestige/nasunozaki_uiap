import type { RuntimeHidDevice } from "../../runtime/types/transport";
import { RuntimeDiagnosticError } from "../../runtime/utils/runtimeDiagnostic";
import { withRuntimeResponseTimeout } from "../../runtime/utils/runtimeTiming";
import { parseStandaloneUpdateResponse } from "./standaloneUpdateProtocol";

type Trace = (event: string, details: Record<string, string | number | boolean>) => void;
type Options = {
  device: RuntimeHidDevice;
  receive: () => Promise<Uint8Array>;
  resetReceiver: () => void;
  command: number;
  sequence: number;
  timeoutMs: number;
  trace: Trace;
};

const EARLY_PROBE_MS = 250;
const FEATURE_TIMEOUT_MS = 1000;

async function inputOrProbe(pending: Promise<Uint8Array>, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      pending.then(response => ({ response })),
      new Promise<{ response?: undefined }>(resolve => { timer = setTimeout(() => resolve({}), Math.max(0, delay)); }),
    ]);
  } finally { clearTimeout(timer); }
}

// Input remains pending during an early read: a stale/unsupported cache must
// not discard a later genuine ACK. Never send a mutating command again.
export async function receiveStandaloneWriteResponse(options: Options): Promise<number> {
  const { device, command, sequence, receive, resetReceiver, trace, timeoutMs } = options;
  const started = Date.now(), deadline = started + timeoutMs;
  const canReadCache = [0x20, 0x21, 0x22, 0x40, 0x41, 0x42].includes(command);
  // Only the new owned-transfer firmware is known to implement this path.
  // Keep the timing contract of unknown/legacy firmware unchanged.
  const canProbeEarly = [0x40, 0x41, 0x42].includes(command);
  let probed = false;
  const readCache = async (reason: "early" | "timeout"): Promise<number | undefined> => {
    trace("FEATURE_READ", { reason });
    try {
      const view = await withRuntimeResponseTimeout(device.receiveFeatureReport(0), FEATURE_TIMEOUT_MS);
      let bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice();
      if (bytes.length === 9 && bytes[0] === 0) bytes = bytes.slice(1);
      const status = parseStandaloneUpdateResponse(bytes, command, sequence);
      trace("FEATURE_RESPONSE", { status, reason });
      return status;
    } catch (error) {
      trace("FEATURE_FAILED", { reason, error: error instanceof Error ? error.message : String(error) });
      // A timed-out native GET_REPORT can still be in flight. Do not advance
      // into DATA/COMMIT while that early read remains unresolved.
      if (reason === "early" && error instanceof RuntimeDiagnosticError && error.code === "RESPONSE_TIMEOUT") {
        throw new Error("ボードの応答確認が時間切れになりました。保存を進めずに終了します。");
      }
      return undefined;
    }
  };
  try {
    for (let ignored = 0; ignored < 8; ++ignored) {
      if (Date.now() >= deadline) throw new RuntimeDiagnosticError("RESPONSE_TIMEOUT", "led-receive", `UIAPduinoからの応答がtimeoutしました（${timeoutMs}ms）。`);
      const pending = receive();
      let response: Uint8Array | undefined;
      if (canProbeEarly && !probed) {
        const first = await inputOrProbe(pending, started + EARLY_PROBE_MS - Date.now());
        response = first.response;
        if (!response) {
          probed = true;
          const status = await readCache("early");
          if (status !== undefined) { resetReceiver(); return status; }
        }
      }
      if (!response && Date.now() >= deadline) throw new RuntimeDiagnosticError("RESPONSE_TIMEOUT", "led-receive", `UIAPduinoからの応答がtimeoutしました（${timeoutMs}ms）。`);
      response ??= await withRuntimeResponseTimeout(pending, Math.max(1, deadline - Date.now()));
      if (response[5] !== (command | 0x80) || response[6] !== sequence) {
        trace("IGNORED", { responseCommand: response[5] ?? -1, responseSequence: response[6] ?? -1 });
        continue;
      }
      const status = parseStandaloneUpdateResponse(response, command, sequence);
      trace("RESPONSE", { status });
      return status;
    }
    throw new Error("UIAPduinoから対応する応答を受け取れませんでした。");
  } catch (error) {
    if (canReadCache && error instanceof RuntimeDiagnosticError && error.code === "RESPONSE_TIMEOUT") {
      resetReceiver();
      const status = await readCache("timeout");
      if (status !== undefined) return status;
    }
    throw error;
  }
}
