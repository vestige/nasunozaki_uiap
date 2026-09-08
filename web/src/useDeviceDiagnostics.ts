import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query";
import {
  createDiagnosticLogEntry,
  formatDiagnosticLogs,
  type DiagnosticLogDetails,
  type DiagnosticLogEntry,
  type DiagnosticLogLevel,
} from "./diagnosticLog";
import { CH32V003_FLASH_START } from "./webhid/flashPacket";
import {
  createFlashBackupFileName,
  crc32,
  formatHexDump,
  parseFlashBackupFileName,
  verifyFlashBackupBytes,
  type FlashBackupVerification,
} from "./webhid/flashBackup";
import {
  createFlashWritePlan,
  type FlashWritePlan,
} from "./webhid/flashWritePlan";
import {
  readFeatureReport,
  readFlashBlockBackup,
  readFlashSafetyState,
  readFlashStatus,
  restoreFlashBlockOnDevice,
  readChipIdentity,
  requestUiapDevice,
  runFlashEraseRestoreOnDevice,
  runRamRoundTrip,
  supportsWebHid,
  unlockFlashForInvestigation,
  watchDisconnect,
} from "./webhid/device";
import type {
  ChipIdentityResult,
  FeatureReportResult,
  FlashSafetyResult,
  FlashStatusResult,
  FlashBlockBackupResult,
  FlashUnlockResult,
  HidDevice,
  RoundTripResult,
} from "./webhid/types";
import {
  FlashRecoveryError,
  type FlashRecoveryResult,
  type FlashRecoveryStage,
} from "./webhid/flashRecoveryTransaction";

