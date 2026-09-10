import type { BoardAdapter } from "../../blockly/types/execution";
import type {
  RuntimeBoardAdapterOptions,
  RuntimeTransport,
} from "../types/transport";
import {
  buildSetLedMessage,
  parseRuntimeResponse,
  RUNTIME_COMMAND_SET_LED,
} from "./runtimeProtocol";

const DEFAULT_TIMEOUT_MS = 1_000;
const DEFAULT_MAX_IGNORED_RESPONSES = 8;

export class RuntimeBoardAdapter implements BoardAdapter {
  private sequence = 0;
  private readonly responseTimeoutMs: number;
  private readonly maxIgnoredResponses: number;

  constructor(
    private readonly transport: RuntimeTransport,
    options: RuntimeBoardAdapterOptions = {},
  ) {
    this.responseTimeoutMs = options.responseTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxIgnoredResponses =
      options.maxIgnoredResponses ?? DEFAULT_MAX_IGNORED_RESPONSES;
  }

  async setLed(on: boolean) {
    const sequence = this.nextSequence();
    await this.transport.send(buildSetLedMessage(sequence, on));

    for (let ignored = 0; ignored <= this.maxIgnoredResponses; ignored += 1) {
      const bytes = await withTimeout(
        this.transport.receive(),
        this.responseTimeoutMs,
      );
      const response = parseRuntimeResponse(bytes);
      if (
        response.command !== RUNTIME_COMMAND_SET_LED ||
        response.sequence !== sequence
      ) {
        continue;
      }
      if (response.status !== "ok") {
        throw new Error(`UIAPduinoがLED命令を拒否しました：${response.status}`);
      }
      return;
    }

    throw new Error("対応するLED命令の応答を確認できませんでした。");
  }

  wait(milliseconds: number, signal: AbortSignal) {
    return abortableDelay(milliseconds, signal);
  }

  private nextSequence() {
    const current = this.sequence;
    this.sequence = (this.sequence + 1) & 0xff;
    return current;
  }
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return Promise.reject(new Error("応答timeoutは正の数で指定してください。"));
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("UIAPduinoからの応答がtimeoutしました。")),
      milliseconds,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function abortableDelay(milliseconds: number, signal: AbortSignal) {
  if (signal.aborted) {
    return Promise.reject(new DOMException("停止しました", "AbortError"));
  }
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener("abort", abort, { once: true });

    function finish() {
      signal.removeEventListener("abort", abort);
      resolve();
    }
    function abort() {
      clearTimeout(timer);
      reject(new DOMException("停止しました", "AbortError"));
    }
  });
}
