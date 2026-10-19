import { expect, it, vi } from "vitest";
import * as Blockly from "blockly/core";
import { registerUiapBlocks } from "../../web/src/features/blockly/utils/blocks";
import { compileWorkspace } from "../../web/src/features/blockly/utils/program";
import { runProgram } from "../../web/src/features/blockly/utils/execution";
import { encodeStandaloneProgram } from "../../web/src/features/blockly/utils/standaloneProgram";
import type { ProgramInstruction, ProgramValue } from "../../web/src/features/blockly/types/program";
import { attachToProgram } from "./programStructure";

const color: ProgramValue = { type: "color", value: "#123456" };
const light: ProgramInstruction = { type: "neoPixelColorValue", pixel: null, color: { type: "variable", id: "c" }, brightness: { type: "number", value: 15 }, blockId: "light" };

it("色を変数へ覚え、全灯・個別へ差し込み、保存形式6へ変換する", async () => {
  const fill = vi.fn(), set = vi.fn();
  const program: ProgramInstruction[] = [{ type: "setVariable", id: "c", value: color, blockId: "remember" }, light,
    { ...light, pixel: { type: "number", value: 8 } }];
  await runProgram(program, { setLed() {}, fillNeoPixels: fill, setNeoPixel: set, async wait() {} }, new AbortController().signal);
  expect(fill).toHaveBeenCalledWith("#123456", 15);
  expect(set).toHaveBeenCalledWith(7, "#123456", 15);
  expect(encodeStandaloneProgram(program)[4]).toBe(6);
});

it.each([{ type: "number", value: 1 }, { type: "boolean", value: true }, { type: "variable", id: "unset" }, { type: "color", value: "bad" }] as ProgramValue[])("色でない値は明るさ0でも出力前に拒否する: %s", async value => {
  const fill = vi.fn();
  await expect(runProgram([{ ...light, color: value, brightness: { type: "number", value: 0 } }],
    { setLed() {}, fillNeoPixels: fill, async wait() {} }, new AbortController().signal)).rejects.toThrow();
  expect(fill).not.toHaveBeenCalled();
});

it("色は保存・復元後も色型としてコンパイルする", () => {
  registerUiapBlocks();
  const workspace = new Blockly.Workspace(), restored = new Blockly.Workspace();
  try {
    const block = workspace.newBlock("uiap_neopixel_fill_color");
    const c = workspace.newBlock("uiap_color"), n = workspace.newBlock("uiap_number");
    c.setFieldValue("#123456", "COLOR"); n.setFieldValue(15, "VALUE");
    block.getInput("COLOR")!.connection!.connect(c.outputConnection!);
    block.getInput("BRIGHTNESS")!.connection!.connect(n.outputConnection!);
    attachToProgram(workspace, block);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(workspace), restored);
    expect(compileWorkspace(restored)[0]).toMatchObject({ type: "neoPixelColorValue", color, brightness: { type: "number", value: 15 } });
  } finally { workspace.dispose(); restored.dispose(); }
});

it.each(["EQ", "NEQ", "LT"] as const)("色の比較は等価のみ許可する: %s", op => {
  const program: ProgramInstruction[] = [{ type: "if", condition: { type: "compare", op, left: color, right: { type: "color", value: "#123456" } },
    body: [{ type: "led", on: true, blockId: "yes" }], elseBody: [], blockId: "if" }];
  const led = vi.fn();
  const result = runProgram(program, { setLed: led, async wait() {} }, new AbortController().signal);
  if (op === "LT") return expect(result).rejects.toThrow("大小");
  return result.then(() => expect(led.mock.calls.length).toBe(op === "EQ" ? 1 : 0));
});
