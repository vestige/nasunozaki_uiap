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

- ブラウザ → UIAPduino: EP0 Feature Report、32バイトで転送し、先頭8バイトを命令として使用
- UIAPduino → ブラウザ: EP1 Input Report、8バイト

プロトコルは両方向とも `UIAP`識別子、version、command、8bit sequence、payload/statusからなる同じ8バイト構造を使います。Windows HIDとの互換性のため、ブラウザから送る32バイトFeature Reportは先頭8バイトに命令を格納し、残り24バイトを0で埋めます。command `0x01`は内蔵LED、`0x02`はD5（PC3）へ接続した外付けボタンの単発読み取りです。

## 外付けボタン

基板上のボタンはリセット／起動モード切替に使われるため、教材の入力ボタンには使用しません。通常のタクトスイッチをD5とGNDの間へ接続してください。内蔵pull-upを使うため外付け抵抗は不要で、押していない状態を`0`、押した状態を`1`としてブラウザへ返します。

## 現在の確認範囲

`workshop-runtime.ino`はArduino core `1.2.14`でコンパイル済みです。

```text
Flash: 4976 / 16384 bytes (30%)
RAM:    172 / 2048 bytes (8%)
```

2026-09-11にmacOS上のArduino CLI `1.5.1`と公式`uiapflash`で実機へ書き込み、4224 bytesのverifyとアプリ起動に成功しました。

core `1.2.14`のWebHID Only用USB構成は、実データ34 bytesに対して全長41 bytesと宣言されており、そのままではmacOSがHID interfaceを登録しません。同梱の完成済みbinは、この全長を34 bytesへ補正したcoreでビルドしています。補正後の実機ではHID interface、Input Report 8 bytes、Feature Report 32 bytes、Report ID `0`を確認済みです。Feature Reportはdescriptorどおり32バイトで送るため、Windows HIDでも短いreport bufferになりません。

## ブラウザから実機へ書き込む

公開ページに完成済みファームウェアを用意しています。利用者のPCにArduino CLI、Arduino IDE、ボードcoreをインストールする必要はありません。PC版ChromeまたはEdgeのWebHIDを使います。

1. 必要なプログラムや保存した復旧用binを先に保管する
2. UIAPduinoのボタンを押したままUSBへ接続し、約1秒後に離す
3. [公開ページ](https://vestige.github.io/nasunozaki_uiap/)の「はじめて通常動作モードを使うとき」を開き、「教育用ランタイムを書き込む」を押す
4. 書き込みモードのUIAPduinoを選択し、書き込みと照合の完了表示を待つ
5. USBを外し、ボタンを押さずに接続し直す
6. 「通常動作モードを調べる」で接続を確認する

ZIPには同じ完成済み`workshop-runtime.bin`、ソースの`workshop-runtime.ino`、ビルド条件とSHA-256を記録した`build-info.json`を含みます。ZIPの展開はブラウザ書き込みには必要ありません。

この操作はUIAPduino上の現在のプログラムを置き換えます。停止中のブラウザ独自erase試験経路は使用しません。書き込みが失敗した場合は連続して再試行せず、画面のメッセージと接続状態を確認してください。

ソースから再ビルドする開発者だけがArduino coreとArduino CLIを使用します。既存の`./scripts/workshop-runtime.sh`はそのために残しています。

ブラウザの実機AdapterとBlocklyからのLED送信は実機確認済みです。外付けボタンは単発診断を先に確認し、その後Blocklyの待機ブロックへ接続します。
