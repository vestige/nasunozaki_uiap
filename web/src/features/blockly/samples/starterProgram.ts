export const starterProgram = {
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
              type: "uiap_led",
              fields: { STATE: "OFF" },
            },
          },
        },
      },
      {
        type: "uiap_main_forever",
        x: 300,
        y: 36,
        inputs: { DO: { block: {
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
};
