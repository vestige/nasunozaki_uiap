import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("実ファームの所有識別子・期限・条件付き解除・旧送信の遮断を検査する", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const source = readFileSync(join(root, "firmware/workshop-runtime/workshop-runtime.ino"), "utf8");
  const handler = source.slice(source.indexOf("uint8_t handleOwnedUpdate("), source.indexOf("\nvoid handleMessage("));
  const start = source.indexOf("  if (command >= kProgramBegin && command <= kProgramAbort)");
  const legacyRouting = source.slice(start, source.indexOf("  if (command == kNeoRed", start));
  const harness = `
#include <stdint.h>
#include <assert.h>
#include "owned_program_update.h"
constexpr uint8_t kProgramBegin=0x20,kProgramData=0x21,kProgramCommit=0x22,kProgramAbort=0x23;
constexpr uint8_t kOwnedBegin=0x40,kOwnedData=0x41,kOwnedCommit=0x42,kOwnedAbort=0x43,kOwnedState=0x44,kOwnedRecover=0x45;
constexpr uint8_t kInvalidPayload=2,kOk=0;
bool programUpdateActive=false; uint16_t programUpdateOffset=0;
uint32_t now=0; uint32_t runtimeMillis(){return now;}
uiap::OwnedProgramUpdate ownedUpdate;
int writes=0,aborts=0,results=0; uint8_t last=0;
uint8_t handleProgramUpdate(uint8_t cmd,const uint8_t *m,uint8_t length){
  assert(length>=8+m[7]); ++writes;
  if(cmd==kProgramBegin){assert(m[7]==5 && m[8]==1);programUpdateActive=true;programUpdateOffset=0;}
  if(cmd==kProgramData){assert(m[7]>=3);programUpdateOffset+=m[7]-2;}
  if(cmd==kProgramCommit) programUpdateActive=false;
  if(cmd==kProgramAbort){programUpdateActive=false;++aborts;}
  return 0;
}
void sendResponse(uint8_t,uint8_t,uint8_t status){++results;last=status;}
${handler}
void legacy(uint8_t command,const uint8_t *message,uint8_t length){uint8_t sequence=0;${legacyRouting}}
int main(){
  uint8_t a[8]={1,2,3,4,5,6,7,8}, b[8]={9,2,3,4,5,6,7,8};
  uint8_t m[32]={};m[7]=13;
  for(int i=0;i<8;++i) { m[8+i]=a[i]; }
  m[16]=1;
  assert(handleOwnedUpdate(kOwnedBegin,m,32)==0 && writes==1);
  uint8_t old[8]={};legacy(kProgramAbort,old,8);assert(last==2 && aborts==0 && programUpdateActive);
  legacy(kProgramData,old,8);assert(last==2 && writes==1);
  m[7]=24;assert(handleOwnedUpdate(kOwnedData,m,32)==0 && programUpdateOffset==14);
  m[8]=9;assert(handleOwnedUpdate(kOwnedData,m,32)==2 && writes==2);m[8]=1;
  now=29999;m[7]=10;m[16]=14;m[17]=0;
  assert(handleOwnedUpdate(kOwnedRecover,m,32)==2 && aborts==0);
  now=30000;m[16]=0;assert(handleOwnedUpdate(kOwnedRecover,m,32)==2);m[16]=14;
  m[8]=9;assert(handleOwnedUpdate(kOwnedRecover,m,32)==2);m[8]=1;
  assert(handleOwnedUpdate(kOwnedRecover,m,32)==0 && aborts==1 && !programUpdateActive);
  // New owner starts; delayed DATA/ABORT/recovery from the old owner is blocked.
  m[7]=13;
  for(int i=0;i<8;++i) { m[8+i]=b[i]; }
  m[16]=1;
  assert(handleOwnedUpdate(kOwnedBegin,m,32)==0);int count=writes;
  for(int i=0;i<8;++i) { m[8+i]=a[i]; }
  m[7]=24;
  assert(handleOwnedUpdate(kOwnedData,m,32)==2 && writes==count);
  m[7]=8;assert(handleOwnedUpdate(kOwnedAbort,m,32)==2 && writes==count);
  m[7]=10;now=70000;assert(handleOwnedUpdate(kOwnedRecover,m,32)==2 && writes==count);
  // Expiry cannot be renewed with late DATA, but the actual owner can abort.
  for(int i=0;i<8;++i) { m[8+i]=b[i]; }
  m[7]=24;
  assert(handleOwnedUpdate(kOwnedData,m,32)==2);
  m[7]=8;assert(handleOwnedUpdate(kOwnedAbort,m,32)==0 && !programUpdateActive);
  // Progress resets the lease; reads do not. Wrap-safe subtraction.
  ownedUpdate.begin(a,0xfffffff0u);assert(!ownedUpdate.expired(10));
  assert(ownedUpdate.expired(0xfffffff0u+30000u));
  ownedUpdate.progress(100);assert(!ownedUpdate.expired(30099));
  assert(ownedUpdate.expired(30100));
  ownedUpdate.service(30100);assert(ownedUpdate.expired(101)); // Expired leases stay expired over a full wrap.
  ownedUpdate.finish(true);assert(ownedUpdate.state(false,30100)==0x74 && ownedUpdate.matches(a));
  ownedUpdate.legacy();assert(ownedUpdate.state(true,99999)==0x73);
  assert(!ownedUpdate.canRecover(true,a,0,0,99999));
  uiap::OwnedProgramUpdate probe;probe.begin(a,0);probe.progress(10000);
  assert(!probe.canRecover(true,a,14,14,30000)); // Same offset but newer progress.
  assert(probe.canRecover(true,a,14,14,40000));
  // Inspection must not renew the lease or write flash.
  ownedUpdate.begin(a,1000);programUpdateActive=true;now=30999;
  m[7]=1;m[8]=0;int beforeRead=writes;
  assert(handleOwnedUpdate(kOwnedState,m,32)==0x71);
  now=31000;assert(handleOwnedUpdate(kOwnedState,m,32)==0x72 && writes==beforeRead);
  // Truncated packets must not read beyond the supplied payload.
  uint8_t shortPacket[8]={};assert(handleOwnedUpdate(kOwnedRecover,shortPacket,8)==2);
  assert(handleOwnedUpdate(kOwnedBegin,shortPacket,8)==2);
  (void)results;
}
`;
  const directory = mkdtempSync(join(tmpdir(), "uiap-owned-update-"));
  try {
    const file = join(directory, "owned.cpp"), binary = join(directory, "owned");
    writeFileSync(file, harness);
    execFileSync("c++", ["-std=c++11", "-Wall", "-Wextra", "-Werror", "-fsanitize=address,undefined", "-I", join(root, "firmware/workshop-runtime"), file, "-o", binary]);
    expect(() => execFileSync(binary)).not.toThrow();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
