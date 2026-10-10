import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../query";
import { errorText, hex32 } from "../utils/diagnosticDisplay";
import type { AppendDiagnosticLog } from "../types/diagnostics";
import type { HidDevice, FeatureReportResult, RoundTripResult, ChipIdentityResult, FlashSafetyResult, FlashStatusResult, FlashUnlockResult } from "../types/webhid";
import type { FlashWriteReview } from "../types/diagnostics";
import { CH32V003_FLASH_START } from "../utils/flashPacket";
import { createFlashWritePlan } from "../utils/flashWritePlan";
import { readFeatureReport, runRamRoundTrip, readChipIdentity, readFlashSafetyState, readFlashStatus, unlockFlashForInvestigation } from "../utils/device";

export function useBootloaderChecks(device: HidDevice | null, appendLog: AppendDiagnosticLog) {
  const client = useQueryClient();
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
  const flashUnlockQuery = useQuery<FlashUnlockResult | null>({
    queryKey: queryKeys.flashUnlock,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
  });
  const readFeature = useMutation({
    mutationFn: () => readFeatureReport(device!),
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
    mutationFn: () => runRamRoundTrip(device!),
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
    mutationFn: () => readChipIdentity(device!),
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
    mutationFn: () => readFlashSafetyState(device!),
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
    mutationFn: () => readFlashStatus(device!),
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
    mutationFn: () => unlockFlashForInvestigation(device!),
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

  const resetResults = () => {
  for (const key of [queryKeys.featureReport, queryKeys.roundTrip, queryKeys.chipIdentity, queryKeys.flashSafety, queryKeys.flashStatus, queryKeys.flashUnlock]) client.setQueryData(key, null);
  for (const mutation of [readFeature, roundTrip, identifyChip, inspectFlashSafety, inspectFlashStatus, unlockFlash]) mutation.reset();
  };
  return { featureReport: featureQuery.data, roundTripResult: roundTripQuery.data, chipIdentity: chipIdentityQuery.data,
  flashWriteReview: flashWriteReviewQuery.data, flashSafety: flashSafetyQuery.data, flashStatus: flashStatusQuery.data,
  flashUnlockResult: flashUnlockQuery.data, readFeature, roundTrip, identifyChip, reviewFlashWrite, inspectFlashSafety, inspectFlashStatus, unlockFlash, resetResults };
}
