import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import * as Blockly from "blockly/core";
import { LearningSamplePicker } from "../../web/src/features/blockly/components/LearningSamplePicker";
import { learningSampleCategories, learningSamples } from "../../web/src/features/blockly/samples/learningSamples";
import { registerUiapBlocks } from "../../web/src/features/blockly/utils/blocks";
import { compileWorkspace } from "../../web/src/features/blockly/utils/program";

registerUiapBlocks();
const workspaces: Blockly.Workspace[] = [];
afterEach(() => { for (const workspace of workspaces.splice(0)) workspace.dispose(); });

describe("learning samples", () => {
  it("shows the same groups as the Blockly toolbox and marks future groups as in preparation", () => {
    const html = renderToStaticMarkup(createElement(LearningSamplePicker, {
      open: true,
      disabled: false,
      onClose: () => undefined,
      onSelect: () => undefined,
    }));
    for (const category of learningSampleCategories) expect(html).toContain(category);
    expect(html).toContain("LEDをつけて、まって、けす");
    expect(html).toContain("LEDを3回点滅");
    expect(html).toContain("LEDをずっと点滅");
    expect(html).toContain("数をくらべてLEDをつける");
    expect(html).toContain("覚えながら3秒ごとに点灯・消灯");
    expect(html).toContain("押している間だけLEDをつける");
    expect(html).toContain("押すたびにLEDを切り替える");
    expect(html).toContain("全部を同じ色で光らせる");
    expect(html).toContain("1番から8番へ光を動かす");
    expect(html).toContain("ためせる場所:");
    expect(html).toContain("画面・ボード");
    expect(html.match(/サンプルを準備中です。/g)).toHaveLength(1);
  });

  it("provides basic, repetition, condition, and variable samples without unused program sections", () => {
    expect(learningSamples.map((sample) => sample.category)).toEqual([
      "きほん", "くりかえし", "くりかえし", "もし・くらべる", "おぼえる", "タクトスイッチ", "タクトスイッチ", "NeoPixel", "NeoPixel",
    ]);
    for (const sample of learningSamples) {
      const workspace = new Blockly.Workspace();
      workspaces.push(workspace);
      Blockly.serialization.workspaces.load(sample.workspace, workspace);
      const sections = workspace.getTopBlocks(false);
      expect(sections.length).toBeGreaterThan(0);
      expect(sections.every((block) =>
        ["uiap_on_start", "uiap_main_forever"].includes(block.type)
        && block.getInputTargetBlock("DO") !== null,
      )).toBe(true);
      expect(compileWorkspace(workspace).length).toBeGreaterThan(0);
    }
  });

  it("remembers the LED state while toggling it every three seconds", () => {
    const sample = learningSamples.find(({ id }) => id === "variable-timed-light-toggle");
    expect(sample).toBeDefined();
    const workspace = new Blockly.Workspace();
    workspaces.push(workspace);
    Blockly.serialization.workspaces.load(sample!.workspace, workspace);
    expect(compileWorkspace(workspace)).toMatchObject([
      { type: "repeat", times: 2 },
      { type: "setVariable", id: "sample-light-state", value: { type: "boolean", value: false } },
      { type: "forever", body: [
        { type: "wait", milliseconds: 3000 },
        { type: "if", condition: { type: "variable", id: "sample-light-state" },
          body: [
            { type: "led", on: false },
            { type: "setVariable", id: "sample-light-state", value: { type: "boolean", value: false } },
          ],
          elseBody: [
            { type: "led", on: true },
            { type: "setVariable", id: "sample-light-state", value: { type: "boolean", value: true } },
          ],
        },
      ] },
    ]);
  });

  it("distinguishes the held and newly pressed tact switch states", () => {
    const holdSample = learningSamples.find(({ id }) => id === "tact-switch-hold-led");
    const toggleSample = learningSamples.find(({ id }) => id === "tact-switch-press-toggle-led");
    expect(holdSample?.extensions).toEqual({ tactSwitch: true });
    expect(toggleSample?.extensions).toEqual({ tactSwitch: true });

    const holdWorkspace = new Blockly.Workspace();
    const toggleWorkspace = new Blockly.Workspace();
    workspaces.push(holdWorkspace, toggleWorkspace);
    Blockly.serialization.workspaces.load(holdSample!.workspace, holdWorkspace);
    Blockly.serialization.workspaces.load(toggleSample!.workspace, toggleWorkspace);

    expect(compileWorkspace(holdWorkspace)).toMatchObject([
      { type: "forever", body: [
        { type: "ifButton", body: [{ type: "led", on: true }], elseBody: [{ type: "led", on: false }] },
      ] },
    ]);
    expect(compileWorkspace(toggleWorkspace)).toMatchObject([
      { type: "setVariable", id: "sample-button-light-state", value: { type: "boolean", value: false } },
      { type: "forever", body: [
        { type: "ifButtonPressed", body: [
          { type: "if", condition: { type: "variable", id: "sample-button-light-state" } },
        ] },
      ] },
    ]);
  });

  it("provides whole-strip and moving-light NeoPixel examples", () => {
    const fillSample = learningSamples.find(({ id }) => id === "neopixel-fill-then-clear");
    const movingSample = learningSamples.find(({ id }) => id === "neopixel-moving-light");
    expect(fillSample?.extensions).toEqual({ neoPixel: true });
    expect(movingSample?.extensions).toEqual({ neoPixel: true });

    const fillWorkspace = new Blockly.Workspace();
    const movingWorkspace = new Blockly.Workspace();
    workspaces.push(fillWorkspace, movingWorkspace);
    Blockly.serialization.workspaces.load(fillSample!.workspace, fillWorkspace);
    Blockly.serialization.workspaces.load(movingSample!.workspace, movingWorkspace);

    expect(compileWorkspace(fillWorkspace)).toMatchObject([
      { type: "neoPixelColorValue", pixel: null,
        color: { type: "color", value: "#00aaff" }, brightness: { type: "number", value: 20 } },
      { type: "wait", milliseconds: 1000 },
      { type: "neoPixelClear" },
    ]);
    expect(compileWorkspace(movingWorkspace)).toMatchObject([
      { type: "setVariable", id: "sample-neopixel-index", value: { type: "number", value: 1 } },
      { type: "repeat", times: 8, body: [
        { type: "neoPixelClear" },
        { type: "neoPixelColorValue", pixel: { type: "variable", id: "sample-neopixel-index" },
          color: { type: "color", value: "#aa00ff" }, brightness: { type: "number", value: 20 } },
        { type: "wait", milliseconds: 300 },
        { type: "setVariable", id: "sample-neopixel-index", value: { type: "arithmetic", op: "ADD" } },
      ] },
      { type: "neoPixelClear" },
    ]);
  });
});
