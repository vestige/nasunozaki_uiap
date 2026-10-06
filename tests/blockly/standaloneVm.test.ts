import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, expect, it } from "vitest";
import * as Blockly from "blockly/core";
import { registerUiapBlocks } from "../../web/src/features/blockly/utils/blocks";
import { compileWorkspace, type ProgramInstruction, type ProgramValue } from "../../web/src/features/blockly/utils/program";
import { parseBlocklyProjectFile } from "../../web/src/features/blockly/utils/projectFile";
import { encodeStandaloneProgram } from "../../web/src/features/blockly/utils/standaloneProgram";

const directory = mkdtempSync(join(tmpdir(), "uiap-vm-test-"));
const binary = join(directory, "vm");
beforeAll(() => {
  execFileSync("c++", ["-std=c++11", "-Wall", "-Wextra", "-Werror", "-fsanitize=address,undefined",
    fileURLToPath(new URL("./standalone_vm_host.cpp", import.meta.url)), "-o", binary]);
}, 30000);
afterAll(() => rmSync(directory, { recursive: true, force: true }));

function raw(payload: number[], version = 2, validateOnly = false) {
  return execFileSync(binary, validateOnly ? ["validate"] : [], { input: [version, ...payload].join(" "), encoding: "utf8", timeout: 5000 });
}
function run(program: ProgramInstruction[]) {
  const slot = encodeStandaloneProgram(program);
  return raw([...slot.slice(16, 16 + (slot[6] | slot[7] << 8))], slot[4]);
}
function example(name: string) {
  registerUiapBlocks();
  const project = parseBlocklyProjectFile(readFileSync(new URL(`../../examples/blockly/${name}.uiap.json`, import.meta.url), "utf8"));
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(project.workspace, workspace);
    return compileWorkspace(workspace);
  } finally { workspace.dispose(); }
}

it("実際の論理確認作品をボード用C++で実行して8灯とも緑になる", () => {
  const result = run(example("logic-check"));
  expect(result).toContain("VALID 1");
  const pixels = result.split("\n").filter(line => /^N [1-8] /.test(line));
  expect(pixels).toEqual(Array.from({ length: 8 }, (_, i) => `N ${i + 1} 0 255 0 20`));
});

it("トグル作品は長押し中に反転せず、再押下で消灯する", () => {
  const result = run(example("tact-neopixel-toggle"));
  expect(result.split("\n").filter(line => line.startsWith("N "))).toEqual([
    "N 0 0 0 0 100", "N 0 0 255 0 20", "N 0 0 0 0 100",
  ]);
});

it("実ファームの押下判定は20ms安定・長押し・再押下・起動時押下・時計周回を扱える", () => {
  expect(() => execFileSync(binary, ["button"], { timeout: 5000 })).not.toThrow();
});

it("同じ実行器を再利用しても変数は初期化される", () => {
  expect(() => execFileSync(binary, ["reset"], { timeout: 5000 })).not.toThrow();
});

it("待機中のキャンセル後は後続命令を出さない", () => {
  expect(raw([1, 1, 2, 244, 1, 1, 0, 0])).toBe("VALID 1\nL 1\nDONE 0\n");
});

it("符号付き整数の両端と異なる型の等値比較を扱える", () => {
  const n = (value: number): ProgramValue => ({ type: "number", value });
  const conditions: ProgramValue[] = [
    { type: "compare", op: "LT", left: n(-2147483648), right: n(2147483647) },
    { type: "compare", op: "NEQ", left: n(1), right: { type: "boolean", value: true } },
  ];
  for (const condition of conditions) {
    expect(run([{ type: "if", condition, body: [{ type: "led", on: true, blockId: "led" }],
      elseBody: [], blockId: "if" }])).toBe("VALID 1\nL 1\nDONE 1\n");
  }
});

it("旧形式LEDと回数指定ループも実行できる", () => {
  expect(raw([0x10, 2, 2, 0, 1, 1, 0], 1)).toBe("VALID 1\nL 1\nL 1\nDONE 1\n");
});

it("未初期化変数・型不正は後続LEDを動かさない", () => {
  for (const condition of [
    { type: "variable", id: "unset" }, { type: "number", value: 1 },
    { type: "not", value: { type: "number", value: 1 } },
  ] as ProgramValue[]) {
    expect(run([{ type: "if", condition, body: [], elseBody: [], blockId: "if" },
      { type: "led", on: true, blockId: "led" }])).toBe("VALID 1\nDONE 0\n");
  }
});

it("かつ・またはの短絡評価では未初期化の右辺を読まない", () => {
  for (const op of ["AND", "OR"] as const) {
    const result = run([{ type: "setVariable", id: "out", value: {
      type: "logic", op, left: { type: "boolean", value: op === "OR" }, right: { type: "variable", id: "unset" },
    }, blockId: "set" }, { type: "led", on: true, blockId: "led" }]);
    expect(result).toContain("L 1\nDONE 1");
  }
});

it("不正命令・引数・途中切れ・旧形式への新命令混入を実行前に拒否する", () => {
  for (const payload of [[255, 0], [1, 2, 0], [2, 255, 255, 0], [0x20, 16, 1, 1, 0],
    [0x30, 9, 0, 0, 0, 20, 0], [0x30, 0, 0, 0, 0, 0, 0], [0x11, 0, 0, 0],
    [0x21, 1, 1, 255, 255, 0, 0, 0], [0, 1, 1]]) {
    expect(raw(payload)).toBe("VALID 0\nDONE 0\n");
  }
  expect(raw([0x32, 0], 1)).toBe("VALID 0\nDONE 0\n");
  const program = [0x20, 0, 2, 0, 0, 0, 0, 0x30, 1, 0, 255, 0, 20, 0];
  for (let i = 0; i < program.length; ++i) expect(raw(program.slice(0, i))).toContain("VALID 0");
});

it("構造と式の深すぎる入れ子を拒否する", () => {
  let nested = [1, 1];
  for (let i = 0; i < 9; ++i) nested = [0x10, 1, nested.length, 0, ...nested];
  expect(raw([...nested, 0])).toContain("VALID 0");
  expect(raw([0x20, 0, ...Array(9).fill(4), 1, 1, 0])).toContain("VALID 0");
});
