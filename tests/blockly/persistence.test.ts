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
  it("圧電スピーカーの準備タブを保存し、追加・削除を復元できる", () => {
    const storage = createStorage();
    const workspace = { blocks: { languageVersion: 0, blocks: [] } };
    saveBlocklyWorkspace(storage, workspace, true, true, true);
    expect(loadBlocklySavedState(storage)).toEqual({ workspace, tactSwitchEnabled: true, neoPixelEnabled: true, piezoEnabled: true });
    saveBlocklyWorkspace(storage, workspace, true, true, false);
    expect(loadBlocklySavedState(storage)?.piezoEnabled).toBe(false);
  });

  it("圧電スピーカー情報がない旧作品では準備タブを追加しない", () => {
    const storage = createStorage();
    storage.setItem(BLOCKLY_STORAGE_KEY, JSON.stringify({ version: 5, workspace: { blocks: { blocks: [] } }, extensions: { neoPixel: true } }));
    expect(loadBlocklySavedState(storage)).toMatchObject({ piezoEnabled: false, neoPixelEnabled: true });
  });

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
      piezoEnabled: false,
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
      JSON.stringify({ version: 99, workspace: {} }),
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
