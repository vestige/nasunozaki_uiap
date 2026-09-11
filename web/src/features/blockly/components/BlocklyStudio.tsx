import { useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Blockly from "blockly/core";
import {
  registerUiapBlocks,
  starterProgram,
  uiapToolbox,
} from "../utils/blocks";
import { compileWorkspace, type ProgramInstruction } from "../utils/program";
import { runProgram } from "../utils/execution";
import { createBoardExecutionSession } from "../utils/executionSession";
import {
  clearBlocklyWorkspace,
  loadBlocklyWorkspace,
  saveBlocklyWorkspace,
} from "../utils/persistence";
import {
  createBlocklyProjectFile,
  createBlocklyProjectFileName,
  parseBlocklyProjectFile,
  stringifyBlocklyProjectFile,
} from "../utils/projectFile";
import { queryKeys } from "../../../query";
import { BlocklyToolbar } from "./BlocklyToolbar";
import { LedSimulator } from "./LedSimulator";
import { ProjectFileActions } from "./ProjectFileActions";
import { ExecutionTargetSelector } from "./ExecutionTargetSelector";
import type { ExecutionTarget } from "../types/execution";
import type { RuntimeHidDevice } from "../../runtime/types/transport";
import {
  createDiagnosticLogEntry,
  type DiagnosticLogEntry,
} from "../../../diagnosticLog";

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
  const executionTarget = useQuery<ExecutionTarget>({
    queryKey: queryKeys.blocklyExecutionTarget,
    queryFn: async (): Promise<ExecutionTarget> => "simulator",
    initialData: "simulator",
    enabled: false,
  });
  const runtimeDevice = useQuery<RuntimeHidDevice | null>({
    queryKey: queryKeys.runtimeDevice,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
  });

  const appendLog = (
    level: "info" | "success" | "warning" | "error",
    action: string,
    message: string,
    details?: Record<string, string | number | boolean>,
  ) =>
    client.setQueryData<DiagnosticLogEntry[]>(
      queryKeys.diagnosticLog,
      (entries = []) => [
        ...entries,
        createDiagnosticLogEntry(level, action, message, details),
      ],
    );

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
      let resizeFrame = 0;
      const resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => Blockly.svgResize(workspace));
      });
      resizeObserver.observe(node);
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
        resizeObserver.disconnect();
        cancelAnimationFrame(resizeFrame);
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
      appendLog("info", "BLOCKLY_RUN", "Blocklyプログラムを開始しました。", {
        target: executionTarget.data,
        topLevelInstructions: program.data.length,
      });
      const session = createBoardExecutionSession({
        target: executionTarget.data,
        runtimeDevice: runtimeDevice.data,
        setSimulatorLed: (on) => {
          client.setQueryData(queryKeys.simulatorLed, on);
        },
      });
      let turnOff = false;
      try {
        await runProgram(
          program.data,
          session.board,
          controller.signal,
          {
            onInstruction: (blockId) => {
              client.setQueryData(queryKeys.simulatorBlock, blockId);
              workspace.highlightBlock(blockId);
            },
          },
        );
      } catch (error) {
        turnOff = true;
        throw error;
      } finally {
        await session.close(turnOff || controller.signal.aborted);
      }
    },
    onSuccess: () => {
      appendLog("success", "BLOCKLY_RUN", "Blocklyプログラムを完了しました。", {
        target: executionTarget.data,
      });
    },
    onError: (error) => {
      const stopped =
        error instanceof DOMException && error.name === "AbortError";
      appendLog(
        stopped ? "warning" : "error",
        stopped ? "BLOCKLY_STOP" : "BLOCKLY_RUN",
        stopped
          ? "Blocklyプログラムを停止しました。"
          : "Blocklyプログラムを完了できませんでした。",
        { target: executionTarget.data, error: errorMessage(error) },
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
    client.setQueryData(queryKeys.simulatorBlock, null);
    workspaceRef.current?.highlightBlock(null);
  };

  const exportProject = useMutation({
    mutationFn: async () => {
      const workspace = workspaceRef.current;
      if (!workspace) throw new Error("Blocklyを準備中です。");
      const project = createBlocklyProjectFile(
        Blockly.serialization.workspaces.save(workspace),
      );
      downloadTextFile(
        createBlocklyProjectFileName(new Date(project.savedAt)),
        stringifyBlocklyProjectFile(project),
      );
      return "作品ファイルを保存しました。";
    },
  });

  const importProject = useMutation({
    mutationFn: async (file: File) => {
      const workspace = workspaceRef.current;
      if (!workspace) throw new Error("Blocklyを準備中です。");
      if (file.size > 1024 * 1024) {
        throw new Error("作品ファイルが大きすぎます（上限1MB）。");
      }
      const project = parseBlocklyProjectFile(await file.text());
      if (!window.confirm("今のブロックを置き換えて、作品を開きますか？")) {
        return null;
      }
      stop();
      workspace.clear();
      Blockly.serialization.workspaces.load(project.workspace, workspace);
      saveBlocklyWorkspace(window.localStorage, project.workspace);
      client.setQueryData(
        queryKeys.blocklyProgram,
        compileWorkspace(workspace),
      );
      return `${file.name} を開きました。`;
    },
  });

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
      className="mx-auto w-full max-w-6xl overflow-x-clip px-5 py-12 sm:px-8"
      aria-labelledby="blockly-title"
    >
      <div className="mb-5 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black tracking-[.18em] text-primary">
            PHASE 1 · BLOCK PROGRAMMING
          </p>
          <h2 id="blockly-title" className="mt-1 text-3xl font-black">
            ブロックでLEDを動かそう
          </h2>
          <p className="mt-2 text-base text-base-content/65">
            左からブロックを運び、画面または接続したUIAPduinoで実行できます。
          </p>
        </div>
        <div className="min-w-0 flex flex-col gap-3 lg:items-end">
          <ExecutionTargetSelector
            target={executionTarget.data}
            runtimeConnected={Boolean(runtimeDevice.data?.opened)}
            disabled={run.isPending}
            message={run.error?.message}
            onChange={(target) => {
              run.reset();
              client.setQueryData(queryKeys.blocklyExecutionTarget, target);
            }}
          />
          <BlocklyToolbar
            isRunning={run.isPending}
            canRun={
              program.data.length > 0 &&
              (executionTarget.data === "simulator" ||
                Boolean(runtimeDevice.data?.opened))
            }
            saveMessage={saveMessage}
            runLabel={
              executionTarget.data === "uiapduino"
                ? "UIAPduinoで実行"
                : "画面で実行"
            }
            onRun={() => run.mutate()}
            onStop={stop}
            onReset={resetWorkspace}
          />
          <ProjectFileActions
            disabled={
              run.isPending ||
              importProject.isPending ||
              exportProject.isPending
            }
            message={projectFileMessage(exportProject, importProject)}
            onExport={() => {
              importProject.reset();
              exportProject.mutate();
            }}
            onImport={(file) => {
              exportProject.reset();
              importProject.mutate(file);
            }}
          />
        </div>
      </div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          ref={mountWorkspace}
          className="blockly-workspace h-[34rem] w-full min-w-0 max-w-full overflow-hidden rounded-box border-2 border-neutral bg-white shadow-xl"
          aria-label="ブロックプログラミング編集エリア"
        />
        <LedSimulator ledOn={led.data} instructions={program.data} />
      </div>
    </section>
  );
}

function projectFileMessage(
  exportProject: { data?: string; error: Error | null },
  importProject: { data?: string | null; error: Error | null },
) {
  return (
    importProject.error?.message ??
    exportProject.error?.message ??
    importProject.data ??
    exportProject.data ??
    null
  );
}

function downloadTextFile(fileName: string, contents: string) {
  const url = URL.createObjectURL(
    new Blob([contents], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
