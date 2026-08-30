# Phase 0: 実機調査記録

更新日: 2026-08-30

## 目的

Blockly教材の実装前に、対象UIAPduinoとWebHIDの通信条件を実機で確定する。

## 現在わかっていること

- UIAPduinoブートローダーのUSB Vendor IDは `0x1209`
- 通常のWebHIDファームウェアではProduct ID `0xD004`という公開例がある
- 書き込み待機中の識別子として `0x1209:B803`を使う公開例がある
- WebHIDはHTTPSまたはlocalhostで使用する
- 初期対象ブラウザはデスクトップ版Chrome／Edge
- ボタンを押しながらUSB接続し、約1秒後にボタンを離すと診断ページから取得できた

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

## 確認できた接続手順

1. UIAPduinoをUSBから外しておく
2. UIAPduinoのボタンを押し続ける
3. ボタンを押したままUSBケーブルでPCへ接続する
4. 接続後、約1秒待ってからボタンを離す
5. Chromeで診断ページの「UIAPduinoを調べる」を押す
6. ブラウザの一覧に表示されたUIAPduinoを選択する

通常接続では情報を取得できず、この操作が必要だった。現時点では、ボードを書き込み待機状態へ入れる操作と考えられる。

## 実機確認チェックリスト

- [ ] 使用するUIAPduinoの型番と基板バージョンを記録する
- [ ] ワークショップで使用する教育用ファームウェアを固定する
- [x] Chromeで診断ページからデバイスを選択できる
- [ ] Edgeで診断ページからデバイスを選択できる
- [ ] Chromebookで接続できるか確認する
- [ ] 通常動作時のVID/PIDを記録する
- [x] ブートローダー時のVID/PIDを記録する
- [x] HID collectionとReport IDを記録する
- [x] Feature Reportの最大送信サイズを確認する
- [x] Input Reportが存在しないことを確認する
- [x] Report ID `0xAA`を読み取り専用で取得する
- [x] 実行マジック値を含まないRAM往復テストに成功する
- [x] 接続を解除して再接続できる
- [x] USBを途中で抜いた場合にページが復旧できる
- [ ] 読み取り専用RAM stubでチップ識別値を取得する
- [ ] LEDを1回点灯する最小コマンドを送受信する
- [ ] 成功応答またはエラー応答をブラウザで受信する

## 実機結果

UIAPduinoを接続して診断ページを実行した後、この表を更新する。

| 項目                 | 結果                                                                   |
| -------------------- | ---------------------------------------------------------------------- |
| 型番／基板バージョン | 製品名 `32V003`（基板バージョンは未確認）                              |
| 教育用ファームウェア | 未決定                                                                 |
| 通常時VID            | 未確認                                                                 |
| 通常時PID            | 未確認                                                                 |
| ブートローダーVID    | `0x1209`                                                               |
| ブートローダーPID    | `0xB803`                                                               |
| HID collection       | Usage Page `0x0001`、Usage `0x00FF`、Collection Type `1`               |
| Feature Report       | Report ID `0xAA`、Report Count `127`、Report Size `8 bit`（127 bytes） |
| Input Report         | 未確認                                                                 |
| Chrome               | 接続とdescriptor取得を確認済み                                         |
| RAM往復              | 127 bytesの送信内容と読み戻し内容が完全一致                            |
| USB切断・再接続      | 切断検知後、接続手順を繰り返して再接続成功                             |
| Edge                 | 未確認                                                                 |
| Chromebook           | 未確認                                                                 |

取得したHID Collection:

```text
Usage Page:       0x0001
Usage:            0x00FF
Collection Type:  1
Feature Report ID: 0xAA (170)
Report Count:      127
Report Size:       8 bit
Input Reports:     なし
Output Reports:    なし
```

この状態ではFeature Reportだけが公開されている。ブラウザからの書き込みプロトコル調査では、Report ID `0xAA`を使うFeature Reportが入口になる可能性が高い。

診断画面で確認したデバイス情報:

```text
Product Name: 32V003
Vendor ID:    0x1209
Product ID:   0xB803
Collections:  1
```

## 次の調査

診断ページからWebHIDの `receiveFeatureReport(0xAA)` を呼び、GET_REPORT相当の読み取りが可能であることを確認した。

実測結果:

```text
Raw length:       128 bytes
Leading byte:     0x00
Payload candidate: 127 bytes
Content:          all 0x00
Observed at:      2026-08-30 09:44:18 JST
```

descriptorはReport Count 127、Report Size 8 bitを示すが、WebHIDの戻り値は128バイトだった。WebHID仕様上、Feature Reportの読み取り結果にはOSが返す先頭バイトが含まれる場合があるため、先頭1バイトと127バイトのpayload候補として記録する。

全ゼロ応答はGET_REPORTの転送成功を示すが、ブートローダーの状態やバージョンを表す有効な応答とは判断しない。

この段階では次を行わない。

- `sendFeatureReport`によるデータ送信
- フラッシュへの書き込み
- 未確認コマンドの送信

## 参照実装の調査結果

rv003usb bootloaderとch32fun minichlinkを照合した結果、固定的な状態取得コマンドを送る方式ではないことが分かった。

minichlinkは次の流れで動作する。

1. scratchpadへRISC-Vの小さな処理コードをFeature Reportで送る
2. 転送末尾へ実行マジック `0x1234ABCD`を置く
3. ブートローダーがRAM上のコードを実行する
4. 結果をscratchpadへ置く
5. GET_REPORTでホストが結果を読む

実機検証では、実行マジックを含めない127バイトの固定パターンをSET_REPORTでscratchpadへ送り、GET_REPORTで同じ内容を読み戻すことに成功した。これはRAMだけを変更し、フラッシュ書き込みやコード実行は行わない。

```text
送信payload:  127 bytes
受信payload:  127 bytes
比較結果:     完全一致
実機確認日:   2026-08-30
```

接続中にUSBを抜いた場合の切断表示と、接続手順を繰り返した場合の再接続に成功した。これにより、書き込み実験前に必要なWebHID通信経路と基本的な復旧性を確認できた。

次の実機検証では、参照実装の読み取り専用 `word_wise_read_blob`をRAMで実行し、`0x1FFFF7C4`から4バイトのチップ識別値を取得する。これが成功すれば、実行マジック、RAMコード実行、完了応答、結果取り出しまでの経路が確認できる。フラッシュの消去・書き込みは行わない。

初回試験では完了応答 `0xFF`を1回目の確認で取得したが、表示値は読み取り先と同じ `0x1FFFF7C4`だった。これは入力アドレスが置かれたpayload offset 51を結果として解釈したためで、stubが実データを置くpayload offset 59へ修正した。初回値はチップ識別値として採用せず、修正版で再確認する。

## Phase 0完了条件

ブラウザからLEDを1回点灯する最小命令を送り、UIAPduinoから応答を受信できること。ここまで確認できたら、通信仕様を固定しPhase 1のBlockly画面へ進む。
