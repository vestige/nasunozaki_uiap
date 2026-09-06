import { describe, expect, it } from "vitest";
import {
  crc32,
  formatHexDump,
  validateFlashBackupAddress,
} from "./flashBackup";
import { CH32V003_FLASH_START } from "./flashPacket";

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
});
