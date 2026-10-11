import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type * as Blockly from "blockly/core";
import { compileWorkspace } from "../utils/program";
import { runProgram, hasToneInstructions } from "../utils/execution";
import { createBrowserTone } from "../utils/browserTone";
import { createStepDisplayObserver } from "../utils/stepDisplay";
import { createBoardExecutionSession } from "../utils/executionSession";
import type { ExecutionTarget } from "../types/execution";
import type { RuntimeHidDevice } from "../../runtime/types/transport";
import { createDiagnosticLogEntry, type DiagnosticLogEntry } from "../../../diagnosticLog";
import { queryKeys } from "../../../query";
import { neoPixelPreview, clearedNeoPixelPreview, type NeoPixelPreview } from "../utils/neoPixelPreview";

export function useBlocklyExecution(workspaceRef: RefObject<Blockly.WorkspaceSvg | null>, stepDisplay: boolean) {
  const client = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
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

  const neoPixels = useQuery<NeoPixelPreview[]>({
    queryKey: queryKeys.simulatorNeoPixels,
    queryFn: async () => clearedNeoPixelPreview(),
    initialData: clearedNeoPixelPreview(),
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
      const usesSound = hasToneInstructions(currentProgram);
      const controller = new AbortController();
      abortRef.current = controller;
      appendLog("info", "BLOCKLY_RUN", "Blocklyプログラムを開始しました。", {
        target: executionTarget.data,
        topLevelInstructions: currentProgram.length,
      });
      const session = createBoardExecutionSession({
        target: executionTarget.data,
        runtimeDevice: runtimeDevice.data,
        usesTone: usesSound,
        setSimulatorLed: (on) => {
          client.setQueryData(queryKeys.simulatorLed, on);
        },
        setSimulatorNeoPixel: (index, color, brightness) => {
          client.setQueryData<NeoPixelPreview[]>(queryKeys.simulatorNeoPixels, (current = clearedNeoPixelPreview()) => current.map((value, pixel) => pixel === index ? neoPixelPreview(color, brightness) : value));
        },
        fillSimulatorNeoPixels: (color, brightness) => {
          client.setQueryData(queryKeys.simulatorNeoPixels, Array.from({ length: 8 }, () => neoPixelPreview(color, brightness)));
        },
        clearSimulatorNeoPixels: () => {
          client.setQueryData(queryKeys.simulatorNeoPixels, clearedNeoPixelPreview());
        },
        getSimulatorButton: () =>
          client.getQueryData<boolean>(queryKeys.simulatorButton) ?? false,
      });
      let turnOff = false;
      const tone = usesSound && executionTarget.data === "simulator" ? createBrowserTone(soundEnabled) : null;
      if (tone) {
        session.board.playTone = tone.play;
        session.board.stopTone = tone.stop;
      }
      try {
        await tone?.ready(controller.signal);
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
        try { await tone?.close(); }
        finally { await session.close(turnOff || controller.signal.aborted); }
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


  return { run, stop, led, button, neoPixels, executionTarget, runtimeDevice, soundEnabled, setSoundEnabled };
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
