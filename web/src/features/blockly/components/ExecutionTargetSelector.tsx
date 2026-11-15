import type { ExecutionTarget } from "../types/execution";

type Props = {
  target: ExecutionTarget;
  runtimeConnected: boolean;
  disabled: boolean;
  message?: string;
  onChange(target: ExecutionTarget): void;
};

export function ExecutionTargetSelector({
  target,
  runtimeConnected,
  disabled,
  message,
  onChange,
}: Props) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">実行する場所</legend>
      <label className="flex h-11 items-center gap-2">
        <span className={`flex items-center gap-1.5 text-sm font-black ${target === "simulator" ? "text-primary" : "text-base-content/50"}`}>
          <ScreenIcon />
          <span>画面</span>
        </span>
        <input
          aria-label="画面とボードの実行先を切り替える"
          checked={target === "uiapduino"}
          className="toggle toggle-primary"
          disabled={disabled || (!runtimeConnected && target === "simulator")}
          onChange={(event) => onChange(event.target.checked ? "uiapduino" : "simulator")}
          title={runtimeConnected ? "実行先を切り替える" : "ボードでためすには、先にボードをつないでください"}
          type="checkbox"
        />
        <span className={`flex items-center gap-1.5 text-sm font-black ${target === "uiapduino" ? "text-primary" : "text-base-content/50"} ${runtimeConnected ? "" : "opacity-40"}`}>
          <BoardIcon />
          <span>ボード</span>
        </span>
      </label>
      <p className="sr-only" role="status">
        {message ??
          (runtimeConnected
            ? "ボードにつながっています。ためす場所をえらべます。"
            : "ボードでためすには、下の「ボードにつなぐ」を押してください。")}
      </p>
    </fieldset>
  );
}

function ScreenIcon() {
  return <span className="grid justify-items-center" aria-hidden="true"><span className="h-4 w-6 rounded-sm border-2 border-current" /><span className="h-1 w-0.5 bg-current" /><span className="h-0.5 w-3 bg-current" /></span>;
}

function BoardIcon() {
  return <span className="relative h-7 w-5 rounded border-2 border-current" aria-hidden="true"><span className="absolute left-1/2 top-0.5 h-1 w-2 -translate-x-1/2 rounded-full border border-current" /><span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-current" /></span>;
}
