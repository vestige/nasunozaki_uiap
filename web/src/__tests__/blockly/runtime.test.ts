import { describe, expect, it, vi } from "vitest";
import type { ProgramInstruction } from "../../features/blockly/utils/program";
import {
  runSimulatorProgram,
  type SimulatorAdapter,
} from "../../features/blockly/utils/runtime";

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

const createAdapter = () => {
  const events: string[] = [];
  const adapter: SimulatorAdapter = {
    setLed: (on) => events.push(`led:${on}`),
    highlightBlock: (blockId) => events.push(`highlight:${blockId}`),
    wait: vi.fn(async (milliseconds) => {
      events.push(`wait:${milliseconds}`);
    }),
  };
  return { adapter, events };
};

describe("runSimulatorProgram", () => {
  it("繰り返し内も実行順にブロックをハイライトする", async () => {
    const { adapter, events } = createAdapter();

    await runSimulatorProgram(program, adapter, new AbortController().signal);

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
    const { adapter, events } = createAdapter();
    const controller = new AbortController();
    controller.abort();

    await expect(
      runSimulatorProgram(program, adapter, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(events).toEqual([]);
  });
});
