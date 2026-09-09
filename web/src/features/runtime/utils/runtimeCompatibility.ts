import type { HidCollection } from "../../device/types/webhid";
import type { RuntimeCompatibility } from "../types/compatibility";

const BOOTLOADER_REPORT_ID = 0xaa;

export function assessRuntimeCompatibility(
  collections: HidCollection[],
): RuntimeCompatibility {
  const flattened = flattenCollections(collections);
  const inputReportIds = reportIds(flattened, "inputReports");
  const outputReportIds = reportIds(flattened, "outputReports");
  const featureReportIds = reportIds(flattened, "featureReports");
  const hasStreamingReports =
    inputReportIds.length > 0 || outputReportIds.length > 0;
  const bootloaderOnly =
    !hasStreamingReports &&
    featureReportIds.length === 1 &&
    featureReportIds[0] === BOOTLOADER_REPORT_ID;

  return {
    mode: bootloaderOnly
      ? "bootloader"
      : hasStreamingReports
        ? "runtime-candidate"
        : "unknown",
    inputReportIds,
    outputReportIds,
    featureReportIds,
    collections: flattened,
  };
}

function flattenCollections(collections: HidCollection[]): HidCollection[] {
  return collections.flatMap((collection) => [
    collection,
    ...flattenCollections(collection.children ?? []),
  ]);
}

function reportIds(
  collections: HidCollection[],
  key: "inputReports" | "outputReports" | "featureReports",
) {
  return [
    ...new Set(
      collections.flatMap((collection) =>
        (collection[key] ?? []).map((report) => report.reportId),
      ),
    ),
  ].sort((left, right) => left - right);
}
