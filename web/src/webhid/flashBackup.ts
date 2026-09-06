import {
  CH32V003_FLASH_BLOCK_SIZE,
  CH32V003_FLASH_END,
  CH32V003_FLASH_START,
} from "./flashPacket";

export function validateFlashBackupAddress(address: number) {
  if (
    !Number.isInteger(address) ||
    address % CH32V003_FLASH_BLOCK_SIZE !== 0 ||
    address < CH32V003_FLASH_START ||
    address + CH32V003_FLASH_BLOCK_SIZE > CH32V003_FLASH_END
  ) {
    throw new RangeError(
      "退避元はCH32V003 flash内の64バイト境界で指定してください。",
    );
  }
}

export function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function formatHexDump(bytes: number[]) {
  return bytes
    .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}
