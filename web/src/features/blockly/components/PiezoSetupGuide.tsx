import { WiringGuideLayout } from "./WiringGuideLayout";
import { PiezoWiringDiagram } from "./PiezoWiringDiagram";

export function PiezoSetupGuide() {
  return (
    <WiringGuideLayout
      titleId="piezo-setup-title"
      title="音もつかってみよう"
      summary="スピーカーをブレッドボードに挿し、1kΩの抵抗を通してボード右側のD6につなぎます。もう片方の足はGNDへ。"
      wiringReady
      diagram={<PiezoWiringDiagram />}
      steps={[
        { title: "スピーカーを置く", description: "2本の足を、つながっていない別々の横一列に挿します。今回のスピーカーは、足の向きを入れ替えても使えます。" },
        { title: "1kΩの抵抗を挿す", description: "抵抗の片足をスピーカーの片足と同じ横一列へ。抵抗のもう片足は、別の横一列に挿します。" },
        { title: "D6とGNDにつなぐ", description: "D6の線は抵抗の空いている側と同じ横一列へ。GNDの線はスピーカーのもう片足と同じ横一列へつなぎます。" },
        { title: "音をためそう", description: "「音」のブロックでドレミをえらぼう。画面なら音をオンにして、ボードなら対応するランタイムを用意してためしてね。" },
      ]}
      details={<p>発振回路のない圧電スピーカー用の試験配線です。電源PINにはつながないでね。図は足と穴を見やすく広げています。実物では部品の足に合わせて別々の横一列を使い、足と線は同じ横一列の別の穴に挿してください。「次へすすむ」は音を鳴らしながら光も動かせます。音は同時に1つだけ。とめるボタンや作品の終わりで音も止まります。</p>}
    />
  );
}
