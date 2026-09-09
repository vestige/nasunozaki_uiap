import { describe, expect, it } from "vitest";
import {
  createBlocklyProjectFile,
  createBlocklyProjectFileName,
  parseBlocklyProjectFile,
  stringifyBlocklyProjectFile,
} from "../../features/blockly/utils/projectFile";

describe("Blockly project file", () => {
  const savedAt = new Date("2026-09-09T01:02:03.000Z");
  const workspace = { blocks: { languageVersion: 0, blocks: [] } };

  it("version付き作品ファイルを作って読み戻せる", () => {
    const project = createBlocklyProjectFile(workspace, savedAt);

    expect(
      parseBlocklyProjectFile(stringifyBlocklyProjectFile(project)),
    ).toEqual(project);
  });

  it("作品ファイルではないJSONと未知のversionを拒否する", () => {
    expect(() => parseBlocklyProjectFile("{}")).toThrow(
      "UIAPduinoのブロック作品ファイルではありません。",
    );
    expect(() =>
      parseBlocklyProjectFile(
        JSON.stringify({
          format: "uiapduino-blockly-project",
          version: 2,
          savedAt: savedAt.toISOString(),
          workspace,
        }),
      ),
    ).toThrow("このバージョンの作品ファイルにはまだ対応していません。");
  });

  it("日時を含む専用拡張子のファイル名を作る", () => {
    expect(createBlocklyProjectFileName(savedAt)).toBe(
      "uiapduino-project-20260909010203.uiap.json",
    );
  });
});
