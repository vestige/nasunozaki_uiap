export type BlocklyProjectFile = {
  format: "uiapduino-blockly-project";
  version: 1 | 2 | 3 | 4 | 5;
  savedAt: string;
  workspace: Record<string, unknown>;
  extensions?: { tactSwitch?: boolean; neoPixel?: boolean };
};
