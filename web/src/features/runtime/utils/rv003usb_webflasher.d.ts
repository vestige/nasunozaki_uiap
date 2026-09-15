export default function flash(
  image: Uint8Array,
  onStatus: (status: { step: number; offset: number; size: number }) => void,
  device: import("../../device/types/webhid").HidDevice,
): Promise<boolean | null>;
