export const FLASH_CONTROL_REGISTER = 0x40022010;
export const FLASH_READ_PROTECTION_REGISTER = 0x4002201c;

export type FlashSafetyState = {
  controlValue: number;
  protectionValue: number;
  locked: boolean;
  readProtected: boolean;
  safeToUnlock: boolean;
};

export function interpretFlashSafety(
  controlValue: number,
  protectionValue: number,
): FlashSafetyState {
  const locked = (controlValue & 0x8080) !== 0;
  const readProtected = (protectionValue & 0x2) !== 0;
  return {
    controlValue,
    protectionValue,
    locked,
    readProtected,
    safeToUnlock: locked && !readProtected,
  };
}
