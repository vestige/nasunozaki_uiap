import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDiagnosticLogEntry,
  type DiagnosticLogEntry,
} from "../../../diagnosticLog";
import { queryKeys } from "../../../query";
import type { RuntimeHidDevice } from "../types/transport";
import {
  requestUiapRuntimeDevice,
  watchRuntimeDisconnect,
} from "../utils/runtimeDevice";
import {
  formatRuntimeBytes,
  runRuntimeLedDiagnostic,
} from "../utils/runtimeLedDiagnostic";
import { readRuntimeButton } from "../utils/runtimeButtonDiagnostic";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export function useRuntimeDeviceDiagnostics() {
  const client = useQueryClient();
  const deviceQuery = useQuery<RuntimeHidDevice | null>({
    queryKey: queryKeys.runtimeDevice,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
  });
  const messageQuery = useQuery<string>({
    queryKey: queryKeys.runtimeConnectionMessage,
    queryFn: async () => "",
    initialData: "通常動作モードの実機情報はまだ確認していません。",
    enabled: false,
  });

  const appendLog = (
    level: "info" | "success" | "warning" | "error",
    action: string,
    message: string,
    details?: Record<string, string | number | boolean>,
  ) =>
    client.setQueryData<DiagnosticLogEntry[]>(
      queryKeys.diagnosticLog,
      (entries = []) => [
        ...entries,
        createDiagnosticLogEntry(level, action, message, details),
      ],
    );

  const connect = useMutation({
    mutationFn: requestUiapRuntimeDevice,
    onMutate: () => {
      appendLog("info", "RUNTIME_CONNECT", "通常動作モードのデバイス選択を開始しました。");
      client.setQueryData(
        queryKeys.runtimeConnectionMessage,
        "通常動作モードのUIAPduinoを選んでください。",
      );
    },
    onSuccess: (device) => {
      client.setQueryData(queryKeys.runtimeDevice, device);
      client.setQueryData(
        queryKeys.runtimeConnectionMessage,
        "通常動作モードのHID情報を取得しました。まだ命令は送信していません。",
      );
      appendLog("success", "RUNTIME_CONNECT", "教育用ランタイムへ接続しました。", {
        product: device.productName ?? "",
        vendorId: "0x1209",
        productId: "0xD004",
      });
      watchRuntimeDisconnect(device, () => {
        client.setQueryData(queryKeys.runtimeDevice, null);
        client.setQueryData(
          queryKeys.runtimeConnectionMessage,
          "通常動作モードのUIAPduinoが外されました。",
        );
        appendLog("warning", "RUNTIME_DISCONNECT", "教育用ランタイムが外されました。");
      });
    },
    onError: (error) => {
      client.setQueryData(
        queryKeys.runtimeConnectionMessage,
        `確認できませんでした：${errorMessage(error)}`,
      );
      appendLog("error", "RUNTIME_CONNECT", "教育用ランタイムへ接続できませんでした。", {
        error: errorMessage(error),
      });
    },
  });

  const ledCheck = useMutation({
    mutationFn: () => runRuntimeLedDiagnostic(deviceQuery.data!),
    onMutate: () => {
      client.setQueryData(
        queryKeys.runtimeConnectionMessage,
        "LEDを1回だけ点灯・消灯し、応答を確認しています。",
      );
      appendLog("info", "RUNTIME_LED_CHECK", "LED往復確認を開始しました。");
    },
    onSuccess: (result) => {
      client.setQueryData(
        queryKeys.runtimeConnectionMessage,
        "LEDの点灯・消灯と2回の成功応答を確認しました。",
      );
      appendLog("success", "RUNTIME_LED_CHECK", "LED往復確認に成功しました。", {
        reportId: 0,
        sentOn: formatRuntimeBytes(result.sent[0]),
        receivedOn: formatRuntimeBytes(result.received[0]),
        sentOff: formatRuntimeBytes(result.sent[1]),
        receivedOff: formatRuntimeBytes(result.received[1]),
      });
    },
    onError: (error) => {
      client.setQueryData(
        queryKeys.runtimeConnectionMessage,
        `LED往復確認に失敗しました：${errorMessage(error)}`,
      );
      appendLog("error", "RUNTIME_LED_CHECK", "LED往復確認に失敗しました。", {
        error: errorMessage(error),
      });
    },
  });

  const buttonCheck = useMutation({
    mutationFn: () => readRuntimeButton(deviceQuery.data!),
    onMutate: () => {
      client.setQueryData(
        queryKeys.runtimeConnectionMessage,
        "D5につないだボタンの状態を読み取っています。",
      );
      appendLog("info", "RUNTIME_BUTTON_CHECK", "外付けボタンの読み取りを開始しました。");
    },
    onSuccess: (pressed) => {
      const state = pressed ? "押されています" : "押されていません";
      client.setQueryData(
        queryKeys.runtimeConnectionMessage,
        `D5につないだボタンは${state}。`,
      );
      appendLog("success", "RUNTIME_BUTTON_CHECK", "外付けボタンの状態を読み取りました。", {
        pin: "D5 / PC3",
        pressed,
      });
    },
    onError: (error) => {
      client.setQueryData(
        queryKeys.runtimeConnectionMessage,
        `ボタンを確認できませんでした：${errorMessage(error)}`,
      );
      appendLog("error", "RUNTIME_BUTTON_CHECK", "外付けボタンを読み取れませんでした。", {
        error: errorMessage(error),
      });
    },
  });

  return {
    device: deviceQuery.data,
    message: messageQuery.data,
    connect,
    ledCheck,
    buttonCheck,
  };
}
