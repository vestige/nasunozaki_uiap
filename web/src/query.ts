import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Number.POSITIVE_INFINITY,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export const queryKeys = {
  device: ["webhid", "device"] as const,
  connectionMessage: ["webhid", "connection-message"] as const,
  featureReport: ["webhid", "feature-report"] as const,
  roundTrip: ["webhid", "round-trip"] as const,
  chipIdentity: ["webhid", "chip-identity"] as const,
  flashWriteReview: ["flash", "write-review"] as const,
  flashSafety: ["flash", "safety"] as const,
  flashStatus: ["flash", "status-diagnostic"] as const,
  flashUnlock: ["flash", "unlock"] as const,
  flashBackup: ["flash", "backup"] as const,
  flashBackupVerification: ["flash", "backup-verification"] as const,
  flashRecovery: ["flash", "erase-restore"] as const,
  emergencyRecoveryFile: ["flash", "emergency-recovery-file"] as const,
  emergencyRecoveryResult: ["flash", "emergency-recovery-result"] as const,
  diagnosticLog: ["diagnostics", "log"] as const,
  blocklyProgram: ["blockly", "program"] as const,
  simulatorLed: ["blockly", "simulator-led"] as const,
  simulatorBlock: ["blockly", "simulator-block"] as const,
  blocklySaveStatus: ["blockly", "save-status"] as const,
  runtimeDevice: ["runtime", "device"] as const,
  runtimeConnectionMessage: ["runtime", "connection-message"] as const,
};
