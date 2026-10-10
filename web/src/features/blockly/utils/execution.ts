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
    } else if (instruction.type === "neoPixelLightValue") {
      const brightness = evaluateValue(instruction.brightness, variables);
      const pixel = instruction.pixel === null ? null : evaluateValue(instruction.pixel, variables);
      if (typeof brightness !== "number" || !Number.isInteger(brightness) || brightness < 0 || brightness > 100) throw new Error("明るさには0から100の整数を入れてください。");
      if (pixel !== null && (typeof pixel !== "number" || !Number.isInteger(pixel) || pixel < 1 || pixel > 8)) throw new Error("LED番号には1から8の整数を入れてください。");
      const color = brightness === 0 ? "#000000" : instruction.color;
      if (pixel === null) {
        if (!board.fillNeoPixels) throw new Error("この実行先ではNeoPixelを使えません。");
        await board.fillNeoPixels(color, brightness || 1);
      } else {
        if (!board.setNeoPixel) throw new Error("この実行先ではNeoPixelを使えません。");
        await board.setNeoPixel(pixel - 1, color, brightness || 1);
      }
      await board.wait(180, signal);
    } else if (instruction.type === "neoPixelFill") {
      if (!board.fillNeoPixels) throw new Error("この実行先ではNeoPixelを使えません。");
      await board.fillNeoPixels(instruction.color, instruction.brightness);
      await board.wait(180, signal);
    } else if (instruction.type === "neoPixelSetValue") {
      const pixel = evaluateValue(instruction.pixel, variables);
      if (typeof pixel !== "number" || !Number.isInteger(pixel) || pixel < 1 || pixel > 8) {
        throw new Error("LED番号には1から8の整数を入れてください。");
      }
      if (!board.setNeoPixel) throw new Error("この実行先ではNeoPixelを使えません。");
      await board.setNeoPixel(pixel - 1, instruction.color, instruction.brightness);
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
  if (value.type === "arithmetic") {
    for (const operand of [left, right]) {
      if (typeof operand !== "number" || !Number.isInteger(operand) || operand < -2147483648 || operand > 2147483647) {
        throw new Error("足す・引くには、扱える範囲の整数を入れてください。");
      }
    }
    if (value.op !== "ADD" && value.op !== "SUB") throw new Error("対応していない計算です。");
    const result = value.op === "ADD" ? Number(left) + Number(right) : Number(left) - Number(right);
    if (result < -2147483648 || result > 2147483647) throw new Error("計算結果が扱える整数の範囲を超えています。");
    return result;
  }
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
