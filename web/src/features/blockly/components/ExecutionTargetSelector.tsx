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
      <legend className="mb-2 text-sm font-black">実行する場所</legend>
      <div className="join w-full sm:w-auto">
        <TargetButton
          checked={target === "simulator"}
          disabled={disabled}
          label="画面で試す"
          onChange={() => onChange("simulator")}
        />
        <TargetButton
          checked={target === "uiapduino"}
          disabled={disabled || !runtimeConnected}
          label="UIAPduinoで動かす"
          onChange={() => onChange("uiapduino")}
        />
      </div>
      <p className="mt-2 text-sm font-bold text-base-content/60" role="status">
        {message ??
          (runtimeConnected
            ? "UIAPduinoへ接続済みです。実行先を選べます。"
            : "実機で動かすには、下の通常動作モードへ接続してください。")}
      </p>
    </fieldset>
  );
}

function TargetButton({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange(): void;
}) {
  return (
    <input
      aria-label={label}
      checked={checked}
      className="btn join-item flex-1 sm:flex-none"
      disabled={disabled}
      name="execution-target"
      onChange={onChange}
      type="radio"
      value={label}
    />
  );
}
