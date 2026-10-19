import * as Blockly from "blockly/core";

export function attachToProgram(
  workspace: Blockly.Workspace,
  block: Blockly.Block,
  section: "start" | "forever" = "start",
) {
  const container = workspace.newBlock(section === "start" ? "uiap_on_start" : "uiap_main_forever");
  container.getInput("DO")!.connection!.connect(block.previousConnection!);
  return container;
}

export function programState(block: Record<string, unknown>, section: "start" | "forever" = "start") {
  return {
    blocks: {
      languageVersion: 0,
      blocks: [{
        type: section === "start" ? "uiap_on_start" : "uiap_main_forever",
        inputs: { DO: { block } },
      }],
    },
  };
}
