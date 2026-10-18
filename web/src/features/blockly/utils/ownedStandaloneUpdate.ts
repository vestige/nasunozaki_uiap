import { OWNED_RECOVER, OWNED_STATE } from "./standaloneUpdateProtocol";

export type OwnedExchange = (command: number, payload: number[], timeoutMs?: number) => Promise<number>;
export type OwnedUpdateSnapshot = {
  kind: "idle" | "active" | "expired" | "legacy" | "committed" | "unsupported";
  token: number[];
  offset: number;
};
export type StandaloneRecoveryOptions = {
  confirmRecovery?: (snapshot: OwnedUpdateSnapshot) => boolean | Promise<boolean>;
};
export class StandaloneRecoveryRequiredError extends Error {
  constructor(readonly snapshot: OwnedUpdateSnapshot) {
    super(snapshot.kind === "legacy"
      ? "前の方式のかきこみが残っています。ほかの画面でかきこみ中でないことをたしかめ、USBをつなぎなおしてください。"
      : snapshot.kind === "expired" ? "中断されたかきこみが残っています。解除の確認をしてから、もう一度ためしてください。"
      : "ボードで別のかきこみが進んでいる可能性があります。ほかの画面をたしかめてください。中断した場合は30秒ほど待ち、もう一度ためしてください。");
    this.name = "StandaloneRecoveryRequiredError";
  }
}
export class StandaloneRecoveryCancelledError extends Error {
  constructor() {
    super("かきこみの再開をとりやめました。ボードの状態は変えていません。");
    this.name = "StandaloneRecoveryCancelledError";
  }
}

export async function readOwnedUpdateSnapshot(exchange: OwnedExchange): Promise<OwnedUpdateSnapshot> {
  const state = await exchange(OWNED_STATE, [0]);
  const kinds = { 1: "unsupported", 0x70: "idle", 0x71: "active", 0x72: "expired", 0x73: "legacy", 0x74: "committed" } as const;
  const kind = kinds[state as keyof typeof kinds];
  if (!kind) throw new Error("ボードのかきこみ状態を確認できません。診断ログを保存してください。");
  if (kind === "idle" || kind === "unsupported" || kind === "legacy") return { kind, token: [], offset: 0 };
  const token: number[] = [];
  for (let field = 1; field <= 8; ++field) token.push(await exchange(OWNED_STATE, [field]));
  const low = await exchange(OWNED_STATE, [9]), high = await exchange(OWNED_STATE, [10]);
  if (await exchange(OWNED_STATE, [0]) !== state) throw new Error("確認中にボードの状態が変わりました。もう一度ためしてください。");
  return { kind, token, offset: low | high << 8 };
}

export async function prepareOwnedUpdate(exchange: OwnedExchange, options: StandaloneRecoveryOptions) {
  const snapshot = await readOwnedUpdateSnapshot(exchange);
  if (snapshot.kind === "unsupported") return null;
  if (snapshot.kind === "active" || snapshot.kind === "legacy") throw new StandaloneRecoveryRequiredError(snapshot);
  if (snapshot.kind === "expired") {
    if (!options.confirmRecovery) throw new StandaloneRecoveryRequiredError(snapshot);
    if (!await options.confirmRecovery(snapshot)) throw new StandaloneRecoveryCancelledError();
    const result = await exchange(OWNED_RECOVER, [...snapshot.token, snapshot.offset & 0xff, snapshot.offset >> 8]);
    if (result !== 0) throw new Error("確認後にかきこみが進んだ可能性があります。解除せずに終了しました。もう一度状態をたしかめてください。");
    const after = await readOwnedUpdateSnapshot(exchange);
    if (after.kind !== "idle") throw new Error("かきこみの解除を確認できません。保存を始めずに終了しました。");
  }
  const token = Array.from(crypto.getRandomValues(new Uint8Array(8)));
  // A zero token is reserved. These are accidental-conflict identifiers, not
  // authentication credentials; never serialize them into the project file.
  if (!token.some(value => value !== 0)) token[0] = 1;
  return token;
}
