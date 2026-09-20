const LEFT_PINS = ["TX / 15", "RX / 16", "GND", "GND", "SDA / 3", "SCL / 4", "PC0 / 2", "PC3 / D5", "PD1 / 11", "PC5 / 7", "PC6 / 8", "PC7 / 9"];
const HOLE_ROWS = Array.from({ length: 12 }, (_, index) => index + 1);

export function TactSwitchWiringGuide() {
  return (
    <section className="rounded-box border-2 border-base-300 bg-base-100 p-5 shadow-sm" aria-labelledby="tact-switch-wiring-title">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black tracking-[.16em] text-primary">TACT SWITCH · WIRING GUIDE</p>
          <h3 id="tact-switch-wiring-title" className="mt-1 text-xl font-black">タクトスイッチを置こう</h3>
        </div>
        <p className="text-sm text-base-content/65">使うのは D5 と GND だけです。</p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="overflow-x-auto rounded-box bg-base-200 p-3 sm:p-5">
          <WiringDiagram />
        </div>
        <ol className="grid content-start gap-4" aria-label="配線の手順">
          <GuideStep number="1" title="足をH字に広げる">4本の足を少し広げ、タクトスイッチを縦向きに置きます。横方向に3列の穴を使います。</GuideStep>
          <GuideStep number="2" title="上と下に1本ずつつなぐ">青いD5は上側の接点へ、黒いGNDは下側の接点へつなぎます。</GuideStep>
          <GuideStep number="3" title="押すと上下がつながる">上側の2本どうし、下側の2本どうしは常につながっています。押している間だけ上下がつながります。</GuideStep>
        </ol>
      </div>
      <p className="mt-4 text-sm text-base-content/65">D5・GNDの位置は、USB-Cを上にして見たUIAPduino左側ピン列を基準にしています。</p>
    </section>
  );
}

function WiringDiagram() {
  return (
    <svg viewBox="0 0 820 510" className="min-w-[42rem] w-full" role="img" aria-labelledby="wiring-diagram-title wiring-diagram-description">
      <title id="wiring-diagram-title">UIAPduinoとH字に置くタクトスイッチの固定配線</title>
      <desc id="wiring-diagram-description">UIAPduino左側のD5とGNDの穴から、ブレッドボード上で縦向きに置いたタクトスイッチの上側と下側の接点へ配線する図。</desc>
      <text x="40" y="28" className="fill-base-content text-[19px] font-black">UIAPduino（USB-Cを上にして見る）</text>
      <rect x="120" y="48" width="154" height="394" rx="14" className="fill-neutral stroke-base-300" strokeWidth="2" />
      <rect x="157" y="58" width="80" height="40" rx="10" className="fill-base-100 stroke-base-300" />
      <text x="197" y="84" textAnchor="middle" className="fill-base-content text-[14px] font-black">USB-C</text>
      <text x="197" y="124" textAnchor="middle" className="fill-neutral-content/65 text-[14px]">左側ピン列</text>
      {LEFT_PINS.map((pin, index) => {
        const y = 148 + index * 24;
        const isGround = index === 2;
        const isD5 = index === 7;
        return (
          <g key={pin}>
            <circle cx="150" cy={y} r="10" className={isD5 ? "fill-info stroke-info-content" : isGround ? "fill-base-100 stroke-base-content" : "fill-neutral-content/75 stroke-neutral-content"} strokeWidth="2" />
            {(isGround || isD5) && <circle cx="150" cy={y} r="15" className={isD5 ? "fill-none stroke-info" : "fill-none stroke-base-content"} strokeWidth="3" />}
            <text x="170" y={y + 5} className={isD5 ? "fill-info text-[13px] font-black" : isGround ? "fill-base-100 text-[13px] font-black" : "fill-neutral-content text-[13px]"}>{pin}</text>
          </g>
        );
      })}
      {HOLE_ROWS.map((row) => <circle key={`right-${row}`} cx="244" cy={148 + (row - 1) * 24} r="10" className="fill-neutral-content/75 stroke-neutral-content" strokeWidth="2" />)}
      <text x="120" y="468" className="fill-neutral-content/65 text-[14px]">丸印が使う実際の穴</text>

      <text x="408" y="28" className="fill-base-content text-[19px] font-black">ブレッドボード（電源レールなし）</text>
      <rect x="420" y="48" width="330" height="394" rx="14" className="fill-base-100 stroke-base-300" strokeWidth="2" />
      {["a", "b", "c", "d", "e"].map((column, index) => <text key={column} x={505 + index * 30} y="104" textAnchor="middle" className="fill-base-content text-[12px] font-black">{column}</text>)}
      {HOLE_ROWS.flatMap((row) => [0, 1, 2, 3, 4].map((column) => {
        const x = 505 + column * 30;
        const y = 142 + (row - 1) * 24;
        const isTopContact = row === 3 && (column === 1 || column === 2);
        const isBottomContact = row === 7 && (column === 1 || column === 2);
        return <circle key={`${row}-${column}`} cx={x} cy={y} r="8" className={isTopContact ? "fill-info stroke-info-content" : isBottomContact ? "fill-base-content stroke-base-content" : "fill-base-content/55 stroke-base-content/30"} strokeWidth="2" />;
      }))}
      <path d="M150 316 H365 V190 H535" className="fill-none stroke-info" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="362" y="178" className="fill-info text-[14px] font-black">D5</text>
      <path d="M150 196 H335 V286 H535" className="fill-none stroke-base-content" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="336" y="274" className="fill-base-content text-[14px] font-black">GND</text>

      <rect x="518" y="162" width="94" height="152" rx="10" className="fill-base-100 stroke-base-content" strokeWidth="3" />
      <rect x="539" y="213" width="52" height="50" rx="19" className="fill-error" opacity=".85" />
      <path d="M535 190 H565 M535 286 H565" className="fill-none stroke-base-content" strokeWidth="5" strokeLinecap="round" />
      <path d="M565 190 V220 M565 256 V286" className="fill-none stroke-base-content" strokeWidth="4" strokeLinecap="round" />
      <path d="M565 220 V256" className="fill-none stroke-base-300" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 6" />
      <circle cx="535" cy="190" r="13" className="fill-none stroke-info" strokeWidth="3" /><circle cx="565" cy="190" r="11" className="fill-none stroke-info" strokeWidth="2" />
      <circle cx="535" cy="286" r="13" className="fill-none stroke-base-content" strokeWidth="3" /><circle cx="565" cy="286" r="11" className="fill-none stroke-base-content" strokeWidth="2" />
      <text x="628" y="190" className="fill-info text-[14px] font-black">上側の2本は常時つながる</text>
      <text x="628" y="286" className="fill-base-content text-[14px] font-black">下側の2本は常時つながる</text>
      <text x="565" y="344" textAnchor="middle" className="fill-base-content text-[14px] font-black">H字に足を広げて縦置き</text>
      <path d="M535 368 H595" className="fill-none stroke-warning" strokeWidth="2" />
      <text x="565" y="392" textAnchor="middle" className="fill-warning text-[13px] font-black">3列を使用</text>
      <text x="585" y="468" textAnchor="middle" className="fill-base-content/65 text-[14px] font-black">D5 は上側、GND は下側の接点に1本ずつつなぐ</text>
    </svg>
  );
}

function GuideStep({ number, title, children }: { number: string; title: string; children: string }) {
  return <li className="grid grid-cols-[2rem_1fr] gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-primary font-black text-primary-content">{number}</span><div><p className="font-black">{title}</p><p className="mt-1 text-sm leading-6 text-base-content/65">{children}</p></div></li>;
}
