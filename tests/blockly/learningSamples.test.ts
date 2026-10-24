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
    expect(html).toContain("ためせる場所:");
    expect(html).toContain("画面・ボード");
    expect(html.match(/サンプルを準備中です。/g)).toHaveLength(5);
  });

  it("provides one basic and two repetition samples with the common program structure", () => {
    expect(learningSamples.map((sample) => sample.category)).toEqual(["きほん", "くりかえし", "くりかえし"]);
    for (const sample of learningSamples) {
      const workspace = new Blockly.Workspace();
      workspaces.push(workspace);
      Blockly.serialization.workspaces.load(sample.workspace, workspace);
      expect(workspace.getTopBlocks(false).map((block) => block.type)).toEqual(["uiap_on_start", "uiap_main_forever"]);
      expect(compileWorkspace(workspace).length).toBeGreaterThan(0);
    }
  });
});
