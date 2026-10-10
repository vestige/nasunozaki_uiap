import type { FlashWritePlan } from "../utils/flashWritePlan";
import type { DiagnosticLogLevel, DiagnosticLogDetails } from "../../../diagnosticLog";
export type FlashWriteReview = {
  fileName: string;
  plan: FlashWritePlan;
};

export type EmergencyRecoveryFile = {
  fileName: string;
  address: number;
  checksum: number;
  bytes: number[];
};

export type AppendDiagnosticLog = (level: DiagnosticLogLevel, action: string, message: string, details?: DiagnosticLogDetails) => void;
