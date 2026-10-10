import { useDiagnosticLogs } from "./useDiagnosticLogs";
import { useDiagnosticConnection } from "./useDiagnosticConnection";
import { useBootloaderChecks } from "./useBootloaderChecks";
import { useFlashBackup } from "./useFlashBackup";
import { useFlashRecovery } from "./useFlashRecovery";
import { errorText } from "../utils/diagnosticDisplay";
export type { FlashWriteReview, EmergencyRecoveryFile } from "../types/diagnostics";

// Compose the responsibilities while keeping the UI-facing API unchanged.

export function useDeviceDiagnostics() {
  const { appendLog, ...logs } = useDiagnosticLogs();
  const connection = useDiagnosticConnection(() => {
  resetChecks(); resetBackup(); resetRecovery();
  }, appendLog);
  const { resetResults: resetChecks, ...checks } = useBootloaderChecks(connection.device, appendLog);
  const { resetResults: resetBackup, ...backup } = useFlashBackup(connection.device, appendLog);
  const { resetResults: resetRecovery, ...recovery } = useFlashRecovery(
  connection.device, backup.flashBackupResult, backup.flashBackupVerification, appendLog,
  );
  return { ...connection, ...checks, ...backup, ...recovery, ...logs, errorText };
}
