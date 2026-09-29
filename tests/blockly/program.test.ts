import { describe, expect, it } from "vitest";
import * as Blockly from "blockly/core";
import {
  registerUiapBlocks,
  starterProgram,
} from "../../web/src/features/blockly/utils/blocks";
import { compileWorkspace } from "../../web/src/features/blockly/utils/program";

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
              fields: { PIXEL: 8, COLOR: "#ff0000", BRIGHTNESS: 40 },
              next: { block: { type: "uiap_neopixel_clear" } },
            } },
          }],
        },
      },
      workspace,
    );

    expect(compileWorkspace(workspace)).toMatchObject([
      { type: "neoPixelFill", color: "#00ff00", brightness: 20 },
      { type: "neoPixelSet", index: 7, color: "#ff0000", brightness: 40 },
      { type: "neoPixelClear" },
    ]);
  });
});
