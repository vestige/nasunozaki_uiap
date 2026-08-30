# UIAPduino Browser Studio 仕様書

更新日: 2026-08-30

この文書を、現在実装されている仕様と確定した設計判断の正本とする。構想の背景は `initial-design.md`、実機での検証履歴は `phase-0-device-investigation.md`に記録する。

## 1. プロダクトゴール

UIAPduinoのプログラム作成、実行、状態確認、保存、実機への書き込みをブラウザだけで行える統合開発環境を作る。

最終的にはUIFlowのように、初学者がブロックから始め、理解や用途に応じて高度な開発へ進める環境を目指す。

小学生向けワークショップはプロダクトの最終目的ではない。接続の分かりやすさ、実行と修正の速さ、復旧可能性、複数台運用を検証する最初の実証実験として扱う。

## 2. 現在のスコープ

現在はPhase 0「実機調査」である。

Phase 0の目的:

- ブラウザとUIAPduinoブートローダーの接続条件を確定する
- HID descriptorとFeature Reportの構成を確定する
- 読み取り専用通信を確認する
- 書き込みプロトコルを調査する
- 最小バイナリを書き込み、実行結果を確認する

Phase 0の完了条件:

1. 対象デバイスを安全に識別できる
2. ブラウザからFeature Reportを送受信できる
3. LEDを点灯する最小バイナリを書き込める
4. 書き込み成功またはエラーをブラウザで確認できる

## 3. 対象デバイス

ブートローダーモードで確認済みの識別情報:

| 項目                   | 値          |
| ---------------------- | ----------- |
| Product Name           | `32V003`    |
| Vendor ID              | `0x1209`    |
| Product ID             | `0xB803`    |
| HID Collection         | 1個         |
| Usage Page             | `0x0001`    |
| Usage                  | `0x00FF`    |
| Collection Type        | `1`         |
| Feature Report ID      | `0xAA`      |
| Feature Report Count   | `127`       |
| Feature Report Size    | `8 bit`     |
| Feature Report Payload | `127 bytes` |
| Input Report           | なし        |
| Output Report          | なし        |

WebHIDの選択ダイアログはVendor IDとProduct IDの両方で絞り込む。他のHIDデバイスへ命令を送らない。

## 4. ブートローダー接続手順

1. UIAPduinoをUSBから外す
2. UIAPduinoのボタンを押し続ける
3. ボタンを押したままUSBでPCへ接続する
4. 約1秒待ってからボタンを離す
5. PC版ChromeまたはEdgeで診断ページを開く
6. 「UIAPduinoを調べる」を押す
7. デバイス選択画面で `32V003` を選ぶ

## 5. Webアプリ仕様

### 5.1 技術構成

| 項目             | 採用技術       |
| ---------------- | -------------- |
| UI               | React          |
| UIコンポーネント | daisyUI        |
| CSS              | Tailwind CSS   |
| ビルド           | Vite           |
| USB通信          | WebHID         |
| 公開             | GitHub Pages   |
| CI/CD            | GitHub Actions |

公開URL: `https://vestige.github.io/nasunozaki_uiap/`

### 5.2 対応環境

- デスクトップ版Chrome
- デスクトップ版Edge
- HTTPSまたはlocalhost

Safari、Firefox、スマートフォンは現在の対象外とする。Chromebookは実機検証待ち。

### 5.3 診断画面

診断画面は次を行う。

- WebHID対応ブラウザか判定する
- ブートローダーへの接続手順を表示する
- `0x1209:0xB803`だけを選択候補にする
- 接続後に製品名、VID、PID、HID Collectionを表示する
- Report ID `0xAA`のFeature Reportを読み取る
- 読み取り結果を16進数とバイト数で表示する
- OSから返った生データとdescriptor上のpayload候補を区別する
- 通信失敗時に再試行可能なメッセージを表示する
- 接続、読み取り、dry-run、flash安全確認の結果を画面下部の診断ログへ記録する
- 診断ログを新しい順に表示し、全文コピーと消去を行える

診断画面では、明示的に別の操作を選ぶまでFeature Reportの送信やフラッシュ書き込みを行わない。

診断ログはTanStack Queryのメモリーキャッシュだけに保持する。各行は時刻、レベル、操作名、説明、診断値を持ち、ページ再読み込み後には残さない。ログをサーバーへ送信せず、ファイルや`localStorage`へ自動保存しない。

