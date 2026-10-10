import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../query";
import type { AppendDiagnosticLog } from "../types/diagnostics";
import { createDiagnosticLogEntry, formatDiagnosticLogs, type DiagnosticLogEntry } from "../../../diagnosticLog";

export function useDiagnosticLogs() {
  const client = useQueryClient();
  const diagnosticLogQuery = useQuery<DiagnosticLogEntry[]>({
    queryKey: queryKeys.diagnosticLog,
    queryFn: async () => [],
    initialData: [],
    enabled: false,
  });
  const appendLog: AppendDiagnosticLog = (level, action, message, details) =>
    client.setQueryData<DiagnosticLogEntry[]>(
      queryKeys.diagnosticLog,
      (entries = []) => [
        ...entries,
        createDiagnosticLogEntry(level, action, message, details),
      ],
    );

  const clearLogs = useMutation({
    mutationFn: async () => undefined,
    onSuccess: () => client.setQueryData(queryKeys.diagnosticLog, []),
  });

  const copyLogs = useMutation({
    mutationFn: async () => {
      const entries =
        client.getQueryData<DiagnosticLogEntry[]>(queryKeys.diagnosticLog) ??
        [];
      await navigator.clipboard.writeText(formatDiagnosticLogs(entries));
    },
  });

  return { diagnosticLogs: diagnosticLogQuery.data, appendLog, clearLogs, copyLogs };
}
