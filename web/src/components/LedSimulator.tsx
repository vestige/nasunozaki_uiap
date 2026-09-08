import type { ProgramInstruction } from "../blockly/program";

type Props = { ledOn: boolean; instructions: ProgramInstruction[] };

export function LedSimulator({ ledOn, instructions }: Props) {
  return (
    <aside className="card border-2 border-neutral bg-neutral text-neutral-content shadow-xl">
      <div className="card-body items-center text-center">
        <p className="text-sm font-black tracking-widest text-neutral-content/60">
          LED SIMULATOR
        </p>
        <div
          className={`my-8 h-36 w-36 rounded-full border-8 transition-all duration-150 ${ledOn ? "border-warning/40 bg-warning shadow-[0_0_60px_20px_oklch(var(--wa)/.45)]" : "border-neutral-content/20 bg-black/50"}`}
          role="img"
          aria-label={ledOn ? "LED点灯中" : "LED消灯中"}
        />
        <p className="text-2xl font-black">
          {ledOn ? "LED ついてる！" : "LED きえてる"}
        </p>
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
        : 1),
    0,
  );
}
