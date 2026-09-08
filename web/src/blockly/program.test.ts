import { describe, expect, it } from "vitest";
import * as Blockly from "blockly/core";
import { registerUiapBlocks, starterProgram } from "./blocks";
import { compileWorkspace } from "./program";

describe("compileWorkspace", () => {
  it("点滅ブロックを安全な中間命令へ変換する", () => {
    registerUiapBlocks();
    const workspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(starterProgram, workspace);

    const program = compileWorkspace(workspace);

    expect(program).toHaveLength(1);
    expect(program[0]).toMatchObject({ type: "repeat", times: 3 });
    if (program[0].type === "repeat") {
      expect(program[0].body.map((instruction) => instruction.type)).toEqual([
        "led",
        "wait",
        "led",
        "wait",
      ]);
    }
  });
});
