import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import * as Blockly from "blockly/core";
import { registerUiapBlocks, createUiapToolbox } from "../../web/src/features/blockly/utils/blocks";
import { compileWorkspace, type ProgramValue, type ProgramInstruction } from "../../web/src/features/blockly/utils/program";
import { runProgram } from "../../web/src/features/blockly/utils/execution";
import { encodeStandaloneProgram } from "../../web/src/features/blockly/utils/standaloneProgram";
import { parseBlocklyProjectFile, createBlocklyProjectFile, stringifyBlocklyProjectFile } from "../../web/src/features/blockly/utils/projectFile";
import { loadBlocklyWorkspace, BLOCKLY_STORAGE_KEY } from "../../web/src/features/blockly/utils/persistence";

const n = (value: number): ProgramValue => ({ type: "number", value });
const calc = (op: "ADD" | "SUB", a: ProgramValue, b: ProgramValue): ProgramValue => ({ type: "arithmetic", op, left: a, right: b });
const light = (pixel: ProgramValue): ProgramInstruction => ({ type: "neoPixelSetValue", pixel, color: "#00ff00", brightness: 20, blockId: "pixel" });

it.each([false, true])("光が移動する作品を保存・復元し画面で順方向／逆方向に実行: %s", async reverse => {
  registerUiapBlocks();
  const project = parseBlocklyProjectFile(readFileSync(new URL(`../../examples/blockly/neopixel-${reverse ? "backward" : "forward"}.uiap.json`, import.meta.url), "utf8"));
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(project.workspace, workspace);
    const saved = createBlocklyProjectFile(Blockly.serialization.workspaces.save(workspace));
    Blockly.serialization.workspaces.load(parseBlocklyProjectFile(stringifyBlocklyProjectFile(saved)).workspace, workspace);
    const program = compileWorkspace(workspace);
    expect(encodeStandaloneProgram(program)[4]).toBe(3);
    const controller = new AbortController();
    const positions: number[] = [];
    await expect(runProgram(program, { setLed() {}, clearNeoPixels() {},
      setNeoPixel(index) { positions.push(index); if (positions.length === 10) controller.abort(); },
      async wait() {},
    }, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(positions).toEqual(Array.from({ length: 10 }, (_, i) => reverse ? 7 - i % 8 : i % 8));
  } finally { workspace.dispose(); }
});

it("旧形式の固定番号をファイルと自動保存から移行し、形式2のまま書ける", () => {
  registerUiapBlocks();
  const old = { blocks: { languageVersion: 0, blocks: [{ type: "uiap_neopixel_set", fields: { PIXEL: 8, COLOR: "#00ff00", BRIGHTNESS: 20 } }] } };
  const json = JSON.stringify({ format: "uiapduino-blockly-project", version: 3, savedAt: "2026-10-07", workspace: old });
  const storage = { getItem(key: string) { return key === BLOCKLY_STORAGE_KEY ? json : null; }, setItem() {}, removeItem() {} };
  const migrated = parseBlocklyProjectFile(json).workspace;
  expect(loadBlocklyWorkspace(storage)).toEqual(migrated);
  expect(old.blocks.blocks[0].type).toBe("uiap_neopixel_set");
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(migrated, workspace);
    const block = workspace.getTopBlocks()[0];
    expect(block.type).toBe("uiap_neopixel_set_value");
    expect(block.getInputTargetBlock("PIXEL")?.getFieldValue("VALUE")).toBe(8);
    const program = compileWorkspace(workspace);
    expect(program[0]).toMatchObject({ type: "neoPixelSet", index: 7 });
    expect(encodeStandaloneProgram(program)[4]).toBe(2);
  } finally { workspace.dispose(); }
});

it("新規ブロックの入力には編集できる初期値を用意する", () => {
  const toolbox = JSON.stringify(createUiapToolbox({ tactSwitch: false, neoPixel: true }));
  expect(toolbox).toContain('"PIXEL":{"shadow":{"type":"uiap_number","fields":{"VALUE":1}}}');
  expect(toolbox).toContain('"type":"uiap_arithmetic"');
});

it("空入力や不正な固定番号をコンパイル時に拒否する", () => {
  registerUiapBlocks();
  const workspace = new Blockly.Workspace();
  try {
    const block = workspace.newBlock("uiap_neopixel_set_value");
    expect(() => compileWorkspace(workspace)).toThrow("値を入れていない");
    const number = workspace.newBlock("uiap_number");
    block.getInput("PIXEL")!.connection!.connect(number.outputConnection!);
    for (const value of [0, 9, 1.5]) {
      number.setFieldValue(value, "VALUE");
      expect(() => compileWorkspace(workspace)).toThrow("1から8");
    }
  } finally { workspace.dispose(); }
});

it.each([
  n(0), n(9), n(-1), n(1.5), { type: "boolean", value: true } as ProgramValue,
  { type: "variable", id: "missing" } as ProgramValue,
  calc("ADD", n(2147483647), n(1)), calc("SUB", n(-2147483648), n(1)),
  calc("ADD", n(1.5), n(1)), calc("ADD", { type: "boolean", value: true }, n(1)),
])("不正な番号・計算は出力と後続命令を実行しない: %j", async pixel => {
  const outputs: string[] = [];
  await expect(runProgram([light(pixel), { type: "led", on: true, blockId: "after" }], {
    setLed() { outputs.push("led"); }, setNeoPixel() { outputs.push("neo"); }, async wait() {},
  }, new AbortController().signal)).rejects.toThrow();
  expect(outputs).toEqual([]);
});

it("加減算後に別の形式2命令があっても形式3を維持する", () => {
  expect(encodeStandaloneProgram([{ type: "setVariable", id: "n", value: calc("ADD", n(1), n(2)), blockId: "sum" },
    { type: "neoPixelClear", blockId: "clear" }])[4]).toBe(3);
});
