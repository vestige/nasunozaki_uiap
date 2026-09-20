const LEFT_PINS = ["TX / 15", "RX / 16", "GND", "GND", "SDA / 3", "SCL / 4", "PC0 / 2", "PC3 / D5", "PD1 / 11", "PC5 / 7", "PC6 / 8", "PC7 / 9"];
const HOLE_ROWS = Array.from({ length: 12 }, (_, index) => index + 1);
const BREADBOARD_COLUMNS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

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
        <div className="overflow-x-auto rounded-box bg-base-200 p-3 sm:p-5"><WiringDiagram /></div>
        <ol className="grid content-start gap-4" aria-label="配線の手順">
          <GuideStep number="1" title="真ん中の溝をまたぐ">タクトスイッチを横向きにして、ブレッドボード中央の溝をまたぐように置きます。</GuideStep>
          <GuideStep number="2" title="左右に1本ずつつなぐ">青いD5は左側の接点へ、黒いGNDは右側の接点へつなぎます。上・下のどちらの足でも大丈夫です。</GuideStep>
          <GuideStep number="3" title="押すとD5がLOWになる">左右それぞれの上下2本は常時つながっています。押している間だけ左右がつながり、D5がGNDへつながります。</GuideStep>
        </ol>
      </div>
      <p className="mt-4 text-sm text-base-content/65">スイッチの中を読みやすくするため、ブレッドボードの穴の縦間隔は説明用に広げて表示しています。</p>
    </section>
  );
}

function WiringDiagram() {
  return (
    <svg viewBox="0 0 900 680" className="min-w-[46rem] w-full" role="img" aria-labelledby="wiring-diagram-title wiring-diagram-description">
      <title id="wiring-diagram-title">中央の溝をまたぐタクトスイッチの固定配線</title>
      <desc id="wiring-diagram-description">UIAPduino左側のD5とGNDから、ブレッドボード中央の溝をまたぐ横向きタクトスイッチの左右別々の接点へ配線する図。左右それぞれの上下2本は常時つながり、押した時だけ左右がつながる。</desc>
      <text x="42" y="34" className="fill-base-content text-[19px] font-black">UIAPduino（USB-Cを上にして見る）</text>
      <rect x="112" y="54" width="172" height="430" rx="14" className="fill-neutral stroke-base-300" strokeWidth="2" />
      <rect x="158" y="64" width="80" height="40" rx="10" className="fill-base-100 stroke-base-300" />
      <text x="198" y="90" textAnchor="middle" className="fill-base-content text-[14px] font-black">USB-C</text>
      <text x="198" y="126" textAnchor="middle" className="fill-neutral-content/65 text-[14px]">左側ピン列</text>
      {LEFT_PINS.map((pin, index) => {
        const y = 150 + index * 26;
        const isGround = index === 2;
        const isD5 = index === 7;
        return <g key={pin}><circle cx="142" cy={y} r="10" className={isD5 ? "fill-info stroke-info-content" : isGround ? "fill-base-100 stroke-base-content" : "fill-neutral-content/75 stroke-neutral-content"} strokeWidth="2" />{(isGround || isD5) && <circle cx="142" cy={y} r="15" className={isD5 ? "fill-none stroke-info" : "fill-none stroke-base-content"} strokeWidth="3" />}<text x="162" y={y + 5} className={isD5 ? "fill-info text-[13px] font-black" : isGround ? "fill-base-100 text-[13px] font-black" : "fill-neutral-content text-[13px]"}>{pin}</text></g>;
      })}
      {HOLE_ROWS.map((row) => <circle key={`right-${row}`} cx="254" cy={150 + (row - 1) * 26} r="10" className="fill-neutral-content/75 stroke-neutral-content" strokeWidth="2" />)}
      <text x="112" y="512" className="fill-neutral-content/65 text-[14px]">丸印が使う実際の穴</text>

      <text x="372" y="34" className="fill-base-content text-[19px] font-black">ブレッドボード（電源レールなし）</text>
      <text x="372" y="58" className="fill-base-content/65 text-[14px]">穴の縦間隔を広げた説明用の図</text>
      <rect x="360" y="76" width="478" height="548" rx="16" className="fill-base-100 stroke-base-300" strokeWidth="2" />
      <rect x="574" y="96" width="50" height="508" rx="8" className="fill-base-200 stroke-base-300" strokeWidth="2" />
      <text x="599" y="120" textAnchor="middle" className="fill-base-content/65 text-[12px] font-black">中央の溝</text>
      {BREADBOARD_COLUMNS.map((column, index) => {
        const x = index < 5 ? 410 + index * 34 : 648 + (index - 5) * 34;
        return <text key={column} x={x} y="146" textAnchor="middle" className="fill-base-content text-[12px] font-black">{column}</text>;
      })}
      {HOLE_ROWS.flatMap((row) => BREADBOARD_COLUMNS.map((column, index) => {
        const x = index < 5 ? 410 + index * 34 : 648 + (index - 5) * 34;
        const y = 174 + (row - 1) * 36;
        const isLeftContact = (row === 3 || row === 6) && column === "e";
        const isRightContact = (row === 3 || row === 6) && column === "f";
        return <circle key={`${column}-${row}`} cx={x} cy={y} r="9" className={isLeftContact ? "fill-info stroke-info-content" : isRightContact ? "fill-base-content stroke-base-content" : "fill-base-content/55 stroke-base-content/30"} strokeWidth="2" />;
      }))}
      <path d="M142 332 H330 V246 H546" className="fill-none stroke-info" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="326" y="232" className="fill-info text-[14px] font-black">D5</text>
      <path d="M142 202 H316 V246 H648" className="fill-none stroke-base-content" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="318" y="284" className="fill-base-content text-[14px] font-black">GND</text>
      <rect x="530" y="202" width="138" height="160" rx="16" className="fill-base-100 stroke-base-content" strokeWidth="3" />
      <rect x="570" y="244" width="58" height="76" rx="25" className="fill-error" opacity=".85" />
      <path d="M546 246 V354 M546 246 H530 M546 354 H530 M648 246 V354 M648 246 H668 M648 354 H668" className="fill-none stroke-base-content" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M572 300 H622" className="fill-none stroke-base-300" strokeWidth="7" strokeLinecap="round" strokeDasharray="9 9" />
      <circle cx="546" cy="246" r="15" className="fill-none stroke-info" strokeWidth="3" /><circle cx="546" cy="354" r="15" className="fill-none stroke-info" strokeWidth="3" />
      <circle cx="648" cy="246" r="15" className="fill-none stroke-base-content" strokeWidth="3" /><circle cx="648" cy="354" r="15" className="fill-none stroke-base-content" strokeWidth="3" />
      <text x="476" y="414" textAnchor="middle" className="fill-info text-[14px] font-black">左側の上下2本は常時つながる</text>
      <text x="720" y="414" textAnchor="middle" className="fill-base-content text-[14px] font-black">右側の上下2本は常時つながる</text>
      <text x="599" y="452" textAnchor="middle" className="fill-base-content text-[15px] font-black">横向きに置き、中央の溝をまたぐ</text>
      <text x="599" y="652" textAnchor="middle" className="fill-base-content/65 text-[14px] font-black">押した時だけ左右が導通し、D5 は GND につながって LOW になる</text>
    </svg>
  );
}

function GuideStep({ number, title, children }: { number: string; title: string; children: string }) {
  return <li className="grid grid-cols-[2rem_1fr] gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-primary font-black text-primary-content">{number}</span><div><p className="font-black">{title}</p><p className="mt-1 text-sm leading-6 text-base-content/65">{children}</p></div></li>;
}
