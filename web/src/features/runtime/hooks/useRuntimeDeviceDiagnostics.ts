import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../query";
import type { HidDevice } from "../../device/types/webhid";
import {
  requestUiapRuntimeDevice,
  watchRuntimeDisconnect,
} from "../utils/runtimeDevice";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export function useRuntimeDeviceDiagnostics() {
  const client = useQueryClient();
  const deviceQuery = useQuery<HidDevice | null>({
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

  const connect = useMutation({
    mutationFn: requestUiapRuntimeDevice,
    onMutate: () => {
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
      watchRuntimeDisconnect(device, () => {
        client.setQueryData(queryKeys.runtimeDevice, null);
        client.setQueryData(
          queryKeys.runtimeConnectionMessage,
          "通常動作モードのUIAPduinoが外されました。",
        );
      });
    },
    onError: (error) => {
      client.setQueryData(
        queryKeys.runtimeConnectionMessage,
        `確認できませんでした：${errorMessage(error)}`,
      );
    },
  });

  return {
    device: deviceQuery.data,
    message: messageQuery.data,
    connect,
  };
}
