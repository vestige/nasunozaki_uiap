type Props = {
  isRunning: boolean;
  canRun: boolean;
  saveMessage: string;
  runLabel: string;
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
};

export function BlocklyToolbar({
  isRunning,
  canRun,
  saveMessage,
  runLabel,
  onRun,
  onStop,
  onReset,
}: Props) {
  return (
    <div className="min-w-0 flex flex-col gap-3 lg:items-end">
      <p className="text-sm font-bold text-base-content/60" role="status">
        {saveMessage}
      </p>
      <div className="flex min-w-0 flex-wrap gap-3">
        <button
          className="btn btn-primary btn-lg font-black"
          onClick={onRun}
          disabled={isRunning || !canRun}
        >
          {isRunning && <span className="loading loading-spinner" />}
          {isRunning ? "実行中…" : `▶ ${runLabel}`}
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
