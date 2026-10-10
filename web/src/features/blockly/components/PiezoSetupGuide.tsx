import { WiringGuideLayout } from "./WiringGuideLayout";

export function PiezoSetupGuide() {
  return (
    <WiringGuideLayout
      titleId="piezo-setup-title"
      title="音もつかってみよう"
      summary="圧電スピーカーは、小さな音を出す部品です。ドレミや合図の音で、作品をもっと楽しくしよう。"
      wiringReady={false}
      diagram={(
        <svg viewBox="0 0 640 380" className="w-full" role="img" aria-labelledby="piezo-illustration-title piezo-illustration-description">
          <title id="piezo-illustration-title">圧電スピーカーのイメージ</title>
          <desc id="piezo-illustration-description">2本の足がある丸いスピーカーのイメージ。配線図ではありません。実際の部品の形は種類によって違います。</desc>
          <path d="M275 245 V320 M365 245 V320" className="stroke-base-content/50" strokeWidth="9" strokeLinecap="round" />
          <ellipse cx="320" cy="224" rx="112" ry="52" className="fill-neutral" />
          <path d="M208 150 V224 A112 52 0 0 0 432 224 V150" className="fill-neutral" />
          <ellipse cx="320" cy="150" rx="112" ry="68" className="fill-neutral stroke-base-content/40" strokeWidth="3" />
          <ellipse cx="320" cy="150" rx="23" ry="14" className="fill-base-100/70" />
          <text x="320" y="52" textAnchor="middle" className="fill-base-content text-[24px] font-black">圧電スピーカー</text>
          <text x="320" y="362" textAnchor="middle" className="fill-base-content/70 text-[16px] font-bold">部品のイメージ（配線はまだです）</text>
        </svg>
      )}
      steps={[
        { title: "部品をたしかめよう", description: "音の高さを変えられる、圧電スピーカーを使います。使う部品を先生とたしかめよう。" },
        { title: "どんな音にしよう？", description: "ボタンを押したらピッ。光といっしょにドレミ。どんな作品にするか考えてみよう。" },
      ]}
      details={<p>このタブは準備用です。音はまだ鳴らせません。部品の種類と安全な配線を確認してから、音のブロックを追加します。</p>}
    />
  );
}
