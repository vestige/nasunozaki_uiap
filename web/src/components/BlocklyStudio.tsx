import { useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Blockly from "blockly/core";
import {
  registerUiapBlocks,
  starterProgram,
  uiapToolbox,
} from "../blockly/blocks";
import { compileWorkspace, type ProgramInstruction } from "../blockly/program";
import { queryKeys } from "../query";

export function BlocklyStudio() {
  const client = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);
  const program = useQuery<ProgramInstruction[]>({
    queryKey: queryKeys.blocklyProgram,
    queryFn: async () => [],
    initialData: [],
    enabled: false,
  });
  const led = useQuery<boolean>({
    queryKey: queryKeys.simulatorLed,
    queryFn: async () => false,
    initialData: false,
    enabled: false,
  });

  const mountWorkspace = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      registerUiapBlocks();
      const workspace = Blockly.inject(node, {
        toolbox: uiapToolbox,
        renderer: "zelos",
        trashcan: true,
        zoom: { controls: true, wheel: true, startScale: 0.9 },
        move: { scrollbars: true, drag: true, wheel: true },
      });
      Blockly.serialization.workspaces.load(starterProgram, workspace);
      const updateProgram = () =>
        client.setQueryData(
          queryKeys.blocklyProgram,
          compileWorkspace(workspace),
        );
      updateProgram();
      workspace.addChangeListener((event) => {
        if (!event.isUiEvent) updateProgram();
      });
      return () => workspace.dispose();
    },
    [client],
  );

  const run = useMutation({
    mutationFn: async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      await executeProgram(program.data, controller.signal, client);
    },
    onSettled: () => {
      abortRef.current = null;
      client.setQueryData(queryKeys.simulatorBlock, null);
    },
  });

  const stop = () => {
    abortRef.current?.abort();
    client.setQueryData(queryKeys.simulatorLed, false);
    run.reset();
  };

  return (
    <section
      className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8"
      aria-labelledby="blockly-title"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black tracking-[.18em] text-primary">
            PHASE 1 · BLOCK PROGRAMMING
          </p>
          <h2 id="blockly-title" className="mt-1 text-3xl font-black">
            ブロックでLEDを動かそう
          </h2>
          <p className="mt-2 text-base text-base-content/65">
            左からブロックを運び、「画面で実行」を押してください。まだ実機には送信しません。
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn btn-primary btn-lg font-black"
            onClick={() => run.mutate()}
            disabled={run.isPending || program.data.length === 0}
          >
            {run.isPending && <span className="loading loading-spinner" />}
            {run.isPending ? "実行中…" : "▶ 画面で実行"}
          </button>
          <button
            className="btn btn-outline btn-lg font-black"
            onClick={stop}
            disabled={!run.isPending}
          >
            ■ とめる
          </button>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          ref={mountWorkspace}
          className="h-[34rem] overflow-hidden rounded-box border-2 border-neutral bg-white shadow-xl"
          aria-label="ブロックプログラミング編集エリア"
        />
        <aside className="card border-2 border-neutral bg-neutral text-neutral-content shadow-xl">
          <div className="card-body items-center text-center">
            <p className="text-sm font-black tracking-widest text-neutral-content/60">
              LED SIMULATOR
            </p>
            <div
              className={`my-8 h-36 w-36 rounded-full border-8 transition-all duration-150 ${led.data ? "border-warning/40 bg-warning shadow-[0_0_60px_20px_oklch(var(--wa)/.45)]" : "border-neutral-content/20 bg-black/50"}`}
              role="img"
              aria-label={led.data ? "LED点灯中" : "LED消灯中"}
            />
            <p className="text-2xl font-black">
              {led.data ? "LED ついてる！" : "LED きえてる"}
            </p>
            <div className="divider divider-neutral" />
            <p className="text-sm leading-6 text-neutral-content/65">
              ブロックは安全な命令へ変換してから順番に実行します。
            </p>
            <div className="badge badge-outline mt-2">
              命令 {countInstructions(program.data)}個
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

async function executeProgram(
  instructions: ProgramInstruction[],
  signal: AbortSignal,
  client: ReturnType<typeof useQueryClient>,
) {
  for (const instruction of instructions) {
    if (signal.aborted) throw new DOMException("停止しました", "AbortError");
    client.setQueryData(queryKeys.simulatorBlock, instruction.blockId);
    if (instruction.type === "led")
      client.setQueryData(queryKeys.simulatorLed, instruction.on);
    if (instruction.type === "wait")
      await delay(instruction.milliseconds, signal);
    if (instruction.type === "repeat") {
      for (let index = 0; index < instruction.times; index += 1)
        await executeProgram(instruction.body, signal, client);
    }
  }
}

function delay(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("停止しました", "AbortError"));
      },
      { once: true },
    );
  });
}

function countInstructions(instructions: ProgramInstruction[]): number {
  return instructions.reduce(
    (total, instruction) =>
      total +
      (instruction.type === "repeat"
        ? instruction.times * countInstructions(instruction.body)
        : 1),
    0,
  );
}
