export const BLOCKLY_STORAGE_KEY = "uiapduino:blockly-workspace:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type SavedBlocklyWorkspace = {
  version: 1;
  workspace: unknown;
};

export function saveBlocklyWorkspace(storage: StorageLike, workspace: unknown) {
  const saved: SavedBlocklyWorkspace = { version: 1, workspace };
  storage.setItem(BLOCKLY_STORAGE_KEY, JSON.stringify(saved));
}

export function loadBlocklyWorkspace(storage: StorageLike): unknown | null {
  const raw = storage.getItem(BLOCKLY_STORAGE_KEY);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as Partial<SavedBlocklyWorkspace>;
    return saved.version === 1 && saved.workspace ? saved.workspace : null;
  } catch {
    return null;
  }
}

export function clearBlocklyWorkspace(storage: StorageLike) {
  storage.removeItem(BLOCKLY_STORAGE_KEY);
}
