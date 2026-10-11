import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TactSwitchWiringGuide } from "../../web/src/features/blockly/components/TactSwitchWiringGuide";
import { NeoPixelWiringGuide } from "../../web/src/features/blockly/components/NeoPixelWiringGuide";
import { PiezoSetupGuide } from "../../web/src/features/blockly/components/PiezoSetupGuide";

describe("wiring guides", () => {
  it("shows the non-polar piezo on separate breadboard rows with D6 and a series resistor", () => {
    const html = renderToStaticMarkup(createElement(PiezoSetupGuide));
    expect(html).toContain("ブレッドボード");
    expect(html).toContain("PC4 / D6");
    expect(html).toContain("1kΩ");
    expect(html).toContain("つながっていない別々の横一列");
    expect(html).toContain("足の向きはどちらでもOK");
    expect(html).not.toContain("プラス側");
    expect(html).not.toContain("＋");
    expect(html.match(/配線する前に、USBを抜いてください。/g)).toHaveLength(1);
  });
  it("keeps the tact switch instructions and pin labels together", () => {
    const html = renderToStaticMarkup(createElement(TactSwitchWiringGuide));
    expect(html).toContain("中央の溝");
    expect(html).toContain("PC3 / D5");
    expect(html).toContain("黒い線をGNDへ");
    expect(html).toContain("青い線をD5へ");
    expect(html.match(/配線する前に、USBを抜いてください。/g)).toHaveLength(1);
  });

  it("shows the NeoPixel input terminals and a single safety warning", () => {
    const html = renderToStaticMarkup(createElement(NeoPixelWiringGuide));
    expect(html).toContain("入力側（1番側）");
    expect(html).toContain("PC6 / D8");
    expect(html).toContain("DIN");
    expect(html).toContain("1→8");
    expect(html.match(/配線する前に、USBを抜いてください。/g)).toHaveLength(1);
  });
});
