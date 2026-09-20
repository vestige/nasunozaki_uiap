import type {
  RuntimeHidDevice,
  RuntimeTransport,
} from "../types/transport";
import { RuntimeBoardAdapter } from "./runtimeBoardAdapter";
import { WebHidRuntimeTransport } from "./webHidRuntimeTransport";
import { formatVidPid, runtimeErrorDetails } from "./runtimeDiagnostic";

export type RuntimeLedDiagnosticResult = {
  sent: Uint8Array[];
  received: Uint8Array[];
};

export type RuntimeLedDiagnosticEvent = {
  level: "info" | "success" | "warning" | "error";
  action: string;
  message: string;
  details?: Record<string, string | number | boolean>;
};

export async function runRuntimeLedDiagnostic(
  device: RuntimeHidDevice,
  waitMilliseconds = 400,
  onEvent: (event: RuntimeLedDiagnosticEvent) => void = () => undefined,
): Promise<RuntimeLedDiagnosticResult> {
  const hidTransport = new WebHidRuntimeTransport(device);
  const sent: Uint8Array[] = [];
  const received: Uint8Array[] = [];
  const transport: RuntimeTransport = {
    async send(message) {
      const startedAt = performance.now();
      onEvent({
        level: "info",
        action: "RUNTIME_LED_SEND_START",
        message: `LED ${message[7] === 1 ? "ON" : "OFF"}命令を送信します。`,
        details: {
          vidPid: formatVidPid(device.vendorId, device.productId),
          reportId: 0,
          command: "0x01",
          sequence: message[6],
          bytes: formatRuntimeBytes(message),
        },
      });
      sent.push(message.slice());
      try {
        await hidTransport.send(message);
        onEvent({
          level: "success",
          action: "RUNTIME_LED_SEND_SUCCESS",
          message: "LED命令を送信しました。応答を待ちます。",
          details: {
            sequence: message[6],
            elapsedMs: Math.round(performance.now() - startedAt),
          },
        });
      } catch (error) {
        onEvent({
          level: "error",
          action: "RUNTIME_LED_SEND_ERROR",
          message: "LED命令を送信できませんでした。",
          details: { sequence: message[6], ...runtimeErrorDetails(error) },
        });
        throw error;
      }
    },
    async receive() {
      const startedAt = performance.now();
      onEvent({
        level: "info",
        action: "RUNTIME_LED_RESPONSE_WAIT",
        message: "UIAPduinoからの応答を待っています。",
        details: { timeoutMs: 1000 },
      });
      try {
        const message = await hidTransport.receive();
        received.push(message.slice());
        onEvent({
          level: "success",
          action: "RUNTIME_LED_RESPONSE_RECEIVED",
          message: "UIAPduinoから応答を受信しました。",
          details: {
            reportId: 0,
            bytes: message.length,
            data: formatRuntimeBytes(message),
            command: `0x${(message[5] & 0x7f).toString(16).padStart(2, "0")}`,
            sequence: message[6],
            status: message[7],
            elapsedMs: Math.round(performance.now() - startedAt),
          },
        });
        return message;
      } catch (error) {
        onEvent({
          level: "error",
          action: "RUNTIME_LED_RESPONSE_ERROR",
          message: "UIAPduinoからの応答を確認できませんでした。",
          details: runtimeErrorDetails(error),
        });
        throw error;
      }
    },
  };
  const adapter = new RuntimeBoardAdapter(transport);
  let ledMayBeOn = false;

  try {
    ledMayBeOn = true;
    await adapter.setLed(true);
    await adapter.wait(waitMilliseconds, new AbortController().signal);
    await adapter.setLed(false);
    ledMayBeOn = false;
    return { sent, received };
  } catch (error) {
    onEvent({
      level: "error",
      action: "RUNTIME_LED_TRANSACTION_ERROR",
      message: "LED往復確認を完了できませんでした。",
      details: {
        sentCommands: sent.length,
        receivedResponses: received.length,
        ...runtimeErrorDetails(error),
      },
    });
    if (ledMayBeOn) {
      try {
        await adapter.setLed(false);
      } catch {
        // 元のエラーを優先し、UI側で再接続を案内する。
      }
    }
    throw error;
  } finally {
    hidTransport.dispose();
  }
}

export const formatRuntimeBytes = (bytes: Uint8Array) =>
  [...bytes]
    .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
