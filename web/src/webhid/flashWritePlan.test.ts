import { describe, expect, it } from "vitest";
import {
  CH32V003_FLASH_BLOCK_SIZE,
  CH32V003_FLASH_END,
  CH32V003_FLASH_START,
} from "./flashPacket";
import { createFlashWritePlan } from "./flashWritePlan";

describe("createFlashWritePlan", () => {
  it("64バイトの全blockを安全な操作順に展開する", () => {
    const plan = createFlashWritePlan(CH32V003_FLASH_START, 64);

    expect(plan.executable).toBe(false);
    expect(plan.blocks).toEqual([CH32V003_FLASH_START]);
    expect(plan.steps).toEqual([
      { kind: "preflight" },
      { kind: "unlock" },
      { kind: "backup", address: CH32V003_FLASH_START, length: 64 },
      {
        kind: "merge",
        address: CH32V003_FLASH_START,
        writeOffset: 0,
        writeLength: 64,
      },
      { kind: "erase", address: CH32V003_FLASH_START, length: 64 },
      { kind: "write", address: CH32V003_FLASH_START, length: 64 },
      { kind: "verify", address: CH32V003_FLASH_START, length: 64 },
    ]);
  });

  it("blockをまたぐ部分書き込みで退避とmerge範囲を作る", () => {
    const plan = createFlashWritePlan(CH32V003_FLASH_START + 48, 32);

    expect(plan.blocks).toEqual([
      CH32V003_FLASH_START,
      CH32V003_FLASH_START + CH32V003_FLASH_BLOCK_SIZE,
    ]);
    expect(plan.steps.filter((step) => step.kind === "merge")).toEqual([
      {
        kind: "merge",
        address: CH32V003_FLASH_START,
        writeOffset: 48,
        writeLength: 16,
      },
      {
        kind: "merge",
        address: CH32V003_FLASH_START + 64,
        writeOffset: 0,
        writeLength: 16,
      },
    ]);
  });

  it.each([
    [CH32V003_FLASH_START - 1, 1],
    [CH32V003_FLASH_END, 1],
    [CH32V003_FLASH_END - 1, 2],
    [CH32V003_FLASH_START, 0],
  ])("flash外または空の書き込みを拒否する", (address, length) => {
    expect(() => createFlashWritePlan(address, length)).toThrow(RangeError);
  });
});
