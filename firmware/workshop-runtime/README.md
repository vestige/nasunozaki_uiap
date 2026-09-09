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

この段階ではブラウザの実機Adapterと書き込み導線は未実装です。既存プログラムを上書きするため、明示的な次段階まではボードへ書き込まないでください。
