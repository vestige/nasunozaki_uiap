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

現在のBlocklyはC/C++のコンパイルやファームウェア書き込みではありません。操作できる範囲は教育用ランタイムが実装したWebHID命令に限られ、ブラウザを閉じた後の単独実行には対応していません。

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
- 外付け部品の採用と教材の見せ方を決めるまでBlocklyの部品追加は一時停止
- コード開発モードはWeb Buildの仕様策定を終え、次はローカルbuild containerを試作する段階

D5の外付けボタン診断は技術検討用の仮実装です。タクトスイッチを教材へ正式採用したことや、D5を正式なボタンポートに決定したことを意味しません。

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

Arduino CLIを使う補助scriptは、環境準備、PC内だけのbuild、実機uploadを分離しています。

```bash
./scripts/workshop-runtime.sh setup
./scripts/workshop-runtime.sh build
./scripts/workshop-runtime.sh upload
```

`upload`はUIAPduino上のプログラムを書き換えます。実機手順と安全上の制約は[全体仕様](docs/spec.md)を確認してください。

公開ページ: [UIAPduino Browser Studio](https://vestige.github.io/nasunozaki_uiap/)
