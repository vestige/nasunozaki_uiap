import type { HidDevice } from "../../device/types/webhid";

export type RuntimeTransport = {
  send(message: Uint8Array): Promise<void>;
  receive(): Promise<Uint8Array>;
};

export type RuntimeInputReportEvent = Event & {
  device: RuntimeHidDevice;
  reportId: number;
  data: DataView;
};

export type RuntimeHidDevice = HidDevice & {
  addEventListener(
    type: "inputreport",
    listener: (event: RuntimeInputReportEvent) => void,
  ): void;
  removeEventListener(
    type: "inputreport",
    listener: (event: RuntimeInputReportEvent) => void,
  ): void;
};

export type RuntimeBoardAdapterOptions = {
  responseTimeoutMs?: number;
  maxIgnoredResponses?: number;
};
