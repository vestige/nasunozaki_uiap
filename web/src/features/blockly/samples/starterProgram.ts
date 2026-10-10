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
