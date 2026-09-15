# UIAPduino Workshop Runtime

Blocklyの安全な中間命令をUIAPduinoで実行するための、最小教育用ランタイムです。現在は内蔵LED（Arduino pin 2）の点灯・消灯だけを扱います。

## 対象環境

- UIAPduino HID Arduino core `1.2.14`
- Board: `HID ProMicro CH32V003`
- USB: `WebHID Only`
- Optimize: `Smallest (-Os) with LTO`

Board Manager URL:

```text
https://raw.githubusercontent.com/tarosay/board_manager_files/main/package_uiap_hid_index.json
```

## 通信方向

- ブラウザ → UIAPduino: EP0 Feature Report、8バイトを使用（コアは最大32バイト）
- UIAPduino → ブラウザ: EP1 Input Report、8バイト

両方向とも `UIAP`識別子、version、command、8bit sequence、payload/statusからなる同じ8バイト構造を使います。command `0x01`は内蔵LED、`0x02`はD5（PC3）へ接続した外付けボタンの単発読み取りです。

## 外付けボタン

基板上のボタンはリセット／起動モード切替に使われるため、教材の入力ボタンには使用しません。通常のタクトスイッチをD5とGNDの間へ接続してください。内蔵pull-upを使うため外付け抵抗は不要で、押していない状態を`0`、押した状態を`1`としてブラウザへ返します。

## 現在の確認範囲

`workshop-runtime.ino`はArduino core `1.2.14`でコンパイル済みです。

```text
Flash: 4976 / 16384 bytes (30%)
RAM:    172 / 2048 bytes (8%)
```

2026-09-11にmacOS上のArduino CLI `1.5.1`と公式`uiapflash`で実機へ書き込み、4224 bytesのverifyとアプリ起動に成功しました。

core `1.2.14`のWebHID Only用USB構成は、実データ34 bytesに対して全長41 bytesと宣言されており、そのままではmacOSがHID interfaceを登録しません。`workshop-runtime.sh setup`は既知の誤記だけを34 bytesへ補正します。coreを先に導入済みの場合は、`patch-core`を一度実行してから再ビルドしてください。補正後の実機ではHID interface、Input Report 8 bytes、Feature Report 32 bytes、Report ID `0`を確認済みです。

## ZIPから実機へ書き込む

先にArduino CLIをインストールしてください。公開ページのZIPを展開し、展開した`workshop-runtime`フォルダで次のコマンドを実行します。`setup`は公式coreと公式`uiapflash`を導入し、`build`はPC内でのコンパイルだけを行います。実機を書き換えるのは`upload`だけです。

```bash
cd workshop-runtime
./scripts/workshop-runtime.sh setup
./scripts/workshop-runtime.sh build
./scripts/workshop-runtime.sh upload
```

coreをすでに導入済みで補正だけを行う場合:

```bash
./scripts/workshop-runtime.sh patch-core
```

`upload`の直前に、UIAPduinoのボタンを押したままUSBへ接続し、約1秒後にボタンを離してください。成功したらUSBを一度外し、ボタンを押さずに通常接続します。生成したbinは`.build/workshop-runtime/`へ置かれます。ZIPにはビルド済みbinやArduino coreは含まれません。

この操作はUIAPduino上の現在のプログラムを置き換えます。必要なプログラムや、保存した復旧用binがある場合は先に保管してください。停止中のブラウザ独自erase経路は使用しません。Uploadが失敗した場合は繰り返し書き込まず、CLIの出力を保存して原因を確認します。

ブラウザの実機AdapterとBlocklyからのLED送信は実機確認済みです。外付けボタンは単発診断を先に確認し、その後Blocklyの待機ブロックへ接続します。
