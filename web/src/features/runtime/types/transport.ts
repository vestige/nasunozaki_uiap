export type RuntimeTransport = {
  send(message: Uint8Array): Promise<void>;
  receive(): Promise<Uint8Array>;
};

export type RuntimeBoardAdapterOptions = {
  responseTimeoutMs?: number;
  maxIgnoredResponses?: number;
};
