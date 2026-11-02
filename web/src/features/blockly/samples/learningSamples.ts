import type { ProjectExtensions } from "../types/projectSchema";

export const learningSampleCategories = [
  "きほん",
  "くりかえし",
  "もし・くらべる",
  "おぼえる",
  "タクトスイッチ",
  "NeoPixel",
  "音",
] as const;

export type LearningSampleCategory = (typeof learningSampleCategories)[number];

export type LearningSample = {
  id: string;
  category: LearningSampleCategory;
  name: string;
  description: string;
  parts: string;
  worksOn: string;
  workspace: Record<string, unknown>;
  extensions: ProjectExtensions;
};

const emptyForever = { type: "uiap_main_forever", x: 300, y: 36 };

export const blankProgram = {
  blocks: {
    languageVersion: 0,
    blocks: [
      { type: "uiap_on_start", x: 36, y: 36 },
      emptyForever,
    ],
  },
};

export const learningSamples: LearningSample[] = [
  {
    id: "basic-led-on-wait-off",
    category: "きほん",
    name: "LEDをつけて、まって、けす",
    description: "LEDを1秒つけてから消します。命令を上から順番に動かしてみよう。",
    parts: "UIAPduinoだけ",
    worksOn: "画面・ボード",
    extensions: {},
    workspace: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: "uiap_on_start", x: 36, y: 36, inputs: { DO: { block: {
              type: "uiap_led", fields: { STATE: "ON" }, next: { block: {
                type: "uiap_wait", fields: { MILLISECONDS: 1000 }, next: { block: {
                  type: "uiap_led", fields: { STATE: "OFF" },
                } },
              } },
            } } },
          },
        ],
      },
    },
  },
  {
    id: "repeat-led-three-times",
    category: "くりかえし",
    name: "LEDを3回点滅",
    description: "同じ命令を3回くりかえして、LEDを点滅させます。",
    parts: "UIAPduinoだけ",
    worksOn: "画面・ボード",
    extensions: {},
    workspace: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: "uiap_on_start", x: 36, y: 36, inputs: { DO: { block: {
              type: "uiap_repeat", fields: { TIMES: 3 }, inputs: { DO: { block: {
                type: "uiap_led", fields: { STATE: "ON" }, next: { block: {
                  type: "uiap_wait", fields: { MILLISECONDS: 500 }, next: { block: {
                    type: "uiap_led", fields: { STATE: "OFF" }, next: { block: {
                      type: "uiap_wait", fields: { MILLISECONDS: 500 },
                    } },
                  } },
                } },
              } } },
            } } },
          },
        ],
      },
    },
  },
  {
    id: "forever-led-blink",
    category: "くりかえし",
    name: "LEDをずっと点滅",
    description: "とめるまで、LEDをつけたり消したりします。",
    parts: "UIAPduinoだけ",
    worksOn: "画面・ボード",
    extensions: {},
    workspace: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: "uiap_main_forever", x: 36, y: 36, inputs: { DO: { block: {
              type: "uiap_led", fields: { STATE: "ON" }, next: { block: {
                type: "uiap_wait", fields: { MILLISECONDS: 500 }, next: { block: {
                  type: "uiap_led", fields: { STATE: "OFF" }, next: { block: {
                    type: "uiap_wait", fields: { MILLISECONDS: 500 },
                  } },
                } },
              } },
            } } },
          },
        ],
      },
    },
  },
  {
    id: "condition-compare-numbers",
    category: "もし・くらべる",
    name: "数をくらべてLEDをつける",
    description: "5と3をくらべて、5のほうが大きければLEDをつけます。条件で動きを分けてみよう。",
    parts: "UIAPduinoだけ",
    worksOn: "画面・ボード",
    extensions: {},
    workspace: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: "uiap_on_start", x: 36, y: 36, inputs: { DO: { block: {
              type: "uiap_if", inputs: {
                CONDITION: { block: {
                  type: "uiap_compare", fields: { OP: "GT" }, inputs: {
                    LEFT: { block: { type: "uiap_number", fields: { VALUE: 5 } } },
                    RIGHT: { block: { type: "uiap_number", fields: { VALUE: 3 } } },
                  },
                } },
                DO: { block: { type: "uiap_led", fields: { STATE: "ON" } } },
                ELSE: { block: { type: "uiap_led", fields: { STATE: "OFF" } } },
              },
            } } },
          },
        ],
      },
    },
  },
  {
    id: "variable-timed-light-toggle",
    category: "おぼえる",
    name: "覚えながら3秒ごとに点灯・消灯",
    description: "はじめに2回点滅し、そのあとはLEDの状態を覚えながら、3秒ごとにつけたり消したりします。",
    parts: "UIAPduinoだけ",
    worksOn: "画面・ボード",
    extensions: {},
    workspace: {
      variables: [{ name: "ひかる", id: "sample-light-state" }],
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: "uiap_on_start",
            x: 36,
            y: 36,
            inputs: {
              DO: {
                block: {
                  type: "uiap_repeat",
                  fields: { TIMES: 2 },
                  inputs: {
                    DO: {
                      block: {
                        type: "uiap_led", fields: { STATE: "ON" }, next: { block: {
                          type: "uiap_wait", fields: { MILLISECONDS: 300 }, next: { block: {
                            type: "uiap_led", fields: { STATE: "OFF" }, next: { block: {
                              type: "uiap_wait", fields: { MILLISECONDS: 300 },
                            } },
                          } },
                        } },
                      },
                    },
                  },
                  next: {
                    block: {
                      type: "uiap_variable_set",
                      fields: { VAR: { id: "sample-light-state" } },
                      inputs: { VALUE: { block: { type: "uiap_boolean", fields: { VALUE: "FALSE" } } } },
                    },
                  },
                },
              },
            },
          },
          {
            type: "uiap_main_forever",
            x: 300,
            y: 36,
            inputs: {
              DO: {
                block: {
                  type: "uiap_wait",
                  fields: { MILLISECONDS: 3000 },
                  next: {
                    block: {
                      type: "uiap_if",
                      inputs: {
                        CONDITION: { block: { type: "uiap_variable_get", fields: { VAR: { id: "sample-light-state" } } } },
                        DO: { block: {
                          type: "uiap_led", fields: { STATE: "OFF" }, next: { block: {
                            type: "uiap_variable_set", fields: { VAR: { id: "sample-light-state" } }, inputs: {
                              VALUE: { block: { type: "uiap_boolean", fields: { VALUE: "FALSE" } } },
                            },
                          } },
                        } },
                        ELSE: { block: {
                          type: "uiap_led", fields: { STATE: "ON" }, next: { block: {
                            type: "uiap_variable_set", fields: { VAR: { id: "sample-light-state" } }, inputs: {
                              VALUE: { block: { type: "uiap_boolean", fields: { VALUE: "TRUE" } } },
                            },
                          } },
                        } },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    },
  },
];

