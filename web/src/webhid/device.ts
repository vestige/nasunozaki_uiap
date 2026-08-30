import {
  BOOTLOADER_REPORT_ID,
  buildReadWordRequest,
  CH32V003_PART_ID_ADDRESS,
  normalizeFeaturePayload,
  readUint32Result,
} from "./bootloaderProtocol";
import type {
  ChipIdentityResult,
  FeatureReportResult,
  FlashSafetyResult,
  HidDevice,
  HidNavigator,
  RoundTripResult,
} from "./types";
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
  | ((event: Event & { device: HidDevice }) => void)
  | null = null;

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
