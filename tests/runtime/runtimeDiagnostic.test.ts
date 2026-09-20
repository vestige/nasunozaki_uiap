import { describe, expect, it, vi } from "vitest";
import {
  browserDiagnosticDetails,
  formatVidPid,
  RuntimeDiagnosticError,
  runtimeErrorDetails,
} from "../../web/src/features/runtime/utils/runtimeDiagnostic";

describe("runtime diagnostic details", () => {
  it("構造化エラーに失敗段階と次の操作を含める", () => {
    const cause = new DOMException("Access denied", "NotAllowedError");
    const details = runtimeErrorDetails(
      new RuntimeDiagnosticError(
        "DEVICE_CANCELLED",
        "runtime-select",
        "デバイスを選択できませんでした。",
        cause,
      ),
    );

    expect(details).toMatchObject({
      code: "DEVICE_CANCELLED",
      phase: "runtime-select",
      causeName: "NotAllowedError",
      causeMessage: "Access denied",
    });
    expect(details.nextAction).toContain("選んでください");
  });

  it("完全なUser-Agentを残さずWindows版Chromeを要約する", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0 Safari/537.36",
      hid: {},
    });
    vi.stubGlobal("window", {
      isSecureContext: true,
      location: { origin: "https://example.test" },
    });

    expect(browserDiagnosticDetails()).toEqual({
      platform: "Windows",
      browser: "Chrome 140",
      webHid: true,
      secureContext: true,
      origin: "https://example.test",
    });
    vi.unstubAllGlobals();
  });

  it("VIDとPIDを固定幅で表示する", () => {
    expect(formatVidPid(0x1209, 0xd004)).toBe("1209:D004");
  });
});
