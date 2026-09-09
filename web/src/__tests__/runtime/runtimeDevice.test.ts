import { describe, expect, it } from "vitest";
import {
  UIAP_RUNTIME_PRODUCT_ID,
  UIAP_RUNTIME_VENDOR_ID,
} from "../../features/runtime/utils/runtimeDevice";

describe("runtime device identity", () => {
  it("通常動作モードだけに使うVID/PIDを固定する", () => {
    expect(UIAP_RUNTIME_VENDOR_ID).toBe(0x1209);
    expect(UIAP_RUNTIME_PRODUCT_ID).toBe(0xd004);
  });
});
