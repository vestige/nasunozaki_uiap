import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../query";
import { errorText, hex32 } from "../utils/diagnosticDisplay";
import type { AppendDiagnosticLog } from "../types/diagnostics";
import type { HidDevice, FlashBlockBackupResult } from "../types/webhid";
import { CH32V003_FLASH_START } from "../utils/flashPacket";
import { readFlashBlockBackup } from "../utils/device";
import { createFlashBackupFileName, formatHexDump, verifyFlashBackupBytes, type FlashBackupVerification } from "../utils/flashBackup";

export function useFlashBackup(device: HidDevice | null, appendLog: AppendDiagnosticLog) {
  const client = useQueryClient();
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
  const backupFlashBlock = useMutation({
    mutationFn: () =>
      readFlashBlockBackup(device!, CH32V003_FLASH_START),
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

  const resetResults = () => {
  client.setQueryData(queryKeys.flashBackup, null); client.setQueryData(queryKeys.flashBackupVerification, null);
  backupFlashBlock.reset(); downloadFlashBackup.reset(); verifyFlashBackup.reset();
  };
  return { flashBackupResult: flashBackupQuery.data, flashBackupVerification: flashBackupVerificationQuery.data, backupFlashBlock, downloadFlashBackup, verifyFlashBackup, resetResults };
}
