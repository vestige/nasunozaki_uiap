import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type * as Blockly from "blockly/core";
import { compileWorkspace } from "../utils/program";
import { queryKeys } from "../../../query";
import { useBlocklyExecution } from "../hooks/useBlocklyExecution";
import { useBlocklyProject } from "../hooks/useBlocklyProject";
import { useBlocklyWorkspace, setWorkspaceToolboxVisible } from "../hooks/useBlocklyWorkspace";
import { BlocklyToolbar } from "./BlocklyToolbar";
import { LedSimulator } from "./LedSimulator";
import { TactSwitchWiringGuide } from "./TactSwitchWiringGuide";
import { NeoPixelWiringGuide } from "./NeoPixelWiringGuide";
import { ProjectFileActions } from "./ProjectFileActions";
import { ExecutionTargetSelector } from "./ExecutionTargetSelector";
import { StandaloneProgramInstall } from "./StandaloneProgramInstall";

export function BlocklyStudio() {
  const client = useQueryClient();
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const toolboxVisibleRef = useRef(true);
  const [activeEditorTab, setActiveEditorTab] = useState<"blocks" | "tactSwitch" | "neoPixel">("blocks");
  const [stepDisplay, setStepDisplay] = useState(false);
  const [toolboxVisible, setToolboxVisible] = useState(true);
  const { run, stop, led, button, neoPixels, executionTarget, runtimeDevice } = useBlocklyExecution(workspaceRef, stepDisplay);
  const { program, editingError, tactSwitchExtension, neoPixelExtension, initialize, onChange,
    exportProject, importProject, resetWorkspace, saveMessage, setExtension } = useBlocklyProject(workspaceRef, toolboxVisibleRef, stop);
  const mountWorkspace = useBlocklyWorkspace(workspaceRef, initialize, onChange, stop);
  return (
    <section
      className="mx-auto w-full max-w-[90rem] overflow-x-clip px-5 py-12 sm:px-8"
      aria-labelledby="blockly-title"
    >
      <div className="mb-5 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black tracking-[.18em] text-primary">
            BLOCK STUDIO
          </p>
          <h2 id="blockly-title" className="mt-1 text-3xl font-black">
            ブロックでLEDを動かそう
          </h2>
          <p className="mt-2 text-base text-base-content/65">
            左の一覧からブロックをえらんで、組み合わせてみよう。
          </p>
          <ol className="mt-4 flex flex-wrap gap-2 text-sm font-bold" aria-label="ブロックの使い方">
            <li className="rounded-full border border-base-content/20 bg-base-100 px-3 py-1">1 ブロックをおく</li>
            <li className="rounded-full border border-base-content/20 bg-base-100 px-3 py-1">2 ▶でためす</li>
            <li className="rounded-full border border-base-content/20 bg-base-100 px-3 py-1">3 ■でとめる</li>
          </ol>
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
            stepDisplay={stepDisplay}
            canRun={
              !editingError &&
              program.data.length > 0 &&
              (executionTarget.data === "simulator" ||
                Boolean(runtimeDevice.data?.opened))
            }
            saveMessage={saveMessage}
            runLabel={
              executionTarget.data === "uiapduino"
                ? "ボードでためす"
                : "画面でためす"
            }
            onStepDisplayChange={(enabled) => {
              setStepDisplay(enabled);
              if (!enabled) {
                client.setQueryData(queryKeys.simulatorBlock, null);
                workspaceRef.current?.highlightBlock(null);
              }
            }}
            onRun={() => run.mutate()}
            onStop={stop}
            onReset={resetWorkspace}
          />
          <div className="flex min-w-0 flex-wrap items-start justify-end gap-2">
            <ProjectFileActions
              disabled={
                run.isPending ||
                importProject.isPending ||
                exportProject.isPending
              }
              message={importProject.error?.message ?? exportProject.error?.message ?? importProject.data ?? exportProject.data ?? null}
              onExport={() => {
                importProject.reset();
                exportProject.mutate();
              }}
              onImport={(file) => {
                exportProject.reset();
                importProject.mutate(file);
              }}
            />
            <StandaloneProgramInstall
              program={program.data}
              getCurrentProgram={() => {
                const workspace = workspaceRef.current;
                if (!workspace) throw new Error("Blocklyを準備中です。");
                return compileWorkspace(workspace);
              }}
              device={runtimeDevice.data}
              disabled={Boolean(editingError) || run.isPending || importProject.isPending || exportProject.isPending}
            />
          </div>
        </div>
      </div>
      <p className="mb-5 max-w-3xl text-sm leading-6 text-base-content/70">
        画面やボードでためしたあと、作品を残すときは「ボードにかきこむ」を選びます。
      </p>
      {editingError && <p role="status" className="mb-5 text-sm font-bold text-error">{editingError} 組み立て途中でも、作品は保存できます。</p>}
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="lg:col-span-2">
          <div className="tabs tabs-lift after:hidden" role="tablist" aria-label="Blocklyと配線ガイドの表示切り替え">
            <button type="button" role="tab" aria-selected={activeEditorTab === "blocks"} className={`tab ${activeEditorTab === "blocks" ? "tab-active" : ""}`} onClick={() => setActiveEditorTab("blocks")}>ブロックプログラミング</button>
            {tactSwitchExtension.data ? (
              <div role="tab" aria-selected={activeEditorTab === "tactSwitch"} className={`tab gap-1 ${activeEditorTab === "tactSwitch" ? "tab-active" : ""}`}>
                <button type="button" className="h-full" onClick={() => setActiveEditorTab("tactSwitch")}>タクトスイッチ</button>
                <button type="button" className="btn btn-circle btn-ghost btn-xs" aria-label="タクトスイッチを外す" onClick={() => { if (!window.confirm("タクトスイッチ拡張を外します。すでに置いたブロックは消えません。続けますか？")) return; setExtension("tactSwitch", false); client.setQueryData(queryKeys.simulatorButton, false);   setActiveEditorTab("blocks"); }}>×</button>
              </div>
            ) : <button type="button" className="tab" onClick={() => { setExtension("tactSwitch", true);   setActiveEditorTab("tactSwitch"); }}>＋ タクトスイッチを追加</button>}
            {neoPixelExtension.data ? (
              <div role="tab" aria-selected={activeEditorTab === "neoPixel"} className={`tab gap-1 ${activeEditorTab === "neoPixel" ? "tab-active" : ""}`}>
                <button type="button" className="h-full" onClick={() => setActiveEditorTab("neoPixel")}>NeoPixel</button>
                <button type="button" className="btn btn-circle btn-ghost btn-xs" aria-label="NeoPixelを外す" onClick={() => { if (!window.confirm("NeoPixel拡張を外します。すでに置いたブロックは消えません。続けますか？")) return; setExtension("neoPixel", false); client.setQueryData(queryKeys.simulatorNeoPixels, Array<string>(8).fill("#000000"));   setActiveEditorTab("blocks"); }}>×</button>
              </div>
            ) : <button type="button" className="tab" onClick={() => { setExtension("neoPixel", true);   setActiveEditorTab("neoPixel"); }}>＋ NeoPixelを追加</button>}
          </div>
          {tactSwitchExtension.data && activeEditorTab === "tactSwitch" && <div className="rounded-b-box rounded-tr-box border-x-2 border-b-2 border-base-300 bg-base-100 p-4 lg:min-h-[48rem]" role="tabpanel"><TactSwitchWiringGuide /></div>}
          {neoPixelExtension.data && activeEditorTab === "neoPixel" && <div className="rounded-b-box rounded-tr-box border-x-2 border-b-2 border-base-300 bg-base-100 p-4 lg:min-h-[48rem]" role="tabpanel"><NeoPixelWiringGuide /></div>}
          <div className={`rounded-b-box rounded-tr-box border-x-2 border-b-2 border-base-300 bg-base-100 p-4 lg:min-h-[48rem] ${activeEditorTab !== "blocks" ? "hidden" : ""}`}>
            <div className="mb-3 flex justify-start">
              <button type="button" className="btn btn-outline btn-sm" aria-pressed={!toolboxVisible} onClick={() => { const visible = !toolboxVisibleRef.current; toolboxVisibleRef.current = visible; setToolboxVisible(visible); const workspace = workspaceRef.current; if (workspace) setWorkspaceToolboxVisible(workspace, visible); }}>{toolboxVisible ? "ブロック一覧をかくす 😶‍🌫️" : "ブロック一覧をみせる 👀"}</button>
            </div>
            <div className={`grid min-w-0 gap-5 ${neoPixelExtension.data ? "lg:grid-cols-[minmax(0,1fr)_24rem]" : "lg:grid-cols-[minmax(0,1fr)_18rem]"}`}><div ref={mountWorkspace} className={`blockly-workspace h-[38rem] w-full min-w-0 max-w-full overflow-hidden rounded-box border-2 border-neutral bg-white shadow-xl lg:h-[44rem] ${toolboxVisible ? "" : "blockly-workspace--toolbox-hidden"}`} aria-label="ブロックプログラミング編集エリア" /><LedSimulator ledOn={led.data} buttonPressed={button.data} extensionEnabled={tactSwitchExtension.data} neoPixelEnabled={neoPixelExtension.data} neoPixels={neoPixels.data} onButtonChange={(pressed) => client.setQueryData(queryKeys.simulatorButton, pressed)} /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
