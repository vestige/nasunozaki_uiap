import { beforeEach, describe, expect, it, vi } from "vitest";

// Exercise hook composition and guards without React rendering or real USB.
const context = vi.hoisted(() => ({ values: new Map<string, unknown>() }));
// Tests live outside web/, so target the module resolved by the Web hooks.
vi.mock("../../web/node_modules/@tanstack/react-query/build/modern/index.js", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const keyOf = (key: unknown) => JSON.stringify(key);
  const client = {
    getQueryData: (key: unknown) => context.values.get(keyOf(key)),
    setQueryData: (key: unknown, value: unknown) => {
      const result = typeof value === "function" ? value(context.values.get(keyOf(key))) : value;
      context.values.set(keyOf(key), result);
    },
  };
  return {
    ...actual,
    useQueryClient: () => client,
    useQuery: (options: { queryKey: unknown; initialData: unknown }) => {
      const key = keyOf(options.queryKey);
      if (!context.values.has(key)) context.values.set(key, options.initialData);
      return { data: context.values.get(key) };
    },
    useMutation: (options: {
      mutationFn: (arg: unknown) => unknown; onMutate?: () => unknown;
      onSuccess?: (result: unknown) => unknown; onError?: (error: unknown) => unknown;
    }) => ({
      reset: vi.fn(),
      mutateAsync: async (arg?: unknown) => {
        await options.onMutate?.();
        try {
          const result = await options.mutationFn(arg);
          await options.onSuccess?.(result);
          return result;
        } catch (error) {
          await options.onError?.(error);
          throw error;
        }
      },
    }),
  };
});
vi.mock("../../web/src/features/device/utils/device", () => ({
  supportsWebHid: () => true,
  requestUiapDevice: vi.fn(), watchDisconnect: vi.fn(),
  readFeatureReport: vi.fn(), runRamRoundTrip: vi.fn(), readChipIdentity: vi.fn(),
  readFlashSafetyState: vi.fn(), readFlashStatus: vi.fn(), unlockFlashForInvestigation: vi.fn(),
  readFlashBlockBackup: vi.fn(), runFlashEraseRestoreOnDevice: vi.fn(), restoreFlashBlockOnDevice: vi.fn(),
}));

import { useDeviceDiagnostics } from "../../web/src/features/device/hooks/useDeviceDiagnostics";
import { queryKeys } from "../../web/src/query";
import { crc32, createFlashBackupFileName } from "../../web/src/features/device/utils/flashBackup";
import * as deviceApi from "../../web/src/features/device/utils/device";

const put = (key: unknown, value: unknown) => context.values.set(JSON.stringify(key), value);
const get = (key: unknown) => context.values.get(JSON.stringify(key));
const fakeFile = (name: string, bytes: Uint8Array) => ({ name, arrayBuffer: async () => bytes.buffer }) as File;
// The mock exposes mutateAsync, while the production API remains useMutation's.
const mutate = (mutation: unknown, arg?: unknown) => (mutation as { mutateAsync: (arg?: unknown) => Promise<unknown> }).mutateAsync(arg);

beforeEach(() => { context.values.clear(); vi.clearAllMocks(); });

describe("diagnostic responsibilities", () => {
  it("バックアップの一致確認なしでは消去・復元の下位処理を呼ばない", async () => {
    await expect(mutate(useDeviceDiagnostics().eraseAndRestoreFlash)).rejects.toThrow("一致確認が必要");
    expect(deviceApi.runFlashEraseRestoreOnDevice).not.toHaveBeenCalled();
    expect(get(queryKeys.diagnosticLog)).toEqual(expect.arrayContaining([expect.objectContaining({ level: "error", action: "FLASH_ERASE_RESTORE" })]));
  });

  it("一致確認済みのバックアップだけを模擬復元処理へ渡す", async () => {
    const bytes = Array(64).fill(7);
    const device = { vendorId: 0x1209, productId: 0xb803, opened: true };
    put(queryKeys.device, device);
    put(queryKeys.flashBackup, { address: 0x08000000, bytes });
    put(queryKeys.flashBackupVerification, { matches: true });
    vi.mocked(deviceApi.runFlashEraseRestoreOnDevice).mockResolvedValue({ address: 0x08000000, backupChecksum: 1, erased: true, restored: true } as never);
    await mutate(useDeviceDiagnostics().eraseAndRestoreFlash);
    expect(deviceApi.runFlashEraseRestoreOnDevice).toHaveBeenCalledWith(device, 0x08000000, Uint8Array.from(bytes), expect.any(Function));
  });

  it("復旧ファイルの長さとCRCを確認し、不正なファイルを保持しない", async () => {
    const bytes = new Uint8Array(64).fill(7);
    const name = createFlashBackupFileName(0x08000000, crc32(bytes));
    await mutate(useDeviceDiagnostics().loadEmergencyRecoveryFile, fakeFile(name, bytes));
    expect(get(queryKeys.emergencyRecoveryFile)).toMatchObject({ fileName: name, bytes: Array.from(bytes) });
    await expect(mutate(useDeviceDiagnostics().loadEmergencyRecoveryFile, fakeFile(name, new Uint8Array(64)))).rejects.toThrow("CRC32");
    expect(get(queryKeys.emergencyRecoveryFile)).toBeNull();
    await expect(mutate(useDeviceDiagnostics().loadEmergencyRecoveryFile, fakeFile(name, new Uint8Array(63)))).rejects.toThrow("64バイト");
    await expect(mutate(useDeviceDiagnostics().restoreFromEmergencyFile)).rejects.toThrow("選んでください");
    expect(deviceApi.restoreFlashBlockOnDevice).not.toHaveBeenCalled();
  });

  it("接続と切断で診断結果を消し、復旧ファイルと書き込み計画は維持する", async () => {
    const recovery = { fileName: "backup.bin" };
    const plan = { fileName: "firmware.bin" };
    const resetKeys = [queryKeys.featureReport, queryKeys.roundTrip, queryKeys.chipIdentity, queryKeys.flashSafety,
      queryKeys.flashStatus, queryKeys.flashUnlock, queryKeys.flashBackup, queryKeys.flashBackupVerification, queryKeys.flashRecovery];
    for (const key of resetKeys) put(key, { previous: true });
    put(queryKeys.emergencyRecoveryFile, recovery); put(queryKeys.flashWriteReview, plan);
    const device = { vendorId: 0x1209, productId: 0xb803, productName: "Mock board" };
    vi.mocked(deviceApi.requestUiapDevice).mockResolvedValue(device as never);
    const diagnostics = useDeviceDiagnostics();
    await mutate(diagnostics.connect);
    for (const key of resetKeys) expect(get(key)).toBeNull();
    expect(get(queryKeys.emergencyRecoveryFile)).toBe(recovery);
    expect(get(queryKeys.flashWriteReview)).toBe(plan);
    const disconnect = vi.mocked(deviceApi.watchDisconnect).mock.calls[0][1];
    put(queryKeys.flashBackup, { previous: true });
    disconnect();
    expect(get(queryKeys.device)).toBeNull(); expect(get(queryKeys.flashBackup)).toBeNull();
    expect(get(queryKeys.connectionMessage)).toContain("外されました");
    expect(get(queryKeys.emergencyRecoveryFile)).toBe(recovery);
  });
});
