// Inspect block types, not arbitrary strings in variable names or comments.
export function detectWorkspaceExtensions(workspace: unknown) {
  const extensions = { tactSwitch: false, neoPixel: false };
  const pending: unknown[] = [workspace];
  const visited = new Set<object>();
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== "object" || visited.has(value)) continue;
    visited.add(value);
    if (Array.isArray(value)) {
      pending.push(...value);
      continue;
    }
    const node = value as Record<string, unknown>;
    if (node.type === "uiap_if_button" || node.type === "uiap_if_button_pressed") extensions.tactSwitch = true;
    if (typeof node.type === "string" && node.type.startsWith("uiap_neopixel_")) extensions.neoPixel = true;
    pending.push(...Object.values(node));
  }
  return extensions;
}

export function hasTactSwitchBlock(workspace: unknown) {
  return detectWorkspaceExtensions(workspace).tactSwitch;
}

export function hasNeoPixelBlock(workspace: unknown) {
  return detectWorkspaceExtensions(workspace).neoPixel;
}
