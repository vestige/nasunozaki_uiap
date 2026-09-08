type Props = {
  isRunning: boolean;
  canRun: boolean;
  saveMessage: string;
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
};

export function BlocklyToolbar({
  isRunning,
  canRun,
  saveMessage,
  onRun,
  onStop,
  onReset,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:items-end">
      <p className="text-sm font-bold text-base-content/60" role="status">
        {saveMessage}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          className="btn btn-primary btn-lg font-black"
          onClick={onRun}
          disabled={isRunning || !canRun}
        >
          {isRunning && <span className="loading loading-spinner" />}
          {isRunning ? "実行中…" : "▶ 画面で実行"}
        </button>
        <button
          className="btn btn-outline btn-lg font-black"
          onClick={onStop}
          disabled={!isRunning}
        >
          ■ とめる
        </button>
        <button className="btn btn-ghost" onClick={onReset}>
          最初のブロックに戻す
        </button>
      </div>
    </div>
  );
}
