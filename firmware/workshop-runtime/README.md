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

両方向とも `UIAP`識別子、version、command、8bit sequence、payload/statusからなる同じ8バイト構造を使います。

## 現在の確認範囲

`workshop-runtime.ino`はArduino core `1.2.14`でコンパイル済みです。

```text
Flash: 4004 / 16384 bytes (24%)
RAM:    172 / 2048 bytes (8%)
```

2026-09-11にmacOS上のArduino CLI `1.5.1`と公式`uiapflash`で実機へ書き込み、4224 bytesのverifyとアプリ起動に成功しました。

## Arduino CLIから実機へ書き込む（推奨）

Arduino IDEがなくても、リポジトリ直下から次の3コマンドで準備できます。`setup`は公式coreと公式`uiapflash`を導入し、`build`はPC内でのコンパイルだけを行います。実機を書き換えるのは`upload`だけです。

```bash
./scripts/workshop-runtime.sh setup
./scripts/workshop-runtime.sh build
./scripts/workshop-runtime.sh upload
```

`upload`の直前に、UIAPduinoのボタンを押したままUSBへ接続し、約1秒後にボタンを離してください。成功したらUSBを一度外し、ボタンを押さずに通常接続します。生成したbinは`.build/workshop-runtime/`へ置かれ、Git管理には含めません。

## Arduino IDEから実機へ書き込む（代替手順）

この操作はUIAPduino上の現在のプログラムを置き換えます。必要なプログラムや、Phase 0で保存した復旧用binがある場合は先に保管してください。停止中のブラウザ独自erase経路は使用しません。

1. Arduino IDE 2.xの設定へBoard Manager URLを追加する
2. Board Managerで `UIAPduino HID` version `1.2.14`をインストールする
3. このフォルダの `workshop-runtime.ino`をArduino IDEで開く
4. Boardを `HID ProMicro CH32V003`にする
5. USBを `WebHID Only`、Optimizeを `Smallest (-Os) with LTO`にする
6. UIAPduinoをUSBから外す
7. ボード上のボタンを押したままUSBへ接続し、約1秒後にボタンを離す
8. Arduino IDEの `Upload`を実行し、成功表示を確認する
9. USBを外し、今度はボタンを押さず通常どおり接続する
10. Browser Studioの「通常動作モードを調べる」からdescriptorを確認する

coreの公式導入手順は[UIAPduino HID Board Manager Files](https://github.com/tarosay/board_manager_files)を参照してください。macOSは公式ページ上で動作確認中と記載されているため、Uploadが失敗した場合は繰り返し書き込まず、CLIまたはArduino IDEの出力を保存して原因を確認します。

ブラウザの実機AdapterとBlocklyからの送信導線はまだ有効にしていません。実機descriptorを確認してから接続します。
