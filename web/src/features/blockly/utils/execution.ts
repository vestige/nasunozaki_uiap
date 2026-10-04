import type { ProgramInstruction, ProgramValue } from "./program";
import type { BoardAdapter, ExecutionObserver } from "../types/execution";

const FOREVER_LOOP_INTERVAL_MS = 50;

export async function runProgram(
  instructions: ProgramInstruction[],
  board: BoardAdapter,
  signal: AbortSignal,
  observer: ExecutionObserver = {},
): Promise<void> {
  await runInstructions(instructions, board, signal, observer, new Map());
}

async function runInstructions(
  instructions: ProgramInstruction[],
  board: BoardAdapter,
  signal: AbortSignal,
  observer: ExecutionObserver,
  variables: Map<string, boolean | number>,
): Promise<void> {
  for (const instruction of instructions) {
    assertRunning(signal);
    observer.onInstruction?.(instruction.blockId);

    if (instruction.type === "setVariable") {
      variables.set(instruction.id, evaluateValue(instruction.value, variables));
    } else if (instruction.type === "if") {
      const condition = evaluateValue(instruction.condition, variables);
      if (typeof condition !== "boolean") throw new Error("条件には、ほんとう／ちがうを入れてください。");
      await runInstructions(condition ? instruction.body : instruction.elseBody, board, signal, observer, variables);
    } else if (instruction.type === "ifButtonPressed") {
      if (!board.consumeButtonPress) throw new Error("この実行先ではタクトスイッチを使えません。");
      if (await board.consumeButtonPress()) await runInstructions(instruction.body, board, signal, observer, variables);
    } else if (instruction.type === "led") {
      await board.setLed(instruction.on);
      await board.wait(180, signal);
    } else if (instruction.type === "neoPixelFill") {
      if (!board.fillNeoPixels) throw new Error("この実行先ではNeoPixelを使えません。");
      await board.fillNeoPixels(instruction.color, instruction.brightness);
      await board.wait(180, signal);
    } else if (instruction.type === "neoPixelSet") {
      if (!board.setNeoPixel) throw new Error("この実行先ではNeoPixelを使えません。");
      await board.setNeoPixel(instruction.index, instruction.color, instruction.brightness);
      await board.wait(180, signal);
    } else if (instruction.type === "neoPixelClear") {
      if (!board.clearNeoPixels) throw new Error("この実行先ではNeoPixelを使えません。");
      await board.clearNeoPixels();
      await board.wait(180, signal);
    } else if (instruction.type === "wait") {
      await board.wait(instruction.milliseconds, signal);
    } else if (instruction.type === "repeat") {
      await board.wait(180, signal);
      for (let index = 0; index < instruction.times; index += 1) {
        await runInstructions(instruction.body, board, signal, observer, variables);
      }
    } else if (instruction.type === "forever") {
      await board.wait(180, signal);
      while (true) {
        assertRunning(signal);
        await runInstructions(instruction.body, board, signal, observer, variables);
        await board.wait(FOREVER_LOOP_INTERVAL_MS, signal);
      }
    } else {
      if (!board.isButtonPressed) {
        throw new Error("この実行先ではタクトスイッチを使えません。");
      }
      const pressed = await board.isButtonPressed();
      await board.wait(180, signal);
      await runInstructions(
        pressed ? instruction.body : instruction.elseBody,
        board,
        signal,
        observer,
        variables,
      );
    }
  }
}

function evaluateValue(value: ProgramValue, variables: Map<string, boolean | number>): boolean | number {
  if (value.type === "boolean" || value.type === "number") return value.value;
  if (value.type === "variable") {
    if (!variables.has(value.id)) throw new Error("値を入れていない変数があります。");
    return variables.get(value.id)!;
  }
  if (value.type === "not") {
    const result = evaluateValue(value.value, variables);
    if (typeof result !== "boolean") throw new Error("『ではない』には、ほんとう／ちがうを入れてください。");
    return !result;
  }
  const left = evaluateValue(value.left, variables);
  if (value.type === "logic") {
    if (typeof left !== "boolean") throw new Error("論理ブロックには、ほんとう／ちがうを入れてください。");
    if (value.op === "AND" && !left) return false;
    if (value.op === "OR" && left) return true;
    const right = evaluateValue(value.right, variables);
    if (typeof right !== "boolean") throw new Error("論理ブロックには、ほんとう／ちがうを入れてください。");
    return right;
  }
  const right = evaluateValue(value.right, variables);
  if (value.op === "EQ") return left === right;
  if (value.op === "NEQ") return left !== right;
  if (typeof left !== "number" || typeof right !== "number") throw new Error("大小の比較には数字を入れてください。");
  if (value.op === "LT") return left < right;
  if (value.op === "LTE") return left <= right;
  if (value.op === "GT") return left > right;
  return left >= right;
}

function assertRunning(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("停止しました", "AbortError");
}
