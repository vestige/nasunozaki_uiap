# Phase 0: 実機調査記録

更新日: 2026-09-09

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
- [x] flash unlock後の状態とread protectionを実機で検証する
- [x] flash先頭64バイトを読み取り専用で退避する
- [x] 退避した64バイトをPCへ保存し、再読込で完全一致を確認する
- [x] erase・復元トランザクションをオフラインで自動テストする
- [ ] 先頭64バイトのerase・全0xFF確認・元データ復元を実機で確認する
- [x] 破損した先頭4バイトを保存済みbinから復旧する
- [x] erase packetと完了応答の位置を参照実装と再照合する
- [x] eraseを送らずに現在のflash statusを診断できるようにする
- [x] flash status診断の実機結果を記録する
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
| RAM stub識別値       | `0x1FFFF7C4`から `0x00310510`を取得（完了確認1回）                     |
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

2026-09-09に、調査コードの読みやすさを保つため、デバイス診断を `features/device/` の `components`、`hooks`、`utils`、`types`へ再配置し、自動テストを `src/__tests__/device/`へ集約した。通信packet、アドレス、安全条件、実機操作の仕様変更はない。GitHub Pagesでは使われていなかった `web/.openai/hosting.json`も削除した。

同日に追加したBlockly作品ファイルの保存・読み込みはブラウザ内のworkspaceだけを対象とし、WebHID、bootloader、flashの診断・書き込み経路には接続しない。

Phase 2準備として追加した `BoardAdapter`と教育用ランタイムは、UIAPduino HID Arduino core `1.2.14`の送受信幅と照合した。EP0 Feature Reportは最大32バイト、EP1 Input Reportは8バイトのため、要求と応答を8バイトへ統一した。内蔵LEDはArduino pin 2である。最小ランタイムはFlash 4004 bytes、RAM 172 bytesでコンパイル済みだが、実機へは未書き込みである。

ランタイム用VID/PIDとReport IDは実機確認待ちで、Phase 0のbootloader送信処理やflash操作には接続しない。

2026-09-09に通常動作モード専用の読み取り診断を追加した。公開されているArduino coreの既定値 `0x1209:0xD004`だけを選択対象とし、接続後のHID descriptorをそのまま表示する。bootloader用 `0x1209:0xB803`の診断状態とは分離し、この時点ではFeature ReportやLED命令を送らない。実機へ教育用ランタイムを書き込んだ後、この画面でPIDとReport IDなし（0）のブラウザ上の見え方を確定する。

追加後のレスポンシブ確認で、Blockly内部の最小幅が狭い画面のページ幅を押し広げる構造を修正した。これは表示だけの変更であり、Phase 0のWebHID通信条件やflash操作には影響しない。
追加確認でBlockly内部SVGの寸法再計算も必要と判明したため、containerのサイズ変更時に `Blockly.svgResize()`を実行するよう修正した。
通常動作モード診断の追加により、bootloader接続手順の負のmarginが直前カードへ重なることが画像確認で判明した。接続手順を通常フローへ戻し、機能カードの操作領域を覆わないよう修正した。通信処理への変更はない。

HID descriptorの読み取り専用分類では、実測済みのCollectionがInput/Output Reportを持たず、Feature Report `0xAA`だけを持つため `bootloader`となる。これは既存の接続結果と整合する。分類時に追加packetは送らず、教育用ランタイム対応の証明やflash操作の許可には使わない。

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

2026-09-06の実機結果:

```text
完了packet:          6
unlock前 CTLR:       0x00008080
unlock後 CTLR:       0x00000200
unlock後 flash lock: false
unlock後 protection: false
```

unlock sequenceと直後の状態読み取りは成功した。USB再接続後にロック状態へ戻ることは、次回接続時のpreflightログでも継続確認する。

`0x08000000`から64バイトを16 wordで読み取り、ブラウザのメモリーへ退避する実機確認に成功した。

```text
address:    0x08000000
bytes:      64
CRC32:      0xBED6A734
all erased: false
attempts:   16
data:       6F 00 00 0A 00 00 00 00 0E 01 00 00 0C 01 00 00
            00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
            00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
            0C 01 00 00 00 00 00 00 0C 01 00 00 00 00 00 00
```

また、WebHIDの画面操作で再接続しただけでは `CTLR=0x00000200`のunlock状態が継続し、USBを物理的に外してブートローダーモードで接続し直すと `CTLR=0x00008080`のロック状態へ戻ることを確認した。

次の安全確認として、退避した64バイトを復旧用binファイルとしてPCへ保存し、同じファイルを選び直してCRC32と全バイトの一致を確認する画面を追加した。erase・writeはまだ行わない。

2026-09-06に `uiapduino_flash_08000000_crc32_BED6A734.bin`を保存し、64 bytes、CRC32 `0xBED6A734`、全バイト一致を実機画面で確認した。

