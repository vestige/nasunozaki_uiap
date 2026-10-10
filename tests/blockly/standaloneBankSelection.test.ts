import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("実ファームのbank選択は空・破損・未コミット・世代周回でも有効な作品だけを選ぶ", () => {
  const source = readFileSync(new URL("../../firmware/workshop-runtime/workshop-runtime.ino", import.meta.url), "utf8");
  const start = source.indexOf("void selectStandaloneProgram() {");
  const end = source.indexOf("\nbool standaloneService()", start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  // Compile the actual selection function, not a separately rewritten algorithm.
  // Header/payload validation are stubs here; VM validation has separate tests.
  const harness = `
#include <stdint.h>
#include <assert.h>
constexpr uint32_t kProgramBankA=0, kProgramBankB=1;
constexpr uint8_t kBankHeaderSize=16;
uint8_t banks[2][32] = {};
bool headers[2], payloads[2];
uint32_t generations[2];
const volatile uint8_t *standaloneProgramSlot=nullptr;
uint8_t activeProgramBank=0;
bool standaloneProgramReady=false;
struct Button { int resets=0; void reset(){++resets;} } standaloneButtonState;
const volatile uint8_t *bankAt(uint32_t n){return banks[n];}
int indexOf(const volatile uint8_t *p){return p==banks[0]?0:1;}
bool bankHeaderValid(const volatile uint8_t *p){return headers[indexOf(p)];}
uint32_t bankGeneration(const volatile uint8_t *p){return generations[indexOf(p)];}
bool validateStandaloneProgram(){return payloads[standaloneProgramSlot==banks[0]+16?0:1];}
${source.slice(start, end)}
void check(int expected){
  int resets=standaloneButtonState.resets;
  selectStandaloneProgram();
  assert(standaloneButtonState.resets==resets+1);
  assert(activeProgramBank==expected);
  assert(standaloneProgramReady==(expected!=0));
  assert(standaloneProgramSlot==(expected?banks[expected-1]+16:nullptr));
}
int main(){
  check(0); // blank boot
  headers[0]=payloads[0]=true; generations[0]=1; check(1);
  payloads[1]=true; generations[1]=2; check(1); // interrupted DATA, no commit
  headers[1]=true; check(2); // successful commit
  payloads[1]=false; check(1); // newer payload invalid
  payloads[0]=false; check(0); // clear previous pointer and ready flag
  payloads[1]=true; check(2);
  payloads[0]=true; generations[0]=0xffffffffu; generations[1]=0; check(2);
  generations[0]=1; check(1);
  headers[0]=headers[1]=false; check(0);
}
`;
  const directory = mkdtempSync(join(tmpdir(), "uiap-bank-selection-"));
  try {
    const file = join(directory, "selection.cpp");
    const binary = join(directory, "selection");
    writeFileSync(file, harness);
    execFileSync("c++", ["-std=c++11", "-Wall", "-Wextra", "-Werror", "-fsanitize=address,undefined", file, "-o", binary]);
    expect(() => execFileSync(binary)).not.toThrow();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
