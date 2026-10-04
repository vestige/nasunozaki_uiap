import * as Blockly from "blockly/core";
import * as Ja from "blockly/msg/ja";

let registered = false;

export function registerUiapBlocks() {
  if (registered) return;
  Blockly.setLocale(Ja as unknown as Record<string, string>);
  Blockly.common.defineBlocksWithJsonArray([
    {
      type: "uiap_led",
      message0: "LEDを %1",
      args0: [
        {
          type: "field_dropdown",
          name: "STATE",
          options: [
            ["つける", "ON"],
            ["けす", "OFF"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 42,
      tooltip: "ボードのLEDをつけたり、けしたりします。",
    },
    {
      type: "uiap_wait",
      message0: "%1 ミリ秒まつ",
      args0: [
        {
          type: "field_number",
          name: "MILLISECONDS",
          value: 500,
          min: 0,
          max: 5000,
          precision: 100,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 190,
      tooltip: "指定した時間だけ待ちます。",
    },
    {
      type: "uiap_repeat",
      message0: "%1 回くりかえす",
      args0: [
        {
          type: "field_number",
          name: "TIMES",
          value: 3,
          min: 1,
          max: 20,
          precision: 1,
        },
      ],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: 275,
      tooltip: "中に入れたブロックをくり返します。",
    },
    {
      type: "uiap_forever",
      message0: "ずっと",
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      colour: 275,
      tooltip: "とめるボタンを押すまで、中のブロックをくり返します。",
    },
    {
      type: "uiap_if_button",
      message0: "もし タクトスイッチが押されている なら",
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      message2: "でなければ",
      message3: "%1",
      args3: [{ type: "input_statement", name: "ELSE" }],
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: "タクトスイッチの状態で、実行するブロックを選びます。",
    },
    {
      type: "uiap_if_button_pressed",
      message0: "タクトスイッチを押したとき",
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: "押し続けても、1回だけ中のブロックを動かします。",
    },
    {
      type: "uiap_if",
      message0: "もし %1 なら",
      args0: [{ type: "input_value", name: "CONDITION", check: "Boolean" }],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      message2: "でなければ",
      message3: "%1",
      args3: [{ type: "input_statement", name: "ELSE" }],
      previousStatement: null,
      nextStatement: null,
      colour: 210,
    },
    { type: "uiap_boolean", message0: "%1", args0: [{ type: "field_dropdown", name: "VALUE", options: [["ほんとう", "TRUE"], ["ちがう", "FALSE"]] }], output: "Boolean", colour: 210 },
    { type: "uiap_number", message0: "%1", args0: [{ type: "field_number", name: "VALUE", value: 0 }], output: "Number", colour: 230 },
    { type: "uiap_variable_get", message0: "%1", args0: [{ type: "field_variable", name: "VAR", variable: "じょうたい" }], output: null, colour: 330 },
    { type: "uiap_variable_set", message0: "%1 を %2 にする", args0: [{ type: "field_variable", name: "VAR", variable: "じょうたい" }, { type: "input_value", name: "VALUE" }], previousStatement: null, nextStatement: null, colour: 330 },
    { type: "uiap_not", message0: "%1 ではない", args0: [{ type: "input_value", name: "VALUE", check: "Boolean" }], output: "Boolean", colour: 210 },
    { type: "uiap_compare", message0: "%1 %2 %3", args0: [{ type: "input_value", name: "LEFT" }, { type: "field_dropdown", name: "OP", options: [["＝", "EQ"], ["≠", "NEQ"], ["＜", "LT"], ["≤", "LTE"], ["＞", "GT"], ["≥", "GTE"]] }, { type: "input_value", name: "RIGHT" }], output: "Boolean", colour: 210 },
    { type: "uiap_logic", message0: "%1 %2 %3", args0: [{ type: "input_value", name: "LEFT", check: "Boolean" }, { type: "field_dropdown", name: "OP", options: [["かつ", "AND"], ["または", "OR"]] }, { type: "input_value", name: "RIGHT", check: "Boolean" }], output: "Boolean", colour: 210 },
    {
      type: "uiap_neopixel_fill",
      message0: "NeoPixelを全部 %1 で 明るさ %2 % で光らせる",
      args0: [
        { type: "field_dropdown", name: "COLOR", options: neoPixelColorOptions() },
        { type: "field_number", name: "BRIGHTNESS", value: 20, min: 1, max: 100, precision: 1 },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 330,
      tooltip: "8個のNeoPixelを同じ色で光らせます。",
    },
    {
      type: "uiap_neopixel_set",
      message0: "NeoPixelの %1 番を %2 で 明るさ %3 % で光らせる",
      args0: [
        { type: "field_number", name: "PIXEL", value: 1, min: 1, max: 8, precision: 1 },
        { type: "field_dropdown", name: "COLOR", options: neoPixelColorOptions() },
        { type: "field_number", name: "BRIGHTNESS", value: 20, min: 1, max: 100, precision: 1 },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 330,
      tooltip: "選んだ番号のNeoPixelだけを光らせます。番号は1から8です。",
    },
    {
      type: "uiap_neopixel_clear",
      message0: "NeoPixelを全部消す",
      previousStatement: null,
      nextStatement: null,
      colour: 330,
      tooltip: "8個のNeoPixelを全部消します。",
    },
  ]);
  registered = true;
}

const baseBlocks: Blockly.utils.toolbox.ToolboxItemInfo[] = [
  { kind: "block", type: "uiap_led" },
  { kind: "block", type: "uiap_wait" },
  { kind: "block", type: "uiap_repeat" },
  { kind: "block", type: "uiap_forever" },
  { kind: "block", type: "uiap_if" },
  { kind: "block", type: "uiap_variable_set" },
  { kind: "block", type: "uiap_variable_get" },
  { kind: "block", type: "uiap_boolean" },
  { kind: "block", type: "uiap_number" },
  { kind: "block", type: "uiap_compare" },
  { kind: "block", type: "uiap_logic" },
  { kind: "block", type: "uiap_not" },
];

export const uiapToolbox: Blockly.utils.toolbox.ToolboxDefinition = {
  kind: "flyoutToolbox",
  contents: baseBlocks,
};

export const tactSwitchToolbox: Blockly.utils.toolbox.ToolboxDefinition = {
  kind: "flyoutToolbox",
    contents: [
      ...baseBlocks,
      { kind: "block", type: "uiap_if_button" },
      { kind: "block", type: "uiap_if_button_pressed" },
  ],
};

const neoPixelBlocks: Blockly.utils.toolbox.ToolboxItemInfo[] = [
  { kind: "block", type: "uiap_neopixel_fill" },
  { kind: "block", type: "uiap_neopixel_set" },
  { kind: "block", type: "uiap_neopixel_clear" },
];

export function createUiapToolbox(options: { tactSwitch: boolean; neoPixel: boolean }) {
  return {
    kind: "flyoutToolbox",
    contents: [
      ...baseBlocks,
      ...(options.tactSwitch ? [{ kind: "block", type: "uiap_if_button" }, { kind: "block", type: "uiap_if_button_pressed" }] : []),
      ...(options.neoPixel ? neoPixelBlocks : []),
    ],
  } satisfies Blockly.utils.toolbox.ToolboxDefinition;
}

function neoPixelColorOptions(): [string, string][] {
  return [
    ["赤", "#ff0000"],
    ["オレンジ", "#ff8000"],
    ["黄", "#ffff00"],
    ["緑", "#00ff00"],
    ["水色", "#00ffff"],
    ["青", "#0000ff"],
    ["紫", "#8000ff"],
    ["白", "#ffffff"],
  ];
}

export const starterProgram = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: "uiap_repeat",
        x: 36,
        y: 36,
        fields: { TIMES: 3 },
        inputs: {
          DO: {
            block: {
              type: "uiap_led",
              fields: { STATE: "ON" },
              next: {
                block: {
                  type: "uiap_wait",
                  fields: { MILLISECONDS: 500 },
                  next: {
                    block: {
                      type: "uiap_led",
                      fields: { STATE: "OFF" },
                      next: {
                        block: {
                          type: "uiap_wait",
                          fields: { MILLISECONDS: 500 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ],
  },
};
