import type { RuntimeHidDevice } from "../../runtime/types/transport";
import { WebHidRuntimeTransport } from "../../runtime/utils/webHidRuntimeTransport";
import { withRuntimeResponseTimeout } from "../../runtime/utils/runtimeTiming";
import {
  crc16Ccitt,
  STANDALONE_PROGRAM_HEADER_SIZE,
} from "./standaloneProgram";
import {
  buildStandaloneUpdateAbort,
  buildStandaloneUpdateBegin,
  buildStandaloneUpdateCommit,
  buildStandaloneUpdateData,
  buildStandaloneUpdateStatus,
  buildStandaloneCapabilities,
  standaloneSupportedVersion,
  parseStandaloneUpdateResponse,
  STANDALONE_UPDATE_COMMAND_ABORT,
  STANDALONE_UPDATE_COMMAND_BEGIN,
  STANDALONE_UPDATE_COMMAND_COMMIT,
  STANDALONE_UPDATE_COMMAND_DATA,
  STANDALONE_UPDATE_COMMAND_STATUS,
  STANDALONE_UPDATE_DATA_SIZE,
} from "./standaloneUpdateProtocol";

const MAX_BANK_PROGRAM_SIZE = 1008;

export async function readStandaloneStatus(device: RuntimeHidDevice) {
  if (device.vendorId !== 0x1209 || device.productId !== 0xd004 || !device.opened) {
    throw new Error("通常接続のUIAPduinoを接続してください。");
  }
  const transport = new WebHidRuntimeTransport(device);
  try {
    await transport.send(buildStandaloneUpdateStatus(0));
    const response = await withRuntimeResponseTimeout(transport.receive(), 2_000);
    const status = parseStandaloneUpdateResponse(response, STANDALONE_UPDATE_COMMAND_STATUS, 0);
    return status >= 0x40 && status <= 0x42
      ? { supported: true, activeBank: status === 0x40 ? null : status === 0x41 ? "A" : "B" }
      : { supported: false, activeBank: null };
  } finally {
    transport.dispose();
  }
}

export async function writeStandaloneProgram(
  device: RuntimeHidDevice,
  encodedSlot: Uint8Array,
  onProgress: (percent: number) => void,
) {
  if (device.vendorId !== 0x1209 || device.productId !== 0xd004 || !device.opened) {
    throw new Error("通常接続のUIAPduinoを接続してください。");
  }
  const payloadLength = encodedSlot[6] | (encodedSlot[7] << 8);
  const length = STANDALONE_PROGRAM_HEADER_SIZE + payloadLength;
  if (length < STANDALONE_PROGRAM_HEADER_SIZE + 1 ||
      length > MAX_BANK_PROGRAM_SIZE || length > encodedSlot.length) {
    throw new Error("この作品は保存領域へ収まりません。命令を少し減らしてください。");
  }
  const bytes = encodedSlot.slice(0, length);
  const formatVersion = encodedSlot[4];
  if (formatVersion !== 1 && formatVersion !== 2) {
    throw new Error("この作品形式には対応していません。");
  }
  const transport = new WebHidRuntimeTransport(device);
  let sequence = 0;
  let began = false;
  const exchange = async (message: Uint8Array, timeoutMs = 2_000) => {
    const command = message[5];
    const expectedSequence = message[6];
    await transport.send(message);
    for (let ignored = 0; ignored < 8; ignored++) {
      const response = await withRuntimeResponseTimeout(transport.receive(), timeoutMs);
      if (response[5] !== (command | 0x80) || response[6] !== expectedSequence) continue;
      return parseStandaloneUpdateResponse(response, command, expectedSequence);
    }
    throw new Error("UIAPduinoから対応する応答を受け取れませんでした。");
  };
  const next = () => (sequence++ & 0xff);

  try {
    const before = await exchange(buildStandaloneUpdateStatus(next()));
    if (before < 0x40 || before > 0x42) {
      throw new Error("作品だけを書き込めるランタイムが必要です。最初に教育用ランタイムを更新してください。");
    }
    // Version 1 keeps the legacy transfer path. Check newer formats before
    // BEGIN, which stops the current program and erases the inactive bank.
    if (formatVersion > 1) {
      const supportedVersion = standaloneSupportedVersion(
        await exchange(buildStandaloneCapabilities(next())),
      );
      if (formatVersion > supportedVersion) {
        throw new Error("この作品を使うには、最初にボードの教育用ランタイムを更新してください。");
      }
    }
    const begin = await exchange(buildStandaloneUpdateBegin(
      next(), length, crc16Ccitt(bytes), formatVersion,
    ), 10_000);
    if (begin !== 0) throw new Error(`作品の保存を開始できませんでした（${begin}）。`);
    began = true;

    for (let offset = 0; offset < length; offset += STANDALONE_UPDATE_DATA_SIZE) {
      const chunk = bytes.slice(offset, offset + STANDALONE_UPDATE_DATA_SIZE);
      const result = await exchange(buildStandaloneUpdateData(next(), offset, chunk));
      if (result !== 0) throw new Error(`作品の保存中にエラーが起きました（${result}）。`);
      onProgress(Math.round((offset + chunk.length) / length * 100));
    }

    const commit = await exchange(buildStandaloneUpdateCommit(next()), 10_000);
    if (commit !== 0) throw new Error(`保存した作品を検証できませんでした（${commit}）。`);
    began = false;
    const after = await exchange(buildStandaloneUpdateStatus(next()));
    const expectedBank = before === 0x41 ? 0x42 : 0x41;
    if (after !== expectedBank) {
      throw new Error("保存後の作品領域を確認できませんでした。USBを抜かずに状態を確認してください。");
    }
    return after === 0x41 ? "A" : "B";
  } catch (error) {
    if (began) {
      try {
        await exchange(buildStandaloneUpdateAbort(next()));
      } catch {
        // Keep the original failure. The last valid bank is never erased here.
      }
    }
    throw error;
  } finally {
    transport.dispose();
  }
}
