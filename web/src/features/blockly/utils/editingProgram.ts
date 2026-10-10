import type * as Blockly from "blockly/core";
import { compileWorkspace } from "./program";
import type { ProgramInstruction } from "../types/program";

export type EditingProgram = {
  instructions: ProgramInstruction[];
  error: string | null;
};

// An unfinished workspace is still a saveable project, but must never reuse
// the instructions from the last successfully compiled edit.
export function inspectEditingProgram(workspace: Blockly.Workspace): EditingProgram {
  try {
    return { instructions: compileWorkspace(workspace), error: null };
  } catch (error) {
    return {
      instructions: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
