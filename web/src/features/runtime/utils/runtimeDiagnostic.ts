import type { DiagnosticLogDetails } from "../../../diagnosticLog";

export type RuntimeErrorCode =
  | "WEBHID_UNSUPPORTED"
  | "DEVICE_CANCELLED"
  | "DEVICE_OPEN_FAILED"
  | "SEND_FAILED"
  | "RESPONSE_TIMEOUT"
  | "INVALID_RESPONSE"
  | "DEVICE_DISCONNECTED"
  | "FIRMWARE_FETCH_FAILED"
  | "FIRMWARE_HASH_MISMATCH"
  | "FLASH_FAILED";

export type RuntimeErrorPhase =
  | "environment"
  | "firmware-fetch"
  | "firmware-verify"
  | "bootloader-select"
  | "flash-write"
  | "runtime-select"
  | "runtime-open"
  | "led-send"
  | "led-receive";

const suggestions: Record<RuntimeErrorCode, string> = {
  WEBHID_UNSUPPORTED: "PC版ChromeまたはEdgeの最新版で開いてください。",
  DEVICE_CANCELLED: "もう一度ボタンを押し、一覧からUIAPduinoを選んでください。",
  DEVICE_OPEN_FAILED: "USBを抜き差ししてから、UIAPduinoを選び直してください。",
  SEND_FAILED: "USBを抜き、ボタンを押さずに接続し直してください。",
  RESPONSE_TIMEOUT: "USBを抜き、ボタンを押さずに接続し直してから再接続してください。",
  INVALID_RESPONSE: "他の実機操作を停止し、ページを再読み込みしてから試してください。",
  DEVICE_DISCONNECTED: "USBケーブルを確認し、デバイスを選び直してください。",
  FIRMWARE_FETCH_FAILED: "ネットワーク接続を確認し、ページを再読み込みしてください。",
  FIRMWARE_HASH_MISMATCH: "キャッシュを更新するため、ページを再読み込みしてください。",
  FLASH_FAILED: "連続して再試行せず、USB接続と書き込みモードを確認してください。",
};

export class RuntimeDiagnosticError extends Error {
  constructor(
    public readonly code: RuntimeErrorCode,
    public readonly phase: RuntimeErrorPhase,
    message: string,
    public readonly original?: unknown,
  ) {
    super(message, { cause: original });
    this.name = "RuntimeDiagnosticError";
  }

  get suggestion() {
    return suggestions[this.code];
  }
}

export function runtimeErrorDetails(error: unknown): DiagnosticLogDetails {
  if (error instanceof RuntimeDiagnosticError) {
    const original = error.original;
    return {
      code: error.code,
      phase: error.phase,
      error: error.message,
      nextAction: error.suggestion,
      causeName: original instanceof Error ? original.name : "unknown",
      causeMessage: original instanceof Error ? original.message : "",
    };
  }
  return {
    code: "UNKNOWN",
    phase: "unknown",
    error: error instanceof Error ? error.message : String(error),
    causeName: error instanceof Error ? error.name : "unknown",
  };
}

function browserSummary(userAgent: string) {
  const edge = userAgent.match(/Edg\/(\d+)/);
  if (edge) return `Edge ${edge[1]}`;
  const chrome = userAgent.match(/Chrome\/(\d+)/);
  if (chrome) return `Chrome ${chrome[1]}`;
  return "その他";
}

function platformSummary(userAgent: string) {
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Macintosh|Mac OS/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return "その他";
}

export function browserDiagnosticDetails(): DiagnosticLogDetails {
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  return {
    platform: platformSummary(userAgent),
    browser: browserSummary(userAgent),
    webHid: typeof navigator !== "undefined" && "hid" in navigator,
    secureContext: typeof window !== "undefined" && window.isSecureContext,
    origin: typeof window !== "undefined" ? window.location.origin : "unknown",
  };
}

export function formatVidPid(vendorId: number, productId: number) {
  const hex = (value: number) => value.toString(16).toUpperCase().padStart(4, "0");
  return `${hex(vendorId)}:${hex(productId)}`;
}
