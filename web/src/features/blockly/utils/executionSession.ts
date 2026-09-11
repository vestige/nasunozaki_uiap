import type { RuntimeHidDevice } from "../../runtime/types/transport";
import { RuntimeBoardAdapter } from "../../runtime/utils/runtimeBoardAdapter";
import { subscribeRuntimeDisconnect } from "../../runtime/utils/runtimeDevice";
import { WebHidRuntimeTransport } from "../../runtime/utils/webHidRuntimeTransport";
import type {
  BoardExecutionSession,
  ExecutionTarget,
} from "../types/execution";

type Options = {
  target: ExecutionTarget;
  runtimeDevice: RuntimeHidDevice | null;
  setSimulatorLed(on: boolean): void;
};

export function createBoardExecutionSession({
  target,
  runtimeDevice,
  setSimulatorLed,
}: Options): BoardExecutionSession {
  if (target === "simulator") {
    return {
      board: {
        setLed: setSimulatorLed,
        wait: abortableDelay,
      },
      async close(turnOff) {
        if (turnOff) setSimulatorLed(false);
      },
    };
  }

  if (!runtimeDevice?.opened) {
    throw new Error(
      "UIAPduinoが接続されていません。通常動作モードへ接続してください。",
    );
  }

  const transport = new WebHidRuntimeTransport(runtimeDevice);
  const board = new RuntimeBoardAdapter(transport);
  let disconnected = false;
  const stopWatchingDisconnect = subscribeRuntimeDisconnect(
    runtimeDevice,
    () => {
      disconnected = true;
      transport.dispose();
    },
  );
  return {
    board,
    async close(turnOff) {
      try {
        if (turnOff && !disconnected && runtimeDevice.opened) {
          try {
            await board.setLed(false);
          } catch {
            // 切断・timeoutの元エラーを上書きせず、消灯は再接続後に案内する。
          }
        }
      } finally {
        stopWatchingDisconnect();
        transport.dispose();
      }
    },
  };
}

function abortableDelay(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("停止しました", "AbortError"));
      },
      { once: true },
    );
  });
}
