import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("48MHzの時刻計算は端数・最大差分・SysTickとmillisの周回で64bit基準と一致する", () => {
  const directory = mkdtempSync(join(tmpdir(), "uiap-clock-test-"));
  try {
    const binary = join(directory, "clock");
    execFileSync("c++", ["-std=c++11", "-Wall", "-Wextra", "-Werror", "-fsanitize=address,undefined",
      fileURLToPath(new URL("./runtime_clock_host.cpp", import.meta.url)), "-o", binary]);
    expect(execFileSync(binary, [], { encoding: "utf8" })).toBe("clock matches 64-bit reference\n");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
