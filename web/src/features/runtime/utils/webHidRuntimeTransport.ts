import type {
  RuntimeHidDevice,
  RuntimeInputReportEvent,
  RuntimeTransport,
} from "../types/transport";
import { RUNTIME_MESSAGE_SIZE } from "./runtimeProtocol";

export const DEFAULT_RUNTIME_REPORT_ID = 0;

type PendingReceive = {
  resolve: (message: Uint8Array) => void;
  reject: (error: Error) => void;
};

export class WebHidRuntimeTransport implements RuntimeTransport {
  private readonly queuedMessages: Uint8Array[] = [];
  private readonly pendingReceives: PendingReceive[] = [];
  private disposed = false;

  constructor(
    private readonly device: RuntimeHidDevice,
    private readonly reportId = DEFAULT_RUNTIME_REPORT_ID,
  ) {
    device.addEventListener("inputreport", this.handleInputReport);
  }

  async send(message: Uint8Array) {
    this.assertAvailable();
    if (message.length !== RUNTIME_MESSAGE_SIZE) {
      throw new Error(
        `教育用ランタイム命令は${RUNTIME_MESSAGE_SIZE}バイト必要です。`,
      );
    }
    await this.device.sendFeatureReport(this.reportId, new Uint8Array(message));
  }

  receive(): Promise<Uint8Array> {
    try {
      this.assertAvailable();
    } catch (error) {
      return Promise.reject(error);
    }

    const queued = this.queuedMessages.shift();
    if (queued) return Promise.resolve(queued);

    return new Promise((resolve, reject) => {
      this.pendingReceives.push({ resolve, reject });
    });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.device.removeEventListener("inputreport", this.handleInputReport);
    const error = new Error("通常動作モードの通信を終了しました。");
    for (const pending of this.pendingReceives.splice(0)) {
      pending.reject(error);
    }
    this.queuedMessages.length = 0;
  }

  private readonly handleInputReport = (event: RuntimeInputReportEvent) => {
    if (this.disposed || event.reportId !== this.reportId) return;
    const message = new Uint8Array(
      event.data.buffer,
      event.data.byteOffset,
      event.data.byteLength,
    ).slice();
    const pending = this.pendingReceives.shift();
    if (pending) pending.resolve(message);
    else this.queuedMessages.push(message);
  };

  private assertAvailable() {
    if (this.disposed) {
      throw new Error("通常動作モードの通信は終了しています。");
    }
    if (!this.device.opened) {
      throw new Error("通常動作モードのUIAPduinoが接続されていません。");
    }
  }
}
