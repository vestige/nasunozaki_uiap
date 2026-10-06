import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import * as Blockly from "blockly/core";
import { registerUiapBlocks } from "../../web/src/features/blockly/utils/blocks";
import { compileWorkspace } from "../../web/src/features/blockly/utils/program";
import { parseBlocklyProjectFile } from "../../web/src/features/blockly/utils/projectFile";
import { runProgram } from "../../web/src/features/blockly/utils/execution";

it("比較6種の真偽・論理の真理値表・変数と入れ子の確認作品が8灯とも合格する", async () => {
  registerUiapBlocks();
  const project = parseBlocklyProjectFile(readFileSync(new URL("../../examples/blockly/logic-check.uiap.json", import.meta.url), "utf8"));
  const workspace = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(project.workspace, workspace);
  const restored = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(workspace), restored);
  const controller = new AbortController();
  const pixels = Array<string>(8).fill("off");
  await expect(runProgram(compileWorkspace(restored), {
    setLed() {},
    clearNeoPixels() { pixels.fill("off"); },
    setNeoPixel(index, color) { pixels[index] = color; },
    async wait(ms) { if (ms === 500) controller.abort(); },
  }, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  expect(pixels).toEqual(Array(8).fill("#00ff00"));
  restored.dispose();
  workspace.dispose();
});
