import { WiringGuideLayout, type WiringStep } from "./WiringGuideLayout";

const RIGHT_PINS = ["5V", "GND", "RESET", "3V3", "PD2 / 12", "PC4 / 6", "PA1 / 0", "PA2 / 1", "PC5 / 7", "PC7 / 9", "PC6 / D8", "PD0 / 10"];

const steps: WiringStep[] = [
  { title: "入力側をたしかめる", description: "矢印が1番から8番へ向かうように置き、1番側の端子を使います。" },
  { title: "緑の線をD8へ", description: "ボード右側のD8と、NeoPixelのDINをつなぎます。" },
  { title: "黒い線をGNDへ", description: "ボード右側のGNDと、NeoPixelのGNDをつなぎます。" },
  { title: "赤い線を5Vへ", description: "ボード右側の5Vと、NeoPixelの5Vをつなぎます。" },
];

export function NeoPixelWiringGuide() {
  return (
    <WiringGuideLayout
      titleId="neopixel-wiring-title"
      title="8個のLEDをつなごう"
      summary="ボード右側のD8・GND・5Vから、NeoPixelの入力側へ3本の線をつなぎます。"
      diagram={<WiringDiagram />}
      steps={steps}
      details={(
        <>
          <p>DINは「データの入口」です。矢印とは逆向きの出口につなぐと、LEDは正しく光りません。</p>
          <p>明るさの初期値は20%です。実機で安全に使える明るさの上限は、電流を測ってから決めます。</p>
        </>
      )}
    />
  );
}

function WiringDiagram() {
  return (
    <svg viewBox="0 0 960 525" className="min-w-[52rem] w-full" role="img" aria-labelledby="neopixel-diagram-title neopixel-diagram-description">
      <title id="neopixel-diagram-title">ボードと8個のNeoPixelの配線</title>
      <desc id="neopixel-diagram-description">USB-Cを上にしたボードの右側のD8を緑の線でDINへ、GNDを黒い線でGNDへ、5Vを赤い線で5Vへつなぐ。3本はNeoPixelの1番側の入力端子につなぎ、矢印は1番から8番へ向かう。</desc>

      <text x="110" y="35" className="fill-base-content text-[18px] font-black">ボード（USB-Cを上に）</text>
      <rect x="110" y="66" width="290" height="430" rx="16" className="fill-neutral stroke-base-300" strokeWidth="2" />
      <rect x="213" y="78" width="84" height="38" rx="9" className="fill-base-100 stroke-base-300" />
      <text x="255" y="103" textAnchor="middle" className="fill-base-content text-[13px] font-black">USB-C</text>
      <text x="366" y="130" textAnchor="end" className="fill-white/75 text-[13px] font-black">右側ピン列</text>
      {RIGHT_PINS.map((pin, index) => {
        const y = 150 + index * 28;
        const selected = index === 0 || index === 1 || index === 10;
        const pinClass = index === 0 ? "fill-error stroke-white" : index === 1 ? "fill-base-content stroke-white" : "fill-success stroke-white";
        const labelClass = index === 0 ? "fill-base-100 stroke-error" : index === 1 ? "fill-base-100 stroke-base-content" : "fill-base-100 stroke-success";
        const textClass = index === 0 ? "fill-error" : index === 1 ? "fill-base-content" : "fill-success";
        return (
          <g key={pin}>
            <circle cx="370" cy={y} r="10" className={selected ? pinClass : "fill-neutral-content/65 stroke-white/40"} strokeWidth="2" />
            <rect x="405" y={y - 12} width="112" height="24" rx="6" className={selected ? labelClass : "fill-base-100 stroke-base-300"} strokeWidth={selected ? 2 : 1} />
            <text x="461" y={y + 5} textAnchor="middle" className={selected ? `${textClass} text-[13px] font-black` : "fill-base-content text-[12px] font-bold"}>{pin}</text>
          </g>
        );
      })}

      <text x="713" y="35" className="fill-base-content text-[18px] font-black">NeoPixel（8個）</text>
      <rect x="700" y="100" width="154" height="410" rx="12" className="fill-neutral stroke-base-300" strokeWidth="2" />
      <text x="777" y="125" textAnchor="middle" className="fill-white text-[13px] font-black">入力側（1番側）</text>
      {[
        { y: 150, label: "5V", circleClass: "fill-base-100 stroke-error", textClass: "fill-error" },
        { y: 184, label: "GND", circleClass: "fill-base-100 stroke-base-content", textClass: "fill-base-content" },
        { y: 218, label: "DIN", circleClass: "fill-base-100 stroke-success", textClass: "fill-success" },
      ].map(({ y, label, circleClass, textClass }) => (
        <g key={label}>
          <circle cx="700" cy={y} r="10" className={circleClass} strokeWidth="3" />
          <rect x="722" y={y - 12} width="108" height="24" rx="6" className="fill-base-100 stroke-base-300" />
          <text x="776" y={y + 5} textAnchor="middle" className={`${textClass} text-[13px] font-black`}>{label}</text>
        </g>
      ))}
      {Array.from({ length: 8 }, (_, index) => (
        <g key={index}>
          <rect x="728" y={244 + index * 30} width="68" height="25" rx="5" className="fill-base-100 stroke-base-300" />
          <circle cx="762" cy={256 + index * 30} r="8" className="fill-base-content/25 stroke-base-content/50" strokeWidth="2" />
          <text x="808" y={261 + index * 30} className="fill-white text-[12px] font-black">{index + 1}</text>
        </g>
      ))}
      <path d="M879 254 V468 M871 455 L879 469 L887 455" className="fill-none stroke-secondary" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <text x="901" y="360" className="fill-secondary text-[13px] font-black">1→8</text>

      <path d="M517 150 H650 V150 H700" className="fill-none stroke-error" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M517 178 H636 V184 H700" className="fill-none stroke-base-content" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M517 430 H665 V218 H700" className="fill-none stroke-success" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="535" y="115" width="92" height="26" rx="6" className="fill-base-100 stroke-error" strokeWidth="2" />
      <text x="581" y="133" textAnchor="middle" className="fill-error text-[13px] font-black">赤 5V</text>
      <rect x="542" y="190" width="96" height="26" rx="6" className="fill-base-100 stroke-base-content" strokeWidth="2" />
      <text x="590" y="208" textAnchor="middle" className="fill-base-content text-[13px] font-black">黒 GND</text>
      <rect x="542" y="390" width="92" height="26" rx="6" className="fill-base-100 stroke-success" strokeWidth="2" />
      <text x="588" y="408" textAnchor="middle" className="fill-success text-[13px] font-black">緑 D8</text>
    </svg>
  );
}
