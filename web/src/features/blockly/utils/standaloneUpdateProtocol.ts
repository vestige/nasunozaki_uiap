import {
  RUNTIME_FEATURE_REPORT_SIZE,
  RUNTIME_PROTOCOL_VERSION,
  RUNTIME_RESPONSE_FLAG,
} from "../../runtime/utils/runtimeProtocol";

export const STANDALONE_UPDATE_COMMAND_BEGIN = 0x20;
export const STANDALONE_UPDATE_COMMAND_DATA = 0x21;
export const STANDALONE_UPDATE_COMMAND_COMMIT = 0x22;
export const STANDALONE_UPDATE_COMMAND_ABORT = 0x23;
export const STANDALONE_UPDATE_COMMAND_STATUS = 0x24;
export const STANDALONE_UPDATE_COMMAND_CAPABILITIES = 0x25;
export const STANDALONE_UPDATE_DATA_SIZE = 22;

const MAGIC = [0x55, 0x49, 0x41, 0x50] as const; // "UIAP"
const ENVELOPE_SIZE = 8;

export function buildStandaloneUpdateBegin(
  sequence: number,
  programLength: number,
  programCrc: number,
  formatVersion: number,
) {
  assertUint16(programLength, "作品サイズ");
  assertUint16(programCrc, "作品CRC");
  assertUint8(formatVersion, "作品形式version");
  return buildMessage(sequence, STANDALONE_UPDATE_COMMAND_BEGIN, [
    formatVersion,
    programLength & 0xff,
    programLength >> 8,
    programCrc & 0xff,
    programCrc >> 8,
  ]);
}

export function buildStandaloneUpdateData(
  sequence: number,
  offset: number,
  bytes: Uint8Array,
) {
  assertUint16(offset, "作品offset");
  if (bytes.length < 1 || bytes.length > STANDALONE_UPDATE_DATA_SIZE) {
    throw new Error(
      `作品データは1回につき1〜${STANDALONE_UPDATE_DATA_SIZE}バイト必要です。`,
    );
  }
  if (offset + bytes.length > 0x10000) {
    throw new Error("作品データが指定できる範囲を超えています。");
  }
  return buildMessage(sequence, STANDALONE_UPDATE_COMMAND_DATA, [
    offset & 0xff,
    offset >> 8,
    ...bytes,
  ]);
}

export function buildStandaloneUpdateCommit(sequence: number) {
  return buildMessage(sequence, STANDALONE_UPDATE_COMMAND_COMMIT, []);
}

export function buildStandaloneUpdateAbort(sequence: number) {
  return buildMessage(sequence, STANDALONE_UPDATE_COMMAND_ABORT, []);
}

export function buildStandaloneUpdateStatus(sequence: number) {
  return buildMessage(sequence, STANDALONE_UPDATE_COMMAND_STATUS, []);
}

export function buildStandaloneCapabilities(sequence: number) {
  return buildMessage(sequence, STANDALONE_UPDATE_COMMAND_CAPABILITIES, []);
}

// Capability replies use 0x50 + maximum supported format version. Legacy
// runtimes reply UNSUPPORTED (1); STATUS must confirm storage support first.
// This is a format capability, not a firmware build identifier.
export function standaloneSupportedVersion(response: number): number {
  if (response === 1) return 1;
  if (response >= 0x51 && response <= 0x5f) return response & 0x0f;
  throw new Error("ボードの作品形式への対応を確認できませんでした。");
}

export function parseStandaloneUpdateResponse(
  data: Uint8Array,
  expectedCommand: number,
  expectedSequence: number,
) {
  if (data.length !== ENVELOPE_SIZE ||
      !MAGIC.every((byte, index) => data[index] === byte) ||
      data[4] !== RUNTIME_PROTOCOL_VERSION ||
      data[5] !== (expectedCommand | RUNTIME_RESPONSE_FLAG) ||
      data[6] !== expectedSequence) {
    throw new Error("作品更新の応答が要求と一致しません。");
  }
  return data[7];
}

function buildMessage(sequence: number, command: number, payload: number[]) {
  assertUint8(sequence, "sequence");
  if (payload.length > RUNTIME_FEATURE_REPORT_SIZE - ENVELOPE_SIZE) {
    throw new Error("作品更新payloadがFeature Reportへ収まりません。");
  }
  const message = new Uint8Array(RUNTIME_FEATURE_REPORT_SIZE);
  message.set(MAGIC, 0);
  message[4] = RUNTIME_PROTOCOL_VERSION;
  message[5] = command;
  message[6] = sequence;
  message[7] = payload.length;
  message.set(payload, ENVELOPE_SIZE);
  return message;
}

function assertUint8(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new Error(`${label}は0から255の整数で指定してください。`);
  }
}

function assertUint16(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new Error(`${label}は0から65535の整数で指定してください。`);
  }
}
