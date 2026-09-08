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
  ]);
  registered = true;
}

export const uiapToolbox: Blockly.utils.toolbox.ToolboxDefinition = {
  kind: "flyoutToolbox",
  contents: [
    { kind: "block", type: "uiap_led" },
    { kind: "block", type: "uiap_wait" },
    { kind: "block", type: "uiap_repeat" },
  ],
};

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
