import { describe, expect, it } from "vitest";
import {
  BLOCKLY_STORAGE_KEY,
  clearBlocklyWorkspace,
  loadBlocklyWorkspace,
  saveBlocklyWorkspace,
} from "./persistence";

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

  it("壊れたJSONと未知のversionを復元しない", () => {
    const storage = createStorage();
    storage.setItem(BLOCKLY_STORAGE_KEY, "not-json");
    expect(loadBlocklyWorkspace(storage)).toBeNull();
    storage.setItem(
      BLOCKLY_STORAGE_KEY,
      JSON.stringify({ version: 2, workspace: {} }),
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
