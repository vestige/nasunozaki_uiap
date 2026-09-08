import { useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Blockly from "blockly/core";
import {
  registerUiapBlocks,
  starterProgram,
  uiapToolbox,
} from "../utils/blocks";
import { compileWorkspace, type ProgramInstruction } from "../utils/program";
import { runSimulatorProgram } from "../utils/runtime";
import {
  clearBlocklyWorkspace,
  loadBlocklyWorkspace,
  saveBlocklyWorkspace,
} from "../utils/persistence";
import { queryKeys } from "../../../query";
import { BlocklyToolbar } from "./BlocklyToolbar";
import { LedSimulator } from "./LedSimulator";

type SaveStatus = {
  kind: "restored" | "saved" | "unavailable";
  savedAt?: string;
};

export function BlocklyStudio() {
  const client = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
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
  const saveStatus = useQuery<SaveStatus>({
    queryKey: queryKeys.blocklySaveStatus,
    queryFn: async () => ({ kind: "saved", savedAt: "" }),
    initialData: { kind: "saved", savedAt: "" },
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
      workspaceRef.current = workspace;
      const saved = loadBlocklyWorkspace(window.localStorage);
      Blockly.serialization.workspaces.load(saved ?? starterProgram, workspace);
      client.setQueryData(
        queryKeys.blocklyProgram,
        compileWorkspace(workspace),
      );
      client.setQueryData<SaveStatus>(
        queryKeys.blocklySaveStatus,
        saved ? { kind: "restored" } : { kind: "saved", savedAt: "" },
      );
      const updateProgram = () => {
        client.setQueryData(
          queryKeys.blocklyProgram,
          compileWorkspace(workspace),
        );
        try {
          saveBlocklyWorkspace(
            window.localStorage,
            Blockly.serialization.workspaces.save(workspace),
          );
          client.setQueryData<SaveStatus>(queryKeys.blocklySaveStatus, {
            kind: "saved",
            savedAt: new Date().toLocaleTimeString("ja-JP"),
          });
        } catch {
          client.setQueryData<SaveStatus>(queryKeys.blocklySaveStatus, {
            kind: "unavailable",
          });
        }
      };
      workspace.addChangeListener((event) => {
        if (!event.isUiEvent) updateProgram();
      });
      return () => {
        workspaceRef.current = null;
        workspace.dispose();
      };
    },
    [client],
  );

  const run = useMutation({
    mutationFn: async () => {
      const workspace = workspaceRef.current;
      if (!workspace) throw new Error("Blocklyを準備中です。");
      const controller = new AbortController();
      abortRef.current = controller;
      await runSimulatorProgram(
        program.data,
        {
          setLed: (on) => client.setQueryData(queryKeys.simulatorLed, on),
          highlightBlock: (blockId) => {
            client.setQueryData(queryKeys.simulatorBlock, blockId);
            workspace.highlightBlock(blockId);
          },
          wait: delay,
        },
        controller.signal,
      );
    },
    onSettled: () => {
      abortRef.current = null;
      client.setQueryData(queryKeys.simulatorBlock, null);
      workspaceRef.current?.highlightBlock(null);
    },
  });

  const stop = () => {
    abortRef.current?.abort();
    client.setQueryData(queryKeys.simulatorLed, false);
    client.setQueryData(queryKeys.simulatorBlock, null);
    workspaceRef.current?.highlightBlock(null);
    run.reset();
  };

  const resetWorkspace = () => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    if (!window.confirm("今のブロックを消して、最初の点滅例に戻しますか？"))
      return;
    stop();
    clearBlocklyWorkspace(window.localStorage);
    workspace.clear();
    Blockly.serialization.workspaces.load(starterProgram, workspace);
  };

  const saveMessage =
    saveStatus.data.kind === "unavailable"
      ? "このブラウザには保存できません"
      : saveStatus.data.kind === "restored"
        ? "前回のブロックを復元しました"
        : saveStatus.data.savedAt
          ? `${saveStatus.data.savedAt} に自動保存しました`
          : "このブラウザへ自動保存します";

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
        <BlocklyToolbar
          isRunning={run.isPending}
          canRun={program.data.length > 0}
          saveMessage={saveMessage}
          onRun={() => run.mutate()}
          onStop={stop}
          onReset={resetWorkspace}
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          ref={mountWorkspace}
          className="h-[34rem] overflow-hidden rounded-box border-2 border-neutral bg-white shadow-xl"
          aria-label="ブロックプログラミング編集エリア"
        />
        <LedSimulator ledOn={led.data} instructions={program.data} />
      </div>
    </section>
  );
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
