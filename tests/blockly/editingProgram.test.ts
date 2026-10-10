import { afterEach, describe, expect, it } from "vitest";
import * as Blockly from "blockly/core";
import { registerUiapBlocks, starterProgram } from "../../web/src/features/blockly/utils/blocks";
import { inspectEditingProgram } from "../../web/src/features/blockly/utils/editingProgram";
import { loadBlocklyWorkspace, saveBlocklyWorkspace } from "../../web/src/features/blockly/utils/persistence";
import { createBlocklyProjectFile, parseBlocklyProjectFile, stringifyBlocklyProjectFile } from "../../web/src/features/blockly/utils/projectFile";

registerUiapBlocks();
const workspaces: Blockly.Workspace[] = [];
function createWorkspace() {
  const workspace = new Blockly.Workspace();
  workspaces.push(workspace);
  return workspace;
}
afterEach(() => { for (const workspace of workspaces.splice(0)) workspace.dispose(); });

describe("editing program state", () => {
  it("未入力になると前の命令を残さず、修正すれば実行可能な状態へ戻る", () => {
    const workspace = createWorkspace();
    Blockly.serialization.workspaces.load(starterProgram, workspace);
    expect(inspectEditingProgram(workspace)).toMatchObject({ error: null, instructions: [{ type: "repeat" }] });
    workspace.clear();
    const block = workspace.newBlock("uiap_if");
    expect(inspectEditingProgram(workspace)).toEqual({ instructions: [], error: "値を入れていないブロックがあります。" });
    const condition = workspace.newBlock("uiap_boolean");
    block.getInput("CONDITION")!.connection!.connect(condition.outputConnection!);
    expect(inspectEditingProgram(workspace)).toMatchObject({ error: null, instructions: [{ type: "if" }] });
  });

  it("範囲外の固定値では実行用の命令を生成しない", () => {
    const workspace = createWorkspace();
    Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: [{
      type: "uiap_neopixel_fill_brightness", fields: { COLOR: "#00ff00" },
      inputs: { BRIGHTNESS: { block: { type: "uiap_number", fields: { VALUE: 101 } } } },
    }] } }, workspace);
    expect(inspectEditingProgram(workspace)).toEqual({ instructions: [], error: "明るさには0から100の整数を入れてください。" });
  });

  it("組み立て途中でも自動保存と作品ファイルで復元できる", () => {
    const workspace = createWorkspace();
    workspace.newBlock("uiap_if");
    const snapshot = Blockly.serialization.workspaces.save(workspace);
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    expect(inspectEditingProgram(workspace).error).not.toBeNull();
    saveBlocklyWorkspace(storage, snapshot);
    const project = parseBlocklyProjectFile(stringifyBlocklyProjectFile(createBlocklyProjectFile(snapshot)));
    for (const saved of [loadBlocklyWorkspace(storage), project.workspace]) {
      const restored = createWorkspace();
      Blockly.serialization.workspaces.load(saved as Record<string, unknown>, restored);
      expect(restored.getAllBlocks(false).map((block) => block.type)).toEqual(["uiap_if"]);
      expect(inspectEditingProgram(restored)).toEqual(inspectEditingProgram(workspace));
    }
  });

  it("空の作品はエラー扱いせず、命令も生成しない", () => {
    expect(inspectEditingProgram(createWorkspace())).toEqual({ instructions: [], error: null });
  });
});
