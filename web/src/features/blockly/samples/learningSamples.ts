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
          emptyForever,
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
          emptyForever,
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
            type: "uiap_on_start", x: 36, y: 36, inputs: { DO: { block: {
              type: "uiap_led", fields: { STATE: "OFF" },
            } } },
          },
          {
            type: "uiap_main_forever", x: 300, y: 36, inputs: { DO: { block: {
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
];

