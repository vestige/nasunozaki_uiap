import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import * as Blockly from "blockly/core";
import { registerUiapBlocks, createUiapToolbox } from "../../web/src/features/blockly/utils/blocks";
import { compileWorkspace, type ProgramInstruction } from "../../web/src/features/blockly/utils/program";
import { runProgram } from "../../web/src/features/blockly/utils/execution";
import { encodeStandaloneProgram } from "../../web/src/features/blockly/utils/standaloneProgram";
import { createBrowserTone } from "../../web/src/features/blockly/utils/browserTone";
import { createBlocklyProjectFile, parseBlocklyProjectFile, stringifyBlocklyProjectFile } from "../../web/src/features/blockly/utils/projectFile";
import { loadBlocklySavedState, saveBlocklyWorkspace } from "../../web/src/features/blockly/utils/persistence";

afterEach(() => vi.unstubAllGlobals());
const tone: ProgramInstruction = { type: "tone", frequency: 440, milliseconds: 500, wait: true, blockId: "tone" };

it("実機確認作品は音を鳴らしながらLEDとNeoPixelを動かし、最後に停止する", async () => {
  registerUiapBlocks();
  const project = parseBlocklyProjectFile(readFileSync(new URL("../../examples/blockly/piezo-led-preview.uiap.json", import.meta.url), "utf8"));
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(project.workspace, workspace);
    const calls: string[] = [];
    await runProgram(compileWorkspace(workspace), {
      playTone(hz) { calls.push(`tone:${hz}`); }, stopTone() { calls.push("silence"); },
      setLed(on) { calls.push(`led:${on}`); }, fillNeoPixels() { calls.push("neo"); }, clearNeoPixels() { calls.push("clear"); },
      async wait(ms) { calls.push(`wait:${ms}`); },
    }, new AbortController().signal);
    expect(calls).toEqual(["tone:440", "led:true", "wait:180", "neo", "wait:180", "wait:500", "clear", "wait:180", "led:false", "wait:180", "tone:523", "wait:500", "silence"]);
  } finally { workspace.dispose(); }
});

it("音カテゴリは追加したときだけ表示する", () => {
  expect(JSON.stringify(createUiapToolbox({ tactSwitch: false, neoPixel: false }))).not.toContain("uiap_tone");
  expect(JSON.stringify(createUiapToolbox({ tactSwitch: false, neoPixel: false, piezo: true }))).toContain("uiap_stop_tone");
});

it("音ブロックを作品形式6で保存・復元し、拡張フラグがなくても検出する", () => {
  registerUiapBlocks();
  const workspace = new Blockly.Workspace();
  try {
    const block = workspace.newBlock("uiap_tone");
    block.setFieldValue("440", "NOTE");
    block.setFieldValue("NEXT", "MODE");
    const stop = workspace.newBlock("uiap_stop_tone");
    block.nextConnection!.connect(stop.previousConnection!);
    const state = Blockly.serialization.workspaces.save(workspace);
    const project = parseBlocklyProjectFile(stringifyBlocklyProjectFile(createBlocklyProjectFile(state)));
    expect(project.version).toBe(7);
    workspace.clear();
    Blockly.serialization.workspaces.load(project.workspace, workspace);
    expect(compileWorkspace(workspace)).toMatchObject([{ ...tone, blockId: expect.any(String), wait: false }, { type: "stopTone" }]);
    let raw = "";
    const storage = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value; }, removeItem() {} };
    saveBlocklyWorkspace(storage, state);
    expect(loadBlocklySavedState(storage)?.piezoEnabled).toBe(true);
  } finally { workspace.dispose(); }
});

it.each([true, false])("音を待つ／次へ進む: %s", async wait => {
  const playTone = vi.fn(), stopTone = vi.fn(), delay = vi.fn(async () => {});
  await runProgram([{ ...tone, wait }, { type: "stopTone", blockId: "stop" }], { setLed() {}, playTone, stopTone, wait: delay }, new AbortController().signal);
  expect(playTone).toHaveBeenCalledWith(440, 500);
  expect(delay.mock.calls.length).toBe(wait ? 1 : 0);
  expect(stopTone).toHaveBeenCalledOnce();
});

it("音に非対応の実行先は先行命令の前に拒否し、保存形式は5にする", async () => {
  const program: ProgramInstruction[] = [{ type: "led", on: true, blockId: "led" }, { type: "if", condition: { type: "boolean", value: false }, body: [], elseBody: [tone], blockId: "if" }];
  const setLed = vi.fn();
  await expect(runProgram(program, { setLed, async wait() {} }, new AbortController().signal)).rejects.toThrow("この実行先");
  expect(setLed).not.toHaveBeenCalled();
  expect(encodeStandaloneProgram(program)[4]).toBe(5);
});

