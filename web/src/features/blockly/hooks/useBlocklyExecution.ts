import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type * as Blockly from "blockly/core";
import { compileWorkspace } from "../utils/program";
import { runProgram } from "../utils/execution";
import { createStepDisplayObserver } from "../utils/stepDisplay";
import { createBoardExecutionSession } from "../utils/executionSession";
import type { ExecutionTarget } from "../types/execution";
import type { RuntimeHidDevice } from "../../runtime/types/transport";
import { createDiagnosticLogEntry, type DiagnosticLogEntry } from "../../../diagnosticLog";
import { queryKeys } from "../../../query";

export function useBlocklyExecution(workspaceRef: RefObject<Blockly.WorkspaceSvg | null>, stepDisplay: boolean) {
  const client = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => { abortRef.current?.abort(); }, []);
  const led = useQuery<boolean>({
    queryKey: queryKeys.simulatorLed,
    queryFn: async () => false,
    initialData: false,
    enabled: false,
  });

  const button = useQuery<boolean>({
    queryKey: queryKeys.simulatorButton,
    queryFn: async () => false,
    initialData: false,
    enabled: false,
  });

  const neoPixels = useQuery<string[]>({
    queryKey: queryKeys.simulatorNeoPixels,
    queryFn: async () => createClearedNeoPixels(),
    initialData: createClearedNeoPixels(),
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


  const run = useMutation({
    mutationFn: async () => {
      const workspace = workspaceRef.current;
      if (!workspace) throw new Error("Blocklyを準備中です。");
      // Validate the current workspace again at the action boundary, rather
      // than relying on the timing of Blockly's queued change notifications.
      const currentProgram = compileWorkspace(workspace);
      if (currentProgram.length === 0) throw new Error("動かすブロックを置いてください。");
      const controller = new AbortController();
      abortRef.current = controller;
      appendLog("info", "BLOCKLY_RUN", "Blocklyプログラムを開始しました。", {
        target: executionTarget.data,
        topLevelInstructions: currentProgram.length,
      });
      const session = createBoardExecutionSession({
        target: executionTarget.data,
        runtimeDevice: runtimeDevice.data,
        setSimulatorLed: (on) => {
          client.setQueryData(queryKeys.simulatorLed, on);
        },
        setSimulatorNeoPixel: (index, color, brightness) => {
          client.setQueryData<string[]>(queryKeys.simulatorNeoPixels, (current = createClearedNeoPixels()) => current.map((value, pixel) => pixel === index ? applyBrightness(color, brightness) : value));
        },
        fillSimulatorNeoPixels: (color, brightness) => {
          client.setQueryData(queryKeys.simulatorNeoPixels, Array(8).fill(applyBrightness(color, brightness)));
        },
        clearSimulatorNeoPixels: () => {
          client.setQueryData(queryKeys.simulatorNeoPixels, createClearedNeoPixels());
        },
        getSimulatorButton: () =>
          client.getQueryData<boolean>(queryKeys.simulatorButton) ?? false,
      });
      let turnOff = false;
      try {
        await runProgram(
          currentProgram,
          session.board,
          controller.signal,
          createStepDisplayObserver(stepDisplay, (blockId) => {
            client.setQueryData(queryKeys.simulatorBlock, blockId);
            workspaceRef.current?.highlightBlock(blockId);
          }),
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

  const stop = useCallback(() => {
    abortRef.current?.abort();
    client.setQueryData(queryKeys.simulatorBlock, null);
    workspaceRef.current?.highlightBlock(null);
  }, [client, workspaceRef]);


  return { run, stop, led, button, neoPixels, executionTarget, runtimeDevice };
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
function createClearedNeoPixels() {
  return Array<string>(8).fill("#000000");
}

function applyBrightness(color: string, brightness: number) {
  const scale = Math.min(100, Math.max(1, brightness)) / 100;
  const channels = [1, 3, 5].map((offset) => Math.round(Number.parseInt(color.slice(offset, offset + 2), 16) * scale));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
