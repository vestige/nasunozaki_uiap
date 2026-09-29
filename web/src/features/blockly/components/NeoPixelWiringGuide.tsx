const RIGHT_PINS = ["5V", "GND", "RESET", "3V3", "PD2 / 12", "PC4 / 6", "PA1 / 0", "PA2 / 1", "PC5 / 7", "PC7 / 9", "PC6 / D8", "PD0 / 10"];

export function NeoPixelWiringGuide() {
  return (
    <section className="rounded-box border-2 border-base-300 bg-base-100 p-5 shadow-sm" aria-labelledby="neopixel-wiring-title">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black tracking-[.16em] text-secondary">NEOPIXEL · WIRING GUIDE</p>
          <h3 id="neopixel-wiring-title" className="mt-1 text-xl font-black">8個のフルカラーLEDをつなごう</h3>
        </div>
        <p className="text-sm text-base-content/65">データ線は D8（PC6）固定です。</p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="rounded-box bg-base-200 p-3"><WiringDiagram /></div>
        <ol className="grid content-start gap-4" aria-label="配線の手順">
          <Step number="1" title="矢印の入口を探す">LED基板の矢印が、1番から8番へ進む向きになる側へ3本をつなぎます。</Step>
          <Step number="2" title="右側のD8へつなぐ">緑のデータ線を右側のD8（PC6）へつなぎます。タクトスイッチのD5とは別のピンです。</Step>
          <Step number="3" title="右上のGNDへつなぐ">黒の線を右側上から2番目のGNDへつなぎます。</Step>
          <Step number="4" title="右上の5Vへつなぐ">赤のVCC線を右側一番上の5Vへつなぎます。USBを抜いた状態で配線してください。</Step>
        </ol>
      </div>
      <div role="note" className="alert alert-warning mt-5 text-sm">
        <span>配線中はUSBを外してください。明るさは初期値20%、最大40%に制限しています。</span>
      </div>
    </section>
  );
}

function WiringDiagram() {
  return (
    <svg viewBox="0 0 960 560" className="w-full" role="img" aria-labelledby="neopixel-diagram-title neopixel-diagram-description">
      <title id="neopixel-diagram-title">UIAPduinoと8灯NeoPixelの信号配線</title>
      <desc id="neopixel-diagram-description">UIAPduino右側のD8へ緑のデータ入力線、右上のGNDへ黒線、一番上の5Vへ赤線を接続する。</desc>
      <text x="28" y="30" className="fill-base-content text-[18px] font-black">UIAPduino（USB-Cを上にして見る）</text>
      <rect x="110" y="48" width="290" height="432" rx="16" className="fill-neutral stroke-base-300" strokeWidth="2" />
      <rect x="215" y="60" width="80" height="38" rx="9" className="fill-base-100 stroke-base-300" />
      <text x="255" y="84" textAnchor="middle" className="fill-base-content text-[13px] font-black">USB-C</text>
      <text x="374" y="112" textAnchor="end" className="fill-white text-[13px] font-black">右側ピン列</text>
      {RIGHT_PINS.map((pin, index) => {
        const y = 134 + index * 28;
        const selected = index === 0 || index === 1 || index === 10;
        const pinClass = index === 0 ? "fill-error stroke-white" : index === 1 ? "fill-base-content stroke-white" : "fill-success stroke-white";
        const labelClass = index === 0 ? "fill-base-100 stroke-error" : index === 1 ? "fill-base-100 stroke-base-content" : "fill-base-100 stroke-success";
        const textClass = index === 0 ? "fill-error" : index === 1 ? "fill-base-content" : "fill-success";
        return (
          <g key={`${pin}-${index}`}>
            <circle cx="370" cy={y} r="10" className={selected ? pinClass : "fill-neutral-content/70 stroke-white/40"} strokeWidth="2" />
            <rect x="405" y={y - 13} width="112" height="26" rx="6" className={selected ? labelClass : "fill-base-100 stroke-base-300"} strokeWidth={selected ? 2 : 1} />
            <text x="461" y={y + 5} textAnchor="middle" className={selected ? `${textClass} text-[13px] font-black` : "fill-base-content text-[12px] font-bold"}>{pin}</text>
          </g>
        );
      })}

      <text x="666" y="30" className="fill-base-content text-[18px] font-black">NeoPixel（8灯）</text>
      <rect x="700" y="104" width="120" height="366" rx="10" className="fill-neutral stroke-base-300" strokeWidth="2" />
      {Array.from({ length: 8 }, (_, index) => <g key={index}><rect x="728" y={126 + index * 40} width="64" height="30" rx="6" className="fill-base-100 stroke-base-300" /><circle cx="760" cy={141 + index * 40} r="10" className="fill-secondary/40 stroke-secondary" /><text x="805" y={146 + index * 40} className="fill-white text-[12px] font-black">{index + 1}</text></g>)}
      <path d="M840 134 V420" className="fill-none stroke-secondary" strokeWidth="4" />
      <path d="M830 404 L840 422 L850 404" className="fill-none stroke-secondary" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <text x="858" y="282" className="fill-secondary text-[13px] font-black">信号の向き</text>

      <path d="M517 134 H650 V142 H700" className="fill-none stroke-error" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="548" y="106" width="110" height="26" rx="6" className="fill-base-100 stroke-error" strokeWidth="2" />
      <text x="603" y="124" textAnchor="middle" className="fill-error text-[13px] font-black">赤 VCC → 5V</text>
      <path d="M517 162 H636 V182 H700" className="fill-none stroke-base-content" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="548" y="166" width="96" height="26" rx="6" className="fill-base-100 stroke-base-content" strokeWidth="2" />
      <text x="596" y="184" textAnchor="middle" className="fill-base-content text-[13px] font-black">黒 GND</text>
      <path d="M517 414 H650 V222 H700" className="fill-none stroke-success" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="548" y="386" width="136" height="26" rx="6" className="fill-base-100 stroke-success" strokeWidth="2" />
      <text x="616" y="404" textAnchor="middle" className="fill-success text-[13px] font-black">緑 DIN → D8</text>
      <text x="480" y="520" textAnchor="middle" className="fill-base-content text-[15px] font-black">右側の5V・GND・D8だけを使います。D5はタクトスイッチ用です。</text>
    </svg>
  );
}

function Step({ number, title, children }: { number: string; title: string; children: string }) {
  return <li className="grid grid-cols-[2rem_1fr] gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-secondary font-black text-secondary-content">{number}</span><div><p className="font-black">{title}</p><p className="mt-1 text-sm leading-6 text-base-content/65">{children}</p></div></li>;
}
