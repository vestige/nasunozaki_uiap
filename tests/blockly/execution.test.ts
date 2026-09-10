import { describe, expect, it, vi } from "vitest";
import type { ProgramInstruction } from "../../web/src/features/blockly/utils/program";
import type { BoardAdapter } from "../../web/src/features/blockly/types/execution";
import { runProgram } from "../../web/src/features/blockly/utils/execution";

const program: ProgramInstruction[] = [
  {
    type: "repeat",
    times: 2,
    blockId: "repeat",
    body: [
      { type: "led", on: true, blockId: "on" },
      { type: "wait", milliseconds: 500, blockId: "wait" },
      { type: "led", on: false, blockId: "off" },
    ],
  },
];

const createExecution = () => {
  const events: string[] = [];
  const board: BoardAdapter = {
    setLed: (on) => {
      events.push(`led:${on}`);
    },
    wait: vi.fn(async (milliseconds) => {
      events.push(`wait:${milliseconds}`);
    }),
  };
  const observer = {
    onInstruction: (blockId: string) => events.push(`highlight:${blockId}`),
  };
  return { board, observer, events };
};

describe("runProgram", () => {
  it("繰り返し内も実行順にブロックをハイライトする", async () => {
    const { board, observer, events } = createExecution();

    await runProgram(program, board, new AbortController().signal, observer);

    expect(events).toEqual([
      "highlight:repeat",
      "wait:180",
      "highlight:on",
      "led:true",
      "wait:180",
      "highlight:wait",
      "wait:500",
      "highlight:off",
      "led:false",
      "wait:180",
      "highlight:on",
      "led:true",
      "wait:180",
      "highlight:wait",
      "wait:500",
      "highlight:off",
      "led:false",
      "wait:180",
    ]);
  });

  it("停止済みなら次の命令を実行しない", async () => {
    const { board, observer, events } = createExecution();
    const controller = new AbortController();
    controller.abort();

    await expect(
      runProgram(program, board, controller.signal, observer),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(events).toEqual([]);
  });

  it("表示用observerなしでも同じ命令を実行できる", async () => {
    const { board, events } = createExecution();

    await runProgram(program, board, new AbortController().signal);

    expect(events.filter((event) => event.startsWith("led:"))).toEqual([
      "led:true",
      "led:false",
      "led:true",
      "led:false",
    ]);
  });
});
