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
  it("変数を保持して条件・反転・比較を実行する", async () => {
    const { board, events } = createExecution();
    const conditional: ProgramInstruction[] = [
      { type: "setVariable", id: "state", value: { type: "boolean", value: false }, blockId: "init" },
      { type: "setVariable", id: "state", value: { type: "not", value: { type: "variable", id: "state" } }, blockId: "toggle" },
      { type: "if", condition: { type: "compare", op: "EQ", left: { type: "variable", id: "state" }, right: { type: "boolean", value: true } }, body: [{ type: "led", on: true, blockId: "on" }], elseBody: [{ type: "led", on: false, blockId: "off" }], blockId: "if" },
    ];

    await runProgram(conditional, board, new AbortController().signal);

    expect(events.filter((event) => event.startsWith("led:"))).toEqual(["led:true"]);
  });

  it("値を入れていない変数は安全にエラーにする", async () => {
    const { board } = createExecution();
    await expect(runProgram([{ type: "if", condition: { type: "variable", id: "missing" }, body: [], elseBody: [], blockId: "if" }], board, new AbortController().signal)).rejects.toThrow("値を入れていない変数");
  });
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

  it.each([
    [true, "led:true"],
    [false, "led:false"],
  ])("タクトスイッチが%sの分岐を実行する", async (pressed, expected) => {
    const { board, observer, events } = createExecution();
    board.isButtonPressed = async () => pressed;
    const conditional: ProgramInstruction[] = [
      {
        type: "ifButton",
        blockId: "if",
        body: [{ type: "led", on: true, blockId: "then" }],
        elseBody: [{ type: "led", on: false, blockId: "else" }],
      },
    ];

    await runProgram(
      conditional,
      board,
      new AbortController().signal,
      observer,
    );

    expect(events).toContain(expected);
    expect(events).not.toContain(pressed ? "led:false" : "led:true");
  });

  it("ずっとブロックは停止されるまで入力と分岐を繰り返す", async () => {
    const controller = new AbortController();
    const ledStates: boolean[] = [];
    const buttonStates = [true, false];
    const waits: number[] = [];
    const board: BoardAdapter = {
      async setLed(on) {
        ledStates.push(on);
        if (ledStates.length === 2) controller.abort();
      },
      async isButtonPressed() {
        return buttonStates.shift() ?? false;
      },
      async wait(milliseconds) {
        waits.push(milliseconds);
      },
    };
    const forever: ProgramInstruction[] = [
      {
        type: "forever",
        blockId: "forever",
        body: [
          {
            type: "ifButton",
            blockId: "if",
            body: [{ type: "led", on: true, blockId: "on" }],
            elseBody: [{ type: "led", on: false, blockId: "off" }],
          },
        ],
      },
    ];

    await expect(runProgram(forever, board, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });

    expect(ledStates).toEqual([true, false]);
    expect(waits).toContain(50);
  });

  it("空のずっとブロックでも待機を入れて停止できる", async () => {
    const controller = new AbortController();
    const waits: number[] = [];
    const board: BoardAdapter = {
      setLed: () => undefined,
      async wait(milliseconds) {
        waits.push(milliseconds);
        if (milliseconds === 50 && waits.filter((value) => value === 50).length === 2) {
          controller.abort();
        }
      },
    };

    await expect(
      runProgram(
        [{ type: "forever", blockId: "forever", body: [] }],
        board,
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(waits).toEqual([180, 50, 50]);
  });

  it("NeoPixelの全灯・個別点灯・消灯を順番に実行する", async () => {
    const events: string[] = [];
    const board: BoardAdapter = {
      setLed: () => undefined,
      fillNeoPixels: (color, brightness) => events.push(`fill:${color}:${brightness}`),
      setNeoPixel: (index, color, brightness) => events.push(`pixel:${index}:${color}:${brightness}`),
      clearNeoPixels: () => events.push("clear"),
      wait: async () => undefined,
    };

    await runProgram([
      { type: "neoPixelFill", color: "#00ff00", brightness: 20, blockId: "fill" },
      { type: "neoPixelSet", index: 7, color: "#ff0000", brightness: 40, blockId: "set" },
      { type: "neoPixelClear", blockId: "clear" },
    ], board, new AbortController().signal);

    expect(events).toEqual(["fill:#00ff00:20", "pixel:7:#ff0000:40", "clear"]);
  });
});
