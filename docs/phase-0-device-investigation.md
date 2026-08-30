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
- [x] 読み取り専用RAM stubでチップ識別値を取得する
- [x] 64バイト書き込みpacketをオフライン生成して検証する
- [x] flash unlock／erase／write／verify手順を設計する
- [x] 実機へ送る前の書き込み前確認画面を設計する
- [x] flash unlock・64バイトerase packetをオフライン検証する
- [ ] flash unlock後の状態とread protectionを実機で検証する
- [x] flash lockとread protectionを読み取り専用で確認する
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
| RAM stub識別値       | `0x1FFFF7C4`から `0x00310510`を取得（完了確認1回）                      |
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

修正版では `0x1FFFF7C4`から `0x00310510`を取得し、完了確認は1回だった。

続いてCH32V003用 `write64_flash` stubを移植し、16KB flash範囲、64バイト境界、64バイト固定data、status register、実行マジック位置を自動テストで固定した。範囲外・未整列addressと不正data長はpacket生成時に拒否する。builderはWebHID送信処理から分離しており、実機では未実行である。

次はflash unlock、64バイトblock erase、write、read-back verifyの順序と、途中失敗時の復旧方針を設計する。

書き込み計画を実装し、各blockを `preflight → unlock → backup → merge → erase → write → verify` の順で扱うことを自動テストで固定した。部分書き込みがblockをまたぐ場合は、両方のblockを64バイト単位で退避・mergeする。計画は `executable: false`であり、WebHID送信処理へ渡されない。

次は、実行予定のaddress、容量、対象block数、消去を伴うことを利用者へ明示する書き込み前確認画面を設計する。

書き込み前確認画面を追加した。binファイルの内容はPC内で読むだけで、ファイル名、容量、開始address、対象block数、予定手順を表示する。WebHID送信・flash消去・flash書き込みの操作は存在しない。

dry-run画面は実機変更を伴わないため、赤ではなく情報色（青系）で表示するよう調整した。結果表示も成功の緑ではなく、淡い情報色で統一する。

`onboard_led_blink.bin`を選択し、436 bytes、開始address `0x08000000`、対象7 blockとして計画を生成できた。これはdry-run画面の確認結果であり、実機flashへの書き込みは行われていない。

次は、実機書き込みを追加する前提として、ブートローダーのflash unlock・erase用stubをpacketとして生成・検証し、失敗時の再接続とverify再開を設計する。

flash unlockの6 packetと、64バイトerase packetをオフライン生成して自動テストで検証した。unlockではKEYR、OBKEYR、MODEKEYRに2つの鍵を順に書き、eraseでは対象address、FLASH_STATR、64バイト設定を固定する。これらは実行マジックを含むため、実機への送信はまだ有効化していない。

次はunlock後のCTLRとread protectionの確認、erase後の全`0xFF`確認、失敗・切断後のverify再開条件を設計する。

実機操作前のpreflightとして、`FLASH_CTLR (0x40022010)`と `FLASH_OBTKEYR (0x4002201C)`を読み取り専用stubで取得する診断を追加した。ロック中かつread protectionなしの場合だけunlock候補と判定する。

2026-08-30の実機確認結果:

```text
CTLR:            0x00008080
OBTKEYR:         0x03FFFFDC
flash lock:      ロック中
read protection: 検出なし
```

通常の安全な待機状態であり、実機unlockを検討するための前提を確認できた。この確認ではunlock・erase・writeを行っていない。「unlock後のCTLR検証」は別の実機確認として未完了のまま残す。

接続、Feature Report読み取り、RAM往復、チップ識別、dry-run、flash preflightの結果を画面下部へ時刻付きで蓄積する診断ログを追加した。ログはブラウザのメモリー内だけに保持し、新しい順の表示、全文コピー、消去に対応する。サーバー送信と永続保存は行わない。

次の実機確認用として、flash unlockだけを実行してCTLRを読み直す画面を追加した。読み取り済みのpreflight結果でボタンを有効化するが、実行時にもpreflightを再実行し、ロック中かつread protectionなしでなければ6 packetを送らない。各packetの完了応答を確認し、unlock後もlock bitが残れば失敗とする。確認ダイアログ、診断ログ、再接続案内を備え、erase・writeの送信経路は追加していない。

実機結果は未確認である。確認後はunlock前後のCTLR、OBTKEYR、完了packet数、USB再接続後にロック状態へ戻るかを記録する。

## Phase 0完了条件

ブラウザからLEDを1回点灯する最小命令を送り、UIAPduinoから応答を受信できること。ここまで確認できたら、通信仕様を固定しPhase 1のBlockly画面へ進む。
