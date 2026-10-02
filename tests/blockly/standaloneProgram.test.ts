import { describe, expect, it } from "vitest";
import type { ProgramInstruction } from "../../web/src/features/blockly/utils/program";
import {
  crc16Ccitt,
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

  it("未対応ブロックを任意命令へ変換しない", () => {
    expect(() => encodeStandaloneProgram([{
      type: "neoPixelClear",
      blockId,
    }])).toThrow("まだUIAPduino単体");
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
});

function readUint16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}
