import { describe, expect, it } from "vitest";
import { EXECUTION_MAGIC } from "./bootloaderProtocol";
import {
  buildErase64PacketOffline,
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

    expect(packet.kind).toBe("flash-erase-64");
    expect(view.getUint32(55, true)).toBe(CH32V003_FLASH_START);
    expect(view.getUint32(59, true)).toBe(FLASH_STATUS_REGISTER);
    expect(view.getUint32(63, true)).toBe(0x00400040);
    expect(view.getUint32(123, true)).toBe(EXECUTION_MAGIC);
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
