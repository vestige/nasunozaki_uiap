type Props = {
  isRunning: boolean;
  canRun: boolean;
  stepDisplay: boolean;
  saveMessage: string;
  runLabel: string;
  onStepDisplayChange: (enabled: boolean) => void;
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
};

export function BlocklyToolbar({
  isRunning,
  canRun,
  stepDisplay,
  saveMessage,
  runLabel,
  onStepDisplayChange,
  onRun,
  onStop,
  onReset,
}: Props) {
  return (
    <div className="min-w-0 flex flex-col gap-3 lg:items-end">
      <p className="text-sm font-bold text-base-content/60" role="status">
        {saveMessage}
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
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
        <label
          className="label cursor-pointer gap-2 rounded-box px-3"
          title="実行中のブロックを順番に光らせます"
        >
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={stepDisplay}
            disabled={isRunning}
            onChange={(event) => onStepDisplayChange(event.target.checked)}
          />
          <span className="label-text font-bold">ステップ表示</span>
        </label>
      </div>
    </div>
  );
}
