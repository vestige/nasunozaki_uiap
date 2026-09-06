import {
  BOOTLOADER_REPORT_ID,
  buildReadWordRequest,
  CH32V003_PART_ID_ADDRESS,
  normalizeFeaturePayload,
  readUint32Result,
} from "./bootloaderProtocol";
import type {
  ChipIdentityResult,
  FlashBlockBackupResult,
  FeatureReportResult,
  FlashSafetyResult,
  FlashUnlockResult,
  HidDevice,
  HidNavigator,
  RoundTripResult,
} from "./types";
import {
  buildErase64PacketOffline,
  buildFlashProgramPreparationSequenceOffline,
  buildFlashUnlockSequenceOffline,
} from "./flashControlPacket";
import { crc32, validateFlashBackupAddress } from "./flashBackup";
import {
  buildWrite64PacketOffline,
  CH32V003_FLASH_BLOCK_SIZE,
} from "./flashPacket";
import {
  runFlashEraseRestoreTransaction,
  type FlashRecoveryStage,
} from "./flashRecoveryTransaction";
import {
  FLASH_CONTROL_REGISTER,
  FLASH_READ_PROTECTION_REGISTER,
  interpretFlashSafety,
} from "./flashSafety";

export const UIAP_VENDOR_ID = 0x1209;
export const UIAP_BOOTLOADER_PRODUCT_ID = 0xb803;
export { BOOTLOADER_REPORT_ID } from "./bootloaderProtocol";

let watchedDevice: HidDevice | null = null;
let disconnectListener:
  ((event: Event & { device: HidDevice }) => void) | null = null;

function getHid() {
  return (navigator as HidNavigator).hid;
}

export function supportsWebHid() {
  return typeof navigator !== "undefined" && "hid" in navigator;
}

export async function requestUiapDevice() {
  const hid = getHid();
  if (!hid)
    throw new Error(
      "このブラウザはWebHIDに対応していません。PC版ChromeまたはEdgeで開いてください。",
    );

  const devices = await hid.requestDevice({
    filters: [
      { vendorId: UIAP_VENDOR_ID, productId: UIAP_BOOTLOADER_PRODUCT_ID },
    ],
  });
  const selected = devices[0];
  if (!selected)
    throw new Error(
      "ボードは選ばれませんでした。接続手順を確認して、もう一度試してください。",
    );
  if (!selected.opened) await selected.open();
  return selected;
}

export function watchDisconnect(device: HidDevice, onDisconnect: () => void) {
  const hid = getHid();
  if (!hid) return;
  if (disconnectListener)
    hid.removeEventListener("disconnect", disconnectListener);

  watchedDevice = device;
  disconnectListener = (event) => {
    if (event.device !== watchedDevice) return;
    watchedDevice = null;
    onDisconnect();
  };
  hid.addEventListener("disconnect", disconnectListener);
}

export async function readFeatureReport(
  device: HidDevice,
): Promise<FeatureReportResult> {
  const view = await device.receiveFeatureReport(BOOTLOADER_REPORT_ID);
  const rawBytes = Array.from(
    new Uint8Array(view.buffer, view.byteOffset, view.byteLength),
  );
  const includesLeadingByte = rawBytes.length === 128;
  return {
    rawBytes,
    payloadBytes: includesLeadingByte ? rawBytes.slice(1) : rawBytes,
    leadingByte: includesLeadingByte ? rawBytes[0] : undefined,
    readAt: new Date().toLocaleString("ja-JP"),
    allZero: rawBytes.every((byte) => byte === 0),
  };
}

export async function runRamRoundTrip(
  device: HidDevice,
): Promise<RoundTripResult> {
  const sent = new Uint8Array(127);
  sent.fill(0x5a);
  sent.set([0x55, 0x49, 0x41, 0x50], 0);
  sent.fill(0x00, sent.length - 4);

  await device.sendFeatureReport(BOOTLOADER_REPORT_ID, sent);
  const view = await device.receiveFeatureReport(BOOTLOADER_REPORT_ID);
  const raw = Array.from(
    new Uint8Array(view.buffer, view.byteOffset, view.byteLength),
  );
  const received = raw.length === 128 ? raw.slice(1) : raw;
  return {
    succeeded:
      received.length === sent.length &&
      received.every((byte, index) => byte === sent[index]),
    receivedLength: received.length,
  };
}

async function executeReadWord(device: HidDevice, address: number) {
  const request = buildReadWordRequest(address);
  await device.sendFeatureReport(request.reportId, request.payload);

  for (let attempts = 1; attempts <= 21; attempts += 1) {
    const response = await device.receiveFeatureReport(request.reportId);
    const payload = normalizeFeaturePayload(response);
    if (payload[0] === 0xff) {
      return {
        address,
        value: readUint32Result(payload, request.resultOffset),
        attempts,
      };
    }
  }
  throw new Error("RAM stubの完了応答を21回以内に確認できませんでした。");
}

