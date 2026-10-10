import { useCallback, type RefObject } from "react";
import * as Blockly from "blockly/core";
import { registerUiapBlocks } from "../utils/blocks";
import { uiapToolbox, createUiapToolbox } from "../utils/toolbox";

export function useBlocklyWorkspace(
  workspaceRef: RefObject<Blockly.WorkspaceSvg | null>,
  initialize: (workspace: Blockly.WorkspaceSvg) => void,
  onChange: (workspace: Blockly.WorkspaceSvg) => void,
  onDispose: () => void,
) {
  return useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    registerUiapBlocks();
    const workspace = Blockly.inject(node, {
      toolbox: uiapToolbox, renderer: "zelos", trashcan: true,
      zoom: { controls: true, wheel: true, startScale: 0.9 },
      move: { scrollbars: true, drag: true, wheel: true },
    });
    workspaceRef.current = workspace;
    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => Blockly.svgResize(workspace));
    });
    observer.observe(node);
    initialize(workspace);
    workspace.addChangeListener((event) => { if (!event.isUiEvent) onChange(workspace); });
    return () => {
      onDispose();
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      workspaceRef.current = null;
      workspace.dispose();
    };
  }, [workspaceRef, initialize, onChange, onDispose]);
}

export function updateWorkspaceToolbox(
  workspace: Blockly.WorkspaceSvg,
  options: { tactSwitch: boolean; neoPixel: boolean },
  visible: boolean,
) {
  workspace.updateToolbox(createUiapToolbox(options));
  setWorkspaceToolboxVisible(workspace, visible);
}

export function setWorkspaceToolboxVisible(workspace: Blockly.WorkspaceSvg, visible: boolean) {
  const toolbox = workspace.getToolbox();
  toolbox?.setVisible(visible);
  if (!visible) {
    toolbox?.clearSelection();
    workspace.getFlyout()?.hide();
  }
  workspace.resize();
  workspace.resizeContents();
  Blockly.svgResize(workspace);
  const flyout = workspace.getFlyout();
  if (!flyout?.isVisible()) flyout?.getWorkspace().scrollbar?.setContainerVisible(false);
}
