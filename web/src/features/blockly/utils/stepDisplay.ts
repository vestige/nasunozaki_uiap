import type { ExecutionObserver } from "../types/execution";

export function createStepDisplayObserver(
  enabled: boolean,
  onInstruction: (blockId: string) => void,
): ExecutionObserver | undefined {
  return enabled ? { onInstruction } : undefined;
}
