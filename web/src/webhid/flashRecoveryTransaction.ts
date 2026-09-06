import { crc32, validateFlashBackupAddress } from "./flashBackup";
import { CH32V003_FLASH_BLOCK_SIZE } from "./flashPacket";
import type { FlashSafetyResult } from "./types";

export type FlashRecoveryAdapter = {
  readSafety(): Promise<FlashSafetyResult>;
  readBlock(address: number): Promise<Uint8Array>;
  eraseBlock(address: number): Promise<void>;
  writeBlock(address: number, data: Uint8Array): Promise<void>;
};

export type FlashRecoveryResult = {
  address: number;
  backupChecksum: number;
  erased: true;
  restored: true;
};

export type FlashRecoveryStage =
  | "preflight-verified"
  | "erase-complete"
  | "erase-verified"
  | "restore-complete"
  | "restore-verified"
  | "recovery-started";

export class FlashRecoveryError extends Error {
  readonly restored: boolean;
  readonly cause: unknown;

  constructor(message: string, cause: unknown, restored: boolean) {
    super(message);
    this.name = "FlashRecoveryError";
    this.cause = cause;
    this.restored = restored;
  }
}

const bytesEqual = (left: Uint8Array, right: Uint8Array) =>
  left.length === right.length &&
  left.every((byte, index) => byte === right[index]);

async function recoverBlock(
  adapter: FlashRecoveryAdapter,
  address: number,
  backup: Uint8Array,
) {
  const current = await adapter.readBlock(address);
  if (bytesEqual(current, backup)) return true;
  await adapter.writeBlock(address, backup);
  return bytesEqual(await adapter.readBlock(address), backup);
}

export async function runFlashEraseRestoreTransaction(
  adapter: FlashRecoveryAdapter,
  address: number,
  backup: Uint8Array,
  onStage: (stage: FlashRecoveryStage) => void = () => undefined,
): Promise<FlashRecoveryResult> {
  validateFlashBackupAddress(address);
  if (backup.length !== CH32V003_FLASH_BLOCK_SIZE) {
    throw new RangeError("復旧元は64バイト固定です。");
  }

  const safety = await adapter.readSafety();
  if (safety.locked || safety.readProtected) {
    throw new Error("unlock済み・read protectionなしでないため中止しました。");
  }
  if (!bytesEqual(await adapter.readBlock(address), backup)) {
    throw new Error(
      "実機内容が照合済みの退避データと一致しないため中止しました。",
    );
  }
  onStage("preflight-verified");

  let destructiveStarted = false;
  try {
    destructiveStarted = true;
    await adapter.eraseBlock(address);
    onStage("erase-complete");
    const erased = await adapter.readBlock(address);
    if (!erased.every((byte) => byte === 0xff)) {
      throw new Error("erase後の64バイトが全0xFFではありません。");
    }
    onStage("erase-verified");
    await adapter.writeBlock(address, backup);
    onStage("restore-complete");
    if (!bytesEqual(await adapter.readBlock(address), backup)) {
      throw new Error("write後の64バイトが退避データと一致しません。");
    }
    onStage("restore-verified");
    return {
      address,
      backupChecksum: crc32(backup),
      erased: true,
      restored: true,
    };
  } catch (cause) {
    if (!destructiveStarted) throw cause;
    try {
      onStage("recovery-started");
      const restored = await recoverBlock(adapter, address, backup);
      throw new FlashRecoveryError(
        restored
          ? "処理は失敗しましたが、元の64バイトへの復旧を確認しました。"
          : "処理に失敗し、元の64バイトへの復旧も確認できませんでした。",
        cause,
        restored,
      );
    } catch (recoveryCause) {
      if (recoveryCause instanceof FlashRecoveryError) throw recoveryCause;
      throw new FlashRecoveryError(
        "処理に失敗し、復旧処理でもエラーが発生しました。",
        cause,
        false,
      );
    }
  }
}
