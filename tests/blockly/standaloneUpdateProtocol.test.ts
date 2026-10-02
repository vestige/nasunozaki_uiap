import { describe, expect, it } from "vitest";
import {
  buildStandaloneUpdateAbort,
  buildStandaloneUpdateBegin,
  buildStandaloneUpdateCommit,
  buildStandaloneUpdateData,
  buildStandaloneUpdateStatus,
  parseStandaloneUpdateResponse,
  STANDALONE_UPDATE_COMMAND_BEGIN,
  STANDALONE_UPDATE_COMMAND_DATA,
  STANDALONE_UPDATE_DATA_SIZE,
} from "../../web/src/features/blockly/utils/standaloneUpdateProtocol";

describe("standalone update protocol", () => {
  it("32バイトのBEGINに作品形式・長さ・CRCをlittle endianで入れる", () => {
    const message = buildStandaloneUpdateBegin(7, 0x03f0, 0x8a21, 1);

    expect(message).toHaveLength(32);
    expect([...message.slice(0, 13)]).toEqual([
      0x55, 0x49, 0x41, 0x50, 1,
      STANDALONE_UPDATE_COMMAND_BEGIN, 7, 5,
      1, 0xf0, 0x03, 0x21, 0x8a,
    ]);
    expect([...message.slice(13)]).toEqual(new Array(19).fill(0));
  });

  it("DATAはoffsetと最大22バイトを運ぶ", () => {
    const bytes = Uint8Array.from(
      { length: STANDALONE_UPDATE_DATA_SIZE },
      (_, index) => index + 1,
    );
    const message = buildStandaloneUpdateData(8, 0x0123, bytes);

    expect(message[5]).toBe(STANDALONE_UPDATE_COMMAND_DATA);
    expect(message[6]).toBe(8);
    expect(message[7]).toBe(24);
    expect([...message.slice(8, 10)]).toEqual([0x23, 0x01]);
    expect([...message.slice(10)]).toEqual([...bytes]);
  });

  it("空DATA・大きすぎるDATA・範囲外offsetを拒否する", () => {
    expect(() => buildStandaloneUpdateData(0, 0, new Uint8Array())).toThrow("1〜22");
    expect(() => buildStandaloneUpdateData(0, 0, new Uint8Array(23))).toThrow("1〜22");
    expect(() => buildStandaloneUpdateData(0, 0xffff, new Uint8Array(2))).toThrow("範囲");
  });

  it("payloadなしのCOMMIT・ABORT・STATUSも32バイトに揃える", () => {
    for (const message of [
      buildStandaloneUpdateCommit(1),
      buildStandaloneUpdateAbort(2),
      buildStandaloneUpdateStatus(3),
    ]) {
      expect(message).toHaveLength(32);
      expect(message[7]).toBe(0);
      expect([...message.slice(8)]).toEqual(new Array(24).fill(0));
    }
  });

  it("commandとsequenceが一致する8バイト応答だけを受け入れる", () => {
    const response = Uint8Array.from([
      0x55, 0x49, 0x41, 0x50, 1,
      STANDALONE_UPDATE_COMMAND_BEGIN | 0x80, 9, 4,
    ]);
    expect(parseStandaloneUpdateResponse(
      response,
      STANDALONE_UPDATE_COMMAND_BEGIN,
      9,
    )).toBe(4);
    expect(() => parseStandaloneUpdateResponse(
      response,
      STANDALONE_UPDATE_COMMAND_BEGIN,
      10,
    )).toThrow("一致しません");
  });
});
