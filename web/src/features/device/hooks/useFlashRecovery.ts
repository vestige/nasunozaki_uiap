import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../query";
import { errorText, hex32 } from "../utils/diagnosticDisplay";
import type { AppendDiagnosticLog } from "../types/diagnostics";
import type { HidDevice, FlashBlockBackupResult } from "../types/webhid";
import type { EmergencyRecoveryFile } from "../types/diagnostics";
import { parseFlashBackupFileName, crc32, type FlashBackupVerification } from "../utils/flashBackup";
import { runFlashEraseRestoreOnDevice, restoreFlashBlockOnDevice } from "../utils/device";
import { FlashRecoveryError, type FlashRecoveryResult, type FlashRecoveryStage } from "../utils/flashRecoveryTransaction";

export function useFlashRecovery(device: HidDevice | null, backup: FlashBlockBackupResult | null, verification: FlashBackupVerification | null, appendLog: AppendDiagnosticLog) {
  const client = useQueryClient();
  const flashRecoveryQuery = useQuery<FlashRecoveryResult | null>({
    queryKey: queryKeys.flashRecovery,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
  });
  const emergencyRecoveryFileQuery = useQuery<EmergencyRecoveryFile | null>({
    queryKey: queryKeys.emergencyRecoveryFile,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
  });
  const emergencyRecoveryResultQuery = useQuery<FlashBlockBackupResult | null>({
    queryKey: queryKeys.emergencyRecoveryResult,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
  });

  const recoveryStageMessages: Record<FlashRecoveryStage, string> = {
    "preflight-verified": "実機の現在値と退避データの一致を確認しました。",
    "erase-complete": "先頭64バイトのerase packetが完了しました。",
    "erase-verified": "erase後の64バイトがすべて0xFFであることを確認しました。",
    "restore-complete": "元の64バイトのwrite packetが完了しました。",
    "restore-verified": "書き戻した64バイトの完全一致を確認しました。",
    "recovery-started": "異常を検出したため元データの復旧を開始しました。",
  };

  const eraseAndRestoreFlash = useMutation({
    mutationFn: async () => {
      if (!backup || !verification?.matches) {
        throw new Error("保存した復旧用ファイルの一致確認が必要です。");
      }
      return runFlashEraseRestoreOnDevice(
        device!,
        backup.address,
        Uint8Array.from(backup.bytes),
        (stage) =>
          appendLog(
            "info",
            "FLASH_ERASE_RESTORE_STEP",
            recoveryStageMessages[stage],
            {
              stage,
            },
          ),
      );
    },
    onMutate: () => {
      client.setQueryData(queryKeys.flashRecovery, null);
      appendLog(
        "warning",
        "FLASH_ERASE_RESTORE",
        "先頭64バイトの消去と自動復元を開始しました。USBを抜かないでください。",
      );
    },
    onSuccess: (result) => {
      client.setQueryData(queryKeys.flashRecovery, result);
      appendLog(
        "success",
        "FLASH_ERASE_RESTORE",
        "消去、全0xFF確認、元データ復元、完全一致確認に成功しました。",
        {
          address: hex32(result.address),
          checksum: hex32(result.backupChecksum),
          erased: result.erased,
          restored: result.restored,
        },
      );
    },
    onError: (error) =>
      appendLog(
        "error",
        "FLASH_ERASE_RESTORE",
        "消去と復元の確認を完了できませんでした。",
        {
          error: errorText(error),
          restored: error instanceof FlashRecoveryError && error.restored,
        },
      ),
  });

  const loadEmergencyRecoveryFile = useMutation({
    mutationFn: async (file: File): Promise<EmergencyRecoveryFile> => {
      const metadata = parseFlashBackupFileName(file.name);
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.length !== 64)
        throw new Error("復旧用ファイルは64バイト必要です。");
      const actualChecksum = crc32(bytes);
      if (actualChecksum !== metadata.checksum) {
        throw new Error("ファイル名のCRC32と内容が一致しません。");
      }
      return {
        fileName: file.name,
        address: metadata.address,
        checksum: actualChecksum,
        bytes: Array.from(bytes),
      };
    },
    onMutate: () => client.setQueryData(queryKeys.emergencyRecoveryFile, null),
    onSuccess: (result) => {
      client.setQueryData(queryKeys.emergencyRecoveryFile, result);
      appendLog(
        "success",
        "FLASH_EMERGENCY_FILE",
        "復旧用ファイルを検証しました。",
        {
          file: result.fileName,
          address: hex32(result.address),
          checksum: hex32(result.checksum),
        },
      );
    },
    onError: (error) =>
      appendLog(
        "error",
        "FLASH_EMERGENCY_FILE",
        "復旧用ファイルを検証できませんでした。",
        {
          error: errorText(error),
        },
      ),
  });

  const restoreFromEmergencyFile = useMutation({
    mutationFn: async () => {
      const recoveryFile = emergencyRecoveryFileQuery.data;
      if (!recoveryFile) throw new Error("復旧用ファイルを選んでください。");
      return restoreFlashBlockOnDevice(
        device!,
        recoveryFile.address,
        Uint8Array.from(recoveryFile.bytes),
      );
    },
    onMutate: () => {
      client.setQueryData(queryKeys.emergencyRecoveryResult, null);
      appendLog(
        "warning",
        "FLASH_EMERGENCY_RESTORE",
        "復旧用ファイルの書き戻しを開始しました。USBを抜かないでください。",
      );
    },
    onSuccess: (result) => {
      client.setQueryData(queryKeys.emergencyRecoveryResult, result);
      appendLog(
        "success",
        "FLASH_EMERGENCY_RESTORE",
        "元の64バイトへの復旧と完全一致を確認しました。",
        {
          address: hex32(result.address),
          checksum: hex32(result.checksum),
        },
      );
    },
    onError: (error) =>
      appendLog(
        "error",
        "FLASH_EMERGENCY_RESTORE",
        "復旧を完了できませんでした。USBを抜かないでください。",
        {
          error: errorText(error),
        },
      ),
  });

  // Preserve the emergency recovery file across reconnects, as before.
  const resetResults = () => { client.setQueryData(queryKeys.flashRecovery, null); eraseAndRestoreFlash.reset(); };
  return { flashRecoveryResult: flashRecoveryQuery.data, emergencyRecoveryFile: emergencyRecoveryFileQuery.data, emergencyRecoveryResult: emergencyRecoveryResultQuery.data, eraseAndRestoreFlash, loadEmergencyRecoveryFile, restoreFromEmergencyFile, resetResults };
}
