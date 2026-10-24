import { useCallback, useState, type RefObject } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Blockly from "blockly/core";
import { starterProgram } from "../samples/starterProgram";
import { blankProgram, type LearningSample } from "../samples/learningSamples";
import type { ProgramInstruction } from "../types/program";
import { inspectEditingProgram } from "../utils/editingProgram";
import { updateProgramStructureWarnings } from "../utils/program";
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

  const piezoExtension = useQuery<boolean>({
    queryKey: queryKeys.piezoExtension,
    queryFn: async () => false,
    initialData: false,
    enabled: false,
  });

  const initialize = useCallback((workspace: Blockly.WorkspaceSvg) => {
    const saved = loadBlocklySavedState(window.localStorage);
    const tactSwitchEnabled = saved?.tactSwitchEnabled ?? false;
    const neoPixelEnabled = saved?.neoPixelEnabled ?? false;
    const piezoEnabled = saved?.piezoEnabled ?? false;
    Blockly.serialization.workspaces.load(saved?.workspace ?? starterProgram, workspace);
    updateProgramStructureWarnings(workspace);
    client.setQueryData(queryKeys.tactSwitchExtension, tactSwitchEnabled);
    client.setQueryData(queryKeys.neoPixelExtension, neoPixelEnabled);
    client.setQueryData(queryKeys.piezoExtension, saved?.piezoEnabled ?? false);
    if (tactSwitchEnabled || neoPixelEnabled || piezoEnabled) updateWorkspaceToolbox(workspace, { tactSwitch: tactSwitchEnabled, neoPixel: neoPixelEnabled, piezo: piezoEnabled }, toolboxVisibleRef.current);
    const restoredProgram = inspectEditingProgram(workspace);
    client.setQueryData(queryKeys.blocklyProgram, restoredProgram.instructions);
    setEditingError(restoredProgram.error);
    client.setQueryData<SaveStatus>(
      queryKeys.blocklySaveStatus,
      saved ? { kind: "restored" } : { kind: "saved", savedAt: "" },
    );

  }, [client, toolboxVisibleRef]);
  const onChange = useCallback((workspace: Blockly.WorkspaceSvg) => {
    updateProgramStructureWarnings(workspace);
    const editedProgram = inspectEditingProgram(workspace);
    client.setQueryData(queryKeys.blocklyProgram, editedProgram.instructions);
    setEditingError(editedProgram.error);
    try {
      saveBlocklyWorkspace(
        window.localStorage,
        Blockly.serialization.workspaces.save(workspace),
        client.getQueryData<boolean>(queryKeys.tactSwitchExtension) ?? false,
        client.getQueryData<boolean>(queryKeys.neoPixelExtension) ?? false,
        client.getQueryData<boolean>(queryKeys.piezoExtension) ?? false,
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
        piezoExtension.data,
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
      updateProgramStructureWarnings(workspace);
      const detected = detectWorkspaceExtensions(project.workspace);
      const tactSwitchEnabled = project.extensions?.tactSwitch === true || detected.tactSwitch;
      const neoPixelEnabled = project.extensions?.neoPixel === true || detected.neoPixel;
      client.setQueryData(queryKeys.tactSwitchExtension, tactSwitchEnabled);
      client.setQueryData(queryKeys.neoPixelExtension, neoPixelEnabled);
      const piezoEnabled = project.extensions?.piezo === true || detected.piezo;
      client.setQueryData(queryKeys.piezoExtension, piezoEnabled);
      updateWorkspaceToolbox(workspace, { tactSwitch: tactSwitchEnabled, neoPixel: neoPixelEnabled, piezo: piezoEnabled }, toolboxVisibleRef.current);
      saveBlocklyWorkspace(window.localStorage, project.workspace, tactSwitchEnabled, neoPixelEnabled, piezoEnabled);
      const importedProgram = inspectEditingProgram(workspace);
      client.setQueryData(queryKeys.blocklyProgram, importedProgram.instructions);
      setEditingError(importedProgram.error);
      return `${file.name} を開きました。`;
    },
  });

  const replaceWorkspace = useCallback((workspaceState: Record<string, unknown>, extensions: { tactSwitch?: boolean; neoPixel?: boolean; piezo?: boolean }) => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    stop();
    workspace.clear();
    Blockly.serialization.workspaces.load(workspaceState, workspace);
    updateProgramStructureWarnings(workspace);
    const detected = detectWorkspaceExtensions(workspaceState);
    const tactSwitchEnabled = extensions.tactSwitch === true || detected.tactSwitch;
    const neoPixelEnabled = extensions.neoPixel === true || detected.neoPixel;
    const piezoEnabled = extensions.piezo === true || detected.piezo;
    client.setQueryData(queryKeys.tactSwitchExtension, tactSwitchEnabled);
    client.setQueryData(queryKeys.neoPixelExtension, neoPixelEnabled);
    client.setQueryData(queryKeys.piezoExtension, piezoEnabled);
    updateWorkspaceToolbox(workspace, { tactSwitch: tactSwitchEnabled, neoPixel: neoPixelEnabled, piezo: piezoEnabled }, toolboxVisibleRef.current);
    saveBlocklyWorkspace(window.localStorage, workspaceState, tactSwitchEnabled, neoPixelEnabled, piezoEnabled);
    client.setQueryData<SaveStatus>(queryKeys.blocklySaveStatus, {
      kind: "saved",
      savedAt: new Date().toLocaleTimeString("ja-JP"),
    });
    const replacedProgram = inspectEditingProgram(workspace);
    client.setQueryData(queryKeys.blocklyProgram, replacedProgram.instructions);
    setEditingError(replacedProgram.error);
  }, [client, stop, toolboxVisibleRef, workspaceRef]);

  const loadSample = (sample: LearningSample) => {
    if (!window.confirm(`今のブロックを置き換えて、「${sample.name}」を開きますか？`)) return false;
    replaceWorkspace(sample.workspace, sample.extensions);
    return true;
  };

  const resetWorkspace = () => {
    if (!window.confirm("今のブロックを消して、まっさらからはじめますか？")) return;
    clearBlocklyWorkspace(window.localStorage);
    replaceWorkspace(blankProgram, {});
  };

  const saveMessage =
    saveStatus.data.kind === "unavailable"
      ? "このブラウザには保存できません"
      : saveStatus.data.kind === "restored"
        ? "前回のブロックを復元しました"
        : saveStatus.data.savedAt
          ? `${saveStatus.data.savedAt} に自動保存しました`
          : "このブラウザへ自動保存します";

  const setExtension = (extension: "tactSwitch" | "neoPixel" | "piezo", enabled: boolean) => {
    const key = extension === "tactSwitch" ? queryKeys.tactSwitchExtension : extension === "neoPixel" ? queryKeys.neoPixelExtension : queryKeys.piezoExtension;
    client.setQueryData(key, enabled);
    const tact = client.getQueryData<boolean>(queryKeys.tactSwitchExtension) ?? false;
    const neo = client.getQueryData<boolean>(queryKeys.neoPixelExtension) ?? false;
    const piezo = client.getQueryData<boolean>(queryKeys.piezoExtension) ?? false;
    const workspace = workspaceRef.current;
    if (workspace) {
      updateWorkspaceToolbox(workspace, { tactSwitch: tact, neoPixel: neo, piezo }, toolboxVisibleRef.current);
      onChange(workspace);
    }
  };
  return { program, editingError, tactSwitchExtension, neoPixelExtension, piezoExtension, initialize, onChange,
    exportProject, importProject, loadSample, resetWorkspace, saveMessage, setExtension };
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
