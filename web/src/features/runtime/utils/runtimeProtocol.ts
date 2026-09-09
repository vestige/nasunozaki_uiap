import type { RuntimeResponse } from "../types/protocol";

export const RUNTIME_PROTOCOL_VERSION = 1;
export const RUNTIME_COMMAND_SET_LED = 0x01;
export const RUNTIME_RESPONSE_FLAG = 0x80;
export const RUNTIME_MESSAGE_SIZE = 9;

const MAGIC = [0x55, 0x49, 0x41, 0x50] as const; // "UIAP"
const STATUS = [
  "ok",
  "unsupported-command",
  "invalid-payload",
  "device-error",
] as const;

export function buildSetLedMessage(sequence: number, on: boolean) {
  assertSequence(sequence);
  return Uint8Array.from([
    ...MAGIC,
    RUNTIME_PROTOCOL_VERSION,
    RUNTIME_COMMAND_SET_LED,
    sequence & 0xff,
    (sequence >>> 8) & 0xff,
    on ? 1 : 0,
  ]);
}

export function parseRuntimeResponse(data: Uint8Array): RuntimeResponse {
  if (data.length !== RUNTIME_MESSAGE_SIZE) {
    throw new Error(
      `教育用ランタイム応答は${RUNTIME_MESSAGE_SIZE}バイト必要です。`,
    );
  }
  if (!MAGIC.every((byte, index) => data[index] === byte)) {
    throw new Error("教育用ランタイム応答の識別子が一致しません。");
  }
  if (data[4] !== RUNTIME_PROTOCOL_VERSION) {
    throw new Error("教育用ランタイム応答のversionに対応していません。");
  }
  if ((data[5] & RUNTIME_RESPONSE_FLAG) === 0) {
    throw new Error("教育用ランタイムの応答メッセージではありません。");
  }
  const status = STATUS[data[8]];
  if (!status) throw new Error("教育用ランタイム応答のstatusが不正です。");

  return {
    command: data[5] & ~RUNTIME_RESPONSE_FLAG,
    sequence: data[6] | (data[7] << 8),
    status,
  };
}

function assertSequence(sequence: number) {
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 0xffff) {
    throw new Error("sequenceは0から65535の整数で指定してください。");
  }
}
