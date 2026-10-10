export type ProgramValue =
  | { type: "arithmetic"; op: "ADD" | "SUB"; left: ProgramValue; right: ProgramValue }
  | { type: "boolean"; value: boolean }
  | { type: "number"; value: number }
  | { type: "variable"; id: string }
  | { type: "not"; value: ProgramValue }
  | { type: "compare"; op: "EQ" | "NEQ" | "LT" | "LTE" | "GT" | "GTE"; left: ProgramValue; right: ProgramValue }
  | { type: "logic"; op: "AND" | "OR"; left: ProgramValue; right: ProgramValue };

export type ProgramInstruction =
  | { type: "neoPixelLightValue"; pixel: ProgramValue | null; color: string; brightness: ProgramValue; blockId: string }
  | { type: "neoPixelSetValue"; pixel: ProgramValue; color: string; brightness: number; blockId: string }
  | { type: "setVariable"; id: string; value: ProgramValue; blockId: string }
  | { type: "if"; condition: ProgramValue; body: ProgramInstruction[]; elseBody: ProgramInstruction[]; blockId: string }
  | { type: "ifButtonPressed"; body: ProgramInstruction[]; blockId: string }
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
