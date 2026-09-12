export type BoardAdapter = {
  setLed(on: boolean): void | Promise<void>;
  isButtonPressed?(): boolean | Promise<boolean>;
  wait(milliseconds: number, signal: AbortSignal): Promise<void>;
};

export type ExecutionObserver = {
  onInstruction?(blockId: string): void;
};

export type ExecutionTarget = "simulator" | "uiapduino";

export type BoardExecutionSession = {
  board: BoardAdapter;
  close(turnOff: boolean): Promise<void>;
};
