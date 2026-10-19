import { afterEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import * as Blockly from "blockly/core";
import { registerUiapBlocks } from "../../web/src/features/blockly/utils/blocks";
import { compileWorkspace } from "../../web/src/features/blockly/utils/program";
import { migrateWorkspace } from "../../web/src/features/blockly/utils/migrateWorkspace";

registerUiapBlocks();
const workspaces: Blockly.Workspace[] = [];
function load(state: unknown) {
  const workspace = new Blockly.Workspace();
  workspaces.push(workspace);
  Blockly.serialization.workspaces.load(state as Record<string, unknown>, workspace);
  return workspace;
}
afterEach(() => { for (const workspace of workspaces.splice(0)) workspace.dispose(); });

describe("はじめにと最上位のずっと", () => {
  it("画面上の位置に関係なく、はじめにの後でずっとを実行する", () => {
    const workspace = load({ blocks: { languageVersion: 0, blocks: [
      { type: "uiap_main_forever", x: 20, y: 10, inputs: { DO: { block: { type: "uiap_led", fields: { STATE: "ON" } } } } },
      { type: "uiap_on_start", x: 400, y: 300, inputs: { DO: { block: { type: "uiap_led", fields: { STATE: "OFF" } } } } },
    ] } });
    expect(compileWorkspace(workspace)).toMatchObject([
      { type: "led", on: false },
      { type: "forever", body: [{ type: "led", on: true }] },
    ]);
  });

  it("空のはじめに・ずっとを許し、空ループを生成しない", () => {
    const workspace = load({ blocks: { languageVersion: 0, blocks: [
      { type: "uiap_on_start" }, { type: "uiap_main_forever" },
    ] } });
    expect(compileWorkspace(workspace)).toEqual([]);
  });

  it("同じ最上位ブロックが複数ある不正作品は実行しない", () => {
    const workspace = load({ blocks: { languageVersion: 0, blocks: [
      { type: "uiap_on_start" }, { type: "uiap_on_start" },
    ] } });
    expect(() => compileWorkspace(workspace)).toThrow("1つだけ");
  });

  it("旧作品の末尾のずっとを分離し、他のtop-level列を残す", () => {
    const old = { blocks: { languageVersion: 0, blocks: [
      { type: "uiap_led", x: 20, y: 10, fields: { STATE: "OFF" }, next: { block: {
        type: "uiap_forever", inputs: { DO: { block: { type: "uiap_led", fields: { STATE: "ON" } } } },
      } } },
      { type: "uiap_wait", x: 20, y: 500, fields: { MILLISECONDS: 1000 } },
    ] } };
    const migrated = migrateWorkspace(old, 7) as any;
    expect(old.blocks.blocks[0].type).toBe("uiap_led");
    expect(migrated.blocks.blocks.map((block: any) => block.type)).toEqual([
      "uiap_on_start", "uiap_main_forever", "uiap_wait",
    ]);
    expect(compileWorkspace(load(migrated))).toMatchObject([
      { type: "led", on: false },
      { type: "forever", body: [{ type: "led", on: true }] },
    ]);
    expect(migrateWorkspace(migrated, 8)).toEqual(migrated);
  });

  it("同梱サンプルはversion 8の基本構造で保存する", () => {
    const directory = new URL("../../examples/blockly/", import.meta.url);
    for (const name of readdirSync(directory).filter((file) => file.endsWith(".uiap.json"))) {
      const project = JSON.parse(readFileSync(new URL(name, directory), "utf8"));
      expect(project.version, name).toBe(8);
      expect(project.workspace.blocks.blocks.map((block: any) => block.type).slice(0, 2), name)
        .toEqual(["uiap_on_start", "uiap_main_forever"]);
    }
  });
});
