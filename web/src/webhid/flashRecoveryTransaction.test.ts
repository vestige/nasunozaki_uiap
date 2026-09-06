import { describe, expect, it, vi } from "vitest";
import {
  runFlashEraseRestoreTransaction,
  type FlashRecoveryAdapter,
} from "./flashRecoveryTransaction";
import { CH32V003_FLASH_START } from "./flashPacket";

const unlocked = {
  controlValue: 0x200,
  protectionValue: 0x03ffffdc,
  locked: false,
  readProtected: false,
  safeToUnlock: false,
  attempts: 2,
};

function createAdapter(backup: Uint8Array) {
  let block = Uint8Array.from(backup);
  const order: string[] = [];
  const adapter: FlashRecoveryAdapter = {
    readSafety: vi.fn(async () => {
      order.push("preflight");
      return unlocked;
    }),
    readBlock: vi.fn(async () => {
      order.push("read");
      return block.slice();
    }),
    eraseBlock: vi.fn(async () => {
      order.push("erase");
      block.fill(0xff);
    }),
    writeBlock: vi.fn(async (_address, data) => {
      order.push("write");
      block = data.slice();
    }),
  };
  return {
    adapter,
    order,
    setBlock: (value: Uint8Array) => (block = Uint8Array.from(value)),
  };
}

describe("runFlashEraseRestoreTransaction", () => {
  const backup = Uint8Array.from({ length: 64 }, (_, index) => index);

  it("preflightから復旧verifyまで順番を固定する", async () => {
    const { adapter, order } = createAdapter(backup);
    const stages: string[] = [];
    const result = await runFlashEraseRestoreTransaction(
      adapter,
      CH32V003_FLASH_START,
      backup,
      (stage) => stages.push(stage),
    );
    expect(order).toEqual([
      "preflight",
      "read",
      "erase",
      "read",
      "write",
      "read",
    ]);
    expect(result).toMatchObject({ erased: true, restored: true });
    expect(stages).toEqual([
      "preflight-verified",
      "erase-complete",
      "erase-verified",
      "restore-complete",
      "restore-verified",
    ]);
  });

  it("erase後verify失敗時にも元データへ復旧する", async () => {
    const { adapter, setBlock } = createAdapter(backup);
    vi.mocked(adapter.eraseBlock).mockImplementationOnce(async () => {
      setBlock(new Uint8Array(64));
    });

    await expect(
      runFlashEraseRestoreTransaction(adapter, CH32V003_FLASH_START, backup),
    ).rejects.toMatchObject({ restored: true });
    expect(adapter.writeBlock).toHaveBeenCalled();
  });

  it("退避内容が現在値と違う場合はeraseしない", async () => {
    const { adapter, setBlock } = createAdapter(backup);
    setBlock(new Uint8Array(64));
    await expect(
      runFlashEraseRestoreTransaction(adapter, CH32V003_FLASH_START, backup),
    ).rejects.toThrow("実機内容が照合済みの退避データと一致しない");
    expect(adapter.eraseBlock).not.toHaveBeenCalled();
  });
});