const errorText = (error: unknown) =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);
const hex32 = (value: number) =>
  `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;

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

export function useDeviceDiagnostics() {
  const client = useQueryClient();
  const supported = supportsWebHid();
  const deviceQuery = useQuery<HidDevice | null>({
    queryKey: queryKeys.device,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
  });
  const messageQuery = useQuery<string>({
    queryKey: queryKeys.connectionMessage,
    queryFn: async () => "",
    initialData: "まだボードを調べていません。",
    enabled: false,
  });
  const featureQuery = useQuery<FeatureReportResult | null>({
    queryKey: queryKeys.featureReport,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
  });
  const roundTripQuery = useQuery<RoundTripResult | null>({
    queryKey: queryKeys.roundTrip,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
  });
  const chipIdentityQuery = useQuery<ChipIdentityResult | null>({
    queryKey: queryKeys.chipIdentity,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
  });
  const flashWriteReviewQuery = useQuery<FlashWriteReview | null>({
    queryKey: queryKeys.flashWriteReview,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
  });
  const flashSafetyQuery = useQuery<FlashSafetyResult | null>({
    queryKey: queryKeys.flashSafety,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
  });
  const flashStatusQuery = useQuery<FlashStatusResult | null>({
    queryKey: queryKeys.flashStatus,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
  });
  const diagnosticLogQuery = useQuery<DiagnosticLogEntry[]>({
    queryKey: queryKeys.diagnosticLog,
    queryFn: async () => [],
    initialData: [],
    enabled: false,
  });
  const flashUnlockQuery = useQuery<FlashUnlockResult | null>({
    queryKey: queryKeys.flashUnlock,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
  });
  const flashBackupQuery = useQuery<FlashBlockBackupResult | null>({
    queryKey: queryKeys.flashBackup,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
  });
  const flashBackupVerificationQuery = useQuery<FlashBackupVerification | null>(
    {
      queryKey: queryKeys.flashBackupVerification,
      queryFn: async () => null,
      initialData: null,
      enabled: false,
    },
  );
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

  const appendLog = (
    level: DiagnosticLogLevel,
    action: string,
    message: string,
    details?: DiagnosticLogDetails,
  ) =>
    client.setQueryData<DiagnosticLogEntry[]>(
      queryKeys.diagnosticLog,
      (entries = []) => [
        ...entries,
        createDiagnosticLogEntry(level, action, message, details),
      ],
    );

  const readFeature = useMutation({
    mutationFn: () => readFeatureReport(deviceQuery.data!),
    onSuccess: (result) => {
      client.setQueryData(queryKeys.featureReport, result);
      appendLog("success", "FEATURE_READ", "Feature Reportを読み取りました。", {
        bytes: result.rawBytes.length,
        allZero: result.allZero,
      });
    },
    onError: (error) =>
      appendLog("error", "FEATURE_READ", "読み取りに失敗しました。", {
        error: errorText(error),
      }),
  });

  const roundTrip = useMutation({
    mutationFn: () => runRamRoundTrip(deviceQuery.data!),
    onSuccess: (result) => {
      client.setQueryData(queryKeys.roundTrip, result);
      appendLog(
        result.succeeded ? "success" : "warning",
        "RAM_ROUND_TRIP",
        result.succeeded
          ? "RAM往復確認に成功しました。"
          : "RAM往復結果が一致しませんでした。",
        { receivedBytes: result.receivedLength },
      );
    },
    onError: (error) =>
      appendLog("error", "RAM_ROUND_TRIP", "RAM往復確認に失敗しました。", {
        error: errorText(error),
      }),
  });

  const identifyChip = useMutation({
    mutationFn: () => readChipIdentity(deviceQuery.data!),
    onSuccess: (result) => {
      client.setQueryData(queryKeys.chipIdentity, result);
      appendLog("success", "CHIP_IDENTITY", "チップ識別値を読み取りました。", {
        address: hex32(result.address),
        value: hex32(result.value),
        attempts: result.attempts,
      });
    },
    onError: (error) =>
      appendLog("error", "CHIP_IDENTITY", "識別値の読み取りに失敗しました。", {
        error: errorText(error),
      }),
  });

  const inspectFlashSafety = useMutation({
    mutationFn: () => readFlashSafetyState(deviceQuery.data!),
    onSuccess: (result) => {
      client.setQueryData(queryKeys.flashSafety, result);
      appendLog(
        result.safeToUnlock ? "success" : "warning",
        "FLASH_PREFLIGHT",
        result.safeToUnlock
          ? "flashはロック中で、read protectionは検出されませんでした。"
          : "flashの安全状態に注意が必要です。",
        {
          CTLR: hex32(result.controlValue),
          OBTKEYR: hex32(result.protectionValue),
          locked: result.locked,
          readProtected: result.readProtected,
          attempts: result.attempts,
        },
      );
    },
    onError: (error) =>
      appendLog("error", "FLASH_PREFLIGHT", "安全状態の確認に失敗しました。", {
        error: errorText(error),
      }),
  });

  const inspectFlashStatus = useMutation({
    mutationFn: () => readFlashStatus(deviceQuery.data!),
    onMutate: () => {
      client.setQueryData(queryKeys.flashStatus, null);
      appendLog(
        "info",
        "FLASH_STATUS_DIAGNOSTIC",
        "flash statusの読み取り専用診断を開始しました。",
      );
    },
    onSuccess: (result) => {
      client.setQueryData(queryKeys.flashStatus, result);
      appendLog(
        result.busy || result.writeProtectionError ? "warning" : "success",
        "FLASH_STATUS_DIAGNOSTIC",
        result.busy || result.writeProtectionError
          ? "flash statusに注意が必要なフラグがあります。"
          : "BUSYと書き込み保護エラーは検出されませんでした。",
        {
          CTLR: hex32(result.controlValue),
          STATR: hex32(result.statusValue),
          OBTKEYR: hex32(result.protectionValue),
          busy: result.busy,
          writeProtectionError: result.writeProtectionError,
          endOfOperation: result.endOfOperation,
          statusMode: result.statusMode,
          statusLocked: result.statusLocked,
          attempts: result.attempts,
        },
      );
    },
    onError: (error) =>
      appendLog(
        "error",
        "FLASH_STATUS_DIAGNOSTIC",
        "flash statusを確認できませんでした。",
        { error: errorText(error) },
      ),
  });

  const reviewFlashWrite = useMutation({
    mutationFn: async (file: File): Promise<FlashWriteReview> => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      return {
        fileName: file.name,
        plan: createFlashWritePlan(CH32V003_FLASH_START, bytes.length),
      };
    },
    onMutate: () => client.setQueryData(queryKeys.flashWriteReview, null),
    onSuccess: (result) => {
      client.setQueryData(queryKeys.flashWriteReview, result);
      appendLog("info", "FLASH_DRY_RUN", "書き込み計画を作成しました。", {
        file: result.fileName,
        bytes: result.plan.targetLength,
        address: hex32(result.plan.targetAddress),
        blocks: result.plan.blocks.length,
      });
    },
    onError: (error) =>
      appendLog(
        "error",
        "FLASH_DRY_RUN",
        "書き込み計画を作成できませんでした。",
        {
          error: errorText(error),
        },
      ),
  });

  const unlockFlash = useMutation({
    mutationFn: () => unlockFlashForInvestigation(deviceQuery.data!),
    onMutate: () => {
      client.setQueryData(queryKeys.flashUnlock, null);
      appendLog(
        "warning",
        "FLASH_UNLOCK",
        "flash unlockの実機確認を開始しました。erase・writeは行いません。",
      );
    },
    onSuccess: (result) => {
      client.setQueryData(queryKeys.flashUnlock, result);
      client.setQueryData(queryKeys.flashSafety, result.after);
      appendLog(
        "success",
        "FLASH_UNLOCK",
        "flash unlock後の状態を確認しました。",
        {
          packets: result.completedPackets,
          beforeCTLR: hex32(result.before.controlValue),
          afterCTLR: hex32(result.after.controlValue),
          lockedAfter: result.after.locked,
          readProtectedAfter: result.after.readProtected,
        },
      );
    },
    onError: (error) =>
      appendLog(
        "error",
        "FLASH_UNLOCK",
        "flash unlockを完了できませんでした。",
        {
          error: errorText(error),
        },
      ),
  });

  const backupFlashBlock = useMutation({
    mutationFn: () =>
      readFlashBlockBackup(deviceQuery.data!, CH32V003_FLASH_START),
    onMutate: () => {
      client.setQueryData(queryKeys.flashBackup, null);
      appendLog(
        "info",
        "FLASH_BACKUP",
        "先頭64バイトの読み取り専用退避を開始しました。",
        { address: hex32(CH32V003_FLASH_START) },
      );
    },
    onSuccess: (result) => {
      client.setQueryData(queryKeys.flashBackup, result);
      appendLog("success", "FLASH_BACKUP", "64バイトの退避に成功しました。", {
        address: hex32(result.address),
        bytes: result.bytes.length,
        checksum: hex32(result.checksum),
        allErased: result.allErased,
        attempts: result.attempts,
        data: formatHexDump(result.bytes),
      });
    },
    onError: (error) =>
      appendLog("error", "FLASH_BACKUP", "64バイトを退避できませんでした。", {
        error: errorText(error),
      }),
  });

  const downloadFlashBackup = useMutation({
    mutationFn: async () => {
      const backup = flashBackupQuery.data;
      if (!backup) throw new Error("先に64バイトを読み取ってください。");
      const fileName = createFlashBackupFileName(
        backup.address,
        backup.checksum,
      );
      const blob = new Blob([Uint8Array.from(backup.bytes)], {
        type: "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      return fileName;
    },
    onSuccess: (fileName) =>
      appendLog(
        "success",
        "FLASH_BACKUP_EXPORT",
        "退避ファイルをPCへ保存しました。",
        { file: fileName, bytes: 64 },
      ),
    onError: (error) =>
      appendLog(
        "error",
        "FLASH_BACKUP_EXPORT",
        "退避ファイルを保存できませんでした。",
        { error: errorText(error) },
      ),
  });

  const verifyFlashBackup = useMutation({
    mutationFn: async (file: File) => {
      const backup = flashBackupQuery.data;
      if (!backup) throw new Error("先に64バイトを読み取ってください。");
      const candidate = new Uint8Array(await file.arrayBuffer());
      return verifyFlashBackupBytes(file.name, candidate, backup.bytes);
    },
    onMutate: () =>
      client.setQueryData(queryKeys.flashBackupVerification, null),
    onSuccess: (result) => {
      client.setQueryData(queryKeys.flashBackupVerification, result);
      appendLog(
        result.matches ? "success" : "error",
        "FLASH_BACKUP_VERIFY",
        result.matches
          ? "保存した退避ファイルが読み取り結果と一致しました。"
          : "退避ファイルが読み取り結果と一致しません。",
        {
          file: result.fileName,
          bytes: result.length,
          checksum: hex32(result.checksum),
          matches: result.matches,
        },
      );
    },
    onError: (error) =>
      appendLog(
        "error",
        "FLASH_BACKUP_VERIFY",
        "退避ファイルを照合できませんでした。",
        { error: errorText(error) },
      ),
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
      const backup = flashBackupQuery.data;
      const verification = flashBackupVerificationQuery.data;
      if (!backup || !verification?.matches) {
        throw new Error("保存した復旧用ファイルの一致確認が必要です。");
      }
      return runFlashEraseRestoreOnDevice(
        deviceQuery.data!,
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
        deviceQuery.data!,
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

  const clearDiagnosticResults = () => {
    client.setQueryData(queryKeys.featureReport, null);
    client.setQueryData(queryKeys.roundTrip, null);
    client.setQueryData(queryKeys.chipIdentity, null);
    client.setQueryData(queryKeys.flashSafety, null);
    client.setQueryData(queryKeys.flashStatus, null);
    client.setQueryData(queryKeys.flashUnlock, null);
    client.setQueryData(queryKeys.flashBackup, null);
    client.setQueryData(queryKeys.flashBackupVerification, null);
    client.setQueryData(queryKeys.flashRecovery, null);
    readFeature.reset();
    roundTrip.reset();
    identifyChip.reset();
    inspectFlashSafety.reset();
    inspectFlashStatus.reset();
    unlockFlash.reset();
    backupFlashBlock.reset();
    downloadFlashBackup.reset();
    verifyFlashBackup.reset();
    eraseAndRestoreFlash.reset();
  };

  const connect = useMutation({
    mutationFn: requestUiapDevice,
    onMutate: () => {
      appendLog("info", "DEVICE_CONNECT", "デバイス選択を開始しました。");
      client.setQueryData(
        queryKeys.connectionMessage,
        "一覧から「32V003」を選んでください。",
      );
    },
    onSuccess: (device) => {
      client.setQueryData(queryKeys.device, device);
      clearDiagnosticResults();
      client.setQueryData(
        queryKeys.connectionMessage,
        "ボード情報を取得できました。Phase 0の接続確認は成功です。",
      );
      appendLog("success", "DEVICE_CONNECT", "UIAPduinoへ接続しました。", {
        product: device.productName || "名称なし",
        vendorId: `0x${device.vendorId.toString(16).toUpperCase().padStart(4, "0")}`,
        productId: `0x${device.productId.toString(16).toUpperCase().padStart(4, "0")}`,
      });
      watchDisconnect(device, () => {
        client.setQueryData(queryKeys.device, null);
        clearDiagnosticResults();
        client.setQueryData(
          queryKeys.connectionMessage,
          "UIAPduinoが外されました。接続手順どおりにつなぎ直して、もう一度調べてください。",
        );
        appendLog("warning", "DEVICE_DISCONNECT", "UIAPduinoが外されました。");
      });
    },
    onError: (error) => {
      client.setQueryData(
        queryKeys.connectionMessage,
        `接続できませんでした：${errorText(error)}`,
      );
      appendLog("error", "DEVICE_CONNECT", "接続できませんでした。", {
        error: errorText(error),
      });
    },
  });

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

  return {
    supported,
    device: deviceQuery.data,
    message: messageQuery.data,
    featureReport: featureQuery.data,
    roundTripResult: roundTripQuery.data,
    chipIdentity: chipIdentityQuery.data,
    flashWriteReview: flashWriteReviewQuery.data,
    flashSafety: flashSafetyQuery.data,
    flashStatus: flashStatusQuery.data,
    flashUnlockResult: flashUnlockQuery.data,
    flashBackupResult: flashBackupQuery.data,
    flashBackupVerification: flashBackupVerificationQuery.data,
    flashRecoveryResult: flashRecoveryQuery.data,
    emergencyRecoveryFile: emergencyRecoveryFileQuery.data,
    emergencyRecoveryResult: emergencyRecoveryResultQuery.data,
    diagnosticLogs: diagnosticLogQuery.data,
    connect,
    readFeature,
    roundTrip,
    identifyChip,
    reviewFlashWrite,
    inspectFlashSafety,
    inspectFlashStatus,
    unlockFlash,
    backupFlashBlock,
    downloadFlashBackup,
    verifyFlashBackup,
    eraseAndRestoreFlash,
    loadEmergencyRecoveryFile,
    restoreFromEmergencyFile,
    clearLogs,
    copyLogs,
    errorText,
  };
}
