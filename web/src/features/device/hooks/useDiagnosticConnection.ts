import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../query";
import { errorText } from "../utils/diagnosticDisplay";
import type { AppendDiagnosticLog } from "../types/diagnostics";
import type { HidDevice } from "../types/webhid";
import { supportsWebHid, requestUiapDevice, watchDisconnect } from "../utils/device";

export function useDiagnosticConnection(resetResults: () => void, appendLog: AppendDiagnosticLog) {
  const client = useQueryClient();
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
      resetResults();
      client.setQueryData(
        queryKeys.connectionMessage,
        "ボード情報を取得できました。接続確認は成功です。",
      );
      appendLog("success", "DEVICE_CONNECT", "UIAPduinoへ接続しました。", {
        product: device.productName || "名称なし",
        vendorId: `0x${device.vendorId.toString(16).toUpperCase().padStart(4, "0")}`,
        productId: `0x${device.productId.toString(16).toUpperCase().padStart(4, "0")}`,
      });
      watchDisconnect(device, () => {
        client.setQueryData(queryKeys.device, null);
        resetResults();
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

  return { supported: supportsWebHid(), device: deviceQuery.data, message: messageQuery.data, connect };
}
