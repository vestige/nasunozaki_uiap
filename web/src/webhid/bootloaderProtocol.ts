export const EXECUTION_MAGIC = 0x1234abcd;
export const CH32V003_PART_ID_ADDRESS = 0x1ffff7c4;
export const REPORT_PAYLOAD_SIZE = 127;
export const BOOTLOADER_REPORT_ID = 0xaa;

const WORD_READ_STUB = new Uint8Array([
  0x23, 0xa0, 0x05, 0x00, 0x13, 0x07, 0x45, 0x03, 0x0c, 0x43, 0x50, 0x43, 0x2e,
  0x96, 0x21, 0x07, 0x94, 0x41, 0x14, 0xc3, 0x91, 0x05, 0x11, 0x07, 0xe3, 0xcc,
  0xc5, 0xfe, 0x93, 0x06, 0xf0, 0xff, 0x14, 0xc1, 0x82, 0x80, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

export type ReadWordRequest = {
  reportId: number;
  payload: Uint8Array<ArrayBuffer>;
  resultOffset: number;
};

export function buildReadWordRequest(address: number): ReadWordRequest {
  if (!Number.isInteger(address) || address < 0 || address > 0xffffffff) {
    throw new RangeError("読み取りアドレスは32bitの整数で指定してください。");
  }
  if (address % 4 !== 0) {
    throw new RangeError("word読み取りアドレスは4バイト境界に揃えてください。");
  }

  const packet = new Uint8Array(128);
  packet[0] = BOOTLOADER_REPORT_ID;
  packet.set(WORD_READ_STUB, 4);
  const view = new DataView(packet.buffer);
  view.setUint32(52, address, true);
  view.setUint32(56, 4, true);
  view.setUint32(124, EXECUTION_MAGIC, true);

  return { reportId: packet[0], payload: packet.slice(1), resultOffset: 51 };
}

export function normalizeFeaturePayload(view: DataView) {
  const raw = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  return raw.length === 128 ? raw.slice(1) : raw;
}

export function readUint32Result(payload: Uint8Array, offset: number) {
  if (payload.length < offset + 4)
    throw new RangeError("応答が4バイトより短いため結果を読めません。");
  return new DataView(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength,
  ).getUint32(offset, true);
}
