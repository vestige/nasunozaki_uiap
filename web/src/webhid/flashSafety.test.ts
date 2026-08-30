import { describe, expect, it } from "vitest";
import { interpretFlashSafety } from "./flashSafety";

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
