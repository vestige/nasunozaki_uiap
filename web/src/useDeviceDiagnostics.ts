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
  createFlashWritePlan,
  type FlashWritePlan,
} from "./webhid/flashWritePlan";
import {
  readFeatureReport,
  readFlashSafetyState,
  readChipIdentity,
  requestUiapDevice,
  runRamRoundTrip,
  supportsWebHid,
  watchDisconnect,
} from "./webhid/device";
import type {
  ChipIdentityResult,
  FeatureReportResult,
  FlashSafetyResult,
  HidDevice,
  RoundTripResult,
} from "./webhid/types";

const errorText = (error: unknown) =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);
const hex32 = (value: number) =>
  `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;

export type FlashWriteReview = {
  fileName: string;
  plan: FlashWritePlan;
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
  const diagnosticLogQuery = useQuery<DiagnosticLogEntry[]>({
    queryKey: queryKeys.diagnosticLog,
    queryFn: async () => [],
    initialData: [],
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

  const clearDiagnosticResults = () => {
    client.setQueryData(queryKeys.featureReport, null);
    client.setQueryData(queryKeys.roundTrip, null);
    client.setQueryData(queryKeys.chipIdentity, null);
    client.setQueryData(queryKeys.flashSafety, null);
    readFeature.reset();
    roundTrip.reset();
    identifyChip.reset();
    inspectFlashSafety.reset();
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
    diagnosticLogs: diagnosticLogQuery.data,
    connect,
    readFeature,
    roundTrip,
    identifyChip,
    reviewFlashWrite,
    inspectFlashSafety,
    clearLogs,
    copyLogs,
    errorText,
  };
}
