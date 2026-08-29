# Phase 0: 実機調査記録

更新日: 2026-08-29

## 目的

Blockly教材の実装前に、対象UIAPduinoとWebHIDの通信条件を実機で確定する。

## 現在わかっていること

- UIAPduinoのUSB Vendor ID候補は `0x1209`
- 通常のWebHIDファームウェアではProduct ID `0xD004`という公開例がある
- 書き込み待機中の識別子として `0x1209:B803`を使う公開例がある
- WebHIDはHTTPSまたはlocalhostで使用する
- 初期対象ブラウザはデスクトップ版Chrome／Edge
- 今回確認したMacには調査時点でUIAPduinoが接続されていなかった

参考資料:

- [UIAPduino Pro Micro CH32V003 V1.4](https://www.uiap.jp/uiapduino/pro-micro/ch32v003/v1dot4)
- [UIAPduino WebHID Lab](https://tarosay.github.io/uiap-hid-web/)
- [MDN WebHID API](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API)

PIDやレポート構成はファームウェアによって変わる可能性があるため、実機診断の結果を正式値とする。

## 診断ページ

`web/`に、UIAPduinoを選択して次の情報を表示する診断ページを用意した。

- 製品名
- Vendor ID
- Product ID
- HID collection数
- usage pageとusage
- Input／Output／Feature ReportのReport IDと構造

診断ページは情報取得のみを行い、フラッシュやGPIOには書き込まない。

## 実機確認チェックリスト

- [ ] 使用するUIAPduinoの型番と基板バージョンを記録する
- [ ] ワークショップで使用する教育用ファームウェアを固定する
- [ ] Chromeで診断ページからデバイスを選択できる
- [ ] Edgeで診断ページからデバイスを選択できる
- [ ] Chromebookで接続できるか確認する
- [ ] 通常動作時のVID/PIDを記録する
- [ ] ブートローダー時のVID/PIDを記録する
- [ ] HID collectionとReport IDを記録する
- [ ] Feature Reportの最大送信サイズを確認する
- [ ] Input Reportの最大受信サイズと送信間隔を確認する
- [ ] 接続を解除して再接続できる
- [ ] USBを途中で抜いた場合にページが復旧できる
- [ ] LEDを1回点灯する最小コマンドを送受信する
- [ ] 成功応答またはエラー応答をブラウザで受信する

## 実機結果

UIAPduinoを接続して診断ページを実行した後、この表を更新する。

| 項目 | 結果 |
|---|---|
| 型番／基板バージョン | 未確認 |
| 教育用ファームウェア | 未決定 |
| 通常時VID | 未確認 |
| 通常時PID | 未確認 |
| ブートローダーVID | 未確認 |
| ブートローダーPID | 未確認 |
| HID collection | 未確認 |
| Feature Report | 未確認 |
| Input Report | 未確認 |
| Chrome | 未確認 |
| Edge | 未確認 |
| Chromebook | 未確認 |

## Phase 0完了条件

ブラウザからLEDを1回点灯する最小命令を送り、UIAPduinoから応答を受信できること。ここまで確認できたら、通信仕様を固定しPhase 1のBlockly画面へ進む。
