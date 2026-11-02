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
    expect(html).toContain("ためせる場所:");
    expect(html).toContain("画面・ボード");
    expect(html.match(/サンプルを準備中です。/g)).toHaveLength(3);
  });

  it("provides basic, repetition, condition, and variable samples without unused program sections", () => {
    expect(learningSamples.map((sample) => sample.category)).toEqual([
      "きほん", "くりかえし", "くりかえし", "もし・くらべる", "おぼえる",
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
});
