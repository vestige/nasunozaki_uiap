# UIAPduino Workshop Runtime

Blocklyの安全な中間命令をUIAPduinoで実行するための、最小教育用ランタイムです。内蔵LED、D5のタクトスイッチ、D8（PC6）の8灯NeoPixelを扱います。

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

プロトコルは両方向とも `UIAP`識別子、version、command、8bit sequence、payload/statusからなる同じ8バイト構造を使います。ブラウザは既存ランタイムとの互換性のため最初に8バイトで送り、Windows HIDが短いreport bufferを拒否した場合だけ、先頭8バイトに命令を格納して残り24バイトを0で埋めた32バイトFeature Reportで再送します。command `0x01`は内蔵LED、`0x02`はD5（PC3）へ接続した外付けボタンの単発読み取りです。NeoPixelは`0x10`〜`0x13`でRGBと1〜100%の明るさを設定し、`0x14`で全灯または1〜8番へ反映、`0x15`で全消灯します。

## NeoPixel

`NeoPixelmin`を使い、DINはSPI1 MOSIのD8（PC6）固定、個数は8灯固定です。任意のGPIOや9番以降は操作できません。起動時と停止・エラー時は8灯を消灯します。SPI1を使うため、同じランタイムで`SPI.h`や`SDmin`とは併用できません。

起動時はNeoPixel側の電源安定を20ms待ってから、全消灯フレームを2回送ります。電源投入直後のフレーム取りこぼしによる意図しない点灯を防ぎます。

2026-10-01に修正版を実機へ書き込み、電源投入直後から8灯すべてが消灯状態になることを確認しました。

8灯分の波形を送る約240µsの間は割り込みを停止します。ソフトウェアUSBの割り込みでNeoPixelの波形が途切れ、まれに異なる色として解釈されることを防ぎます。WebHID命令の受信完了を1ms待ってから波形を送り、応答は波形送信の完了後に返します。

## 外付けボタン

基板上のボタンはリセット／起動モード切替に使われるため、教材の入力ボタンには使用しません。通常のタクトスイッチをD5とGNDの間へ接続してください。内蔵pull-upを使うため外付け抵抗は不要で、押していない状態を`0`、押した状態を`1`としてブラウザへ返します。

## 現在の確認範囲

`workshop-runtime.ino`はArduino core `1.2.14`でコンパイル済みです。

```text
Flash: 6164 / 16384 bytes (37%)
RAM:    232 / 2048 bytes (11%)
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

ブラウザの実機AdapterとBlocklyからの内蔵LED送信は実機確認済みです。2026-10-01にD8（PC6）へ接続した8灯NeoPixelで、20%の明るさによる全灯、1番の個別点灯、全消灯とWebHID応答を実機確認しました。D5とGNDへ接続したタクトスイッチとの同時利用も確認し、押している間だけNeoPixelを点灯し、離すと消灯するBlockly作品が動作しました。
