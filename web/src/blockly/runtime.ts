import type { ProgramInstruction } from "./program";

export type SimulatorAdapter = {
  setLed(on: boolean): void;
  highlightBlock(blockId: string): void;
  wait(milliseconds: number, signal: AbortSignal): Promise<void>;
};

export async function runSimulatorProgram(
  instructions: ProgramInstruction[],
  adapter: SimulatorAdapter,
  signal: AbortSignal,
): Promise<void> {
  for (const instruction of instructions) {
    assertRunning(signal);
    adapter.highlightBlock(instruction.blockId);

    if (instruction.type === "led") {
      adapter.setLed(instruction.on);
      await adapter.wait(180, signal);
    } else if (instruction.type === "wait") {
      await adapter.wait(instruction.milliseconds, signal);
    } else {
      await adapter.wait(180, signal);
      for (let index = 0; index < instruction.times; index += 1) {
        await runSimulatorProgram(instruction.body, adapter, signal);
      }
    }
  }
}

function assertRunning(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("停止しました", "AbortError");
}
