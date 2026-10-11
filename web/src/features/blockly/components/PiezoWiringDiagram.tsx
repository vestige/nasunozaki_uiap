const RIGHT_PINS = ["5V", "GND", "RESET", "3V3", "PD2 / 12", "PC4 / D6", "PA1 / 0", "PA2 / 1", "PC5 / 7", "PC7 / 9", "PC6 / D8", "PD0 / 10"];
const COLUMNS = [590, 620, 650, 680, 710, 770, 800, 830, 860, 890];
const ROWS = Array.from({ length: 8 }, (_, index) => 174 + index * 40);

export function PiezoWiringDiagram() {
  return (
    <svg viewBox="0 0 960 525" className="min-w-[52rem] w-full" role="img" aria-labelledby="piezo-illustration-title piezo-illustration-description">
      <title id="piezo-illustration-title">ボードとブレッドボード上の圧電スピーカーの配線</title>
      <desc id="piezo-illustration-description">USB-Cを上にしたボードを左に、ブレッドボードを右に表示。右側のD6から1キロオームの抵抗を直列に通してスピーカーの片足へ、GNDからもう片足へつなぐ。今回のスピーカーの足にプラスとマイナスの区別はない。2本の足はつながっていない別々の横一列に挿す。</desc>
      <text x="110" y="35" className="fill-base-content text-[18px] font-black">ボード（USB-Cを上に）</text>
      <rect x="110" y="66" width="290" height="430" rx="16" className="fill-neutral stroke-base-300" strokeWidth="2" />
      <rect x="213" y="78" width="84" height="38" rx="9" className="fill-base-100 stroke-base-300" />
      <text x="255" y="103" textAnchor="middle" className="fill-base-content text-[13px] font-black">USB-C</text>
      <text x="366" y="130" textAnchor="end" className="fill-white/75 text-[13px] font-black">右側ピン列</text>
      {RIGHT_PINS.map((pin, index) => {
        const y = 150 + index * 28;
        const ground = index === 1;
        const selected = ground || index === 5;
        return (
          <g key={pin}>
            <circle cx="370" cy={y} r="10" className={selected ? ground ? "fill-base-content stroke-white" : "fill-info stroke-white" : "fill-neutral-content/65 stroke-white/40"} strokeWidth="2" />
            <rect x="405" y={y - 12} width="112" height="24" rx="6" className={selected ? ground ? "fill-base-100 stroke-base-content" : "fill-base-100 stroke-info" : "fill-base-100 stroke-base-300"} strokeWidth={selected ? 2 : 1} />
            <text x="461" y={y + 5} textAnchor="middle" className={selected ? ground ? "fill-base-content text-[13px] font-black" : "fill-info text-[13px] font-black" : "fill-base-content text-[12px] font-bold"}>{pin}</text>
          </g>
        );
      })}
      <text x="565" y="35" className="fill-base-content text-[18px] font-black">スピーカーとブレッドボード</text>
      <rect x="560" y="72" width="360" height="440" rx="16" className="fill-base-100 stroke-base-300" strokeWidth="2" />
      <rect x="730" y="116" width="20" height="370" rx="8" className="fill-base-200 stroke-base-300" strokeWidth="2" />
      <text x="740" y="106" textAnchor="middle" className="fill-base-content/70 text-[13px] font-black">中央の溝</text>
      {ROWS.flatMap((y, row) => COLUMNS.map((x, column) => (
        <circle key={`${row}-${column}`} cx={x} cy={y} r="7" className="fill-base-content/35 stroke-base-content/20" />
      )))}
      <path d="M590 174 H710 M590 254 H710" className="fill-none stroke-info/40" strokeWidth="4" strokeDasharray="4 5" />
      <path d="M590 334 H710" className="fill-none stroke-base-content/40" strokeWidth="4" strokeDasharray="4 5" />
      <path d="M590 174 V254" className="stroke-base-content/50" strokeWidth="4" />
      <rect x="577" y="192" width="26" height="44" rx="7" fill="#dcc69d" className="stroke-base-content/50" strokeWidth="2" />
      <path d="M578 201 H602" stroke="#80502a" strokeWidth="5" />
      <path d="M578 210 H602" stroke="#17212b" strokeWidth="5" />
      <path d="M578 219 H602" stroke="#c34d47" strokeWidth="5" />
      <path d="M578 228 H602" stroke="#b69845" strokeWidth="3" />
      <rect x="609" y="200" width="72" height="28" rx="6" className="fill-base-100 stroke-base-content/40" strokeWidth="2" />
      <text x="645" y="220" textAnchor="middle" className="fill-base-content text-[15px] font-black">1kΩ</text>
      <path d="M683 269 H710 V254 M683 319 H710 V334" className="fill-none stroke-base-content/60" strokeWidth="5" />
      <circle cx="650" cy="294" r="48" className="fill-neutral stroke-base-content/40" strokeWidth="3" />
      <circle cx="650" cy="294" r="10" className="fill-base-100/70" />
      <rect x="568" y="374" width="158" height="28" rx="6" className="fill-base-100 stroke-base-content/40" strokeWidth="2" />
      <text x="647" y="393" textAnchor="middle" className="fill-base-content text-[13px] font-black">足の向きはどちらでもOK</text>
      <path d="M517 290 H545 V174 H620" className="fill-none stroke-info" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M517 178 H530 V334 H620" className="fill-none stroke-base-content" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Crossing wires are separate, not an electrical joint. */}
      <path d="M522 290 Q530 276 538 290" className="fill-none stroke-base-100" strokeWidth="9" />
      <path d="M522 290 Q530 276 538 290" className="fill-none stroke-info" strokeWidth="5" />
      <circle cx="620" cy="174" r="9" className="fill-base-100 stroke-info" strokeWidth="3" />
      <circle cx="620" cy="334" r="9" className="fill-base-100 stroke-base-content" strokeWidth="3" />
      <circle cx="710" cy="254" r="9" className="fill-base-100 stroke-info" strokeWidth="3" />
      <circle cx="710" cy="334" r="9" className="fill-base-100 stroke-base-content" strokeWidth="3" />
    </svg>
  );
}
