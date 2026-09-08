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

export function createFlashBackupFileName(address: number, checksum: number) {
  return `uiapduino_flash_${address.toString(16).toUpperCase().padStart(8, "0")}_crc32_${checksum.toString(16).toUpperCase().padStart(8, "0")}.bin`;
}

export type FlashBackupVerification = {
  fileName: string;
  length: number;
  checksum: number;
  matches: boolean;
};

export function parseFlashBackupFileName(fileName: string) {
  const match = fileName.match(
    /^uiapduino_flash_([0-9a-f]{8})_crc32_([0-9a-f]{8})(?: \(\d+\))?\.bin$/i,
  );
  if (!match) {
    throw new Error("UIAPduinoの復旧用ファイル名ではありません。");
  }
  return {
    address: Number.parseInt(match[1], 16),
    checksum: Number.parseInt(match[2], 16),
  };
}

export function verifyFlashBackupBytes(
  fileName: string,
  candidate: Uint8Array,
  expected: number[],
): FlashBackupVerification {
  const expectedBytes = Uint8Array.from(expected);
  return {
    fileName,
    length: candidate.length,
    checksum: crc32(candidate),
    matches:
      candidate.length === expectedBytes.length &&
      candidate.every((byte, index) => byte === expectedBytes[index]),
  };
}
