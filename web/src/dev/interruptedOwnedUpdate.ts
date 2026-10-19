import { encodeStandaloneProgram, crc16Ccitt } from "../features/blockly/utils/standaloneProgram";
import { OWNED_BEGIN } from "../features/blockly/utils/standaloneUpdateProtocol";
import { readOwnedUpdateSnapshot, type OwnedExchange } from "../features/blockly/utils/ownedStandaloneUpdate";

// Development fixture only. Erase the INACTIVE bank, but never DATA/COMMIT or
// automatically ABORT. The valid bank must already contain a verified work.
export async function beginInterruptedOwnedUpdate(exchange: OwnedExchange) {
  const bank = await exchange(0x24, []);
  if (bank !== 0x41 && bank !== 0x42) throw new Error("保存済みの作品がないため中止しました。");
  const state = await readOwnedUpdateSnapshot(exchange);
  if (state.kind !== "idle" && state.kind !== "committed") throw new Error("空き状態の対応ファームではないため、変更せずに中止しました。");
  const token = Array.from(crypto.getRandomValues(new Uint8Array(8)));
  if (!token.some(value => value !== 0)) token[0] = 1;
  const slot = encodeStandaloneProgram([{ type: "led", on: true, blockId: "interrupted-owned-update" }]);
  const length = 16 + (slot[6] | slot[7] << 8);
  const crc = crc16Ccitt(slot.slice(0, length));
  const result = await exchange(OWNED_BEGIN, [...token, slot[4], length & 0xff, length >> 8, crc & 0xff, crc >> 8], 10000);
  if (result !== 0) throw new Error(`中断状態を作れませんでした（${result}）。自動再送・解除はしていません。`);
  return bank === 0x41 ? "A" : "B";
}
