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
      ...(options.tactSwitch ? [{ kind: "block", type: "uiap_if_button" }] : []),
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
