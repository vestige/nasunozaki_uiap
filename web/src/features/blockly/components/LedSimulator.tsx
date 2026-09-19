import type { ProgramInstruction } from "../utils/program";

type Props = {
  ledOn: boolean;
  buttonPressed: boolean;
  extensionEnabled: boolean;
  instructions: ProgramInstruction[];
  onButtonChange(pressed: boolean): void;
};

export function LedSimulator({
  ledOn,
  buttonPressed,
  extensionEnabled,
  instructions,
  onButtonChange,
}: Props) {
  return (
    <aside className="card min-w-0 border-2 border-neutral bg-neutral text-neutral-content shadow-xl">
      <div className="card-body items-center text-center">
        <p className="text-sm font-black tracking-widest text-neutral-content/60">
          BOARD SIMULATOR
        </p>
        <div
          className={`my-8 h-36 w-36 rounded-full border-8 transition-all duration-150 ${ledOn ? "border-warning/40 bg-warning shadow-[0_0_60px_20px_oklch(var(--wa)/.45)]" : "border-neutral-content/20 bg-black/50"}`}
          role="img"
          aria-label={ledOn ? "LED点灯中" : "LED消灯中"}
        />
        <p className="text-2xl font-black">
          {ledOn ? "LED ついてる！" : "LED きえてる"}
        </p>
        {extensionEnabled && (
          <div className="mt-5 w-full rounded-box border border-neutral-content/20 bg-black/20 p-4">
            <p className="text-xs font-black tracking-widest text-neutral-content/60">
              TACT SWITCH · D5 + GND
            </p>
            <div className="my-3 flex items-center justify-center gap-3 text-xs font-bold">
              <span className="rounded bg-info px-2 py-1 text-info-content">D5</span>
              <span aria-hidden="true">━━</span>
              <button
                type="button"
                className={`h-16 w-16 rounded-xl border-4 transition ${buttonPressed ? "translate-y-1 border-primary bg-primary shadow-none" : "border-neutral-content/50 bg-base-300 shadow-[0_5px_0_rgba(255,255,255,.25)]"}`}
                aria-label="タクトスイッチ。押している間オン"
                aria-pressed={buttonPressed}
                onPointerDown={() => onButtonChange(true)}
                onPointerUp={() => onButtonChange(false)}
                onPointerCancel={() => onButtonChange(false)}
                onPointerLeave={() => onButtonChange(false)}
                onKeyDown={(event) => {
                  if (event.key === " " || event.key === "Enter") onButtonChange(true);
                }}
                onKeyUp={(event) => {
                  if (event.key === " " || event.key === "Enter") onButtonChange(false);
                }}
              />
              <span aria-hidden="true">━━</span>
              <span className="rounded bg-base-300 px-2 py-1 text-base-content">GND</span>
            </div>
            <p className="text-sm font-bold">
              {buttonPressed ? "スイッチ：押されている" : "スイッチ：押されていない"}
            </p>
          </div>
        )}
        <div className="divider divider-neutral" />
        <p className="text-sm leading-6 text-neutral-content/65">
          ブロックは安全な命令へ変換してから順番に実行します。
        </p>
        <div className="badge badge-outline mt-2">
          命令 {countInstructions(instructions)}個
        </div>
      </div>
    </aside>
  );
}

function countInstructions(instructions: ProgramInstruction[]): number {
  return instructions.reduce(
    (total, instruction) =>
      total +
      (instruction.type === "repeat"
        ? instruction.times * countInstructions(instruction.body)
        : instruction.type === "ifButton"
          ? 1 + Math.max(
              countInstructions(instruction.body),
              countInstructions(instruction.elseBody),
            )
        : 1),
    0,
  );
}