it("旧ファームの音対応チェック失敗では先行LED命令も実行しない", async () => {
  const setLed = vi.fn(), playTone = vi.fn();
  await expect(runProgram([{ type: "led", on: true, blockId: "led" }, tone], {
    setLed, playTone, stopTone() {}, async prepareTone() { throw new Error("音に未対応"); }, async wait() {},
  }, new AbortController().signal)).rejects.toThrow("音に未対応");
  expect(setLed).not.toHaveBeenCalled();
  expect(playTone).not.toHaveBeenCalled();
});

it.each([0, 99, 5001, NaN])("不正な発音時間では音を出さない: %s", async milliseconds => {
  const playTone = vi.fn();
  await expect(runProgram([{ ...tone, milliseconds }], { setLed() {}, playTone, stopTone() {}, async wait() {} }, new AbortController().signal)).rejects.toThrow("高さや長さ");
  expect(playTone).not.toHaveBeenCalled();
});

it("待機中の停止では、後続命令へ進まない", async () => {
  const controller = new AbortController();
  const setLed = vi.fn();
  await expect(runProgram([tone, { type: "led", on: true, blockId: "after" }], {
    setLed, playTone() {}, stopTone() {}, async wait(_, signal) {
      controller.abort();
      if (signal.aborted) throw new DOMException("停止しました", "AbortError");
    },
  }, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  expect(setLed).not.toHaveBeenCalled();
});

it("音声の利用を拒否されたら解放してエラーにする", async () => {
  const close = vi.fn(async () => {});
  vi.stubGlobal("AudioContext", function () { return { state: "suspended", resume: async () => {}, close }; });
  const sound = createBrowserTone(true);
  await expect(sound.ready()).rejects.toThrow("音をオフ");
  expect(close).toHaveBeenCalledOnce();
});

it("ミュートでは音声機能を開かず、単音は置き換え・停止・終了で解放する", async () => {
  const voices: any[] = [];
  const gains: any[] = [];
  const close = vi.fn(async () => {});
  const context = { state: "running", currentTime: 10, destination: {}, resume: vi.fn(async () => {}), close,
    createOscillator: () => { const voice = { frequency: { value: 0 }, type: "", connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as null | (() => void) }; voices.push(voice); return voice; },
    createGain: () => { const gain = { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() }; gains.push(gain); return gain; },
  };
  const constructor = vi.fn(function () { return context; });
  vi.stubGlobal("AudioContext", constructor);
  const muted = createBrowserTone(false);
  await muted.ready(); muted.play(440, 500); await muted.close();
  expect(constructor).not.toHaveBeenCalled();
  const sound = createBrowserTone(true);
  await sound.ready(); sound.play(440, 500);
  expect(voices[0].stop).toHaveBeenCalledWith(10.5);
  sound.play(262, 1000);
  expect(voices[0].disconnect).toHaveBeenCalledOnce();
  expect(gains[0].disconnect).toHaveBeenCalledOnce();
  sound.stop();
  expect(voices[1].disconnect).toHaveBeenCalledOnce();
  sound.play(523, 500);
  await sound.close();
  expect(voices[2].disconnect).toHaveBeenCalledOnce();
  expect(close).toHaveBeenCalledOnce();
});

it("自然終了でも音声ノードを解放する", async () => {
  const disconnect = vi.fn();
  const voice = { frequency: { value: 0 }, connect() {}, disconnect, start() {}, stop: vi.fn(), onended: null as null | (() => void) };
  vi.stubGlobal("AudioContext", function () { return { state: "running", currentTime: 0, destination: {}, resume: async () => {}, close: async () => {}, createOscillator: () => voice, createGain: () => ({ gain: { value: 0 }, connect() {}, disconnect }) }; });
  const sound = createBrowserTone(true);
  sound.play(440, 500); voice.onended!(); await sound.close();
  expect(voice.stop).toHaveBeenCalledOnce();
  expect(disconnect).toHaveBeenCalledTimes(2);
});

it("音声の準備が終わらなくても停止できる", async () => {
  const close = vi.fn(async () => {});
  vi.stubGlobal("AudioContext", function () { return { state: "closed", resume: () => new Promise(() => {}), close }; });
  const controller = new AbortController();
  const sound = createBrowserTone(true);
  const pending = sound.ready(controller.signal);
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(close).toHaveBeenCalledOnce();
});
