import { expect, it } from "vitest";
import { clearedNeoPixelPreview, neoPixelPreview } from "../../web/src/features/blockly/utils/neoPixelPreview";

it("安全な15%でも画面の色は黒くせず、明るさを別に保持する", () => {
  expect(neoPixelPreview("#35a7ff", 15)).toEqual({ color: "#35a7ff", brightness: 15 });
  expect(neoPixelPreview("#ff6688", 15)).toEqual({ color: "#ff6688", brightness: 15 });
  expect(neoPixelPreview("#35a7ff", 20)).toEqual({ color: "#35a7ff", brightness: 20 });
});

it("消灯・0%は消灯表示へ戻し、8灯の状態は独立する", () => {
  expect(neoPixelPreview("#35a7ff", 0)).toEqual({ color: "#000000", brightness: 0 });
  expect(neoPixelPreview("#000000", 15)).toEqual({ color: "#000000", brightness: 0 });
  const pixels = clearedNeoPixelPreview();
  expect(pixels).toHaveLength(8);
  pixels[0].brightness = 15;
  expect(pixels[1].brightness).toBe(0);
});
