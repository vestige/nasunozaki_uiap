import { describe, expect, it, vi } from "vitest";
import { unlockFlashForInvestigation } from "./device";
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
