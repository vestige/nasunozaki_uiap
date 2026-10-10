import { describe, expect, it } from "vitest";
import { detectWorkspaceExtensions } from "../../web/src/features/blockly/utils/workspaceExtensions";
import { isSupportedProjectVersion, CURRENT_PROJECT_VERSION } from "../../web/src/features/blockly/types/projectSchema";

describe("workspace extension detection", () => {
  it("入れ子と次のブロックから部品を検出する", () => {
    expect(detectWorkspaceExtensions({ blocks: { blocks: [{
      type: "uiap_forever", inputs: { DO: { block: {
        type: "uiap_if_button_pressed", next: { block: { type: "uiap_neopixel_fill_brightness" } },
      } } },
    }] } })).toEqual({ tactSwitch: true, neoPixel: true });
  });
  it("変数名・コメント・フィールドの文字列をブロックと誤判定しない", () => {
    expect(detectWorkspaceExtensions({
      variables: [{ name: "uiap_if_button" }],
      blocks: { blocks: [{ type: "uiap_led", fields: { STATE: "uiap_neopixel_fill" }, comment: "uiap_if_button_pressed" }] },
    })).toEqual({ tactSwitch: false, neoPixel: false });
  });
  it("旧ブロックと空の作品も扱える", () => {
    expect(detectWorkspaceExtensions({ blocks: [{ type: "uiap_if_button" }, { type: "uiap_neopixel_set" }] })).toEqual({ tactSwitch: true, neoPixel: true });
    expect(detectWorkspaceExtensions(null)).toEqual({ tactSwitch: false, neoPixel: false });
  });
});

describe("project version policy", () => {
  it("既存バージョンを維持し、未知の形式を拒否する", () => {
    for (const version of [1, 2, 3, 4, CURRENT_PROJECT_VERSION]) expect(isSupportedProjectVersion(version)).toBe(true);
    for (const version of [0, 6, "5", undefined]) expect(isSupportedProjectVersion(version)).toBe(false);
  });
});
