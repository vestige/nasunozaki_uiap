import type { RuntimeHidDevice } from "../types/transport";
import { RuntimeBoardAdapter } from "./runtimeBoardAdapter";
import { WebHidRuntimeTransport } from "./webHidRuntimeTransport";

export async function readRuntimeButton(
  device: RuntimeHidDevice,
): Promise<boolean> {
  const transport = new WebHidRuntimeTransport(device);
  try {
    return await new RuntimeBoardAdapter(transport).isButtonPressed();
  } finally {
    transport.dispose();
  }
}
