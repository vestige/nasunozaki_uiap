import { afterEach, describe, expect, it, vi } from "vitest";
import { loadVerifiedImage } from "../../web/src/features/runtime/components/RuntimeFirmwareInstall";

const image = new Uint8Array([1, 2, 3, 4]);
const digest = "9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a";

afterEach(() => vi.unstubAllGlobals());

describe("published workshop runtime image", () => {
  it("accepts an image only when its SHA-256 matches the published build info", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ binary_sha256: digest }) }).mockResolvedValueOnce({ ok: true, arrayBuffer: async () => image.buffer }));
    await expect(loadVerifiedImage()).resolves.toEqual(image);
  });

  it("rejects a mismatched image before flashing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ binary_sha256: "0".repeat(64) }) }).mockResolvedValueOnce({ ok: true, arrayBuffer: async () => image.buffer }));
    await expect(loadVerifiedImage()).rejects.toThrow("照合に失敗");
  });
});
