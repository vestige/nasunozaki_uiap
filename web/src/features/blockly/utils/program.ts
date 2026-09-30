import * as Blockly from "blockly/core";

export type ProgramInstruction =
  | { type: "led"; on: boolean; blockId: string }
  | { type: "neoPixelFill"; color: string; brightness: number; blockId: string }
  | { type: "neoPixelSet"; index: number; color: string; brightness: number; blockId: string }
  | { type: "neoPixelClear"; blockId: string }
  | { type: "wait"; milliseconds: number; blockId: string }
  | {
      type: "repeat";
      times: number;
      body: ProgramInstruction[];
      blockId: string;
    }
  | {
      type: "forever";
      body: ProgramInstruction[];
      blockId: string;
    }
  | {
      type: "ifButton";
      body: ProgramInstruction[];
      elseBody: ProgramInstruction[];
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
    } else if (block.type === "uiap_neopixel_fill") {
      instructions.push({
        type: "neoPixelFill",
        color: normalizeColor(block.getFieldValue("COLOR")),
        brightness: clampNumber(block.getFieldValue("BRIGHTNESS"), 1, 100),
        blockId: block.id,
      });
    } else if (block.type === "uiap_neopixel_set") {
      instructions.push({
        type: "neoPixelSet",
        index: clampNumber(block.getFieldValue("PIXEL"), 1, 8) - 1,
        color: normalizeColor(block.getFieldValue("COLOR")),
        brightness: clampNumber(block.getFieldValue("BRIGHTNESS"), 1, 100),
        blockId: block.id,
      });
    } else if (block.type === "uiap_neopixel_clear") {
      instructions.push({ type: "neoPixelClear", blockId: block.id });
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
    } else if (block.type === "uiap_forever") {
      instructions.push({
        type: "forever",
        body: compileChain(block.getInputTargetBlock("DO")),
        blockId: block.id,
      });
    } else if (block.type === "uiap_if_button") {
      instructions.push({
        type: "ifButton",
        body: compileChain(block.getInputTargetBlock("DO")),
        elseBody: compileChain(block.getInputTargetBlock("ELSE")),
        blockId: block.id,
      });
    }
  }
  return instructions;
}

function normalizeColor(value: unknown) {
  const color = String(value).toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : "#ff0000";
}

function clampNumber(value: unknown, minimum: number, maximum: number) {
  const number = Number(value);
  return Math.min(
    maximum,
    Math.max(minimum, Number.isFinite(number) ? number : minimum),
  );
}
