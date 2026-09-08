import { describe, expect, it } from "vitest";
import {
  createFlashBackupFileName,
  crc32,
  formatHexDump,
  parseFlashBackupFileName,
  validateFlashBackupAddress,
  verifyFlashBackupBytes,
} from "../../features/device/utils/flashBackup";
import { CH32V003_FLASH_START } from "../../features/device/utils/flashPacket";

describe("flash backup helpers", () => {
  it("64バイト境界のflash addressだけを許可する", () => {
    expect(() =>
      validateFlashBackupAddress(CH32V003_FLASH_START),
    ).not.toThrow();
    expect(() => validateFlashBackupAddress(CH32V003_FLASH_START + 1)).toThrow(
      RangeError,
    );
  });

  it("CRC32と共有用hex dumpを固定する", () => {
    const bytes = new TextEncoder().encode("123456789");
    expect(crc32(bytes)).toBe(0xcbf43926);
    expect(formatHexDump([0, 15, 255])).toBe("00 0F FF");
  });

  it("保存ファイル名へaddressとCRC32を含める", () => {
    expect(createFlashBackupFileName(0x08000000, 0xbed6a734)).toBe(
      "uiapduino_flash_08000000_crc32_BED6A734.bin",
    );
  });

  it("ブラウザが付けた連番を含む復旧用ファイル名を検証する", () => {
    expect(
      parseFlashBackupFileName(
        "uiapduino_flash_08000000_crc32_BED6A734 (2).bin",
      ),
    ).toEqual({ address: 0x08000000, checksum: 0xbed6a734 });
  });

  it("保存ファイルを元の退避内容とbyte単位で照合する", () => {
    expect(
      verifyFlashBackupBytes("backup.bin", new Uint8Array([1, 2]), [1, 2]),
    ).toMatchObject({ length: 2, matches: true });
    expect(
      verifyFlashBackupBytes("wrong.bin", new Uint8Array([1, 3]), [1, 2]),
    ).toMatchObject({ length: 2, matches: false });
  });
});
