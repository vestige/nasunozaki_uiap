import type {
  HidDevice,
  HidNavigator,
} from "../../device/types/webhid";
import type { RuntimeHidDevice } from "../types/transport";

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
    throw new Error(
      "このブラウザはWebHIDに対応していません。PC版ChromeまたはEdgeで開いてください。",
    );
  }

  const devices = await hid.requestDevice({
    filters: [
      {
        vendorId: UIAP_RUNTIME_VENDOR_ID,
        productId: UIAP_RUNTIME_PRODUCT_ID,
      },
    ],
  });
  const selected = devices[0];
  if (!selected) {
    throw new Error(
      "通常動作モードのUIAPduinoは選ばれませんでした。ファームウェアと接続状態を確認してください。",
    );
  }
  if (!selected.opened) await selected.open();
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
