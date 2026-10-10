import { useCallback, useState, type RefObject } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Blockly from "blockly/core";
import { starterProgram } from "../samples/starterProgram";
import type { ProgramInstruction } from "../types/program";
import { inspectEditingProgram } from "../utils/editingProgram";
import { clearBlocklyWorkspace, loadBlocklySavedState, saveBlocklyWorkspace } from "../utils/persistence";
import { detectWorkspaceExtensions } from "../utils/workspaceExtensions";
import { createBlocklyProjectFile, createBlocklyProjectFileName, parseBlocklyProjectFile, stringifyBlocklyProjectFile } from "../utils/projectFile";
import { updateWorkspaceToolbox } from "./useBlocklyWorkspace";
import { queryKeys } from "../../../query";
type SaveStatus = { kind: "restored" | "saved" | "unavailable"; savedAt?: string };

export function useBlocklyProject(
  workspaceRef: RefObject<Blockly.WorkspaceSvg | null>,
  toolboxVisibleRef: RefObject<boolean>,
  stop: () => void,
) {
  const client = useQueryClient();
  const [editingError, setEditingError] = useState<string | null>(null);
  const program = useQuery<ProgramInstruction[]>({
    queryKey: queryKeys.blocklyProgram,
    queryFn: async () => [],
    initialData: [],
    enabled: false,
  });

  const tactSwitchExtension = useQuery<boolean>({
    queryKey: queryKeys.tactSwitchExtension,
    queryFn: async () => false,
    initialData: false,
    enabled: false,
  });

  const neoPixelExtension = useQuery<boolean>({
    queryKey: queryKeys.neoPixelExtension,
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

  const initialize = useCallback((workspace: Blockly.WorkspaceSvg) => {
    const saved = loadBlocklySavedState(window.localStorage);
    const tactSwitchEnabled = saved?.tactSwitchEnabled ?? false;
    const neoPixelEnabled = saved?.neoPixelEnabled ?? false;
    Blockly.serialization.workspaces.load(saved?.workspace ?? starterProgram, workspace);
    client.setQueryData(queryKeys.tactSwitchExtension, tactSwitchEnabled);
    client.setQueryData(queryKeys.neoPixelExtension, neoPixelEnabled);
    if (tactSwitchEnabled || neoPixelEnabled) updateWorkspaceToolbox(workspace, { tactSwitch: tactSwitchEnabled, neoPixel: neoPixelEnabled }, toolboxVisibleRef.current);
    const restoredProgram = inspectEditingProgram(workspace);
    client.setQueryData(queryKeys.blocklyProgram, restoredProgram.instructions);
    setEditingError(restoredProgram.error);
    client.setQueryData<SaveStatus>(
      queryKeys.blocklySaveStatus,
      saved ? { kind: "restored" } : { kind: "saved", savedAt: "" },
    );

  }, [client, toolboxVisibleRef]);
  const onChange = useCallback((workspace: Blockly.WorkspaceSvg) => {
    const editedProgram = inspectEditingProgram(workspace);
    client.setQueryData(queryKeys.blocklyProgram, editedProgram.instructions);
    setEditingError(editedProgram.error);
    try {
      saveBlocklyWorkspace(
        window.localStorage,
        Blockly.serialization.workspaces.save(workspace),
        client.getQueryData<boolean>(queryKeys.tactSwitchExtension) ?? false,
        client.getQueryData<boolean>(queryKeys.neoPixelExtension) ?? false,
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

  }, [client]);
  const exportProject = useMutation({
    mutationFn: async () => {
      const workspace = workspaceRef.current;
      if (!workspace) throw new Error("Blocklyを準備中です。");
      const project = createBlocklyProjectFile(
        Blockly.serialization.workspaces.save(workspace),
        new Date(),
        tactSwitchExtension.data,
        neoPixelExtension.data,
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
      const detected = detectWorkspaceExtensions(project.workspace);
      const tactSwitchEnabled = project.extensions?.tactSwitch === true || detected.tactSwitch;
      const neoPixelEnabled = project.extensions?.neoPixel === true || detected.neoPixel;
      client.setQueryData(queryKeys.tactSwitchExtension, tactSwitchEnabled);
      client.setQueryData(queryKeys.neoPixelExtension, neoPixelEnabled);
      updateWorkspaceToolbox(workspace, { tactSwitch: tactSwitchEnabled, neoPixel: neoPixelEnabled }, toolboxVisibleRef.current);
      saveBlocklyWorkspace(window.localStorage, project.workspace, tactSwitchEnabled, neoPixelEnabled);
      const importedProgram = inspectEditingProgram(workspace);
      client.setQueryData(queryKeys.blocklyProgram, importedProgram.instructions);
      setEditingError(importedProgram.error);
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

  const setExtension = (extension: "tactSwitch" | "neoPixel", enabled: boolean) => {
    client.setQueryData(extension === "tactSwitch" ? queryKeys.tactSwitchExtension : queryKeys.neoPixelExtension, enabled);
    const tact = client.getQueryData<boolean>(queryKeys.tactSwitchExtension) ?? false;
    const neo = client.getQueryData<boolean>(queryKeys.neoPixelExtension) ?? false;
    const workspace = workspaceRef.current;
    if (workspace) {
      updateWorkspaceToolbox(workspace, { tactSwitch: tact, neoPixel: neo }, toolboxVisibleRef.current);
      onChange(workspace);
    }
  };
  return { program, editingError, tactSwitchExtension, neoPixelExtension, initialize, onChange,
    exportProject, importProject, resetWorkspace, saveMessage, setExtension };
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
