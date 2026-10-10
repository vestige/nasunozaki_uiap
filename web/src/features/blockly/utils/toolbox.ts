import type * as Blockly from "blockly/core";

const category = (name: string, colour: string, types: string[]) => ({
  kind: "category" as const,
  name,
  colour,
  contents: types.map((type) => ({ kind: "block" as const, type,
    ...(type === "uiap_neopixel_fill_brightness" || type === "uiap_neopixel_set_brightness" ? { inputs: {
      BRIGHTNESS: { shadow: { type: "uiap_number", fields: { VALUE: 20 } } },
      ...(type === "uiap_neopixel_set_brightness" ? { PIXEL: { shadow: { type: "uiap_number", fields: { VALUE: 1 } } } } : {}),
    } } : type === "uiap_neopixel_set_value" ? { inputs: { PIXEL: { shadow: { type: "uiap_number", fields: { VALUE: 1 } } } } }
      : type === "uiap_arithmetic" ? { inputs: {
        LEFT: { shadow: { type: "uiap_number", fields: { VALUE: 0 } } },
        RIGHT: { shadow: { type: "uiap_number", fields: { VALUE: 1 } } },
      } } : {}),
  })),
});

export function createUiapToolbox(options: { tactSwitch: boolean; neoPixel: boolean }): Blockly.utils.toolbox.ToolboxDefinition {
  return {
    kind: "categoryToolbox",
    contents: [
      category("きほん", "#b09a58", ["uiap_led", "uiap_wait"]),
      category("くりかえし", "#8557a4", ["uiap_repeat", "uiap_forever"]),
      category("もし・くらべる", "#547ea2", ["uiap_if", "uiap_boolean", "uiap_number", "uiap_compare", "uiap_logic", "uiap_not"]),
      category("おぼえる", "#a25780", ["uiap_variable_set", "uiap_variable_get", "uiap_number", "uiap_arithmetic"]),
      ...(options.tactSwitch || options.neoPixel ? [{ kind: "sep" as const }] : []),
      ...(options.tactSwitch ? [category("タクトスイッチ", "#65885d", ["uiap_if_button", "uiap_if_button_pressed"])] : []),
      ...(options.neoPixel ? [category("NeoPixel", "#a25780", ["uiap_neopixel_fill_brightness", "uiap_neopixel_set_brightness", "uiap_neopixel_clear"])] : []),
    ],
  };
}

export const uiapToolbox = createUiapToolbox({ tactSwitch: false, neoPixel: false });
