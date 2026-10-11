export const colorPresets = [
  ["赤", "#ff0000"], ["オレンジ", "#ff8000"], ["黄", "#ffff00"], ["緑", "#00ff00"],
  ["水色", "#00ffff"], ["青", "#0000ff"], ["紫", "#8000ff"], ["白", "#ffffff"],
] as const;

export function normalizeColor(value: unknown): string | null {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
}

export function colorToHsv(color: string) {
  const normalized = normalizeColor(color);
  if (!normalized) throw new Error("色が正しくありません。");
  const [r, g, b] = [1, 3, 5].map(offset => parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const hue = delta === 0 ? 0 : max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { hue: hue * 60, saturation: max === 0 ? 0 : delta / max * 100, value: max };
}

export function hsvToColor(hue: number, saturation: number, value = 1): string {
  if (![hue, saturation, value].every(Number.isFinite) || hue < 0 || hue > 360 || saturation < 0 || saturation > 100 || value < 0 || value > 1) throw new Error("色が正しくありません。");
  const h = (hue % 360) / 60, s = saturation / 100;
  const c = value * s, x = c * (1 - Math.abs(h % 2 - 1)), m = value - c;
  const rgb = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return "#" + rgb.map(channel => Math.round((channel + m) * 255).toString(16).padStart(2, "0")).join("");
}
