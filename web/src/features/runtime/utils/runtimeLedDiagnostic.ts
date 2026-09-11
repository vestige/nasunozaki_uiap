import type {
  RuntimeHidDevice,
  RuntimeTransport,
} from "../types/transport";
import { RuntimeBoardAdapter } from "./runtimeBoardAdapter";
import { WebHidRuntimeTransport } from "./webHidRuntimeTransport";

export type RuntimeLedDiagnosticResult = {
  sent: Uint8Array[];
  received: Uint8Array[];
};

export async function runRuntimeLedDiagnostic(
  device: RuntimeHidDevice,
  waitMilliseconds = 400,
): Promise<RuntimeLedDiagnosticResult> {
  const hidTransport = new WebHidRuntimeTransport(device);
  const sent: Uint8Array[] = [];
  const received: Uint8Array[] = [];
  const transport: RuntimeTransport = {
    async send(message) {
      sent.push(message.slice());
      await hidTransport.send(message);
    },
    async receive() {
      const message = await hidTransport.receive();
      received.push(message.slice());
      return message;
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
