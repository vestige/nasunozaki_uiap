const PINS = ["TX / 15", "RX / 16", "GND", "GND", "SDA / 3", "SCL / 4", "PC0 / 2", "PC3 / D5", "PD1 / 11", "PC5 / 7", "PC6 / D8", "PC7 / 9"];

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
          <Step number="2" title="緑をD8へつなぐ">緑のデータ線をD8（PC6）へつなぎます。タクトスイッチのD5とは別のピンです。</Step>
          <Step number="3" title="黒をGNDへつなぐ">黒の線をGNDへつなぎます。別電源を使う場合もGNDはUIAPduinoと共通にします。</Step>
          <Step number="4" title="赤は確認してから">赤のVCCは電源条件の確認が終わるまで接続しません。D8やGNDへはつながないでください。</Step>
        </ol>
      </div>
      <div role="note" className="alert alert-warning mt-5 text-sm">
        <span>実機の電源電圧と給電方法は検証中です。この段階では画面シミュレーターで試してください。</span>
      </div>
    </section>
  );
}

function WiringDiagram() {
  return (
    <svg viewBox="0 0 860 540" className="w-full" role="img" aria-labelledby="neopixel-diagram-title neopixel-diagram-description">
      <title id="neopixel-diagram-title">UIAPduinoと8灯NeoPixelの信号配線</title>
      <desc id="neopixel-diagram-description">NeoPixelの緑のデータ入力線をUIAPduinoのD8へ、黒線をGNDへ接続する。赤の電源線は未接続で、電源条件の確認待ち。</desc>
      <text x="32" y="30" className="fill-base-content text-[18px] font-black">UIAPduino（USB-Cを上にして見る）</text>
      <rect x="72" y="48" width="190" height="414" rx="16" className="fill-neutral stroke-base-300" strokeWidth="2" />
      <rect x="127" y="60" width="80" height="38" rx="9" className="fill-base-100 stroke-base-300" />
      <text x="167" y="84" textAnchor="middle" className="fill-base-content text-[13px] font-black">USB-C</text>
      {PINS.map((pin, index) => {
        const y = 124 + index * 27;
        const isGround = index === 2;
        const isD8 = index === 10;
        return <g key={`${pin}-${index}`}><circle cx="102" cy={y} r="10" className={isD8 ? "fill-secondary stroke-secondary-content" : isGround ? "fill-base-100 stroke-base-content" : "fill-neutral-content/70 stroke-neutral-content"} strokeWidth="2" /><text x="122" y={y + 5} className={isD8 ? "fill-secondary text-[13px] font-black" : isGround ? "fill-base-100 text-[13px] font-black" : "fill-neutral-content text-[12px]"}>{pin}</text></g>;
      })}

      <text x="374" y="30" className="fill-base-content text-[18px] font-black">NeoPixel（8灯）</text>
      <rect x="430" y="102" width="120" height="366" rx="10" className="fill-neutral stroke-base-300" strokeWidth="2" />
      {Array.from({ length: 8 }, (_, index) => <g key={index}><rect x="458" y={124 + index * 40} width="64" height="30" rx="6" className="fill-base-100 stroke-base-300" /><circle cx="490" cy={139 + index * 40} r="10" className="fill-secondary/40 stroke-secondary" /><text x="535" y={144 + index * 40} className="fill-neutral-content text-[12px] font-black">{index + 1}</text></g>)}
      <path d="M570 132 V418" className="fill-none stroke-secondary" strokeWidth="4" />
      <path d="M560 402 L570 420 L580 402" className="fill-none stroke-secondary" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <text x="592" y="280" className="fill-secondary text-[13px] font-black">信号の向き</text>

      <path d="M102 394 H354 V126 H430" className="fill-none stroke-success" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <text x="286" y="112" className="fill-success text-[14px] font-black">緑 DIN → D8 / PC6</text>
      <path d="M102 178 H330 V164 H430" className="fill-none stroke-base-content" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <text x="286" y="188" className="fill-base-content text-[14px] font-black">黒 GND</text>
      <path d="M430 202 H366" className="fill-none stroke-error stroke-dashed" strokeWidth="6" strokeLinecap="round" />
      <text x="276" y="208" className="fill-error text-[14px] font-black">赤 VCC：まだ接続しない</text>
      <text x="344" y="510" textAnchor="middle" className="fill-base-content/65 text-[14px] font-bold">D5はタクトスイッチ用として空けておきます</text>
    </svg>
  );
}

function Step({ number, title, children }: { number: string; title: string; children: string }) {
  return <li className="grid grid-cols-[2rem_1fr] gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-secondary font-black text-secondary-content">{number}</span><div><p className="font-black">{title}</p><p className="mt-1 text-sm leading-6 text-base-content/65">{children}</p></div></li>;
}