## 6. 接続状態

UIでは次の状態を区別する。

```text
unsupported
  WebHID非対応

idle
  未接続

selecting
  デバイス選択中

connected
  HIDデバイスをopen済み

reading
  Feature Report読み取り中

error
  選択、open、読み取りの失敗
```

USB切断イベントへの追従と自動再接続は未実装である。

## 7. 読み取り専用Feature Report診断

対象Report ID: `0xAA`

WebHIDの `receiveFeatureReport(0xAA)` を使用し、GET_REPORT相当の読み取りだけを行う。戻り値のDataViewをバイト列へ変換し、次を表示する。

- 受信バイト数
- 16進数表現
- 読み取り日時
- 成功またはエラー

この操作では `sendFeatureReport` を呼ばないため、フラッシュ内容を書き換えない。

### 7.1 実機結果

実機では次の結果を得た。

| 項目         | 結果            |
| ------------ | --------------- |
| WebHID戻り値 | 128 bytes       |
| 先頭バイト   | `0x00`          |
| payload候補  | 127 bytes       |
| 内容         | 全バイト `0x00` |

WebHID仕様では、`receiveFeatureReport()`の戻り値はOSが返した内容をそのまま含み、Report IDを使う機器では先頭バイトが含まれる場合がある。そのため、descriptorの `127 bytes` と実測の `128 bytes` の差はOSが返した先頭1バイトによるものと解釈する。

全ゼロ応答から確認できるのは、ブラウザ、OS、USB HID EP0、ブートローダー間でGET_REPORTが完了したことまでである。ブートローダーのバージョンや状態を取得できたことは意味しない。

これはUSBシリアル通信ではない。CDC、UART、Web Serial APIは使用しておらず、USB HIDのFeature ReportをEP0制御転送で読み取っている。

## 8. Phase 0の通信調査順序

```text
1. HID descriptor取得                 完了
2. Feature Report GET_REPORT          完了（128 bytes、全0）
3. 参照実装から転送方式を特定          完了
4. RAM往復テスト                       完了（127 bytes一致）
5. USB切断検知・再接続                 完了
6. 読み取り専用RAM stub実行            完了（識別値0x00310510）
7. 書き込みパケットを生成              完了（オフライン検証のみ）
8. 安全な書き込み手順を生成            完了（オフライン検証のみ）
9. 実行と復旧を確認                    未実施
```

読み取り診断は手順2の通信経路確認に必要であり、最終プロダクトの通常操作として残す必要はない。開発者向け診断機能として扱う。

### 8.1 参照実装から確認したブートローダー構造

rv003usbのbootloaderとch32funの `pgm-b003fun.c` を照合し、次を確認した。

- Feature ReportはEP0制御転送でscratchpadへ格納される
- minichlinkはReport IDを含めて128バイト単位の最小転送を行う
- scratchpad末尾の4バイトがリトルエンディアンの `0x1234ABCD` の場合、受信したRAMコードの実行準備に入る
- GET_REPORTはscratchpad内容をホストへ返す
- フラッシュの読み書きは、minichlinkがRAMへ転送したRISC-V stubを実行して行う

したがって、ブートローダーに固定された「状態取得コマンド番号」を送る方式ではない。ホスト側が必要な処理を行う小さなコードを組み立て、scratchpadで実行させる方式である。

### 8.2 RAM往復テスト

最初のSET_REPORT検証では127バイトの固定パターンを送る。

```text
先頭4バイト: 55 49 41 50  (ASCII "UIAP")
中間:         5Aで埋める
末尾4バイト: 00 00 00 00
```

末尾をゼロに固定し、実行マジック `CD AB 34 12` を含めない。送信直後にGET_REPORTで読み戻し、127バイトが一致するか検証する。

このテストはscratchpad RAMを書き換えるが、フラッシュは変更しない。USBを抜いて再接続すればRAM内容は失われる。

実機では送信した127バイトと読み戻したpayloadが完全一致し、ブラウザからSET_REPORTとGET_REPORTの往復が成立することを確認した。

### 8.3 USB切断と再接続

