import {
  BOOTLOADER_REPORT_ID,
  EXECUTION_MAGIC,
  REPORT_PAYLOAD_SIZE,
} from "./bootloaderProtocol";
import {
  CH32V003_FLASH_BLOCK_SIZE,
  CH32V003_FLASH_END,
  CH32V003_FLASH_START,
  FLASH_STATUS_REGISTER,
} from "./flashPacket";

const FLASH_KEY_REGISTER = 0x40022004;
const FLASH_OBKEY_REGISTER = 0x40022008;
const FLASH_MODEKEY_REGISTER = 0x40022024;
const KEY_ONE = 0x45670123;
const KEY_TWO = 0xcdef89ab;

const WORD_WRITE_STUB = new Uint8Array([
  0x23, 0xa0, 0x05, 0x00, 0x13, 0x07, 0x45, 0x03, 0x0c, 0x43, 0x50, 0x43, 0x2e,
  0x96, 0x21, 0x07, 0x14, 0x43, 0x94, 0xc1, 0x91, 0x05, 0x11, 0x07, 0xe3, 0xca,
  0xc5, 0xfe, 0x93, 0x06, 0xf0, 0xff, 0x14, 0xc1, 0x82, 0x80, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

const ERASE_64_STUB = new Uint8Array([
  0x13, 0x07, 0x85, 0x03, 0x0c, 0x43, 0x5c, 0x43, 0x83, 0x12, 0x87, 0x00, 0x03,
  0x16, 0xa7, 0x00, 0x2e, 0x96, 0xb7, 0x06, 0x02, 0x00, 0xd4, 0xc3, 0x93, 0x86,
  0x06, 0x04, 0x8c, 0xc7, 0xd4, 0xc3, 0x98, 0x43, 0x05, 0x8b, 0x75, 0xff, 0x96,
  0x95, 0xe3, 0xca, 0xc5, 0xfe, 0xfd, 0x56, 0x14, 0xc1, 0x01, 0x00, 0x82, 0x80,
]);

export type PreparedFlashControlPacket = {
  kind: "flash-unlock-register" | "flash-erase-64";
  reportId: number;
  payload: Uint8Array<ArrayBuffer>;
  executable: true;
};

function finalizePacket(packet: Uint8Array): Uint8Array<ArrayBuffer> {
  new DataView(packet.buffer).setUint32(124, EXECUTION_MAGIC, true);
  return packet.slice(1);
}

function buildRegisterWritePacket(
  register: number,
  value: number,
): PreparedFlashControlPacket {
  const packet = new Uint8Array(128);
  packet[0] = BOOTLOADER_REPORT_ID;
  packet.set(WORD_WRITE_STUB, 4);
  const view = new DataView(packet.buffer);
  view.setUint32(52, register, true);
  view.setUint32(56, 4, true);
  view.setUint32(60, value, true);
  return {
    kind: "flash-unlock-register",
    reportId: packet[0],
    payload: finalizePacket(packet),
    executable: true,
  };
}

export function buildFlashUnlockSequenceOffline(): PreparedFlashControlPacket[] {
  return [
    buildRegisterWritePacket(FLASH_KEY_REGISTER, KEY_ONE),
    buildRegisterWritePacket(FLASH_KEY_REGISTER, KEY_TWO),
    buildRegisterWritePacket(FLASH_OBKEY_REGISTER, KEY_ONE),
    buildRegisterWritePacket(FLASH_OBKEY_REGISTER, KEY_TWO),
    buildRegisterWritePacket(FLASH_MODEKEY_REGISTER, KEY_ONE),
    buildRegisterWritePacket(FLASH_MODEKEY_REGISTER, KEY_TWO),
  ];
}

export function buildErase64PacketOffline(
  address: number,
): PreparedFlashControlPacket {
  if (
    !Number.isInteger(address) ||
    address % CH32V003_FLASH_BLOCK_SIZE !== 0 ||
    address < CH32V003_FLASH_START ||
    address + CH32V003_FLASH_BLOCK_SIZE > CH32V003_FLASH_END
  ) {
    throw new RangeError(
      "消去先はCH32V003 flash内の64バイト境界で指定してください。",
    );
  }
  const packet = new Uint8Array(128);
  packet[0] = BOOTLOADER_REPORT_ID;
  packet.set(ERASE_64_STUB, 4);
  const view = new DataView(packet.buffer);
  view.setUint32(56, address, true);
  view.setUint32(60, FLASH_STATUS_REGISTER, true);
  view.setUint32(64, 0x00400040, true);
  return {
    kind: "flash-erase-64",
    reportId: packet[0],
    payload: finalizePacket(packet),
    executable: true,
  };
}

export const flashControlConstants = {
  FLASH_KEY_REGISTER,
  FLASH_OBKEY_REGISTER,
  FLASH_MODEKEY_REGISTER,
  KEY_ONE,
  KEY_TWO,
  REPORT_PAYLOAD_SIZE,
};
