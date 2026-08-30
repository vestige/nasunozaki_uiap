export type DiagnosticLogLevel = "info" | "success" | "warning" | "error";

export type DiagnosticLogDetails = Record<string, string | number | boolean>;

export type DiagnosticLogEntry = {
  id: string;
  timestamp: string;
  level: DiagnosticLogLevel;
  action: string;
  message: string;
  details?: DiagnosticLogDetails;
};

export const createDiagnosticLogEntry = (
  level: DiagnosticLogLevel,
  action: string,
  message: string,
  details?: DiagnosticLogDetails,
): DiagnosticLogEntry => ({
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  timestamp: new Date().toISOString(),
  level,
  action,
  message,
  details,
});

export const formatDiagnosticLogs = (entries: DiagnosticLogEntry[]) =>
  entries
    .map((entry) => {
      const details = entry.details
        ? ` ${Object.entries(entry.details)
            .map(([key, value]) => `${key}=${String(value)}`)
            .join(" ")}`
        : "";
      return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.action}: ${entry.message}${details}`;
    })
    .join("\n");
