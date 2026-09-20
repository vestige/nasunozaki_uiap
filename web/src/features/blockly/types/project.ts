export type BlocklyProjectFile = {
  format: "uiapduino-blockly-project";
  version: 1 | 2;
  savedAt: string;
  workspace: Record<string, unknown>;
  extensions?: { tactSwitch?: boolean };
};
