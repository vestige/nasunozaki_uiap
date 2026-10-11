export type NeoPixelPreview = { color: string; brightness: number };

// Screen swatches show the selected RGB, not a photograph of emitted light.
// Multiplying RGB by 15% makes distinct safe test colors almost black on screen.
// Keep intensity separately for the percentage label and glow instead.
export function neoPixelPreview(color: string, brightness: number): NeoPixelPreview {
  if (!/^#[0-9a-f]{6}$/i.test(color) || !Number.isFinite(brightness)) throw new Error("色と明るさをたしかめてください。");
  const level = Math.min(100, Math.max(0, brightness));
  return level === 0 || color.toLowerCase() === "#000000"
    ? { color: "#000000", brightness: 0 }
    : { color: color.toLowerCase(), brightness: level };
}

export function clearedNeoPixelPreview(): NeoPixelPreview[] {
  return Array.from({ length: 8 }, () => neoPixelPreview("#000000", 0));
}
