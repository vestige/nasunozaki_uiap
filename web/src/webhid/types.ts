export type HidCollection = {
  usagePage?: number;
  usage?: number;
  type?: number;
  inputReports?: Array<{ reportId: number; items?: unknown[] }>;
  outputReports?: Array<{ reportId: number; items?: unknown[] }>;
  featureReports?: Array<{ reportId: number; items?: unknown[] }>;
  children?: HidCollection[];
};

export type HidDevice = {
  vendorId: number;
  productId: number;
  productName?: string;
  opened: boolean;
  collections: HidCollection[];
  open(): Promise<void>;
  receiveFeatureReport(reportId: number): Promise<DataView>;
  sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
};

export type HidNavigator = Navigator & {
  hid?: {
    requestDevice(options: {
      filters: Array<{ vendorId: number; productId: number }>;
    }): Promise<HidDevice[]>;
    addEventListener(
      type: "disconnect",
      listener: (event: Event & { device: HidDevice }) => void,
    ): void;
    removeEventListener(
      type: "disconnect",
      listener: (event: Event & { device: HidDevice }) => void,
    ): void;
  };
};

export type FeatureReportResult = {
  rawBytes: number[];
  payloadBytes: number[];
  leadingByte?: number;
  readAt: string;
  allZero: boolean;
};

export type RoundTripResult = {
  succeeded: boolean;
  receivedLength: number;
};

export type ChipIdentityResult = {
  address: number;
  value: number;
  attempts: number;
};
