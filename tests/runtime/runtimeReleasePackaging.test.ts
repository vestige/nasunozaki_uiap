import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, appendFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
const files = ["workshop-runtime.ino", "workshop-runtime.bin", "build-info.json", "uiap_standalone.ld", "standalone_vm.h", "standalone_button.h", "runtime_clock.h", "owned_program_update.h", "README.md"];
const run = (directory: string, check = true) => execFileSync("python3", [join(directory, "scripts/package-workshop-runtime.py"), ...(check ? ["--check"] : [])], { encoding: "utf8", stdio: "pipe" });

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "uiap-release-"));
  mkdirSync(join(directory, "scripts"));
  mkdirSync(join(directory, "web/public"), { recursive: true });
  mkdirSync(join(directory, "firmware/workshop-runtime"), { recursive: true });
  copyFileSync(join(root, "scripts/package-workshop-runtime.py"), join(directory, "scripts/package-workshop-runtime.py"));
  for (const file of files) copyFileSync(join(root, "firmware/workshop-runtime", file), join(directory, "firmware/workshop-runtime", file));
  return directory;
}

it("配布版ソース・bin・メタデータは公開用の整合性検証に通る", () => {
  expect(run(root)).toContain("verified");
});

it.each(["workshop-runtime.ino", "workshop-runtime.bin", "uiap_standalone.ld", "standalone_vm.h", "standalone_button.h", "runtime_clock.h", "owned_program_update.h"])("%sだけ変更して配布物を据え置くと公開を拒否する", file => {
  const directory = fixture();
  try {
    appendFileSync(join(directory, "firmware/workshop-runtime", file), "\nchanged\n");
    for (const check of [true, false]) {
      expect(() => run(directory, check)).toThrow(/does not match build-info.json/);
    }
    expect(existsSync(join(directory, "web/public/workshop-runtime.zip"))).toBe(false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

it("確認だけなら出力せず、公開用の生成では検証済みのbinとメタデータを配布する", () => {
  const directory = fixture();
  try {
    run(directory);
    expect(existsSync(join(directory, "web/public/workshop-runtime.bin"))).toBe(false);
    run(directory, false);
    expect(readFileSync(join(directory, "web/public/workshop-runtime.bin"))).toEqual(readFileSync(join(directory, "firmware/workshop-runtime/workshop-runtime.bin")));
    expect(JSON.parse(readFileSync(join(directory, "web/public/workshop-runtime.json"), "utf8"))).toEqual(JSON.parse(readFileSync(join(directory, "firmware/workshop-runtime/build-info.json"), "utf8")));
    expect(existsSync(join(directory, "web/public/workshop-runtime.zip"))).toBe(true);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

it("新しいヘッダーのメタデータ登録漏れも公開前に拒否する", () => {
  const directory = fixture();
  try {
    appendFileSync(join(directory, "firmware/workshop-runtime/unrecorded.h"), "// missing metadata\n");
    expect(() => run(directory, false)).toThrow(/header set does not match/);
    expect(existsSync(join(directory, "web/public/workshop-runtime.zip"))).toBe(false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

it("ハッシュが一致していても記録したbinサイズが違えば公開を拒否する", () => {
  const directory = fixture();
  try {
    const path = join(directory, "firmware/workshop-runtime/build-info.json");
    const info = JSON.parse(readFileSync(path, "utf8"));
    info.binary_size -= 1;
    writeFileSync(path, JSON.stringify(info));
    expect(() => run(directory, false)).toThrow(/binary_size does not match/);
    expect(existsSync(join(directory, "web/public/workshop-runtime.zip"))).toBe(false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
