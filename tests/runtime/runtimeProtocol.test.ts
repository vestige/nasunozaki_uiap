import { describe, expect, it } from "vitest";
import {
  buildSetLedMessage,
  parseRuntimeResponse,
} from "../../web/src/features/runtime/utils/runtimeProtocol";

describe("education runtime protocol", () => {
  it("LED命令をversionとsequence付きで固定長にする", () => {
    expect([...buildSetLedMessage(0x34, true)]).toEqual([
      0x55, 0x49, 0x41, 0x50, 0x01, 0x01, 0x34, 0x01,
    ]);
  });

  it("応答からcommand、sequence、statusを読む", () => {
    expect(
      parseRuntimeResponse(
        Uint8Array.from([0x55, 0x49, 0x41, 0x50, 0x01, 0x81, 0x34, 0x00]),
      ),
    ).toEqual({ command: 1, sequence: 0x34, status: "ok" });
  });

  it("範囲外sequenceと識別できない応答を拒否する", () => {
    expect(() => buildSetLedMessage(0x100, false)).toThrow(
      "sequenceは0から255の整数で指定してください。",
    );
    expect(() => parseRuntimeResponse(new Uint8Array(8))).toThrow(
      "教育用ランタイム応答の識別子が一致しません。",
    );
  });
});
