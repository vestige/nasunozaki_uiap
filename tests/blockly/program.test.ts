import { describe, expect, it } from "vitest";
import * as Blockly from "blockly/core";
import {
  registerUiapBlocks,
  starterProgram,
} from "../../web/src/features/blockly/utils/blocks";
import { compileWorkspace } from "../../web/src/features/blockly/utils/program";

describe("compileWorkspace", () => {
  it("比較と論理の入力を横一列に並べる", () => {
    registerUiapBlocks();
    const workspace = new Blockly.Workspace();
    expect(workspace.newBlock("uiap_compare").getInputsInline()).toBe(true);
    expect(workspace.newBlock("uiap_logic").getInputsInline()).toBe(true);
  });

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

  it("タクトスイッチの条件分岐を中間命令へ変換する", () => {
    registerUiapBlocks();
    const workspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: "uiap_if_button",
              inputs: {
                DO: { block: { type: "uiap_led", fields: { STATE: "ON" } } },
                ELSE: {
                  block: { type: "uiap_led", fields: { STATE: "OFF" } },
                },
              },
            },
          ],
        },
      },
      workspace,
    );

    const program = compileWorkspace(workspace);

    expect(program[0]).toMatchObject({ type: "ifButton" });
    if (program[0].type === "ifButton") {
      expect(program[0].body[0]).toMatchObject({ type: "led", on: true });
      expect(program[0].elseBody[0]).toMatchObject({ type: "led", on: false });
    }
  });

  it("ずっとブロックを停止可能な中間命令へ変換する", () => {
    registerUiapBlocks();
    const workspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: "uiap_forever",
              inputs: {
                DO: { block: { type: "uiap_led", fields: { STATE: "ON" } } },
              },
            },
          ],
        },
      },
      workspace,
    );

    const program = compileWorkspace(workspace);

    expect(program[0]).toMatchObject({ type: "forever" });
    if (program[0].type === "forever") {
      expect(program[0].body[0]).toMatchObject({ type: "led", on: true });
    }
  });

  it("NeoPixelブロックを8灯に制限した中間命令へ変換する", () => {
    registerUiapBlocks();
    const workspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(
      {
        blocks: {
          languageVersion: 0,
          blocks: [{
            type: "uiap_neopixel_fill",
            fields: { COLOR: "#00ff00", BRIGHTNESS: 20 },
            next: { block: {
              type: "uiap_neopixel_set",
              fields: { PIXEL: 8, COLOR: "#ff0000", BRIGHTNESS: 100 },
              next: { block: { type: "uiap_neopixel_clear" } },
            } },
          }],
        },
      },
      workspace,
    );

    expect(compileWorkspace(workspace)).toMatchObject([
      { type: "neoPixelFill", color: "#00ff00", brightness: 20 },
      { type: "neoPixelSet", index: 7, color: "#ff0000", brightness: 100 },
      { type: "neoPixelClear" },
    ]);
  });

  it("変数と条件ブロックを安全な中間表現へ変換する", () => {
    registerUiapBlocks();
    const workspace = new Blockly.Workspace();
    const variable = workspace.getVariableMap().createVariable("じょうたい");
    Blockly.serialization.workspaces.load({ variables: [{ name: "じょうたい", id: variable.getId() }], blocks: { languageVersion: 0, blocks: [{
      type: "uiap_variable_set", fields: { VAR: { id: variable.getId() } },
      inputs: { VALUE: { block: { type: "uiap_boolean", fields: { VALUE: "FALSE" } } } },
      next: { block: { type: "uiap_if", inputs: {
        CONDITION: { block: { type: "uiap_not", inputs: { VALUE: { block: { type: "uiap_variable_get", fields: { VAR: { id: variable.getId() } } } } } } },
        DO: { block: { type: "uiap_led", fields: { STATE: "ON" } } },
      } } },
    }] } }, workspace);

    expect(compileWorkspace(workspace)).toMatchObject([
      { type: "setVariable", id: variable.getId(), value: { type: "boolean", value: false } },
      { type: "if", condition: { type: "not", value: { type: "variable", id: variable.getId() } }, body: [{ type: "led", on: true }] },
    ]);

    const restored = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(workspace), restored);
    expect(restored.getVariableMap().getVariableById(variable.getId())?.name).toBe("じょうたい");
    expect(compileWorkspace(restored)).toEqual(compileWorkspace(workspace));
  });

  it("押した瞬間のブロックを1回限りの条件として変換する", () => {
    registerUiapBlocks();
    const workspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: [{ type: "uiap_if_button_pressed", inputs: { DO: { block: { type: "uiap_neopixel_clear" } } } }] } }, workspace);
    expect(compileWorkspace(workspace)).toMatchObject([{ type: "ifButtonPressed", body: [{ type: "neoPixelClear" }] }]);
  });
});