続いて、`preflight → 現在値照合 → erase → 全0xFF確認 → 元データwrite → 完全一致verify`を1つのtransactionとして実装した。erase後の確認失敗時にも元データの復旧を試み、復旧できたかを型付きエラーで返す。現在値が退避内容と異なる場合にeraseを呼ばないことを含め、自動テストで固定した。

このtransactionをWebHID Device adapterへ接続し、復旧用ファイルの照合成功後だけ有効になる「先頭64バイトを消去して元に戻す」ボタンを追加した。確認ダイアログ後に全工程を自動実行し、段階別ログを残す。実機結果は未確認である。

2026-09-06の実機試験では、preflight照合後にerase完了応答を確認できず、自動復旧も失敗した。再読込結果は先頭4バイトだけが `6F 00 00 0A`から`FF FF FF FF`へ変化し、残り60バイトは元のままだった。CRC32は `0xDDD24572`。erase操作を停止し、新しいeraseを行わず保存済み `CRC32=0xBED6A734`のbinを直接復元する経路を優先する。

参照実装との再照合で、64バイトwrite前に `FLASH_CTLR`へ`CR_PAGE_PG (0x00010000)`と`CR_PAGE_PG | CR_BUF_RST (0x00090000)`を書く必須手順が欠けていたことを確認した。これを追加し、保存済みbinのファイル名・容量・CRC32を検証して書き戻す専用画面を追加した。

同日、保存済み `uiapduino_flash_08000000_crc32_BED6A734 (2).bin`を専用画面で検証し、unlock済み・read protectionなしの状態から新しいeraseを行わずに書き戻した。直後の読み取りで全64バイトの完全一致と `CRC32=0xBED6A734`を確認し、先頭4バイトを破損前の状態へ復旧できた。USBの抜き差し後も今回は `CTLR=0x00000200`のunlock状態が続いたため、物理的な再接続だけで必ずロック状態へ戻るとは仮定しない。

復旧後、ch32fun `618bba58c615ed29dc99e6ea92d869c914b6a8c0`の `pgm-b003fun.c`と再照合した。erase packetの52バイトstub、address `0x08000000`、status register `0x4002200C`、page sizeとlengthを表す `0x00400040`、末尾の実行マジックは一致していた。WebHIDが返す127バイト形式とReport IDを含む128バイト形式の両方で、完了値 `0xFF`を正しく判定できることも自動テストへ追加した。packetの静的配置または応答の1バイトずれが原因である可能性は低くなったが、erase再実行はまだ行わない。

次の実機確認用に、読み取り専用stubだけで `FLASH_CTLR (0x40022010)`、`FLASH_STATR (0x4002200C)`、`FLASH_OBTKEYR (0x4002201C)`を取得するflash status診断を追加した。STATRの `BSY (bit 0)`、`WRPRTERR (bit 4)`、`EOP (bit 5)`、`MODE (bit 14)`、`LOCK (bit 15)`を個別に解釈し、生の3値とともに診断ログへ残す。この操作からunlock・erase・write packetへ到達する経路はない。

2026-09-08の実機確認では、ロック中の状態で次を取得した。

```text
CTLR:                  0x00008080
STATR:                 0x00008000
OBTKEYR:               0x03FFFFDC
busy:                  false
writeProtectionError: false
endOfOperation:        false
statusMode:            false
statusLocked:          true
attempts:              3
```

BUSYとWRPRTERRは残っておらず、STATR側のLOCKだけが有効である。preflightのロック中・read protectionなしという結果と整合し、診断開始前からflash controllerが処理中または書き込み保護エラー状態だった可能性は低い。これは静止状態の確認であり、失敗したerase実行中のSTATR遷移までは説明しないため、eraseは停止したままとする。

## Phase 0完了条件

ブラウザからLEDを1回点灯する最小命令を送り、UIAPduinoから応答を受信できること。ここまで確認できたら、通信仕様を固定しPhase 1のBlockly画面へ進む。

ただし、Blockly編集画面と画面内シミュレーターは実機flash操作に依存しないため、erase調査でUI開発全体を止めない。2026-09-08からPhase 0の未完了項目を維持したままPhase 1の非実機部分を並行して開始した。実機への送信機能はPhase 0完了条件を満たすまで接続しない。

Phase 1側では続いてBlockly workspaceのブラウザ内自動保存、自動復元、初期点滅例へのリセットを追加した。これらは `localStorage`だけを使用し、WebHID Device adapterやflash操作には接続しない。Phase 0の実機チェック状況への変更はない。

2026-09-09にPhase 1側へ実行中ブロックのハイライトを追加した。シミュレーターruntimeはBlockly block IDを命令とともに受け取り、繰り返しの内側を含めて現在位置を表示する。停止時は待機、LED、ハイライトを解除する。これも実機通信から独立しており、Phase 0の未完了項目とerase停止状態に変更はない。
