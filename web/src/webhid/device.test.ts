import { describe, expect, it, vi } from "vitest";
import {
  readFlashBlockBackup,
  readFlashStatus,
  runFlashEraseRestoreOnDevice,
  unlockFlashForInvestigation,
} from "./device";
import { CH32V003_FLASH_START } from "./flashPacket";
import type { HidDevice } from "./types";

const resultView = (value: number) => {
  const bytes = new Uint8Array(127);
  bytes[0] = 0xff;
  new DataView(bytes.buffer).setUint32(59, value, true);
  return new DataView(bytes.buffer);
};

const createDevice = (responses: DataView[]): HidDevice => ({
  vendorId: 0x1209,
  productId: 0xb803,
  productName: "32V003",
  opened: true,
  collections: [],
  open: vi.fn(async () => undefined),
  sendFeatureReport: vi.fn(async () => undefined),
  receiveFeatureReport: vi.fn(async () => {
    const response = responses.shift();
    if (!response) throw new Error("テスト応答が不足しています。");
    return response;
  }),
});

describe("unlockFlashForInvestigation", () => {
  it("安全確認後に6 packetを実行してCTLRを読み直す", async () => {
    const protection = 0x03ffffdc;
    const device = createDevice([
      resultView(0x00008080),
      resultView(protection),
      ...Array.from({ length: 6 }, () => resultView(0)),
      resultView(0),
      resultView(protection),
    ]);

    const result = await unlockFlashForInvestigation(device);

    expect(result.completedPackets).toBe(6);
    expect(result.before.locked).toBe(true);
    expect(result.after.locked).toBe(false);
    expect(device.sendFeatureReport).toHaveBeenCalledTimes(10);
  });

  it("read protection検出時はunlock packetを送らない", async () => {
    const device = createDevice([resultView(0x00008080), resultView(0x2)]);

    await expect(unlockFlashForInvestigation(device)).rejects.toThrow(
      "read protectionが検出されたためunlockを中止しました。",
    );
    expect(device.sendFeatureReport).toHaveBeenCalledTimes(2);
  });
});

describe("readFlashBlockBackup", () => {
  it("16 wordをlittle endianの64バイトへ退避する", async () => {
    const device = createDevice(
      Array.from({ length: 16 }, (_, index) => resultView(index + 1)),
    );

    const result = await readFlashBlockBackup(device, CH32V003_FLASH_START);

    expect(result.bytes).toHaveLength(64);
    expect(result.bytes.slice(0, 8)).toEqual([1, 0, 0, 0, 2, 0, 0, 0]);
    expect(result.attempts).toBe(16);
    expect(result.allErased).toBe(false);
    expect(device.sendFeatureReport).toHaveBeenCalledTimes(16);
  });
});

describe("readFlashStatus", () => {
  it("CTLR、STATR、OBTKEYRを読み取り専用で取得する", async () => {
    const device = createDevice([
      resultView(0x00000200),
      resultView(0x00000020),
      resultView(0x03ffffdc),
    ]);

    const result = await readFlashStatus(device);

    expect(result).toMatchObject({
      controlValue: 0x00000200,
      statusValue: 0x00000020,
      protectionValue: 0x03ffffdc,
      busy: false,
      writeProtectionError: false,
      endOfOperation: true,
      attempts: 3,
    });
    expect(device.sendFeatureReport).toHaveBeenCalledTimes(3);
  });
});

describe("runFlashEraseRestoreOnDevice", () => {
  it("eraseとwrite packetを送り、前後の64バイトを読み取る", async () => {
    const backup = Uint8Array.from({ length: 64 }, (_, index) => index);
    const backupWords = Array.from({ length: 16 }, (_, index) =>
      new DataView(backup.buffer).getUint32(index * 4, true),
    );
    const responses = [
      resultView(0x00000200),
      resultView(0x03ffffdc),
      ...backupWords.map(resultView),
      resultView(0),
      ...Array.from({ length: 16 }, () => resultView(0xffffffff)),
      resultView(0),
      resultView(0),
      resultView(0),
      ...backupWords.map(resultView),
    ];
    const device = createDevice(responses);

    const result = await runFlashEraseRestoreOnDevice(
      device,
      CH32V003_FLASH_START,
      backup,
      () => undefined,
    );

    expect(result).toMatchObject({ erased: true, restored: true });
    expect(device.sendFeatureReport).toHaveBeenCalledTimes(54);
  });
});
