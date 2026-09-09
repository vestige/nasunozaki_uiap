export type BoardAdapter = {
  setLed(on: boolean): void | Promise<void>;
  wait(milliseconds: number, signal: AbortSignal): Promise<void>;
};

export type ExecutionObserver = {
  onInstruction?(blockId: string): void;
};
