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
  {
    id: "tact-switch-hold-led",
    category: "タクトスイッチ",
    name: "押している間だけLEDをつける",
    description: "タクトスイッチを押している間はLEDがつき、離すと消えます。押している状態を使ってみよう。",
    parts: "UIAPduino・タクトスイッチ",
    worksOn: "画面・ボード",
    extensions: { tactSwitch: true },
    workspace: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: "uiap_main_forever", x: 36, y: 36, inputs: { DO: { block: {
              type: "uiap_if_button", inputs: {
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
    id: "tact-switch-press-toggle-led",
    category: "タクトスイッチ",
    name: "押すたびにLEDを切り替える",
    description: "タクトスイッチを1回押すたびに、LEDの点灯と消灯を切り替えます。押した瞬間を使ってみよう。",
    parts: "UIAPduino・タクトスイッチ",
    worksOn: "画面・ボード",
    extensions: { tactSwitch: true },
    workspace: {
      variables: [{ name: "ひかる", id: "sample-button-light-state" }],
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: "uiap_on_start", x: 36, y: 36, inputs: { DO: { block: {
              type: "uiap_variable_set", fields: { VAR: { id: "sample-button-light-state" } }, inputs: {
                VALUE: { block: { type: "uiap_boolean", fields: { VALUE: "FALSE" } } },
              },
            } } },
          },
          {
            type: "uiap_main_forever", x: 300, y: 36, inputs: { DO: { block: {
              type: "uiap_if_button_pressed", inputs: { DO: { block: {
                type: "uiap_if", inputs: {
                  CONDITION: { block: { type: "uiap_variable_get", fields: { VAR: { id: "sample-button-light-state" } } } },
                  DO: { block: {
                    type: "uiap_led", fields: { STATE: "OFF" }, next: { block: {
                      type: "uiap_variable_set", fields: { VAR: { id: "sample-button-light-state" } }, inputs: {
                        VALUE: { block: { type: "uiap_boolean", fields: { VALUE: "FALSE" } } },
                      },
                    } },
                  } },
                  ELSE: { block: {
                    type: "uiap_led", fields: { STATE: "ON" }, next: { block: {
                      type: "uiap_variable_set", fields: { VAR: { id: "sample-button-light-state" } }, inputs: {
                        VALUE: { block: { type: "uiap_boolean", fields: { VALUE: "TRUE" } } },
                      },
                    } },
                  } },
                },
              } } },
            } } },
          },
        ],
      },
    },
  },
  {
    id: "neopixel-fill-then-clear",
    category: "NeoPixel",
    name: "全部を同じ色で光らせる",
    description: "8個のNeoPixelを水色で光らせ、1秒待ってから全部消します。色と明るさを変えてみよう。",
    parts: "UIAPduino・NeoPixel",
    worksOn: "画面・ボード",
    extensions: { neoPixel: true },
    workspace: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: "uiap_on_start", x: 36, y: 36, inputs: { DO: { block: {
              type: "uiap_neopixel_fill_color", inputs: {
                COLOR: { block: { type: "uiap_color", fields: { COLOR: "#00aaff" } } },
                BRIGHTNESS: { block: { type: "uiap_number", fields: { VALUE: 20 } } },
              }, next: { block: {
                type: "uiap_wait", fields: { MILLISECONDS: 1000 }, next: { block: {
                  type: "uiap_neopixel_clear",
                } },
              } },
            } } },
          },
        ],
      },
    },
  },
  {
    id: "neopixel-moving-light",
    category: "NeoPixel",
    name: "1番から8番へ光を動かす",
    description: "光らせる番号を1つずつ増やして、紫の光を1番から8番まで動かします。",
    parts: "UIAPduino・NeoPixel",
    worksOn: "画面・ボード",
    extensions: { neoPixel: true },
    workspace: {
      variables: [{ name: "ばんごう", id: "sample-neopixel-index" }],
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: "uiap_on_start", x: 36, y: 36, inputs: { DO: { block: {
              type: "uiap_variable_set", fields: { VAR: { id: "sample-neopixel-index" } }, inputs: {
                VALUE: { block: { type: "uiap_number", fields: { VALUE: 1 } } },
              }, next: { block: {
                type: "uiap_repeat", fields: { TIMES: 8 }, inputs: { DO: { block: {
                  type: "uiap_neopixel_clear", next: { block: {
                    type: "uiap_neopixel_set_color", inputs: {
                      PIXEL: { block: { type: "uiap_variable_get", fields: { VAR: { id: "sample-neopixel-index" } } } },
                      COLOR: { block: { type: "uiap_color", fields: { COLOR: "#aa00ff" } } },
                      BRIGHTNESS: { block: { type: "uiap_number", fields: { VALUE: 20 } } },
                    }, next: { block: {
                      type: "uiap_wait", fields: { MILLISECONDS: 300 }, next: { block: {
                        type: "uiap_variable_set", fields: { VAR: { id: "sample-neopixel-index" } }, inputs: {
                          VALUE: { block: {
                            type: "uiap_arithmetic", fields: { OP: "ADD" }, inputs: {
                              LEFT: { block: { type: "uiap_variable_get", fields: { VAR: { id: "sample-neopixel-index" } } } },
                              RIGHT: { block: { type: "uiap_number", fields: { VALUE: 1 } } },
                            },
                          } },
                        },
                      } },
                    } },
                  } },
                } } }, next: { block: {
                  type: "uiap_neopixel_clear",
                } },
              } },
            } } },
          },
        ],
      },
    },
  },
];

