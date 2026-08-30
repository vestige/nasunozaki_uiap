import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query";
import {
  readFeatureReport,
  requestUiapDevice,
  runRamRoundTrip,
  supportsWebHid,
  watchDisconnect,
} from "./webhid/device";
import type {
  FeatureReportResult,
  HidDevice,
  RoundTripResult,
} from "./webhid/types";

const errorText = (error: unknown) =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

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

  const readFeature = useMutation({
    mutationFn: () => readFeatureReport(deviceQuery.data!),
    onSuccess: (result) => client.setQueryData(queryKeys.featureReport, result),
  });

  const roundTrip = useMutation({
    mutationFn: () => runRamRoundTrip(deviceQuery.data!),
    onSuccess: (result) => client.setQueryData(queryKeys.roundTrip, result),
  });

  const clearDiagnosticResults = () => {
    client.setQueryData(queryKeys.featureReport, null);
    client.setQueryData(queryKeys.roundTrip, null);
    readFeature.reset();
    roundTrip.reset();
  };

  const connect = useMutation({
    mutationFn: requestUiapDevice,
    onMutate: () =>
      client.setQueryData(
        queryKeys.connectionMessage,
        "一覧から「32V003」を選んでください。",
      ),
    onSuccess: (device) => {
      client.setQueryData(queryKeys.device, device);
      clearDiagnosticResults();
      client.setQueryData(
        queryKeys.connectionMessage,
        "ボード情報を取得できました。Phase 0の接続確認は成功です。",
      );
      watchDisconnect(device, () => {
        client.setQueryData(queryKeys.device, null);
        clearDiagnosticResults();
        client.setQueryData(
          queryKeys.connectionMessage,
          "UIAPduinoが外されました。接続手順どおりにつなぎ直して、もう一度調べてください。",
        );
      });
    },
    onError: (error) =>
      client.setQueryData(
        queryKeys.connectionMessage,
        `接続できませんでした：${errorText(error)}`,
      ),
  });

  return {
    supported,
    device: deviceQuery.data,
    message: messageQuery.data,
    featureReport: featureQuery.data,
    roundTripResult: roundTripQuery.data,
    connect,
    readFeature,
    roundTrip,
    errorText,
  };
}
