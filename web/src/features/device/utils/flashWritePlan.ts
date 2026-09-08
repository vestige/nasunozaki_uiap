import {
  CH32V003_FLASH_BLOCK_SIZE,
  CH32V003_FLASH_END,
  CH32V003_FLASH_START,
} from "./flashPacket";

export type FlashWriteStep =
  | { kind: "preflight" }
  | { kind: "unlock" }
  | { kind: "backup"; address: number; length: number }
  | {
      kind: "merge";
      address: number;
      writeOffset: number;
      writeLength: number;
    }
  | { kind: "erase"; address: number; length: number }
  | { kind: "write"; address: number; length: number }
  | { kind: "verify"; address: number; length: number };

export type FlashWritePlan = {
  targetAddress: number;
  targetLength: number;
  blocks: number[];
  steps: FlashWriteStep[];
  executable: false;
};

export function createFlashWritePlan(
  targetAddress: number,
  targetLength: number,
): FlashWritePlan {
  if (!Number.isInteger(targetAddress) || !Number.isInteger(targetLength)) {
    throw new RangeError("書き込み先と長さは整数で指定してください。");
  }
  if (targetLength <= 0) {
    throw new RangeError("書き込みデータは1バイト以上必要です。");
  }
  const targetEnd = targetAddress + targetLength;
  if (
    targetAddress < CH32V003_FLASH_START ||
    targetEnd > CH32V003_FLASH_END ||
    targetEnd < targetAddress
  ) {
    throw new RangeError("書き込み範囲がCH32V003の16KB flash外です。");
  }

  const firstBlock =
    Math.floor(
      (targetAddress - CH32V003_FLASH_START) / CH32V003_FLASH_BLOCK_SIZE,
    ) *
      CH32V003_FLASH_BLOCK_SIZE +
    CH32V003_FLASH_START;
  const lastBlock =
    Math.floor(
      (targetEnd - 1 - CH32V003_FLASH_START) / CH32V003_FLASH_BLOCK_SIZE,
    ) *
      CH32V003_FLASH_BLOCK_SIZE +
    CH32V003_FLASH_START;
  const blocks: number[] = [];
  const steps: FlashWriteStep[] = [{ kind: "preflight" }, { kind: "unlock" }];

  for (
    let blockAddress = firstBlock;
    blockAddress <= lastBlock;
    blockAddress += CH32V003_FLASH_BLOCK_SIZE
  ) {
    blocks.push(blockAddress);
    const writeStart = Math.max(targetAddress, blockAddress);
    const writeEnd = Math.min(
      targetEnd,
      blockAddress + CH32V003_FLASH_BLOCK_SIZE,
    );
    steps.push(
      {
        kind: "backup",
        address: blockAddress,
        length: CH32V003_FLASH_BLOCK_SIZE,
      },
      {
        kind: "merge",
        address: blockAddress,
        writeOffset: writeStart - blockAddress,
        writeLength: writeEnd - writeStart,
      },
      {
        kind: "erase",
        address: blockAddress,
        length: CH32V003_FLASH_BLOCK_SIZE,
      },
      {
        kind: "write",
        address: blockAddress,
        length: CH32V003_FLASH_BLOCK_SIZE,
      },
      {
        kind: "verify",
        address: blockAddress,
        length: CH32V003_FLASH_BLOCK_SIZE,
      },
    );
  }

  return { targetAddress, targetLength, blocks, steps, executable: false };
}
