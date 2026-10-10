import { expect, it, vi } from "vitest";
import * as Blockly from "blockly/core";
import { registerUiapBlocks } from "../../web/src/features/blockly/utils/blocks";
import { migrateWorkspace } from "../../web/src/features/blockly/utils/migrateWorkspace";
import { compileWorkspace, type ProgramInstruction } from "../../web/src/features/blockly/utils/program";
import { runProgram } from "../../web/src/features/blockly/utils/execution";
import { encodeStandaloneProgram } from "../../web/src/features/blockly/utils/standaloneProgram";

it("旧個別点灯の明るさと番号を移行し、0%でも対象LEDだけを消す", () => {
  registerUiapBlocks();
  const workspace = new Blockly.Workspace();
  try {
    const saved = { blocks: { languageVersion: 0, blocks: [{ type: "uiap_neopixel_set_value", fields: { COLOR: "#00ff00", BRIGHTNESS: 15 },
      inputs: { PIXEL: { shadow: { type: "uiap_number", fields: { VALUE: 8 } } } } }] } };
    const migrated = migrateWorkspace(saved);
    expect(migrateWorkspace(migrated)).toEqual(migrated);
    expect(saved.blocks.blocks[0].fields.BRIGHTNESS).toBe(15);
    Blockly.serialization.workspaces.load(migrated, workspace);
    expect(compileWorkspace(workspace)[0]).toMatchObject({ type: "neoPixelSet", index: 7, brightness: 15 });
    workspace.getTopBlocks()[0].getInputTargetBlock("BRIGHTNESS")!.setFieldValue(0, "VALUE");
    const program = compileWorkspace(workspace);
    expect(program[0]).toMatchObject({ type: "neoPixelSet", index: 7, color: "#000000", brightness: 1 });
    expect(encodeStandaloneProgram(program)[4]).toBe(2);
  } finally { workspace.dispose(); }
});

it.each([0, 15, 20, 100, -1, 101, true])("ブラウザ実行の動的明るさ境界: %s", async value => {
  const output = vi.fn();
  const program: ProgramInstruction[] = [
    { type: "setVariable", id: "b", value: typeof value === "boolean" ? { type: "boolean", value } : { type: "number", value }, blockId: "set" },
    { type: "neoPixelLightValue", pixel: { type: "number", value: 8 }, color: "#00ff00", brightness: { type: "variable", id: "b" }, blockId: "light" }];
  const result = runProgram(program, { setLed() {}, setNeoPixel: output, async wait() {} }, new AbortController().signal);
  if (typeof value !== "number" || value < 0 || value > 100) {
    await expect(result).rejects.toThrow("明るさ"); expect(output).not.toHaveBeenCalled();
  } else {
    await result; expect(output).toHaveBeenCalledWith(7, value === 0 ? "#000000" : "#00ff00", value || 1);
  }
});
