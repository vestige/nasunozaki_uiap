import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("実ファームのBEGIN診断は状態を変更せず段階・応答・更新状態を符号化する", () => {
  const source = readFileSync(new URL("../../firmware/workshop-runtime/workshop-runtime.ino", import.meta.url), "utf8");
  const start = source.indexOf("uint8_t programBeginDiagnosticsSnapshot() {");
  const end = source.indexOf("\nbool programHalfword", start);
  expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
  const harness = `
#include <stdint.h>
#include <assert.h>
bool programUpdateActive=false, programBeginResponseQueued=false;
uint8_t programBeginStage=0, programBeginResult=0, busy=0;
uint8_t uiapwebhid_tx_busy(){return busy;}
${source.slice(start, end)}
int main(){
  for(int stage=0;stage<=6;++stage) for(int result=0;result<4;++result)
    for(int active=0;active<2;++active) for(int queued=0;queued<2;++queued)
      for(int tx=0;tx<2;++tx){
        programBeginStage=stage; programBeginResult=result;
        programUpdateActive=active; programBeginResponseQueued=queued; busy=tx;
        assert(programBeginDiagnosticsSnapshot()==((active<<7)|(stage<<4)|(queued<<3)|(tx<<2)|result));
        assert(programBeginStage==stage && programBeginResult==result);
        assert(programUpdateActive==bool(active) && programBeginResponseQueued==bool(queued) && busy==tx);
      }
}
`;
  const directory = mkdtempSync(join(tmpdir(), "uiap-begin-diagnostic-"));
  try {
    const file = join(directory, "diagnostic.cpp"), binary = join(directory, "diagnostic");
    writeFileSync(file, harness);
    execFileSync("c++", ["-std=c++11", "-Wall", "-Wextra", "-Werror", "-fsanitize=address,undefined", file, "-o", binary]);
    expect(() => execFileSync(binary)).not.toThrow();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