接続中の対象デバイスにWebHIDの `disconnect` イベントが発生した場合、画面上のデバイス情報と診断結果を消去し、再接続手順を案内する。再接続は初回と同じボタンからデバイスを選び直す。自動的にデバイスを開き直さず、利用者が物理状態を確認してから明示的に操作する。

実機ではUSB切断が画面へ反映され、ブートローダー接続手順を繰り返して再接続できることを確認した。

### 8.4 読み取り専用RAM stub

フラッシュ書き込みstubへ進む前に、minichlinkの `word_wise_read_blob`と同じ48バイトのRISC-Vコードをscratchpadで実行する。読み取り先はCH32V003判定に参照実装が使用する `0x1FFFF7C4`、長さは4バイトに固定する。

WebHIDではReport IDを別引数として渡すため、hidapiの128バイトbufferから先頭Report IDを除いた127バイトを送る。実行完了はpayload先頭が `0xFF`になることで判定し、最大21回で打ち切る。この操作はメモリ読み取りだけを行い、フラッシュ制御レジスタ、消去、書き込み処理を含まない。

stubはpacket byte 52から読み取りアドレスと長さを取得し、packet byte 60から結果を書き込む。WebHIDではReport IDを除いたpayloadを扱うため、結果の先頭offsetは59となる。最初の実機試験ではoffset 51を読んだため、実データではなく入力アドレス `0x1FFFF7C4`を表示した。payload先頭の完了値 `0xFF`は確認できており、RAM stubの実行自体は成功している。

修正後の実機試験では1回目の完了確認で `0x00310510`を取得した。これにより、実行マジックによるRAM stub起動、読み取り処理、完了値 `0xFF`、結果offset 59からの取得までを確認できた。

packet生成は自動テストで次を固定する。

- Report ID `0xAA`
- payload 127 bytes
- 読み取りアドレスと長さのリトルエンディアン配置
- 末尾の実行マジック配置
- 結果offset 59（入力アドレスoffset 51と区別）
- 4バイト境界でないアドレスの拒否

### 8.5 64バイト書き込みpacketのオフライン生成

参照実装の `write64_flash`と同じ48バイトstubを使い、CH32V003向けのpacket builderを純粋関数として実装する。この関数はpacketを返すだけでWebHIDを呼ばず、画面からも参照しない。

固定条件:

- flash範囲: `0x08000000`以上、`0x08004000`未満（16KB）
- block size: 64 bytes
- 書き込み先: 64バイト境界
- flash status register: `0x4002200C`
- hidapi形式128 bytes／WebHID payload 127 bytes
- stub: packet byte 4〜51
- address: packet byte 52〜55
- status register: packet byte 56〜59
- data: packet byte 60〜123
- execution magic: packet byte 124〜127

このpacketは実行マジックを含むため、送信されれば書き込みstubを起動し得る。型に `executable: true`を持たせ、読み取り診断packetと区別する。ただし実際の書き込みにはflash unlock、対象blockの退避、erase、write、read-back verify、失敗時の復旧が必要であり、この段階では送信経路へ接続しない。

### 8.6 安全な書き込み計画

任意長のバイナリをflashへ置く際、64バイトblockにまたがる場合も、未変更のバイトを失わない計画を生成する。計画は実行可能なpacketではなく、`executable: false`のデータである。

各対象blockでの順序は次で固定する。

```text
preflight → unlock → backup(64B) → merge → erase(64B) → write(64B) → verify(64B)
```

`backup`は既存blockを読み取り、`merge`が新しいバイナリ範囲だけを上書きして64バイトの完全なblockを作る。`verify`は書き込み後に期待する64バイトと読み戻しを比較する。全blockを置き換える場合も同じ順序を維持し、実機実行時の分岐を減らす。

plan生成時に、空データ、flash外、終端がflash外へ出る範囲を拒否する。WebHIDとの接続や送信は行わない。

### 8.7 書き込み前確認（dry-run）

binファイルを選択すると、ブラウザ内でArrayBufferとして読むだけで、flash write planを生成する。表示するのはファイル名、容量、開始address、対象block数、予定手順である。

- 対象addressは現時点で `0x08000000`固定
- 容量が16KBを超える場合はplan生成で拒否する
- ファイル内容はQuery cacheへ保存せず、ファイル名と計画メタデータだけを保持する
- `sendFeatureReport`、flash erase、flash writeを呼ばない

