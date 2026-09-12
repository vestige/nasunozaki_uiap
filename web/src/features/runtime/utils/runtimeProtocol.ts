import type { RuntimeResponse } from "../types/protocol";

export const RUNTIME_PROTOCOL_VERSION = 1;
export const RUNTIME_COMMAND_SET_LED = 0x01;
export const RUNTIME_COMMAND_READ_BUTTON = 0x02;
export const RUNTIME_RESPONSE_FLAG = 0x80;
export const RUNTIME_MESSAGE_SIZE = 8;

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
    sequence,
    on ? 1 : 0,
  ]);
}

export function buildReadButtonMessage(sequence: number) {
  assertSequence(sequence);
  return Uint8Array.from([
    ...MAGIC,
    RUNTIME_PROTOCOL_VERSION,
    RUNTIME_COMMAND_READ_BUTTON,
    sequence,
    0,
  ]);
}

export function parseButtonStateResponse(
  data: Uint8Array,
  expectedSequence: number,
) {
  assertResponseEnvelope(data);
  if ((data[5] & ~RUNTIME_RESPONSE_FLAG) !== RUNTIME_COMMAND_READ_BUTTON) {
    throw new Error("教育用ランタイムのボタン応答ではありません。");
  }
  if (data[6] !== expectedSequence) {
    throw new Error("教育用ランタイムのボタン応答のsequenceが一致しません。");
  }
  if (data[7] > 1) {
    throw new Error("教育用ランタイムのボタン状態が不正です。");
  }
  return data[7] === 1;
}

export function parseRuntimeResponse(data: Uint8Array): RuntimeResponse {
  assertResponseEnvelope(data);
  const status = STATUS[data[7]];
  if (!status) throw new Error("教育用ランタイム応答のstatusが不正です。");

  return {
    command: data[5] & ~RUNTIME_RESPONSE_FLAG,
    sequence: data[6],
    status,
  };
}

function assertResponseEnvelope(data: Uint8Array) {
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
}

function assertSequence(sequence: number) {
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 0xff) {
    throw new Error("sequenceは0から255の整数で指定してください。");
  }
}
