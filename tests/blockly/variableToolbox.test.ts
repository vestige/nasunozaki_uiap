import { describe, expect, it } from "vitest";
import * as Blockly from "blockly/core";
import { registerUiapBlocks } from "../../web/src/features/blockly/utils/blocks";
import {
  CREATE_UIAP_VARIABLE,
  createUiapVariableFlyout,
} from "../../web/src/features/blockly/utils/variableToolbox";
import { migrateWorkspace } from "../../web/src/features/blockly/utils/migrateWorkspace";

describe("variable toolbox", () => {
  it("変数がない作品では作成ボタンだけを表示する", () => {
    const workspace = new Blockly.Workspace();
    expect(createUiapVariableFlyout(workspace as Blockly.WorkspaceSvg)).toEqual([
      {
        kind: "button",
        text: "数値の変数を作る",
        callbackkey: CREATE_UIAP_VARIABLE,
      },
    ]);
  });

  it("作成済み変数と直接編集できる数字を表示する", () => {
    const workspace = new Blockly.Workspace();
    const second = workspace.getVariableMap().createVariable("ひかる", "Number");
    const first = workspace.getVariableMap().createVariable("かいすう", "Number");
    const flyout = createUiapVariableFlyout(workspace as Blockly.WorkspaceSvg);
    const blocks = flyout.filter((item): item is Blockly.utils.toolbox.BlockInfo => item.kind === "block");

    expect(blocks[0]).toMatchObject({
      type: "uiap_variable_set",
      fields: { VAR: { id: first.getId() } },
      inputs: {
        VALUE: { shadow: { type: "uiap_number", fields: { VALUE: 0 } } },
      },
    });
    expect(blocks.filter(({ type }) => type === "uiap_variable_get")).toMatchObject([
      { fields: { VAR: { id: first.getId() } } },
      { fields: { VAR: { id: second.getId() } } },
    ]);
    expect(blocks.at(-1)).toMatchObject({ type: "uiap_arithmetic" });
  });

  it("変数ブロックの右クリックに削除操作を追加する", () => {
    registerUiapBlocks();
    const workspace = new Blockly.Workspace();
    const variable = workspace.getVariableMap().createVariable("かいすう", "Number");
    const block = workspace.newBlock("uiap_variable_set") as Blockly.BlockSvg;
    block.getField("VAR")?.setValue(variable.getId());
    expect(block.getInput("VALUE")?.connection?.getCheck()).toEqual(["Number"]);
    const options: Blockly.ContextMenuRegistry.LegacyContextMenuOption[] = [];

    block.customContextMenu?.(options);

    expect(options[0]).toMatchObject({
      text: "変数「かいすう」を削除",
      enabled: true,
    });
    options[0].callback(undefined as never);
    expect(workspace.getVariableMap().getVariableById(variable.getId())).toBeNull();
    expect(block.isDeadOrDying()).toBe(true);
  });

  it("既存作品の固定繰り返し回数を長丸の数字へ移行する", () => {
    expect(migrateWorkspace({ blocks: { blocks: [{
      type: "uiap_repeat", fields: { TIMES: 4 },
    }] } }, 8)).toMatchObject({ blocks: { blocks: [{
      type: "uiap_repeat",
      inputs: { TIMES: { shadow: { type: "uiap_number", fields: { VALUE: 4 } } } },
    }] } });
  });

});
