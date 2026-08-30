import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query";
import { CH32V003_FLASH_START } from "./webhid/flashPacket";
import {
  createFlashWritePlan,
  type FlashWritePlan,
} from "./webhid/flashWritePlan";
import {
  readFeatureReport,
  readChipIdentity,
  requestUiapDevice,
  runRamRoundTrip,
  supportsWebHid,
  watchDisconnect,
} from "./webhid/device";
import type {
  ChipIdentityResult,
  FeatureReportResult,
  HidDevice,
  RoundTripResult,
} from "./webhid/types";

const errorText = (error: unknown) =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

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

  const readFeature = useMutation({
    mutationFn: () => readFeatureReport(deviceQuery.data!),
    onSuccess: (result) => client.setQueryData(queryKeys.featureReport, result),
  });

  const roundTrip = useMutation({
    mutationFn: () => runRamRoundTrip(deviceQuery.data!),
    onSuccess: (result) => client.setQueryData(queryKeys.roundTrip, result),
  });

  const identifyChip = useMutation({
    mutationFn: () => readChipIdentity(deviceQuery.data!),
    onSuccess: (result) => client.setQueryData(queryKeys.chipIdentity, result),
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
    onSuccess: (result) =>
      client.setQueryData(queryKeys.flashWriteReview, result),
  });

  const clearDiagnosticResults = () => {
    client.setQueryData(queryKeys.featureReport, null);
    client.setQueryData(queryKeys.roundTrip, null);
    client.setQueryData(queryKeys.chipIdentity, null);
    readFeature.reset();
    roundTrip.reset();
    identifyChip.reset();
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
    chipIdentity: chipIdentityQuery.data,
    flashWriteReview: flashWriteReviewQuery.data,
    connect,
    readFeature,
    roundTrip,
    identifyChip,
    reviewFlashWrite,
    errorText,
  };
}
