import { expect, it, vi } from "vitest";
import * as Blockly from "blockly/core";
import { colorPresets, colorToHsv, hsvToColor, normalizeColor } from "../../web/src/features/blockly/utils/colorPicker";
import { registerUiapBlocks } from "../../web/src/features/blockly/utils/blocks";
import { compileWorkspace } from "../../web/src/features/blockly/utils/program";
import { encodeStandaloneProgram } from "../../web/src/features/blockly/utils/standaloneProgram";
import { runProgram } from "../../web/src/features/blockly/utils/execution";
import { attachToProgram } from "./programStructure";

it("既存8色と任意のRGBはHSV変換しても色が変わらない", () => {
  for (const color of [...colorPresets.map(([, color]) => color), "#123456", "#abcdef", "#000000", "#fedcba"]) {
    const { hue, saturation, value } = colorToHsv(color);
    expect(hsvToColor(hue, saturation, value)).toBe(color);
  }
  expect(hsvToColor(360, 100)).toBe("#ff0000");
  expect(hsvToColor(120, 50)).toBe("#80ff80");
});

it("色は6桁RGBのみ許可し、不正な変換値を拒否する", () => {
  expect(normalizeColor("#ABCDEF")).toBe("#abcdef");
  for (const value of ["red", "#fff", "#ff000080", null, 1]) expect(normalizeColor(value)).toBeNull();
  expect(() => hsvToColor(NaN, 100)).toThrow();
  expect(() => hsvToColor(20, 101)).toThrow();
});

it.each(["#ff0000", "#ffffff", "#123456", "#80ff80"])("色欄の保存復元・実行・既存bytecodeでRGBを維持する: %s", async color => {
  registerUiapBlocks();
  const workspace = new Blockly.Workspace();
  const restored = new Blockly.Workspace();
  try {
    const block = workspace.newBlock("uiap_neopixel_fill_brightness");
    block.setFieldValue(color, "COLOR");
    const number = workspace.newBlock("uiap_number");
    number.setFieldValue(15, "VALUE");
    block.getInput("BRIGHTNESS")!.connection!.connect(number.outputConnection!);
    attachToProgram(workspace, block);
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(workspace), restored);
    const program = compileWorkspace(restored);
    expect(program[0]).toMatchObject({ color });
    const fill = vi.fn();
    await runProgram(program, { setLed() {}, fillNeoPixels: fill, async wait() {} }, new AbortController().signal);
    expect(fill).toHaveBeenCalledWith(color, 15);
    const slot = encodeStandaloneProgram(program);
    expect(slot[4]).toBe(2); // Constant brightness retains the existing compact format.
    expect([...slot.slice(18, 21)]).toEqual([1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16)));
    block.setFieldValue("invalid", "COLOR");
    expect(block.getFieldValue("COLOR")).toBe(color);
  } finally { workspace.dispose(); restored.dispose(); }
});
