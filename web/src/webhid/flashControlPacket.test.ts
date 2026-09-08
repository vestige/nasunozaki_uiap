import { describe, expect, it } from "vitest";
import { EXECUTION_MAGIC } from "./bootloaderProtocol";
import {
  buildErase64PacketOffline,
  buildFlashProgramPreparationSequenceOffline,
  buildFlashUnlockSequenceOffline,
  flashControlConstants,
} from "./flashControlPacket";
import { CH32V003_FLASH_START, FLASH_STATUS_REGISTER } from "./flashPacket";

describe("flash control packets", () => {
  it("flash unlockの6段階を参照実装どおりに生成する", () => {
    const packets = buildFlashUnlockSequenceOffline();
    const values = packets.map((packet) => {
      const view = new DataView(packet.payload.buffer);
      return [view.getUint32(51, true), view.getUint32(59, true)];
    });

    expect(values).toEqual([
      [flashControlConstants.FLASH_KEY_REGISTER, flashControlConstants.KEY_ONE],
      [flashControlConstants.FLASH_KEY_REGISTER, flashControlConstants.KEY_TWO],
      [
        flashControlConstants.FLASH_OBKEY_REGISTER,
        flashControlConstants.KEY_ONE,
      ],
      [
        flashControlConstants.FLASH_OBKEY_REGISTER,
        flashControlConstants.KEY_TWO,
      ],
      [
        flashControlConstants.FLASH_MODEKEY_REGISTER,
        flashControlConstants.KEY_ONE,
      ],
      [
        flashControlConstants.FLASH_MODEKEY_REGISTER,
        flashControlConstants.KEY_TWO,
      ],
    ]);
    expect(packets.every((packet) => packet.executable)).toBe(true);
    expect(packets[0].payload).toHaveLength(
      flashControlConstants.REPORT_PAYLOAD_SIZE,
    );
  });

  it("64バイトerase packetを正しい位置に生成する", () => {
    const packet = buildErase64PacketOffline(CH32V003_FLASH_START);
    const view = new DataView(packet.payload.buffer);

    const upstreamEraseStub = [
      0x13, 0x07, 0x85, 0x03, 0x0c, 0x43, 0x5c, 0x43, 0x83, 0x12, 0x87, 0x00,
      0x03, 0x16, 0xa7, 0x00, 0x2e, 0x96, 0xb7, 0x06, 0x02, 0x00, 0xd4, 0xc3,
      0x93, 0x86, 0x06, 0x04, 0x8c, 0xc7, 0xd4, 0xc3, 0x98, 0x43, 0x05, 0x8b,
      0x75, 0xff, 0x96, 0x95, 0xe3, 0xca, 0xc5, 0xfe, 0xfd, 0x56, 0x14, 0xc1,
      0x01, 0x00, 0x82, 0x80,
    ];

    expect(packet.kind).toBe("flash-erase-64");
    expect(Array.from(packet.payload.slice(3, 55))).toEqual(upstreamEraseStub);
    expect(view.getUint32(55, true)).toBe(CH32V003_FLASH_START);
    expect(view.getUint32(59, true)).toBe(FLASH_STATUS_REGISTER);
    expect(view.getUint32(63, true)).toBe(0x00400040);
    expect(Array.from(packet.payload.slice(67, 123))).toEqual(
      Array(56).fill(0),
    );
    expect(view.getUint32(123, true)).toBe(EXECUTION_MAGIC);
  });

  it("CH32V003のpage write前にCTLRとbufferを初期化する", () => {
    const packets = buildFlashProgramPreparationSequenceOffline();
    expect(
      packets.map((packet) => {
        const view = new DataView(packet.payload.buffer);
        return [view.getUint32(51, true), view.getUint32(59, true)];
      }),
    ).toEqual([
      [0x40022010, 0x00010000],
      [0x40022010, 0x00090000],
    ]);
  });

  it("未整列・範囲外のeraseを拒否する", () => {
    expect(() => buildErase64PacketOffline(CH32V003_FLASH_START + 1)).toThrow(
      RangeError,
    );
    expect(() => buildErase64PacketOffline(CH32V003_FLASH_START - 64)).toThrow(
      RangeError,
    );
  });
});
