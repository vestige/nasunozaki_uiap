import {
  BOOTLOADER_REPORT_ID,
  EXECUTION_MAGIC,
  REPORT_PAYLOAD_SIZE,
} from "./bootloaderProtocol";

export const CH32V003_FLASH_START = 0x08000000;
export const CH32V003_FLASH_SIZE = 16 * 1024;
export const CH32V003_FLASH_END = CH32V003_FLASH_START + CH32V003_FLASH_SIZE;
export const CH32V003_FLASH_BLOCK_SIZE = 64;
export const FLASH_STATUS_REGISTER = 0x4002200c;

const WRITE_64_FLASH_STUB = new Uint8Array([
  0x13, 0x07, 0x45, 0x03, 0x0c, 0x43, 0x13, 0x86, 0x05, 0x04, 0x5c, 0x43, 0x8c,
  0xc7, 0x14, 0x47, 0x94, 0xc1, 0xb7, 0x06, 0x05, 0x00, 0xd4, 0xc3, 0x94, 0x41,
  0x91, 0x05, 0x11, 0x07, 0xe3, 0xc8, 0xc5, 0xfe, 0xc1, 0x66, 0x93, 0x86, 0x06,
  0x04, 0xd4, 0xc3, 0xfd, 0x56, 0x14, 0xc1, 0x82, 0x80,
]);

export type PreparedFlashPacket = {
  kind: "flash-write-64";
  reportId: number;
  payload: Uint8Array<ArrayBuffer>;
  address: number;
  dataLength: number;
  executable: true;
};

export function buildWrite64PacketOffline(
  address: number,
  data: Uint8Array,
): PreparedFlashPacket {
  if (!Number.isInteger(address)) {
    throw new RangeError("flash addressは整数で指定してください。");
  }
  if (address % CH32V003_FLASH_BLOCK_SIZE !== 0) {
    throw new RangeError("flash addressは64バイト境界に揃えてください。");
  }
  if (
    address < CH32V003_FLASH_START ||
    address + CH32V003_FLASH_BLOCK_SIZE > CH32V003_FLASH_END
  ) {
    throw new RangeError("書き込み範囲がCH32V003の16KB flash外です。");
  }
  if (data.length !== CH32V003_FLASH_BLOCK_SIZE) {
    throw new RangeError("書き込みデータは64バイト固定です。");
  }

  const packet = new Uint8Array(128);
  packet[0] = BOOTLOADER_REPORT_ID;
  packet.set(WRITE_64_FLASH_STUB, 4);
  const view = new DataView(packet.buffer);
  view.setUint32(52, address, true);
  view.setUint32(56, FLASH_STATUS_REGISTER, true);
  packet.set(data, 60);
  view.setUint32(124, EXECUTION_MAGIC, true);

  return {
    kind: "flash-write-64",
    reportId: packet[0],
    payload: packet.slice(1),
    address,
    dataLength: data.length,
    executable: true,
  };
}
