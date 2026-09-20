import type {
  HidDevice,
  HidNavigator,
} from "../../device/types/webhid";
import type { RuntimeHidDevice } from "../types/transport";
import { RuntimeDiagnosticError } from "./runtimeDiagnostic";

export const UIAP_RUNTIME_VENDOR_ID = 0x1209;
export const UIAP_RUNTIME_PRODUCT_ID = 0xd004;

let watchedRuntimeDevice: HidDevice | null = null;
let runtimeDisconnectListener:
  | ((event: Event & { device: HidDevice }) => void)
  | null = null;

function getHid() {
  return (navigator as HidNavigator).hid;
}

export async function requestUiapRuntimeDevice(): Promise<RuntimeHidDevice> {
  const hid = getHid();
  if (!hid) {
    throw new RuntimeDiagnosticError(
      "WEBHID_UNSUPPORTED",
      "environment",
      "このブラウザはWebHIDに対応していません。PC版ChromeまたはEdgeで開いてください。",
    );
  }

  let devices: HidDevice[];
  try {
    devices = await hid.requestDevice({
      filters: [
        {
          vendorId: UIAP_RUNTIME_VENDOR_ID,
          productId: UIAP_RUNTIME_PRODUCT_ID,
        },
      ],
    });
  } catch (error) {
    throw new RuntimeDiagnosticError(
      "DEVICE_CANCELLED",
      "runtime-select",
      "通常動作モードのデバイス選択がキャンセルまたは拒否されました。",
      error,
    );
  }
  const selected = devices[0];
  if (!selected) {
    throw new RuntimeDiagnosticError(
      "DEVICE_CANCELLED",
      "runtime-select",
      "通常動作モードのUIAPduinoは選ばれませんでした。ファームウェアと接続状態を確認してください。",
    );
  }
  if (!selected.opened) {
    try {
      await selected.open();
    } catch (error) {
      throw new RuntimeDiagnosticError(
        "DEVICE_OPEN_FAILED",
        "runtime-open",
        "通常動作モードのUIAPduinoを開けませんでした。",
        error,
      );
    }
  }
  return selected as RuntimeHidDevice;
}

export function watchRuntimeDisconnect(
  device: HidDevice,
  onDisconnect: () => void,
) {
  const hid = getHid();
  if (!hid) return;
  if (runtimeDisconnectListener) {
    hid.removeEventListener("disconnect", runtimeDisconnectListener);
  }

  watchedRuntimeDevice = device;
  runtimeDisconnectListener = (event) => {
    if (event.device !== watchedRuntimeDevice) return;
    watchedRuntimeDevice = null;
    onDisconnect();
  };
  hid.addEventListener("disconnect", runtimeDisconnectListener);
}

export function subscribeRuntimeDisconnect(
  device: HidDevice,
  onDisconnect: () => void,
) {
  const hid = getHid();
  if (!hid) return () => undefined;
  const listener = (event: Event & { device: HidDevice }) => {
    if (event.device === device) onDisconnect();
  };
  hid.addEventListener("disconnect", listener);
  return () => hid.removeEventListener("disconnect", listener);
}
