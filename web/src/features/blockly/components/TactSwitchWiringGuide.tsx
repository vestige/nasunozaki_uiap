const HOLE_ROWS = Array.from({ length: 12 }, (_, index) => index + 1);
const BREADBOARD_COLUMNS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

export function TactSwitchWiringGuide() {
  return (
    <section
      className="rounded-box border-2 border-base-300 bg-base-100 p-5 shadow-sm"
      aria-labelledby="tact-switch-wiring-title"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black tracking-[.16em] text-primary">
            TACT SWITCH · WIRING GUIDE
          </p>
          <h3 id="tact-switch-wiring-title" className="mt-1 text-xl font-black">
            タクトスイッチを置こう
          </h3>
        </div>
        <p className="text-sm text-base-content/65">
          使うのはD5とGNDだけです。
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="relative min-h-[26rem] overflow-hidden rounded-box bg-base-200 p-5">
          <div className="grid h-full grid-cols-[minmax(8rem,.8fr)_minmax(10rem,1fr)] items-center gap-8 sm:gap-12">
            <PinBoard />
            <Breadboard />
          </div>
          <div
            className="pointer-events-none absolute left-[24%] top-[43%] h-1 w-[27%] -rotate-6 rounded-full bg-info"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute left-[24%] top-[59%] h-1 w-[28%] rotate-[12deg] rounded-full bg-neutral"
            aria-hidden="true"
          />
        </div>

        <ol className="grid content-start gap-4" aria-label="配線の手順">
          <GuideStep number="1" title="真ん中の溝を見つける">
            タクトスイッチは、中央の溝をまたぐように横向きで置きます。
          </GuideStep>
          <GuideStep number="2" title="2本だけつなぐ">
            青い線はD5、黒い線はGNDです。ほかのピンにはつなぎません。
          </GuideStep>
          <GuideStep number="3" title="スイッチを押してみる">
            下の画面シミュレーターで、押したときの動きを試せます。
          </GuideStep>
        </ol>
      </div>

      <p className="mt-4 text-sm text-base-content/65">
        ブレッドボードの横につながった穴は、薄い帯で示しています。中央の溝を越えた左右は別につながっています。
      </p>
    </section>
  );
}

function PinBoard() {
  return (
    <div className="relative mx-auto grid h-[20rem] w-full max-w-[11rem] grid-cols-[1fr_3.5rem_1fr] gap-2 rounded-box border-2 border-neutral bg-neutral p-3 text-neutral-content shadow-lg">
      <div className="grid grid-rows-12 gap-1.5">
        {HOLE_ROWS.map((row) => (
          <span key={`left-${row}`} className="w-3 justify-self-center rounded-full bg-neutral-content/75 aspect-square" />
        ))}
      </div>
      <div className="flex flex-col items-center justify-between py-1 text-center">
        <span className="text-xs font-black">UIAP</span>
        <span className="text-xs font-black">duino</span>
        <span className="text-[10px] text-neutral-content/60">12 pins</span>
      </div>
      <div className="grid grid-rows-12 gap-1.5">
        {HOLE_ROWS.map((row) => (
          <span
            key={`right-${row}`}
            className={`relative w-3 justify-self-center rounded-full aspect-square ${row === 5 ? "bg-info ring-2 ring-info-content" : row === 8 ? "bg-base-300 ring-2 ring-neutral-content" : "bg-neutral-content/75"}`}
          >
            {row === 5 && (
              <span className="absolute left-5 top-1/2 -translate-y-1/2 rounded bg-info px-1 text-[9px] font-black text-info-content">
                D5
              </span>
            )}
            {row === 8 && (
              <span className="absolute left-5 top-1/2 -translate-y-1/2 rounded bg-base-300 px-1 text-[9px] font-black text-base-content">
                GND
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function Breadboard() {
  return (
    <div className="relative mx-auto h-[20rem] w-full max-w-[14rem] rounded-box border-2 border-base-300 bg-base-100 p-3 shadow-lg">
      <div className="grid h-full grid-rows-12 gap-y-1.5">
        {HOLE_ROWS.map((row) => (
          <div
            key={`row-${row}`}
            className="grid grid-cols-[repeat(5,minmax(0,1fr))_.75rem_repeat(5,minmax(0,1fr))] gap-x-1"
          >
            {BREADBOARD_COLUMNS.map((column) => {
              const isGap = column === "f";
              if (isGap) {
                return <span key={`gap-${row}`} className="rounded-sm bg-base-300" />;
              }
              const isSwitchLeg =
                (row === 5 && (column === "d" || column === "g")) ||
                (row === 7 && (column === "d" || column === "g"));
              return (
                <span
                  key={`${column}-${row}`}
                  className={`relative z-10 justify-self-center w-3 rounded-full aspect-square ${isSwitchLeg ? "bg-primary ring-2 ring-primary-content" : "bg-base-content/55"}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      {HOLE_ROWS.map((row) => (
        <div
          key={`link-left-${row}`}
          className="pointer-events-none absolute left-[9%] right-[54%] h-2 rounded-full bg-info/20"
          style={{ top: `${7 + (row - 1) * 7.25}%` }}
          aria-hidden="true"
        />
      ))}
      {HOLE_ROWS.map((row) => (
        <div
          key={`link-right-${row}`}
          className="pointer-events-none absolute left-[54%] right-[9%] h-2 rounded-full bg-info/20"
          style={{ top: `${7 + (row - 1) * 7.25}%` }}
          aria-hidden="true"
        />
      ))}
      <div className="absolute left-1/2 top-[40%] grid h-14 w-20 -translate-x-1/2 place-items-center rounded-lg border-[7px] border-base-content/55 bg-base-300 text-xs font-black text-base-content shadow-md">
        SW1
      </div>
      <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-base-content/60">
        12 × 10 holes
      </p>
    </div>
  );
}

function GuideStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: string;
}) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-primary font-black text-primary-content">
        {number}
      </span>
      <div>
        <p className="font-black">{title}</p>
        <p className="mt-1 text-sm leading-6 text-base-content/65">{children}</p>
      </div>
    </li>
  );
}
