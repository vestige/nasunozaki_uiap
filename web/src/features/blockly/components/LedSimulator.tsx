type Props = {
  ledOn: boolean;
  buttonPressed: boolean;
  extensionEnabled: boolean;
  neoPixelEnabled: boolean;
  neoPixels: string[];
  onButtonChange(pressed: boolean): void;
};

export function LedSimulator({
  ledOn,
  buttonPressed,
  extensionEnabled,
  neoPixelEnabled,
  neoPixels,
  onButtonChange,
}: Props) {
  return (
    <aside className="card h-[38rem] min-w-0 border-2 border-neutral bg-neutral text-neutral-content shadow-xl lg:h-[44rem]">
      <div className="card-body items-center text-center">
        <p className="grow-0 text-sm font-black tracking-widest text-neutral-content/60">
          BOARD SIMULATOR
        </p>
        <div className={`mt-5 grid w-full items-start gap-4 ${neoPixelEnabled ? "grid-cols-[minmax(0,1fr)_6.5rem]" : "grid-cols-1"}`}>
          <div className="grid justify-items-center">
            <p className="text-xs font-black tracking-widest text-neutral-content/60">UIAPDUINO</p>
            <div
              className={`my-5 rounded-full border-8 transition-all duration-150 ${neoPixelEnabled ? "h-28 w-28" : "h-36 w-36"} ${ledOn ? "border-warning/40 bg-warning shadow-[0_0_60px_20px_oklch(var(--wa)/.45)]" : "border-neutral-content/20 bg-black/50"}`}
              role="img"
              aria-label={ledOn ? "LED点灯中" : "LED消灯中"}
            />
            <p className={`${neoPixelEnabled ? "text-lg" : "text-2xl"} font-black`}>
              {ledOn ? "LED ついてる！" : "LED きえてる"}
            </p>
          </div>
          {neoPixelEnabled && (
            <div className="rounded-box border border-neutral-content/20 bg-black/20 px-3 py-3">
              <p className="text-[10px] font-black tracking-wider text-neutral-content/60">NEOPIXEL</p>
              <p className="mb-2 text-[10px] font-bold text-neutral-content/60">D8 / PC6</p>
              <div className="grid gap-1.5" role="img" aria-label="8個のNeoPixelシミュレーター">
                {neoPixels.map((color, index) => (
                  <div key={index} className="flex items-center justify-center gap-2">
                    <span className="w-3 text-right text-[10px] font-bold">{index + 1}</span>
                    <span className="h-6 w-10 rounded border-2 border-white/25 transition" style={{ backgroundColor: color, boxShadow: color === "#000000" ? "none" : `0 0 12px ${color}` }} aria-label={`${index + 1}番 ${color === "#000000" ? "消灯" : color}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
      </div>
    </aside>
  );
}
