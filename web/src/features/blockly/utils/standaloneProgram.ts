import type { ProgramInstruction, ProgramValue } from "../types/program";

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

export function encodeStandaloneProgram(
  instructions: ProgramInstruction[],
): Uint8Array {
  const context = { version: 1, variables: new Map<string, number>() };
  const payload = [...encodeInstructions(instructions, 0, context), STANDALONE_OPCODE_END];
  const maximumPayloadSize =
    STANDALONE_PROGRAM_SLOT_SIZE - 16 - STANDALONE_PROGRAM_HEADER_SIZE;
  if (payload.length > maximumPayloadSize) {
    throw new Error(
      `作品が大きすぎます。単独実行用の命令は${maximumPayloadSize}バイト以内にしてください。`,
    );
  }

  const slot = new Uint8Array(STANDALONE_PROGRAM_SLOT_SIZE);
  slot.fill(ERASED_FLASH_BYTE);
  slot.set(MAGIC, 0);
  slot[4] = context.version;
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

function encodeInstructions(
  instructions: ProgramInstruction[],
  depth: number,
  context: EncodingContext,
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
      const body = encodeInstructions(instruction.body, depth + 1, context);
      assertBodyLength(body);
      bytes.push(
        STANDALONE_OPCODE_REPEAT,
        instruction.times,
        body.length & 0xff,
        body.length >> 8,
        ...body,
      );
    } else if (instruction.type === "forever") {
      const body = encodeInstructions(instruction.body, depth + 1, context);
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
    } else if (instruction.type === "setVariable") {
      context.version = Math.max(context.version, 2);
      bytes.push(0x20, variableIndex(instruction.id, context), ...encodeValue(instruction.value, context, 0));
    } else if (instruction.type === "if" || instruction.type === "ifButton" || instruction.type === "ifButtonPressed") {
      context.version = Math.max(context.version, 2);
      const condition = instruction.type === "if" ? encodeValue(instruction.condition, context, 0) : [];
      const body = encodeInstructions(instruction.body, depth + 1, context);
      const otherwise = instruction.type === "ifButtonPressed" ? [] : encodeInstructions(instruction.elseBody, depth + 1, context);
      bytes.push(instruction.type === "if" ? 0x21 : instruction.type === "ifButton" ? 0x22 : 0x23,
        ...condition, body.length & 255, body.length >> 8, otherwise.length & 255, otherwise.length >> 8, ...body, ...otherwise);
    } else if (instruction.type === "neoPixelLightValue") {
      context.version = Math.max(context.version, 4);
      if (!/^#[0-9a-f]{6}$/i.test(instruction.color)) throw new Error("NeoPixelの色が正しくありません。");
      const color = Number.parseInt(instruction.color.slice(1), 16);
      bytes.push(0x33, instruction.pixel === null ? 0 : 1,
        ...(instruction.pixel === null ? [] : encodeValue(instruction.pixel, context, 0)),
        color >> 16 & 255, color >> 8 & 255, color & 255,
        ...encodeValue(instruction.brightness, context, 0));
    } else if (instruction.type === "neoPixelClear") {
      context.version = Math.max(context.version, 2);
      bytes.push(0x32);
    } else if (instruction.type === "neoPixelFill" || instruction.type === "neoPixelSet" || instruction.type === "neoPixelSetValue") {
      context.version = Math.max(context.version, instruction.type === "neoPixelSetValue" ? 3 : 2);
      if (!/^#[0-9a-f]{6}$/i.test(instruction.color)) throw new Error("NeoPixelの色が正しくありません。");
      assertIntegerInRange(instruction.brightness, 1, 100, "明るさ");
      if (instruction.type === "neoPixelSet") assertIntegerInRange(instruction.index, 0, 7, "LED番号");
      const color = Number.parseInt(instruction.color.slice(1), 16);
      const target = instruction.type === "neoPixelSetValue" ? [0x31, ...encodeValue(instruction.pixel, context, 0)]
        : [0x30, instruction.type === "neoPixelFill" ? 0 : instruction.index + 1];
      bytes.push(...target,
        (color >> 16) & 255, (color >> 8) & 255, color & 255, instruction.brightness);
    } else {
      throw new Error(
        "このブロックは、まだUIAPduino単体での実行に対応していません。",
      );
    }
  }
  return bytes;
}

type EncodingContext = { version: number; variables: Map<string, number> };

function variableIndex(id: string, context: EncodingContext) {
  if (!id) throw new Error("変数が選ばれていません。");
  if (!context.variables.has(id)) {
    if (context.variables.size >= 16) throw new Error("ボードに保存できる変数は16個までです。");
    context.variables.set(id, context.variables.size);
  }
  return context.variables.get(id)!;
}

function encodeValue(value: ProgramValue, context: EncodingContext, depth: number): number[] {
  // Balance associative chains without changing left-to-right evaluation or
  // short-circuit semantics. Large truth-table examples need not waste stack.
  if (value.type === "logic") value = balanceLogic(value);
  if (depth > 8) throw new Error("値ブロックの入れ子は8段までにしてください。");
  if (value.type === "boolean") return [1, value.value ? 1 : 0];
  if (value.type === "number") {
    assertIntegerInRange(value.value, -2147483648, 2147483647, "数字（整数）");
    return [2, value.value & 255, (value.value >>> 8) & 255, (value.value >>> 16) & 255, (value.value >>> 24) & 255];
  }
  if (value.type === "variable") return [3, variableIndex(value.id, context)];
  if (value.type === "not") return [4, ...encodeValue(value.value, context, depth + 1)];
  if (value.type === "arithmetic") {
    context.version = Math.max(context.version, 3);
    if (value.op !== "ADD" && value.op !== "SUB") throw new Error("対応していない計算です。");
    return [value.op === "ADD" ? 13 : 14, ...encodeValue(value.left, context, depth + 1), ...encodeValue(value.right, context, depth + 1)];
  }
  const op = value.type === "compare"
    ? ({ EQ: 5, NEQ: 6, LT: 7, LTE: 8, GT: 9, GTE: 10 } as const)[value.op]
    : ({ AND: 11, OR: 12 } as const)[value.op];
  if (!op) throw new Error("対応していない比較・論理ブロックです。");
  return [op, ...encodeValue(value.left, context, depth + 1), ...encodeValue(value.right, context, depth + 1)];
}

function balanceLogic(value: Extract<ProgramValue, { type: "logic" }>): ProgramValue {
  const leaves: ProgramValue[] = [];
  const collect = (node: ProgramValue, depth: number) => {
    if (depth > 64) throw new Error("値ブロックが複雑すぎます。");
    if (node.type === "logic" && node.op === value.op) {
      collect(node.left, depth + 1);
      collect(node.right, depth + 1);
    } else leaves.push(node);
  };
  collect(value, 0);
  const build = (start: number, end: number): ProgramValue => {
    if (end - start === 1) return leaves[start];
    const middle = (start + end) >> 1;
    return { type: "logic", op: value.op, left: build(start, middle), right: build(middle, end) };
  };
  return build(0, leaves.length);
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
