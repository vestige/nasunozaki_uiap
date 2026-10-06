import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Blockly from "blockly/core";
import { registerUiapBlocks } from "../../web/src/features/blockly/utils/blocks";
import { compileWorkspace } from "../../web/src/features/blockly/utils/program";
import { parseBlocklyProjectFile } from "../../web/src/features/blockly/utils/projectFile";
import { runProgram } from "../../web/src/features/blockly/utils/execution";
import { DebouncedButton } from "../../web/src/features/blockly/utils/buttonDebounce";

describe("実機確認用トグル作品", () => {
  it("保存作品を読み込み、長押しでは反転せず、再押下で消灯する", async () => {
    registerUiapBlocks();
    const project = parseBlocklyProjectFile(readFileSync(new URL("../../examples/blockly/tact-neopixel-toggle.uiap.json", import.meta.url), "utf8"));
    const workspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(project.workspace, workspace);
    const program = compileWorkspace(workspace);
    const controller = new AbortController();
    const button = new DebouncedButton();
    const lights: string[] = [];
    let now = 0;
    await expect(runProgram(program, {
      setLed() {},
      fillNeoPixels(color, brightness) { lights.push(`${color}:${brightness}`); },
      clearNeoPixels() { lights.push("off"); },
      consumeButtonPress() {
        button.update((now >= 500 && now < 2000) || now >= 2500, now);
        return button.consumePress();
      },
      async wait(ms) {
        now += ms;
        if (now >= 3500) controller.abort();
      },
    }, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(lights).toEqual(["off", "#00ff00:20", "off"]);
    workspace.dispose();
  });
});
