import * as Blockly from "blockly/core";

export type ProgramInstruction =
  | { type: "led"; on: boolean; blockId: string }
  | { type: "wait"; milliseconds: number; blockId: string }
  | {
      type: "repeat";
      times: number;
      body: ProgramInstruction[];
      blockId: string;
    };

export function compileWorkspace(
  workspace: Blockly.Workspace,
): ProgramInstruction[] {
  const first = workspace.getTopBlocks(true)[0];
  return first ? compileChain(first) : [];
}

function compileChain(first: Blockly.Block | null): ProgramInstruction[] {
  const instructions: ProgramInstruction[] = [];
  for (let block = first; block; block = block.getNextBlock()) {
    if (block.type === "uiap_led") {
      instructions.push({
        type: "led",
        on: block.getFieldValue("STATE") === "ON",
        blockId: block.id,
      });
    } else if (block.type === "uiap_wait") {
      instructions.push({
        type: "wait",
        milliseconds: clampNumber(block.getFieldValue("MILLISECONDS"), 0, 5000),
        blockId: block.id,
      });
    } else if (block.type === "uiap_repeat") {
      instructions.push({
        type: "repeat",
        times: clampNumber(block.getFieldValue("TIMES"), 1, 20),
        body: compileChain(block.getInputTargetBlock("DO")),
        blockId: block.id,
      });
    }
  }
  return instructions;
}

function clampNumber(value: unknown, minimum: number, maximum: number) {
  const number = Number(value);
  return Math.min(
    maximum,
    Math.max(minimum, Number.isFinite(number) ? number : minimum),
  );
}
