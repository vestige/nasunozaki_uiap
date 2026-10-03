import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  embedStandaloneProgram,
  encodeStandaloneProgram,
} from "../web/src/features/blockly/utils/standaloneProgram";
import type { ProgramInstruction } from "../web/src/features/blockly/utils/program";

const root = resolve(import.meta.dirname, "..");
const basePath = resolve(root, "firmware/workshop-runtime/workshop-runtime.bin");
const outputPath = resolve(root, ".build/standalone-blink.bin");

const program: ProgramInstruction[] = [{
  type: "forever",
  blockId: "standalone-blink",
  body: [
    { type: "led", on: true, blockId: "standalone-led-on" },
    { type: "wait", milliseconds: 500, blockId: "standalone-wait-on" },
    { type: "led", on: false, blockId: "standalone-led-off" },
    { type: "wait", milliseconds: 500, blockId: "standalone-wait-off" },
  ],
}];

const baseImage = new Uint8Array(readFileSync(basePath));
const image = embedStandaloneProgram(baseImage, encodeStandaloneProgram(program));
writeFileSync(outputPath, image);

console.log(outputPath);
