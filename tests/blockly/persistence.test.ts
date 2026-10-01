import { describe, expect, it } from "vitest";
import {
  BLOCKLY_STORAGE_KEY,
  clearBlocklyWorkspace,
  loadBlocklySavedState,
  loadBlocklyWorkspace,
  saveBlocklyWorkspace,
} from "../../web/src/features/blockly/utils/persistence";

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

describe("Blockly workspace persistence", () => {
  it("version付きJSONとして保存して復元する", () => {
    const storage = createStorage();
    const workspace = { blocks: { languageVersion: 0, blocks: [] } };

    saveBlocklyWorkspace(storage, workspace);

    expect(loadBlocklyWorkspace(storage)).toEqual(workspace);
  });

  it("タクトスイッチとNeoPixelの有効状態を一緒に保存して復元する", () => {
    const storage = createStorage();
    const workspace = { blocks: { languageVersion: 0, blocks: [] } };

    saveBlocklyWorkspace(storage, workspace, true, true);

    expect(loadBlocklySavedState(storage)).toEqual({
      workspace,
      tactSwitchEnabled: true,
      neoPixelEnabled: true,
    });
  });

  it("NeoPixelブロックを含む旧データでは拡張を自動で有効にする", () => {
    const storage = createStorage();
    const workspace = {
      blocks: { languageVersion: 0, blocks: [{ type: "uiap_neopixel_clear" }] },
    };
    storage.setItem(BLOCKLY_STORAGE_KEY, JSON.stringify({ version: 2, workspace }));

    expect(loadBlocklySavedState(storage)).toMatchObject({
      tactSwitchEnabled: false,
      neoPixelEnabled: true,
    });
  });

  it("壊れたJSONと未知のversionを復元しない", () => {
    const storage = createStorage();
    storage.setItem(BLOCKLY_STORAGE_KEY, "not-json");
    expect(loadBlocklyWorkspace(storage)).toBeNull();
    storage.setItem(
      BLOCKLY_STORAGE_KEY,
      JSON.stringify({ version: 4, workspace: {} }),
    );
    expect(loadBlocklyWorkspace(storage)).toBeNull();
  });

  it("保存内容を削除できる", () => {
    const storage = createStorage();
    saveBlocklyWorkspace(storage, { blocks: {} });
    clearBlocklyWorkspace(storage);
    expect(loadBlocklyWorkspace(storage)).toBeNull();
  });
});
