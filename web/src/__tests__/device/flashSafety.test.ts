import { describe, expect, it } from "vitest";
import {
  interpretFlashSafety,
  interpretFlashStatus,
} from "../../features/device/utils/flashSafety";

describe("interpretFlashSafety", () => {
  it("lock中かつread protectionなしをunlock候補とする", () => {
    expect(interpretFlashSafety(0x8080, 0)).toEqual({
      controlValue: 0x8080,
      protectionValue: 0,
      locked: true,
      readProtected: false,
      safeToUnlock: true,
    });
  });

  it("read protection有効時はunlock候補にしない", () => {
    expect(interpretFlashSafety(0x8080, 0x2).safeToUnlock).toBe(false);
  });

  it("すでにunlock済みなら追加unlockを不要とする", () => {
    const state = interpretFlashSafety(0, 0);
    expect(state.locked).toBe(false);
    expect(state.safeToUnlock).toBe(false);
  });
});

describe("interpretFlashStatus", () => {
  it("STATRの主要フラグを個別に解釈する", () => {
    expect(interpretFlashStatus(0x200, 0xc031, 0x03ffffdc)).toEqual({
      controlValue: 0x200,
      statusValue: 0xc031,
      protectionValue: 0x03ffffdc,
      busy: true,
      writeProtectionError: true,
      endOfOperation: true,
      statusMode: true,
      statusLocked: true,
    });
  });

  it("STATRが0なら処理中でもエラーでもない", () => {
    const result = interpretFlashStatus(0x200, 0, 0x03ffffdc);
    expect(result.busy).toBe(false);
    expect(result.writeProtectionError).toBe(false);
    expect(result.endOfOperation).toBe(false);
  });
});
