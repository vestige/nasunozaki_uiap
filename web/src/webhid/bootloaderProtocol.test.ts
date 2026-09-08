import { describe, expect, it } from "vitest";
import {
  BOOTLOADER_REPORT_ID,
  buildReadWordRequest,
  CH32V003_PART_ID_ADDRESS,
  EXECUTION_MAGIC,
  normalizeFeaturePayload,
  REPORT_PAYLOAD_SIZE,
} from "./bootloaderProtocol";

describe("buildReadWordRequest", () => {
  it("minichlink互換の127バイトpayloadを生成する", () => {
    const request = buildReadWordRequest(CH32V003_PART_ID_ADDRESS);
    const view = new DataView(request.payload.buffer);
    expect(request.reportId).toBe(BOOTLOADER_REPORT_ID);
    expect(request.payload).toHaveLength(REPORT_PAYLOAD_SIZE);
    expect(view.getUint32(51, true)).toBe(CH32V003_PART_ID_ADDRESS);
    expect(view.getUint32(55, true)).toBe(4);
    expect(view.getUint32(123, true)).toBe(EXECUTION_MAGIC);
    expect(request.resultOffset).toBe(59);
    expect(request.resultOffset).not.toBe(51);
  });

  it("4バイト境界でないアドレスを拒否する", () => {
    expect(() => buildReadWordRequest(CH32V003_PART_ID_ADDRESS + 1)).toThrow(
      RangeError,
    );
  });
});

describe("normalizeFeaturePayload", () => {
  it("WebHIDの127バイト応答では先頭の完了フラグを保持する", () => {
    const response = new Uint8Array(127);
    response[0] = 0xff;

    expect(normalizeFeaturePayload(new DataView(response.buffer))[0]).toBe(
      0xff,
    );
  });

  it("Report IDを含む128バイト応答ではIDだけを除く", () => {
    const response = new Uint8Array(128);
    response[0] = BOOTLOADER_REPORT_ID;
    response[1] = 0xff;

    const payload = normalizeFeaturePayload(new DataView(response.buffer));
    expect(payload).toHaveLength(REPORT_PAYLOAD_SIZE);
    expect(payload[0]).toBe(0xff);
  });
});
