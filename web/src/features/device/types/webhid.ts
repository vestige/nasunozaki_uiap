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

export type HidDeviceFilter = {
  vendorId: number;
  productId: number;
};

export type HidNavigator = Navigator & {
  hid?: {
    requestDevice(options: {
      filters: HidDeviceFilter[];
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

export type FlashSafetyResult = {
  controlValue: number;
  protectionValue: number;
  locked: boolean;
  readProtected: boolean;
  safeToUnlock: boolean;
  attempts: number;
};

export type FlashStatusResult = {
  controlValue: number;
  statusValue: number;
  protectionValue: number;
  busy: boolean;
  writeProtectionError: boolean;
  endOfOperation: boolean;
  statusMode: boolean;
  statusLocked: boolean;
  attempts: number;
};

export type FlashUnlockResult = {
  before: FlashSafetyResult;
  after: FlashSafetyResult;
  completedPackets: number;
};

export type FlashBlockBackupResult = {
  address: number;
  bytes: number[];
  attempts: number;
  checksum: number;
  allErased: boolean;
};
