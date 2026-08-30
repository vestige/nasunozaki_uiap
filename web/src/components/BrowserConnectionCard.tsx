import type { UseMutationResult } from "@tanstack/react-query";
import type { HidDevice } from "../webhid/types";
type Props = {
  supported: boolean;
  message: string;
  connect: UseMutationResult<HidDevice, Error, void, unknown>;
};

export function BrowserConnectionCard({ supported, message, connect }: Props) {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <div className="card mt-7 border-2 border-neutral bg-base-100 shadow-xl">
        <div className="card-body gap-5 sm:flex-row sm:items-center">
          <div
            className={`status ${supported ? "status-success" : "status-error"} status-xl shrink-0`}
            aria-hidden="true"
          />
          <div className="flex-1">
            <div className="text-xs font-black tracking-[.16em] text-primary">
              ブラウザ確認
            </div>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              {supported ? "WebHIDを利用できます" : "WebHIDを利用できません"}
            </h2>
            <p className="mt-2 text-sm text-base-content/65" role="status">
              {message}
            </p>
          </div>
          <button
            className="btn btn-primary btn-lg font-black"
            onClick={() => connect.mutate()}
            disabled={connect.isPending || !supported}
          >
            {connect.isPending && <span className="loading loading-spinner" />}
            {connect.isPending ? "確認中…" : "UIAPduinoを調べる"}
          </button>
        </div>
      </div>
    </section>
  );
}
