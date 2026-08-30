import { describe, expect, it } from "vitest";
import {
  BOOTLOADER_REPORT_ID,
  EXECUTION_MAGIC,
  REPORT_PAYLOAD_SIZE,
} from "./bootloaderProtocol";
import {
  buildWrite64PacketOffline,
  CH32V003_FLASH_BLOCK_SIZE,
  CH32V003_FLASH_END,
  CH32V003_FLASH_START,
  FLASH_STATUS_REGISTER,
} from "./flashPacket";

describe("buildWrite64PacketOffline", () => {
  const block = Uint8Array.from(
    { length: CH32V003_FLASH_BLOCK_SIZE },
    (_, index) => index,
  );

  it("minichlink互換の64バイト書き込みpacketを生成する", () => {
    const result = buildWrite64PacketOffline(CH32V003_FLASH_START, block);
    const view = new DataView(result.payload.buffer);

    expect(result.kind).toBe("flash-write-64");
    expect(result.executable).toBe(true);
    expect(result.reportId).toBe(BOOTLOADER_REPORT_ID);
    expect(result.payload).toHaveLength(REPORT_PAYLOAD_SIZE);
    expect(view.getUint32(51, true)).toBe(CH32V003_FLASH_START);
    expect(view.getUint32(55, true)).toBe(FLASH_STATUS_REGISTER);
    expect(Array.from(result.payload.slice(59, 123))).toEqual(
      Array.from(block),
    );
    expect(view.getUint32(123, true)).toBe(EXECUTION_MAGIC);
  });

  it("flashの最終64バイトblockを許可する", () => {
    expect(() =>
      buildWrite64PacketOffline(
        CH32V003_FLASH_END - CH32V003_FLASH_BLOCK_SIZE,
        block,
      ),
    ).not.toThrow();
  });

  it.each([
    CH32V003_FLASH_START - CH32V003_FLASH_BLOCK_SIZE,
    CH32V003_FLASH_END,
    CH32V003_FLASH_START + 1,
  ])("範囲外または未整列address 0x%sを拒否する", (address) => {
    expect(() => buildWrite64PacketOffline(address, block)).toThrow(RangeError);
  });

  it("64バイト以外のデータを拒否する", () => {
    expect(() =>
      buildWrite64PacketOffline(CH32V003_FLASH_START, new Uint8Array(63)),
    ).toThrow(RangeError);
  });
});
