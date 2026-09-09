import type { HidCollection } from "../../device/types/webhid";

export type RuntimeCompatibility = {
  mode: "bootloader" | "runtime-candidate" | "unknown";
  inputReportIds: number[];
  outputReportIds: number[];
  featureReportIds: number[];
  collections: HidCollection[];
};
