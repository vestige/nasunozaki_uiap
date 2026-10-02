import type { ProgramInstruction } from "./program";

export const STANDALONE_PROGRAM_SLOT_SIZE = 1024;
export const STANDALONE_PROGRAM_HEADER_SIZE = 16;
export const STANDALONE_PROGRAM_VERSION = 1;

export const STANDALONE_OPCODE_END = 0x00;
export const STANDALONE_OPCODE_SET_LED = 0x01;
export const STANDALONE_OPCODE_WAIT = 0x02;
export const STANDALONE_OPCODE_REPEAT = 0x10;
export const STANDALONE_OPCODE_FOREVER = 0x11;

const MAGIC = [0x55, 0x49, 0x42, 0x50] as const; // "UIBP"
const AUTOSTART_FLAG = 0x01;
const MAX_NESTING_DEPTH = 8;
const MAX_WAIT_MILLISECONDS = 5000;
const MAX_REPEAT_COUNT = 20;
const ERASED_FLASH_BYTE = 0xff;
const EMPTY_SLOT_HEADER = new Uint8Array([
  ...MAGIC,
  STANDALONE_PROGRAM_VERSION,
  0x00,
  0x00, 0x00,
  0xff, 0xff,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

export function encodeStandaloneProgram(
  instructions: ProgramInstruction[],
): Uint8Array {
  const payload = [...encodeInstructions(instructions, 0), STANDALONE_OPCODE_END];
  const maximumPayloadSize =
    STANDALONE_PROGRAM_SLOT_SIZE - STANDALONE_PROGRAM_HEADER_SIZE;
  if (payload.length > maximumPayloadSize) {
    throw new Error(
      `作品が大きすぎます。単独実行用の命令は${maximumPayloadSize}バイト以内にしてください。`,
    );
  }

  const slot = new Uint8Array(STANDALONE_PROGRAM_SLOT_SIZE);
  slot.fill(ERASED_FLASH_BYTE);
  slot.set(MAGIC, 0);
  slot[4] = STANDALONE_PROGRAM_VERSION;
  slot[5] = AUTOSTART_FLAG;
  writeUint16(slot, 6, payload.length);
  writeUint16(slot, 8, crc16Ccitt(payload));
  slot.fill(0, 10, STANDALONE_PROGRAM_HEADER_SIZE);
  slot.set(payload, STANDALONE_PROGRAM_HEADER_SIZE);
  return slot;
}

export function crc16Ccitt(bytes: ArrayLike<number>): number {
  let crc = 0xffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index] << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0
        ? ((crc << 1) ^ 0x1021) & 0xffff
        : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

export function embedStandaloneProgram(
  baseImage: Uint8Array,
  programSlot: Uint8Array,
): Uint8Array {
  if (programSlot.length !== STANDALONE_PROGRAM_SLOT_SIZE) {
    throw new Error("単独実行用の作品領域サイズが正しくありません。");
  }

  const offsets = findPatternOffsets(baseImage, EMPTY_SLOT_HEADER);
  if (offsets.length !== 1) {
    throw new Error(
      offsets.length === 0
        ? "完成済みランタイムに空の作品領域が見つかりません。"
        : "完成済みランタイムに作品領域が複数見つかりました。",
    );
  }
  const offset = offsets[0];
  if (offset + STANDALONE_PROGRAM_SLOT_SIZE > baseImage.length) {
    throw new Error("完成済みランタイムの作品領域が途中で切れています。");
  }

  const image = baseImage.slice();
  image.set(programSlot, offset);
  return image;
}

function encodeInstructions(
  instructions: ProgramInstruction[],
  depth: number,
): number[] {
  if (depth > MAX_NESTING_DEPTH) {
    throw new Error(`ブロックの入れ子は${MAX_NESTING_DEPTH}段までにしてください。`);
  }

  const bytes: number[] = [];
  for (const instruction of instructions) {
    if (instruction.type === "led") {
      bytes.push(STANDALONE_OPCODE_SET_LED, instruction.on ? 1 : 0);
    } else if (instruction.type === "wait") {
      assertIntegerInRange(
        instruction.milliseconds,
        0,
        MAX_WAIT_MILLISECONDS,
        "待ち時間",
      );
      bytes.push(
        STANDALONE_OPCODE_WAIT,
        instruction.milliseconds & 0xff,
        instruction.milliseconds >> 8,
      );
    } else if (instruction.type === "repeat") {
      assertIntegerInRange(
        instruction.times,
        1,
        MAX_REPEAT_COUNT,
        "繰り返し回数",
      );
      const body = encodeInstructions(instruction.body, depth + 1);
      assertBodyLength(body);
      bytes.push(
        STANDALONE_OPCODE_REPEAT,
        instruction.times,
        body.length & 0xff,
        body.length >> 8,
        ...body,
      );
    } else if (instruction.type === "forever") {
      const body = encodeInstructions(instruction.body, depth + 1);
      if (body.length === 0) {
        throw new Error("空の「ずっと」ブロックは単独実行できません。");
      }
      assertBodyLength(body);
      bytes.push(
        STANDALONE_OPCODE_FOREVER,
        body.length & 0xff,
        body.length >> 8,
        ...body,
      );
    } else {
      throw new Error(
        "このブロックは、まだUIAPduino単体での実行に対応していません。",
      );
    }
  }
  return bytes;
}

function assertIntegerInRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label}が単独実行で扱える範囲を超えています。`);
  }
}

function assertBodyLength(body: number[]) {
  if (body.length > 0xffff) {
    throw new Error("ブロックの中身が大きすぎます。");
  }
}

function writeUint16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = value >> 8;
}

function findPatternOffsets(image: Uint8Array, pattern: Uint8Array) {
  const offsets: number[] = [];
  for (let offset = 0; offset <= image.length - pattern.length; offset += 1) {
    let matches = true;
    for (let index = 0; index < pattern.length; index += 1) {
      if (image[offset + index] !== pattern[index]) {
        matches = false;
        break;
      }
    }
    if (matches) offsets.push(offset);
  }
  return offsets;
}
