import { migrateWorkspace } from "./migrateWorkspace";
export const BLOCKLY_STORAGE_KEY = "uiapduino:blockly-workspace:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type SavedBlocklyWorkspace = {
  version: 1 | 2 | 3 | 4;
  workspace: unknown;
  extensions?: { tactSwitch?: boolean; neoPixel?: boolean };
};

export type BlocklySavedState = {
  workspace: unknown;
  tactSwitchEnabled: boolean;
  neoPixelEnabled: boolean;
};

export function saveBlocklyWorkspace(
  storage: StorageLike,
  workspace: unknown,
  tactSwitchEnabled = false,
  neoPixelEnabled = false,
) {
  const saved: SavedBlocklyWorkspace = {
    version: 4,
    workspace,
    extensions: { tactSwitch: tactSwitchEnabled, neoPixel: neoPixelEnabled },
  };
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
    if ((saved.version !== 1 && saved.version !== 2 && saved.version !== 3 && saved.version !== 4) || !saved.workspace) return null;
    return {
      workspace: migrateWorkspace(saved.workspace),
      tactSwitchEnabled: saved.extensions?.tactSwitch === true || hasTactSwitchBlock(saved.workspace),
      neoPixelEnabled: saved.extensions?.neoPixel === true || hasNeoPixelBlock(saved.workspace),
    };
  } catch {
    return null;
  }
}

export function hasTactSwitchBlock(workspace: unknown) {
  return JSON.stringify(workspace).includes("uiap_if_button");
}

export function hasNeoPixelBlock(workspace: unknown) {
  return JSON.stringify(workspace).includes("uiap_neopixel_");
}

export function clearBlocklyWorkspace(storage: StorageLike) {
  storage.removeItem(BLOCKLY_STORAGE_KEY);
}