export async function readChipIdentity(
  device: HidDevice,
): Promise<ChipIdentityResult> {
  return executeReadWord(device, CH32V003_PART_ID_ADDRESS);
}

export async function readFlashSafetyState(
  device: HidDevice,
): Promise<FlashSafetyResult> {
  const control = await executeReadWord(device, FLASH_CONTROL_REGISTER);
  const protection = await executeReadWord(
    device,
    FLASH_READ_PROTECTION_REGISTER,
  );
  return {
    ...interpretFlashSafety(control.value, protection.value),
    attempts: control.attempts + protection.attempts,
  };
}

async function executePreparedPacket(
  device: HidDevice,
  packet: { reportId: number; payload: Uint8Array<ArrayBuffer> },
  options: { attempts?: number; delayMs?: number } = {},
) {
  await device.sendFeatureReport(packet.reportId, packet.payload);
  const maxAttempts = options.attempts ?? 21;
  const delayMs = options.delayMs ?? 0;
  for (let attempts = 1; attempts <= maxAttempts; attempts += 1) {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    const response = await device.receiveFeatureReport(packet.reportId);
    const payload = normalizeFeaturePayload(response);
    if (payload[0] === 0xff) return attempts;
  }
  throw new Error(
    `実行packetの完了応答を${maxAttempts}回以内に確認できませんでした。`,
  );
}

export async function unlockFlashForInvestigation(
  device: HidDevice,
): Promise<FlashUnlockResult> {
  const before = await readFlashSafetyState(device);
  if (!before.safeToUnlock) {
    throw new Error(
      before.readProtected
        ? "read protectionが検出されたためunlockを中止しました。"
        : "flashが通常のロック状態ではないためunlockを中止しました。",
    );
  }

  const packets = buildFlashUnlockSequenceOffline();
  let completedPackets = 0;
  for (const packet of packets) {
    await executePreparedPacket(device, packet);
    completedPackets += 1;
  }

  const after = await readFlashSafetyState(device);
  if (after.locked) {
    throw new Error("6 packet送信後もflash lockが解除されていません。");
  }
  return { before, after, completedPackets };
}

export async function readFlashBlockBackup(
  device: HidDevice,
  address: number,
): Promise<FlashBlockBackupResult> {
  validateFlashBackupAddress(address);
  const bytes = new Uint8Array(CH32V003_FLASH_BLOCK_SIZE);
  let attempts = 0;

  for (let offset = 0; offset < bytes.length; offset += 4) {
    const result = await executeReadWord(device, address + offset);
    new DataView(bytes.buffer).setUint32(offset, result.value, true);
    attempts += result.attempts;
  }

  return {
    address,
    bytes: Array.from(bytes),
    attempts,
    checksum: crc32(bytes),
    allErased: bytes.every((byte) => byte === 0xff),
  };
}

export async function runFlashEraseRestoreOnDevice(
  device: HidDevice,
  address: number,
  backup: Uint8Array,
  onStage: (stage: FlashRecoveryStage) => void,
) {
  return runFlashEraseRestoreTransaction(
    {
      readSafety: () => readFlashSafetyState(device),
      readBlock: async (targetAddress) =>
        Uint8Array.from(
          (await readFlashBlockBackup(device, targetAddress)).bytes,
        ),
      eraseBlock: async (targetAddress) => {
        await executePreparedPacket(
          device,
          buildErase64PacketOffline(targetAddress),
          { attempts: 201, delayMs: 5 },
        );
      },
      writeBlock: async (targetAddress, data) => {
        for (const packet of buildFlashProgramPreparationSequenceOffline()) {
          await executePreparedPacket(device, packet);
        }
        await executePreparedPacket(
          device,
          buildWrite64PacketOffline(targetAddress, data),
          { attempts: 201, delayMs: 5 },
        );
      },
    },
    address,
    backup,
    onStage,
  );
}

export async function restoreFlashBlockOnDevice(
  device: HidDevice,
  address: number,
  data: Uint8Array,
) {
  validateFlashBackupAddress(address);
  if (data.length !== CH32V003_FLASH_BLOCK_SIZE) {
    throw new RangeError("復旧データは64バイト固定です。");
  }
  const safety = await readFlashSafetyState(device);
  if (safety.locked || safety.readProtected) {
    throw new Error("flashをunlockし、read protectionなしを確認してください。");
  }
  for (const packet of buildFlashProgramPreparationSequenceOffline()) {
    await executePreparedPacket(device, packet);
  }
  await executePreparedPacket(
    device,
    buildWrite64PacketOffline(address, data),
    {
      attempts: 201,
      delayMs: 5,
    },
  );
  const restored = await readFlashBlockBackup(device, address);
  if (!restored.bytes.every((byte, index) => byte === data[index])) {
    throw new Error("書き戻し後の64バイトが復旧ファイルと一致しません。");
  }
  return restored;
}
