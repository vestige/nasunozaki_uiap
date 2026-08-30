import { describe, expect, it } from "vitest";
import {
  createDiagnosticLogEntry,
  formatDiagnosticLogs,
} from "./diagnosticLog";

describe("diagnosticLog", () => {
  it("共有しやすい1行形式へ診断値を整形する", () => {
    const entry = createDiagnosticLogEntry(
      "success",
      "FLASH_PREFLIGHT",
      "安全状態を確認しました。",
      {
        CTLR: "0x00008080",
        OBTKEYR: "0x03FFFFDC",
        locked: true,
        readProtected: false,
      },
    );

    expect(formatDiagnosticLogs([entry])).toContain(
      "[SUCCESS] FLASH_PREFLIGHT: 安全状態を確認しました。 CTLR=0x00008080 OBTKEYR=0x03FFFFDC locked=true readProtected=false",
    );
  });

  it("ログがない場合は空文字を返す", () => {
    expect(formatDiagnosticLogs([])).toBe("");
  });
});
