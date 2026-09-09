import type { BlocklyProjectFile } from "../types/project";

export const BLOCKLY_PROJECT_EXTENSION = ".uiap.json";

export function createBlocklyProjectFile(
  workspace: Record<string, unknown>,
  savedAt = new Date(),
): BlocklyProjectFile {
  return {
    format: "uiapduino-blockly-project",
    version: 1,
    savedAt: savedAt.toISOString(),
    workspace,
  };
}

export function stringifyBlocklyProjectFile(project: BlocklyProjectFile) {
  return `${JSON.stringify(project, null, 2)}\n`;
}

export function parseBlocklyProjectFile(raw: string): BlocklyProjectFile {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("JSONファイルとして読み取れませんでした。");
  }

  if (!isRecord(value) || value.format !== "uiapduino-blockly-project") {
    throw new Error("UIAPduinoのブロック作品ファイルではありません。");
  }
  if (value.version !== 1) {
    throw new Error("このバージョンの作品ファイルにはまだ対応していません。");
  }
  if (!("workspace" in value) || !isRecord(value.workspace)) {
    throw new Error("ブロック情報が見つかりませんでした。");
  }
  if (typeof value.savedAt !== "string") {
    throw new Error("保存日時が正しくありません。");
  }

  return value as BlocklyProjectFile;
}

export function createBlocklyProjectFileName(savedAt = new Date()) {
  const stamp = savedAt.toISOString().slice(0, 19).replaceAll(/[-:T]/g, "");
  return `uiapduino-project-${stamp}${BLOCKLY_PROJECT_EXTENSION}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
