import { migrateWorkspace } from "./migrateWorkspace";
import { detectWorkspaceExtensions } from "./workspaceExtensions";
import { CURRENT_PROJECT_VERSION, isSupportedProjectVersion, type ProjectVersion, type ProjectExtensions } from "../types/projectSchema";
export { hasTactSwitchBlock, hasNeoPixelBlock } from "./workspaceExtensions";
export const BLOCKLY_STORAGE_KEY = "uiapduino:blockly-workspace:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type SavedBlocklyWorkspace = {
  version: ProjectVersion;
  workspace: unknown;
  extensions?: ProjectExtensions;
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
    version: CURRENT_PROJECT_VERSION,
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
    if (!isSupportedProjectVersion(saved.version) || !saved.workspace) return null;
    const detected = detectWorkspaceExtensions(saved.workspace);
    return {
      workspace: migrateWorkspace(saved.workspace),
      tactSwitchEnabled: saved.extensions?.tactSwitch === true || detected.tactSwitch,
      neoPixelEnabled: saved.extensions?.neoPixel === true || detected.neoPixel,
    };
  } catch {
    return null;
  }
}

export function clearBlocklyWorkspace(storage: StorageLike) {
  storage.removeItem(BLOCKLY_STORAGE_KEY);
}
