type Props = {
  isRunning: boolean;
  canRun: boolean;
  stepDisplay: boolean;
  runLabel: string;
  onStepDisplayChange: (enabled: boolean) => void;
  onRun: () => void;
  onStop: () => void;
};

export function BlocklyToolbar({
  isRunning,
  canRun,
  stepDisplay,
  runLabel,
  onStepDisplayChange,
  onRun,
  onStop,
}: Props) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <button
          className="btn btn-primary font-black"
          onClick={onRun}
          disabled={isRunning || !canRun}
        >
          {isRunning && <span className="loading loading-spinner" />}
          {isRunning ? "実行中…" : `▶ ${runLabel}`}
        </button>
        <button
          className="btn btn-outline font-black"
          onClick={onStop}
          disabled={!isRunning}
        >
          ■ とめる
        </button>
        <label
          className="flex h-11 cursor-pointer items-center gap-2 rounded-box px-2"
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
