# UIAPduino Browser Studio

UIAPduinoをブラウザから学び、操作し、将来はコードのビルドや実機への書き込みまで行える開発環境を目指すプロジェクトです。

最終的には[UIFlow](https://uiflow.m5stack.com/)のように、初学者がブロックから始め、理解や目的に応じてコード開発へ進める環境を目指します。小学生向けワークショップは最終目的ではなく、接続、実行、修正、復旧の分かりやすさを確かめる最初の実証実験です。

## 2つの開発モード

### ブロック開発モード

Blocklyを安全な中間命令へ変換し、画面シミュレーターまたはUIAPduinoへ書き込んだ教育用ランタイムで実行します。

```text
Blockly
  ↓
ブラウザ内の実行エンジン
  ↓
WebHID
  ↓
UIAPduino教育用ランタイム
```

Blockly作品を安全な小さな命令列へ変換し、通常接続のUIAPduinoへ作品だけを書き込んで単独実行できます。通常接続での更新と、再給電後の自動実行は実機確認済みです。教育用ランタイムの初回導入・更新には書き込みモードが必要ですが、その後の作品更新では不要です。C/C++を作品ごとにコンパイルする方式ではありません。

### コード開発モード

ブラウザでArduino形式のC/C++を書き、AWS上の固定toolchainでUIAPduino向けに実際にビルドする構想です。

最初のMVPはcompiler error、warning、Flash使用量、RAM使用量の確認までとし、実機への書き込みは含めません。AWS構成はTerraformで再現できるようにします。

## 現在地

- Phase 0のbootloader・WebHID調査は完了
- 教育用ランタイムを公式`uiapflash`で書き込み、verify済み
- ブラウザとUIAPduino間のLED命令・応答を実機確認済み
- Blocklyの画面実行、実機実行、保存・復元、作品ファイルに対応済み
- 実行中のUSB切断と再接続後の再実行を確認済み
- 独自erase経路は過去の部分消去事故のため停止中。保存済みbinから完全復旧済み
- D5のタクトスイッチ、D8の8灯NeoPixel、変数・条件・比較・論理・加減算に対応済み
- NeoPixelのLED番号と明るさに数値・変数・計算を使用可能。色は選択欄で指定する
- コード開発モードはWeb Buildの仕様策定を終え、次はローカルbuild containerを試作する段階

タクトスイッチ教材はD5–GND、NeoPixel教材はD8–DIN・5V・GNDの固定配線を使います。参加者による配線・学習のしやすさと高速連打の検出限界は、引き続き検証する項目です。

## 技術構成

- React
- TypeScript
- daisyUI / Tailwind CSS
- TanStack Query
- Blockly
- WebHID
- Vite
- GitHub Pages
- AWS Lambda / API Gateway / ECR（Web Build計画）
- Terraform（Web Build計画）

Webアプリは機能単位の`features/`に分け、必要に応じて`components`、`hooks`、`utils`、`types`へ整理します。テストは実装と混在させず、プロジェクト直下の`tests/`へ機能別に置きます。

## ドキュメント

`docs/`の正本は次の2ファイルです。

- [全体構想・Blockly・実機仕様](docs/spec.md)
- [コード開発モード・Web Build仕様](docs/spec_build.md)

`spec.md`には全体構想、現在の仕様・進捗・残タスク、ブレッドボードとWebHID対応部品を組み合わせるBlocklyチュートリアル原案をまとめています。

`spec_build.md`にはコード開発モード、AWS Web Build、料金・セキュリティ、Terraform構成、現在地、残タスクをまとめています。

詳細な設計・検証は、正本から次の専用文書を参照します。

- [Web側の責任分担・編集中の保存と実行判定](docs/web-responsibilities.md)
- [ボード単独実行・通常接続での作品更新](docs/spec_standalone.md)
- [Blocklyの実機確認と未確認事項](docs/validation-blockly-hardware.md)
- [NeoPixelの明るさ入力・互換性・実機確認](docs/spec-neopixel-brightness.md)
- [ファーム容量の調査・削減記録](docs/firmware-capacity-investigation.md)

実装変更時はREADMEと該当する仕様書を同じ作業単位で更新します。長い時系列記録は増やさず、現在有効な仕様、安全上必要な結論、残タスクを優先します。

## ローカルでWebアプリを開く

```bash
cd web
npm install
npm run dev
```

## テストとビルド

```bash
npm --prefix web test
npm --prefix web run build
```

## 教育用ランタイム

公開ページから教育用ランタイムをブラウザで直接書き込めます。利用者にArduino CLIは不要です。[ZIP](https://vestige.github.io/nasunozaki_uiap/workshop-runtime.zip)には完成済みbin、ソース、ビルド条件、手順書を含みます。

ソースから再ビルドする開発者向けに、Arduino CLIを使う補助scriptも残しています。環境準備、PC内だけのbuild、実機uploadを分離しています。

```bash
./scripts/workshop-runtime.sh setup
./scripts/workshop-runtime.sh build
./scripts/workshop-runtime.sh upload
```

`upload`はUIAPduino上のプログラムを書き換えます。実機手順と安全上の制約は[全体仕様](docs/spec.md)を確認してください。

公開ページ: [UIAPduino Browser Studio](https://vestige.github.io/nasunozaki_uiap/)