この画面には「書き込む」「実行する」操作を置かない。実機操作を追加する段階で、別途明示的な確認、接続状態確認、復旧案内を加える。

dry-runは安全な確認操作のため、カード・ファイル選択・結果表示は情報色（青系）で表す。成功を意味する緑や、危険操作を意味する赤は使わない。実機の消去・書き込みを有効化する画面だけ、警告色を使う。

実機環境では `onboard_led_blink.bin`（436 bytes）を選択し、開始address `0x08000000`、対象7 blockの計画が生成されることを確認した。この結果はdry-runの成功であり、flash書き込みの成功を意味しない。

### 8.8 flash unlock・erase packetのオフライン検証

参照実装の `InternalUnlockFlash` と `erase_block_bin` に基づき、次の実行可能packetを生成する純粋関数を追加した。ただし、これらはWebHID送信層から参照しない。

1. `FLASH_KEYR (0x40022004)` へ `0x45670123`、`0xCDEF89AB`
2. `FLASH_OBKEYR (0x40022008)` へ同じ2値
3. `FLASH_MODEKEYR (0x40022024)` へ同じ2値
4. 対象64バイトblockをeraseするpacket

unlock sequenceは6 packet、erase packetはaddress・`FLASH_STATR (0x4002200C)`・`0x00400040`（64B sectorと64B length）を参照実装と同じoffsetへ置く。全packetは `executable: true`であり、誤送信を避けるため画面やDevice adapterから到達できない。

実機実行を有効化する前に、unlock後のCTLR検証、read protection検証、erase後の全`0xFF`確認、write後のread-back verify、切断時の再接続後verify再開を実装する。

### 8.9 flash安全状態の読み取り

書き込み前の非破壊preflightとして、既存の読み取り専用RAM stubで次の2レジスタを読む。

- `FLASH_CTLR (0x40022010)`: `0x8080` maskが残っていればロック中
- `FLASH_OBTKEYR (0x4002201C)`: bit 1が立っていればread protectionあり

判定は純粋関数へ分離し、次の状態を返す。

- `locked`
- `readProtected`
- `safeToUnlock`: ロック中かつread protectionなしの場合のみtrue

すでにunlock済みの場合は意図しない状態として再接続を案内する。read protectionがある場合は書き込み処理へ進ませない。この診断ではレジスタ読み取りだけを行い、unlock keyやerase packetを送らない。

2026-08-30の実機確認では次を取得した。

| 項目            | 結果         |
| --------------- | ------------ |
| `FLASH_CTLR`    | `0x00008080` |
| `FLASH_OBTKEYR` | `0x03FFFFDC` |
| flash lock      | ロック中     |
| read protection | 検出なし     |

この結果は、実機操作前の通常の安全な待機状態として扱う。`safeToUnlock`の前提は満たすが、実機unlockを自動的に許可または実行するものではない。

## 9. 安全境界

- 対象VID/PIDを固定する
- 書き込み機能と診断機能を画面とコードで分離する
- 任意のHIDデバイスを選択させない
- 未知のコマンドを推測して送らない
- RAM往復テストでは実行マジック値を送らない
- 書き込みプロトコルは参照実装を確認してから実装する
- 書き込み前にバイナリのサイズと対象アドレスを検証する
- 書き込み中断時の復旧手順が確立するまで一般利用へ出さない

## 10. 将来アーキテクチャ

```text
Blockly workspace
      ↓
安全な中間命令列
      ↓
Execution Engine
      ↓
BoardAdapter
  ├── SimulatorAdapter
  ├── RuntimeWebHIDAdapter
  └── BootloaderWebHIDAdapter
```

実行用ランタイムとブートローダー書き込みは別Adapterとして扱う。教材UIがブートローダー固有のパケット形式へ直接依存しないようにする。

## 11. ドキュメント更新ルール

実装変更は、同じコミットまたは同じ作業単位で次を更新する。

- `README.md`: プロジェクトの目的、現在地、利用方法
- `docs/spec.md`: 現在の確定仕様と設計判断
- `docs/phase-0-device-investigation.md`: Phase 0の実機結果とチェック状況

Phase 0終了後も各Phaseの調査記録を追加し、`spec.md`は常に現在仕様を示す。
