export const BLOCKLY_STORAGE_KEY = "uiapduino:blockly-workspace:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type SavedBlocklyWorkspace = {
  version: 1 | 2;
  workspace: unknown;
  extensions?: { tactSwitch?: boolean };
};

export type BlocklySavedState = { workspace: unknown; tactSwitchEnabled: boolean };

export function saveBlocklyWorkspace(storage: StorageLike, workspace: unknown, tactSwitchEnabled = false) {
  const saved: SavedBlocklyWorkspace = { version: 2, workspace, extensions: { tactSwitch: tactSwitchEnabled } };
  storage.setItem(BLOCKLY_STORAGE_KEY, JSON.stringify(saved));
}

export function loadBlocklyWorkspace(storage: StorageLike): unknown | null {
  return loadBlocklySavedState(storage)?.workspace ?? null;
}

export function loadBlocklySavedState(storage: StorageLike): BlocklySavedState | null {
  const raw = storage.getItem(BLOCKLY_STORAGE_KEY);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as Partial<SavedBlocklyWorkspace>;
    if ((saved.version !== 1 && saved.version !== 2) || !saved.workspace) return null;
    return { workspace: saved.workspace, tactSwitchEnabled: saved.extensions?.tactSwitch === true || hasTactSwitchBlock(saved.workspace) };
  } catch {
    return null;
  }
}

export function hasTactSwitchBlock(workspace: unknown) {
  return JSON.stringify(workspace).includes("uiap_if_button");
}

export function clearBlocklyWorkspace(storage: StorageLike) {
  storage.removeItem(BLOCKLY_STORAGE_KEY);
}
