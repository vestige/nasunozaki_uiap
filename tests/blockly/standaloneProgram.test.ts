import { describe, expect, it } from "vitest";
import type { ProgramInstruction } from "../../web/src/features/blockly/utils/program";
import {
  crc16Ccitt,
  embedStandaloneProgram,
  encodeStandaloneProgram,
  STANDALONE_OPCODE_END,
  STANDALONE_OPCODE_FOREVER,
  STANDALONE_OPCODE_REPEAT,
  STANDALONE_OPCODE_SET_LED,
  STANDALONE_OPCODE_WAIT,
  STANDALONE_PROGRAM_HEADER_SIZE,
  STANDALONE_PROGRAM_SLOT_SIZE,
  STANDALONE_PROGRAM_VERSION,
} from "../../web/src/features/blockly/utils/standaloneProgram";

const blockId = "test-block";

describe("encodeStandaloneProgram", () => {
  it("LED点滅のずっとブロックをversion付きbytecodeへ変換する", () => {
    const program: ProgramInstruction[] = [{
      type: "forever",
      blockId,
      body: [
        { type: "led", on: true, blockId },
        { type: "wait", milliseconds: 500, blockId },
        { type: "led", on: false, blockId },
        { type: "wait", milliseconds: 500, blockId },
      ],
    }];

    const slot = encodeStandaloneProgram(program);
    const expectedPayload = [
      STANDALONE_OPCODE_FOREVER, 10, 0,
      STANDALONE_OPCODE_SET_LED, 1,
      STANDALONE_OPCODE_WAIT, 0xf4, 0x01,
      STANDALONE_OPCODE_SET_LED, 0,
      STANDALONE_OPCODE_WAIT, 0xf4, 0x01,
      STANDALONE_OPCODE_END,
    ];

    expect(slot).toHaveLength(STANDALONE_PROGRAM_SLOT_SIZE);
    expect([...slot.slice(0, 6)]).toEqual([0x55, 0x49, 0x42, 0x50, STANDALONE_PROGRAM_VERSION, 1]);
    expect(readUint16(slot, 6)).toBe(expectedPayload.length);
    expect(readUint16(slot, 8)).toBe(crc16Ccitt(expectedPayload));
    expect([...slot.slice(10, STANDALONE_PROGRAM_HEADER_SIZE)]).toEqual([0, 0, 0, 0, 0, 0]);
    expect([...slot.slice(STANDALONE_PROGRAM_HEADER_SIZE, STANDALONE_PROGRAM_HEADER_SIZE + expectedPayload.length)]).toEqual(expectedPayload);
    expect(slot.at(-1)).toBe(0xff);
  });

  it("有限の繰り返し回数とbody長を保持する", () => {
    const slot = encodeStandaloneProgram([{
      type: "repeat",
      times: 3,
      blockId,
      body: [{ type: "led", on: true, blockId }],
    }]);

    expect([...slot.slice(STANDALONE_PROGRAM_HEADER_SIZE, STANDALONE_PROGRAM_HEADER_SIZE + 7)]).toEqual([
      STANDALONE_OPCODE_REPEAT, 3, 2, 0,
      STANDALONE_OPCODE_SET_LED, 1,
      STANDALONE_OPCODE_END,
    ]);
  });

  it("NeoPixelを含む作品はversion 2で変換する", () => {
    const slot = encodeStandaloneProgram([{
      type: "neoPixelClear",
      blockId,
    }]);
    expect(slot[4]).toBe(2);
    expect([...slot.slice(16, 18)]).toEqual([0x32, 0]);
  });

  it("小数・非有限値・範囲外整数を丸めず拒否する", () => {
    for (const value of [0.5, NaN, Infinity, 2147483648, -2147483649]) {
      expect(() => encodeStandaloneProgram([{ type: "setVariable", id: "n", value: { type: "number", value }, blockId }])).toThrow("整数");
    }
  });

  it("変数17個と8段を超える式を拒否する", () => {
    expect(() => encodeStandaloneProgram(Array.from({ length: 17 }, (_, n) => ({
      type: "setVariable", id: String(n), value: { type: "boolean", value: true }, blockId,
    })))).toThrow("16個");
    let value: import("../../web/src/features/blockly/utils/program").ProgramValue = { type: "boolean", value: true };
    for (let i = 0; i < 9; ++i) value = { type: "not", value };
    expect(() => encodeStandaloneProgram([{ type: "setVariable", id: "n", value, blockId }])).toThrow("8段");
  });

  it("二重bankの992バイト上限を変換時点で検査する", () => {
    expect(() => encodeStandaloneProgram(Array.from({ length: 496 }, () => ({ type: "led", on: true, blockId })))).toThrow("992");
  });

  it("空のずっとブロックと範囲外の値を拒否する", () => {
    expect(() => encodeStandaloneProgram([{
      type: "forever",
      body: [],
      blockId,
    }])).toThrow("空の「ずっと」");

    expect(() => encodeStandaloneProgram([{
      type: "wait",
      milliseconds: 5001,
      blockId,
    }])).toThrow("待ち時間");
  });

  it("予約領域を超える作品を拒否する", () => {
    const program: ProgramInstruction[] = Array.from({ length: 505 }, () => ({
      type: "led" as const,
      on: true,
      blockId,
    }));

    expect(() => encodeStandaloneProgram(program)).toThrow("作品が大きすぎます");
  });

  it("完成済みbinの予約領域だけを作品で置き換える", () => {
    const emptySlot = new Uint8Array(STANDALONE_PROGRAM_SLOT_SIZE);
    emptySlot.set([
      0x55, 0x49, 0x42, 0x50, STANDALONE_PROGRAM_VERSION, 0,
      0, 0, 0xff, 0xff, 0, 0, 0, 0, 0, 0,
    ]);
    const prefix = new Uint8Array([1, 2, 3]);
    const suffix = new Uint8Array([4, 5]);
    const baseImage = concat(prefix, emptySlot, suffix);
    const programSlot = encodeStandaloneProgram([{
      type: "led",
      on: true,
      blockId,
    }]);

    const embedded = embedStandaloneProgram(baseImage, programSlot);

    expect([...embedded.slice(0, prefix.length)]).toEqual([...prefix]);
    expect([...embedded.slice(prefix.length, prefix.length + programSlot.length)]).toEqual([...programSlot]);
    expect([...embedded.slice(-suffix.length)]).toEqual([...suffix]);
    expect([...baseImage.slice(prefix.length, prefix.length + 6)]).toEqual([
      0x55, 0x49, 0x42, 0x50, STANDALONE_PROGRAM_VERSION, 0,
    ]);
  });

  it("予約領域が見つからないbinや複数あるbinを拒否する", () => {
    const programSlot = encodeStandaloneProgram([]);
    expect(() => embedStandaloneProgram(new Uint8Array(2048), programSlot)).toThrow("見つかりません");

    const emptySlot = new Uint8Array(STANDALONE_PROGRAM_SLOT_SIZE);
    emptySlot.set([
      0x55, 0x49, 0x42, 0x50, STANDALONE_PROGRAM_VERSION, 0,
      0, 0, 0xff, 0xff, 0, 0, 0, 0, 0, 0,
    ]);
    expect(() => embedStandaloneProgram(concat(emptySlot, emptySlot), programSlot)).toThrow("複数");
  });
});

function readUint16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function concat(...parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
