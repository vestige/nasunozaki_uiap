import type { BoardAdapter } from "../../blockly/types/execution";
import type {
  RuntimeBoardAdapterOptions,
  RuntimeTransport,
} from "../types/transport";
import {
  buildReadButtonMessage,
  buildRuntimeCommandMessage,
  buildSetLedMessage,
  parseButtonStateResponse,
  parseRuntimeResponse,
  RUNTIME_COMMAND_READ_BUTTON,
  RUNTIME_COMMAND_SET_LED,
  RUNTIME_COMMAND_NEO_APPLY,
  RUNTIME_COMMAND_NEO_BLUE,
  RUNTIME_COMMAND_NEO_BRIGHTNESS,
  RUNTIME_COMMAND_NEO_CLEAR,
  RUNTIME_COMMAND_NEO_GREEN,
  RUNTIME_COMMAND_NEO_RED,
} from "./runtimeProtocol";
import { abortableDelay, withRuntimeResponseTimeout } from "./runtimeTiming";
import { RuntimeDiagnosticError } from "./runtimeDiagnostic";

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
    await this.sendAndWait(buildSetLedMessage(sequence, on), RUNTIME_COMMAND_SET_LED, sequence, "LED");
  }

  async fillNeoPixels(color: string, brightness: number) {
    await this.configureNeoPixel(color, brightness);
    await this.sendCommand(RUNTIME_COMMAND_NEO_APPLY, 0, "NeoPixel全灯");
  }

  async setNeoPixel(index: number, color: string, brightness: number) {
    if (!Number.isInteger(index) || index < 0 || index >= 8) {
      throw new Error("NeoPixel番号は1から8の範囲で指定してください。");
    }
    await this.configureNeoPixel(color, brightness);
    await this.sendCommand(RUNTIME_COMMAND_NEO_APPLY, index + 1, "NeoPixel個別点灯");
  }

  async clearNeoPixels() {
    await this.sendCommand(RUNTIME_COMMAND_NEO_CLEAR, 0, "NeoPixel消灯");
  }

  private async configureNeoPixel(color: string, brightness: number) {
    const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
    if (!match) throw new Error("NeoPixelの色は#RRGGBB形式で指定してください。");
    if (!Number.isInteger(brightness) || brightness < 1 || brightness > 100) {
      throw new Error("NeoPixelの明るさは1から100の整数で指定してください。");
    }
    await this.sendCommand(RUNTIME_COMMAND_NEO_RED, Number.parseInt(match[1], 16), "NeoPixel赤");
    await this.sendCommand(RUNTIME_COMMAND_NEO_GREEN, Number.parseInt(match[2], 16), "NeoPixel緑");
    await this.sendCommand(RUNTIME_COMMAND_NEO_BLUE, Number.parseInt(match[3], 16), "NeoPixel青");
    await this.sendCommand(RUNTIME_COMMAND_NEO_BRIGHTNESS, brightness, "NeoPixel明るさ");
  }

  private async sendCommand(command: number, payload: number, label: string) {
    const sequence = this.nextSequence();
    await this.sendAndWait(buildRuntimeCommandMessage(sequence, command, payload), command, sequence, label);
  }

  private async sendAndWait(message: Uint8Array, command: number, sequence: number, label: string) {
    await this.transport.send(message);

    for (let ignored = 0; ignored <= this.maxIgnoredResponses; ignored += 1) {
      const bytes = await withRuntimeResponseTimeout(
        this.transport.receive(),
        this.responseTimeoutMs,
      );
      let response;
      try {
        response = parseRuntimeResponse(bytes);
      } catch (error) {
        throw new RuntimeDiagnosticError(
          "INVALID_RESPONSE",
          "runtime-receive",
          "UIAPduinoから解析できない応答を受信しました。",
          error,
        );
      }
      if (
        response.command !== command ||
        response.sequence !== sequence
      ) {
        continue;
      }
      if (response.status !== "ok") {
        throw new Error(`UIAPduinoが${label}命令を拒否しました：${response.status}`);
      }
      return;
    }

    throw new Error(`対応する${label}命令の応答を確認できませんでした。`);
  }

  async isButtonPressed() {
    const sequence = this.nextSequence();
    await this.transport.send(buildReadButtonMessage(sequence));

    for (let ignored = 0; ignored <= this.maxIgnoredResponses; ignored += 1) {
      const bytes = await withRuntimeResponseTimeout(
        this.transport.receive(),
        this.responseTimeoutMs,
      );
      if (
        (bytes[5] & 0x7f) !== RUNTIME_COMMAND_READ_BUTTON ||
        bytes[6] !== sequence
      ) {
        continue;
      }
      return parseButtonStateResponse(bytes, sequence);
    }

    throw new Error("対応するボタン読み取りの応答を確認できませんでした。");
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
