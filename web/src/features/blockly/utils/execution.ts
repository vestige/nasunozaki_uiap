import type { ProgramInstruction } from "./program";
import type { BoardAdapter, ExecutionObserver } from "../types/execution";

const FOREVER_LOOP_INTERVAL_MS = 50;

export async function runProgram(
  instructions: ProgramInstruction[],
  board: BoardAdapter,
  signal: AbortSignal,
  observer: ExecutionObserver = {},
): Promise<void> {
  for (const instruction of instructions) {
    assertRunning(signal);
    observer.onInstruction?.(instruction.blockId);

    if (instruction.type === "led") {
      await board.setLed(instruction.on);
      await board.wait(180, signal);
    } else if (instruction.type === "wait") {
      await board.wait(instruction.milliseconds, signal);
    } else if (instruction.type === "repeat") {
      await board.wait(180, signal);
      for (let index = 0; index < instruction.times; index += 1) {
        await runProgram(instruction.body, board, signal, observer);
      }
    } else if (instruction.type === "forever") {
      await board.wait(180, signal);
      while (true) {
        assertRunning(signal);
        await runProgram(instruction.body, board, signal, observer);
        await board.wait(FOREVER_LOOP_INTERVAL_MS, signal);
      }
    } else {
      if (!board.isButtonPressed) {
        throw new Error("この実行先ではタクトスイッチを使えません。");
      }
      const pressed = await board.isButtonPressed();
      await board.wait(180, signal);
      await runProgram(
        pressed ? instruction.body : instruction.elseBody,
        board,
        signal,
        observer,
      );
    }
  }
}

function assertRunning(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("停止しました", "AbortError");
}
