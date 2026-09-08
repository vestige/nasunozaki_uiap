import { FLASH_STATUS_REGISTER } from "./flashPacket";

export const FLASH_CONTROL_REGISTER = 0x40022010;
export const FLASH_READ_PROTECTION_REGISTER = 0x4002201c;
export { FLASH_STATUS_REGISTER };

export type FlashStatusState = {
  controlValue: number;
  statusValue: number;
  protectionValue: number;
  busy: boolean;
  writeProtectionError: boolean;
  endOfOperation: boolean;
  statusMode: boolean;
  statusLocked: boolean;
};

export function interpretFlashStatus(
  controlValue: number,
  statusValue: number,
  protectionValue: number,
): FlashStatusState {
  return {
    controlValue,
    statusValue,
    protectionValue,
    busy: (statusValue & 0x00000001) !== 0,
    writeProtectionError: (statusValue & 0x00000010) !== 0,
    endOfOperation: (statusValue & 0x00000020) !== 0,
    statusMode: (statusValue & 0x00004000) !== 0,
    statusLocked: (statusValue & 0x00008000) !== 0,
  };
}

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
