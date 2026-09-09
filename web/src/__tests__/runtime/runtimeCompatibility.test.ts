import { describe, expect, it } from "vitest";
import { assessRuntimeCompatibility } from "../../features/runtime/utils/runtimeCompatibility";

describe("runtime compatibility assessment", () => {
  it("0xAA Feature Reportだけならbootloaderと判定する", () => {
    const result = assessRuntimeCompatibility([
      {
        featureReports: [{ reportId: 0xaa }],
        inputReports: [],
        outputReports: [],
      },
    ]);

    expect(result.mode).toBe("bootloader");
    expect(result.featureReportIds).toEqual([0xaa]);
  });

  it("InputまたはOutput Reportがあればruntime候補にする", () => {
    const result = assessRuntimeCompatibility([
      {
        inputReports: [{ reportId: 1 }],
        outputReports: [{ reportId: 2 }],
      },
    ]);

    expect(result.mode).toBe("runtime-candidate");
    expect(result.inputReportIds).toEqual([1]);
    expect(result.outputReportIds).toEqual([2]);
  });

  it("子Collectionを含めてReport IDを重複なく集める", () => {
    const result = assessRuntimeCompatibility([
      {
        featureReports: [{ reportId: 2 }],
        children: [
          {
            featureReports: [{ reportId: 2 }, { reportId: 3 }],
          },
        ],
      },
    ]);

    expect(result.mode).toBe("unknown");
    expect(result.featureReportIds).toEqual([2, 3]);
  });
});
