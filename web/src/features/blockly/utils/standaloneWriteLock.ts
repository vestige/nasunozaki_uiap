const LOCK_NAME = "uiapduino:standalone-program-write:1209:d004";
let writingInThisPage = false;

export class StandaloneWriteBusyError extends Error {
  constructor() {
    super("ほかの画面でボードにかきこんでいます。終わってから、もう一度ためしてください。");
    this.name = "StandaloneWriteBusyError";
  }
}

// No serial number is available: conservatively serialize all runtime boards.
// Web Locks cover cooperating pages of the same origin, not other origins,
// browsers or older pages. This is not proof of firmware session ownership.
export async function withStandaloneWriteLock<T>(
  action: () => Promise<T>,
  locks: Pick<LockManager, "request"> | undefined = globalThis.navigator?.locks,
): Promise<T> {
  if (writingInThisPage) throw new StandaloneWriteBusyError();
  writingInThisPage = true;
  try {
    if (!locks) return await action();
    return await locks.request(LOCK_NAME, { mode: "exclusive", ifAvailable: true }, async lock => {
      if (!lock) throw new StandaloneWriteBusyError();
      return action();
    });
  } finally {
    writingInThisPage = false;
  }
}
