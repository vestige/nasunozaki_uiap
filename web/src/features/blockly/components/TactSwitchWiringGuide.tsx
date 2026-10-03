import { WiringGuideLayout, type WiringStep } from "./WiringGuideLayout";

const LEFT_PINS = ["TX / 15", "RX / 16", "GND", "GND", "SDA / 3", "SCL / 4", "PC0 / 2", "PC3 / D5", "PD1 / 11", "PC5 / 7", "PC6 / 8", "PC7 / 9"];
const COLUMNS = [100, 130, 160, 190, 220, 325, 355, 385, 415, 445];
const ROWS = Array.from({ length: 8 }, (_, index) => 154 + index * 40);

const steps: WiringStep[] = [
  { title: "スイッチを置く", description: "4本の足が中央の溝をはさんで左右に分かれるように置きます。" },
  { title: "黒い線をGNDへ", description: "ボード左側のGNDと、スイッチ右上の足と同じ横一列の穴をつなぎます。" },
  { title: "青い線をD5へ", description: "ボード左側のD5と、スイッチ右下の足と同じ横一列の穴をつなぎます。" },
];

export function TactSwitchWiringGuide() {
  return (
    <WiringGuideLayout
      titleId="tact-switch-wiring-title"
      title="タクトスイッチをつなごう"
      summary="スイッチを置き、ボード左側のGNDとD5から2本の線をつなぎます。"
      diagram={<WiringDiagram />}
      steps={steps}
      details={(
        <>
          <p>スイッチの上側の2本はつながっていて、下側の2本もつながっています。押すと上下がつながり、D5がGNDにつながります。</p>
          <p>図では穴と足を見やすい大きさにしています。実物のブレッドボードでは、足と線をそれぞれ同じ横一列の別の穴に挿してください。</p>
        </>
      )}
    />
  );
}

function WiringDiagram() {
  return (
    <svg viewBox="0 0 960 525" className="min-w-[52rem] w-full" role="img" aria-labelledby="tact-diagram-title tact-diagram-description">
      <title id="tact-diagram-title">ボードとタクトスイッチの配線</title>
      <desc id="tact-diagram-description">USB-Cを上にしたボードを右に、中央の溝をまたぐタクトスイッチを左に表示。ボード左側のGNDから黒い線をスイッチ右上と同じ列の穴へ、D5から青い線を右下と同じ列の穴へつなぐ。</desc>

      <text x="60" y="35" className="fill-base-content text-[18px] font-black">スイッチとブレッドボード</text>
      <rect x="58" y="72" width="440" height="440" rx="16" className="fill-base-100 stroke-base-300" strokeWidth="2" />
      <rect x="251" y="116" width="46" height="370" rx="8" className="fill-base-200 stroke-base-300" strokeWidth="2" />
      <text x="274" y="106" textAnchor="middle" className="fill-base-content/70 text-[13px] font-black">中央の溝</text>
      {ROWS.flatMap((y, row) => COLUMNS.map((x, column) => (
        <circle key={`${row}-${column}`} cx={x} cy={y} r="8" className="fill-base-content/35 stroke-base-content/20" strokeWidth="1" />
      )))}

      <rect x="214" y="210" width="124" height="165" rx="14" className="fill-neutral stroke-base-300" strokeWidth="3" />
      <rect x="233" y="234" width="86" height="116" rx="12" className="fill-base-100 stroke-base-300" strokeWidth="2" />
      <circle cx="231" cy="234" r="12" className="fill-base-100 stroke-base-content" strokeWidth="3" />
      <circle cx="325" cy="234" r="12" className="fill-base-100 stroke-base-content" strokeWidth="3" />
      <circle cx="231" cy="354" r="12" className="fill-base-100 stroke-info" strokeWidth="3" />
      <circle cx="325" cy="354" r="12" className="fill-base-100 stroke-info" strokeWidth="3" />
      <text x="275" y="290" textAnchor="middle" className="fill-base-content text-[15px] font-black">押す</text>
      <text x="350" y="211" className="fill-base-content text-[13px] font-black">右上</text>
      <text x="350" y="387" className="fill-info text-[13px] font-black">右下</text>

      <text x="560" y="35" className="fill-base-content text-[18px] font-black">ボード（USB-Cを上に）</text>
      <rect x="560" y="66" width="280" height="430" rx="16" className="fill-neutral stroke-base-300" strokeWidth="2" />
      <rect x="657" y="78" width="86" height="38" rx="9" className="fill-base-100 stroke-base-300" />
      <text x="700" y="103" textAnchor="middle" className="fill-base-content text-[13px] font-black">USB-C</text>
      <text x="700" y="138" textAnchor="middle" className="fill-white/75 text-[13px] font-black">左側ピン列</text>
      {LEFT_PINS.map((pin, index) => {
        const y = 152 + index * 27;
        const selected = index === 2 || index === 7;
        const ground = index === 2;
        return (
          <g key={`${pin}-${index}`}>
            <circle cx="575" cy={y} r="10" className={selected ? ground ? "fill-base-content stroke-white" : "fill-info stroke-white" : "fill-neutral-content/65 stroke-white/40"} strokeWidth="2" />
            <rect x="601" y={y - 12} width="118" height="24" rx="6" className={selected ? ground ? "fill-base-100 stroke-base-content" : "fill-base-100 stroke-info" : "fill-base-100 stroke-base-300"} strokeWidth={selected ? 2 : 1} />
            <text x="660" y={y + 5} textAnchor="middle" className={selected ? ground ? "fill-base-content text-[13px] font-black" : "fill-info text-[13px] font-black" : "fill-base-content text-[12px] font-bold"}>{pin}</text>
          </g>
        );
      })}

      <path d="M575 206 H530 V234 H355" className="fill-none stroke-base-content" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M575 341 H530 V354 H355" className="fill-none stroke-info" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="355" cy="234" r="10" className="fill-base-100 stroke-base-content" strokeWidth="3" />
      <circle cx="355" cy="354" r="10" className="fill-base-100 stroke-info" strokeWidth="3" />
      <rect x="408" y="201" width="92" height="26" rx="6" className="fill-base-100 stroke-base-content" strokeWidth="2" />
      <text x="454" y="219" textAnchor="middle" className="fill-base-content text-[13px] font-black">黒 GND</text>
      <rect x="418" y="364" width="82" height="26" rx="6" className="fill-base-100 stroke-info" strokeWidth="2" />
      <text x="459" y="382" textAnchor="middle" className="fill-info text-[13px] font-black">青 D5</text>
    </svg>
  );
}
