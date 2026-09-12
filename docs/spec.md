# UIAPduino Browser Studio 仕様書

更新日: 2026-09-12

この文書を、プロジェクト全体の構想、現在の確定仕様、現在地、残タスク、Blockly教材原案の正本とする。実機調査の重要な結果もこの文書へ統合し、詳細な時系列ログはGit履歴とアプリの診断ログで確認する。

コード開発モードとAWS上のC/C++ビルド基盤は [`spec_build.md`](spec_build.md) を構想・仕様・進捗・残タスクの正本とする。

## 開発進捗

BlocklyのPhase 2では実機LED実行まで成立した。外付け部品の採用と教材の見せ方を決めるまで機能追加を一時停止し、並行してコード開発モードのWeb BuildをWB0「仕様確定」から進める。Phase 0は最小LED命令と成功応答まで確認して完了し、破壊的なerase経路だけは安全保留事項として残す。

| Phase | 状態 | 現在地 |
| --- | --- | --- |
| Phase 0: 実機調査 | 完了 | bootloader調査、runtime書き込み、ブラウザLED往復に成功。破壊的erase再試行は中止 |
| Phase 1: 画面プロトタイプ | 完了 | Blockly編集、シミュレーター、保存・復元、作品ファイル、実行位置表示を実装済み |
| Phase 2: 実機MVP | 一時停止 | LED経路を確認済み。D5ボタン診断は仮実装。教材部品決定後に再開 |
| Web Build WB0 | 進行中 | コード開発モードの仕様とAWS/Terraform作戦を確定中 |
| Phase 3: ワークショップ検証 | 未着手 | 部品構成とチュートリアル原案の検証後に開始 |
| Phase 4: 拡張 | 未着手 | 一部の作品保存機能だけPhase 1へ前倒し済み |

### 次に行うタスク

- [x] 教育用ランタイムを書き込む安全な手順を確定し、`workshop-runtime.ino`を実機へ書き込む
- [x] 通常動作モードで `0x1209:0xD004`、HID descriptor、Input Report、Report ID `0`の見え方を診断画面から記録する
- [x] 確認結果と一致した場合だけ `WebHidRuntimeTransport`を通常動作モードの接続へ組み込む
- [x] 専用の実機確認操作からLEDを1回点灯・消灯し、8バイト成功応答またはエラー応答を診断ログへ残す
- [ ] Blocklyの実行先を「画面」と「UIAPduino」から選べるようにし、実機点滅、切断、再接続、timeout時の表示を確認する（timeout以外は確認済み）
- [ ] D5ボタン仮診断を教材仕様から切り離し、部品構成決定後に採用・変更・削除を判断する
- [ ] `spec_build.md`のWB1としてローカルbuild containerを試作する

### 設計判断が必要なタスク

- [ ] ブロックプログラミングの最終的な体験を、順番に課題を進める「チュートリアル型」と、利用できる部品や配線を絞った「限定サンドボックス型」のどちらへ寄せるか決める
- [ ] 小学生向けワークショップで両方式の小さな試作を比較し、開始までの時間、迷った回数、自由制作への移行しやすさを記録する
- [ ] 限定サンドボックス型を採用する場合、UIAPduino本体、LED、ボタンなど初期部品の範囲と、仮想配線・シミュレーションをどこまで実装するか決める
- [x] Blocklyとは別の「コード開発モード」とWeb Build MVPを `spec_build.md` に設計する
- [x] 初期Web BuildをGitHub Pages + AWS Lambda container + API Gateway HTTP APIで試作する方針を定める
- [ ] ローカルbuild containerでUIAPduino coreとtoolchainの再現性、実行時間、image容量を検証する
- [ ] TerraformでECR、Lambda、HTTP API、最小権限IAM、Logs、alarm、budgetを構築する
- [ ] コード開発モードでも、対象ボード確認、build結果、書き込み範囲、backup、verify、復旧導線をBlocklyの実機書き込みと共通化する

### 直近の完了項目

- [x] Blockly画面プロトタイプと画面内実行を完成する
- [x] 教育用ランタイムfirmwareをArduino core `1.2.14`でコンパイルする
- [x] 8バイトprotocolと `RuntimeBoardAdapter`を自動テストする
- [x] Report IDを差し替え可能な `WebHidRuntimeTransport`を自動テストする
- [x] `0x1209:0xD004`専用の読み取り診断画面を用意する
- [x] Arduino IDEと公式UIAPduino HID coreを使う教育用ランタイム導入手順を画面とfirmware READMEへ追加する
- [x] Arduino CLIでcore導入、build、uploadを分離するスクリプトを追加し、core `1.2.14`でbuildする
- [x] core `1.2.14`のWebHID構成全長を41 bytesから実データの34 bytesへ補正する処理を追加する
- [x] 現在地を示すヒーロー表示をPhase 2へ更新し、Phase 0のerase保留を補足として分離する
- [x] LED点灯・消灯と2回の応答を確認する専用操作を実装し、自動テストする
- [x] Blocklyへ画面・実機の実行先選択と実機sessionの安全な終了処理を実装する
- [x] Blocklyの初期3回点滅プログラムを実機で実行する
- [x] 実行sessionへUSB切断監視を追加し、通信待機を即時終了できるようにする
- [x] Blocklyの開始、完了、停止、失敗を共通診断ログへ記録する
- [x] USB切断後に通常動作モードへ再接続し、Blocklyから再び実機LEDを点灯する
- [x] Blockly実行中にUSBを切断し、切断ログ、実行失敗、再接続後の正常完了を確認する
- [x] Feature Report送信失敗を日本語の再接続案内へ変換する
- [x] D5（PC3）の外付けボタン入力commandと単発診断を実装し、自動テストする

### 保留中の安全課題

- 先頭64バイトのeraseでは過去に先頭4バイトだけが `0xFF`となったため、原因が確定するまで同じ操作を再試行しない
- 保存済みbinからの直接復元は完全一致を確認済みだが、これをerase経路の安全確認完了とは扱わない
- 教育用ランタイムの実機接続とbootloaderのflash操作は別の接続状態・Adapterとして維持する

### 進捗の更新方法

- この節を残タスクと現在地の正本とし、機能追加・実機確認・方針変更のコミットごとに更新日と該当項目を更新する
- 確定した動作仕様はこの文書の各仕様節へ反映する
- Blockly、実機ランタイム、画面設計、実機調査の重要な結論はこの文書へ反映する
- コード開発とWeb Buildの詳細は `spec_build.md`へ反映し、この文書には全体進捗だけを記録する

## 1. プロダクトゴール

UIAPduinoのプログラム作成、実行、状態確認、保存、実機への書き込みをブラウザだけで行える統合開発環境を作る。

最終的にはUIFlowのように、初学者がブロックから始め、理解や用途に応じて高度な開発へ進める環境を目指す。

小学生向けワークショップはプロダクトの最終目的ではない。接続の分かりやすさ、実行と修正の速さ、復旧可能性、複数台運用を検証する最初の実証実験として扱う。

### 1.1 提供する開発モード

最終的には次の2つを別の入口として提供する。

1. **ブロック開発モード**: 初学者とワークショップ向け。Blocklyから安全な中間命令列を作り、画面シミュレーターまたは教育用ランタイムで実行する
2. **コード開発モード**: 通常のソースコードを書きたい利用者向け。ブラウザ上のeditor、build、生成物確認、WebHID書き込み、verifyを一連の操作として提供する

両モードは作品形式と画面を分けるが、対象デバイスの識別、安全確認、診断ログ、書き込み計画、backup・verifyの下位機能は可能な範囲で共有する。コード開発モードから教育用ランタイムの命令protocolへ変換するのではなく、コンパイル済みfirmwareを書き込む独立した経路として扱う。

### 1.2 現在のBlocklyで行っていること・行っていないこと

現在のBlocklyは、UIAPduino用ファームウェアをコンパイルして書き込む方式ではない。Blockly workspaceをブラウザ内で安全な中間命令列へ変換し、画面シミュレーターで解釈するか、WebHID経由で教育用ランタイムへ命令を逐次送る「命令転送方式」である。

| 処理 | 現在の対応 |
| --- | --- |
| Blockly workspaceの保存・復元 | 対応済み |
| Blocklyから安全な中間命令列への変換 | 対応済み |
| ブラウザを開いた状態で教育用ランタイムを操作 | 対応済み |
| Arduino C/C++ソースの生成 | 未対応 |
| CH32V003向けcompilerによるbuild | 未対応 |
| `.bin`の生成とBlockly作品のflash書き込み | 未対応 |
| ブラウザを閉じた後のボード単独実行 | 未対応 |

Blocklyの変換成功を「ビルド成功」とは表示しない。ネイティブbuildを追加する場合は、Arduino core、library、RISC-V compilerを使って実際に`.bin`を生成し、行番号付きのcompiler errorと使用容量を取得できることを完了条件とする。

教育用ランタイムを拡張して命令種類を増やせば、GPIO、PWM、I2Cなどランタイムが実装した範囲はWebHIDから操作できる。しかし、教育用ランタイムの拡張だけで任意のArduino C/C++をコンパイルできるようになるわけではない。C/C++のbuildはブラウザ内compiler、外部build service、またはPC上のlocal helperのいずれかが別途必要である。

将来、Blockly作品をボードへ保存して単独動作させる方式は次の2案を区別して検討する。

1. **命令列保存方式**: Blocklyの中間命令列をデータとしてボードへ保存し、教育用ランタイムが起動後に解釈する。ネイティブcompileは不要だが、保存容量と命令範囲はランタイムに制約される
2. **ネイティブbuild方式**: BlocklyからC/C++を生成し、別のcompiler基盤で`.bin`を作成してbootloader経由で書き込む。自由度と単独動作性は高いが、build環境と安全なflash更新が必要になる

教育用ランタイム自身に任意firmwareのself-write機能を持たせることは初期案にしない。通常動作中のWebHID命令とbootloaderによるfirmware書き込みを分離し、書き込み失敗時の復旧経路を維持する。

ブロック開発モードの長期的な画面方式は未決定とする。候補は次の2つである。

| 方式 | 体験 | 利点 | 検討事項 |
| --- | --- | --- | --- |
| チュートリアル型 | 課題、説明、接続確認を順番に進める | 初回ワークショップを進行しやすく、つまずきを観測しやすい | 自由制作へ移る導線、経験者には制約が強い点 |
| 限定サンドボックス型 | UIAPduinoと限定部品を自由に配置・接続して試す | 試行錯誤と作品づくりへ発展しやすい | 仮想配線、部品状態、シミュレーション範囲、画面の複雑さ |

比較対象の[Wokwi](https://docs.wokwi.com/)は、ブラウザ上でボード、部品、センサーを扱える電子回路シミュレーターである。本プロジェクトでは同等の汎用シミュレーターを直ちに目指さず、UIAPduinoのワークショップで必要な部品だけに絞った方式を比較候補とする。

## 2. 現在のスコープ

Phase 0の安全調査を継続しながら、独立して進められるPhase 1を完了し、現在はPhase 2の実機MVPを進めている。

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

ソースは機能単位で `src/features/blockly/` と `src/features/device/` に分ける。各機能では必要に応じて `components`、`hooks`、`utils`、`types`を使い、表示、状態調整、純粋処理、型定義の責務を分離する。機能横断の表示と状態定義だけを `src/components/`、`src/query.ts`、`src/diagnosticLog.ts`へ置く。

自動テストはプロジェクト直下の `tests/blockly/`、`tests/device/`、`tests/runtime/`、`tests/shared/`へ集約する。`web/vitest.config.ts`からこの範囲だけを探索し、Webアプリのソースやビルド対象へテストを混在させない。現在の公開方式はGitHub ActionsからGitHub Pagesへの静的配信だけであり、Sites用の `.openai/hosting.json`は使用しない。

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

USB切断イベントを検出すると、対象デバイスとその診断結果を消去して再接続を案内する。利用者の意図しない再openを避けるため、自動再接続は行わない。

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

すでにunlock済みの場合、通常の調査ではUSBの物理的な再接続を案内する。保存済みデータからの復旧作業中は、read protectionがなければ直接復元画面へ進める案内を併記する。read protectionがある場合は書き込み処理へ進ませない。この診断ではレジスタ読み取りだけを行い、unlock keyやerase packetを送らない。

2026-08-30の実機確認では次を取得した。

| 項目            | 結果         |
| --------------- | ------------ |
| `FLASH_CTLR`    | `0x00008080` |
| `FLASH_OBTKEYR` | `0x03FFFFDC` |
| flash lock      | ロック中     |
| read protection | 検出なし     |

この結果は、実機操作前の通常の安全な待機状態として扱う。`safeToUnlock`の前提は満たすが、実機unlockを自動的に許可または実行するものではない。

### 8.10 flash unlockの限定実機確認

flash内容を変更する操作へ進む前に、ロック解除と直後の状態読み取りだけを行う調査機能を提供する。

実行条件と順序:

1. 画面のpreflightでflash lock中かつread protectionなしを確認する
2. 利用者の確認ダイアログへの同意を得る
3. 通信層でpreflightを再実行し、同じ安全条件を確認する
4. 検証済みのunlock sequence 6 packetを1つずつ送る
5. 各packetで完了応答 `0xFF`を確認してから次へ進む
6. `FLASH_CTLR`と`FLASH_OBTKEYR`を読み直す
7. CTLRのlock bitが残る場合は失敗として停止する

画面のボタンは、読み取り専用preflightで `safeToUnlock=true`を取得するまで無効にする。実行開始、成功、失敗、unlock前後のCTLR、完了packet数を診断ログへ記録する。この機能からerase packetまたはwrite packetへ到達する経路は作らない。

unlockは一時的な実機状態変更なので警告色で示す。USBを外してブートローダーモードで再接続した後もunlock状態が続く場合があるため、再接続後は必ずCTLRを読み直し、ロック状態へ戻ったと仮定しない。実機で復旧性を確認するまでは一般利用へ出さない。

2026-09-06の実機確認では6 packetが完了し、`FLASH_CTLR`は `0x00008080`から `0x00000200`へ変化した。unlock後もread protectionは検出されなかった。これにより、unlock sequenceと直後の再読み取りが成功したと判断する。

### 8.11 flash 64バイトblockの読み取り退避

erase前の必須手順として、`0x08000000`から先頭64バイトを16回のword読み取りで取得し、ブラウザのメモリーへ退避する。

- 読み取りaddressは16KB flash範囲内の64バイト境界に限定する
- 4バイトごとに読み取り専用RAM stubを実行し、little endianで64バイトへ復元する
- address、64バイトのhex dump、CRC32、全バイトが`0xFF`か、完了確認回数を表示・記録する
- unlock確認が完了するまで画面の退避ボタンを無効にする
- 退避データはTanStack Queryのメモリーキャッシュに置き、ページ再読み込み後は残さない
- erase・write packetは送らない

この退避結果は、次段階のerase後確認と、失敗時に元の64バイトへ戻すための基準値として使用する。

2026-09-06の実機確認では、`0x08000000`から64バイトを完了確認16回で取得した。全`0xFF`ではなく実データがあり、CRC32は `0xBED6A734`だった。

ブラウザのメモリーだけではページ終了時に復旧元を失うため、退避した64バイトをPCへbinファイルとして保存できるようにする。ファイル名にはaddressとCRC32を含める。保存後に同じファイルを選択し、容量、CRC32、全64バイトが現在の退避内容と一致することを確認する。一致確認が完了するまで、将来のerase操作を有効にしない。

期待するファイル名:

```text
uiapduino_flash_08000000_crc32_BED6A734.bin
```

2026-09-06の実機確認では、この名前で64バイトをPCへ保存し、再読込後の容量、CRC32、全バイトが読み取り結果と一致した。

### 8.12 erase・復元トランザクション

実機eraseを画面へ公開する前に、次の順序を1つの処理として固定する。

1. unlock済みかつread protectionなしを再確認する
2. 実機の現在64バイトが照合済み退避データと完全一致することを再確認する
3. 64バイトblockをeraseする
4. 読み直した64バイトがすべて`0xFF`であることを確認する
5. 元の64バイトを書き戻す
6. 読み直した64バイトが退避データと完全一致することを確認する

erase開始後に失敗した場合は、現在値を読み、元データと異なる場合は書き戻しと再読込verifyを試みる。エラーには復旧確認済みか否かを含める。preflightまたは現在値照合に失敗した場合はeraseを呼ばない。

通信処理を抽象化したtransactionをWebHID Device adapterへ接続し、実機確認用の「先頭64バイトを消去して元に戻す」ボタンを提供する。

ボタンの有効条件:

- 同じ接続中にflash unlock後の読み直しが成功している
- 先頭64バイトの退避が成功している
- PCへ保存した復旧用ファイルの再読込が退避内容と完全一致している
- erase・復元処理が実行中ではない

押下時には、flashを実際に変更することと、完了までUSBを抜かないことを確認ダイアログで明示する。各段階を診断ログへ記録し、成功時は対象address、erase確認、復元CRC32を表示する。復旧未確認のエラーではUSBを抜かずにログを保存するよう案内する。

初回実機試験でerase完了応答を確認できず、先頭4バイトだけが`0xFF`となったため、このボタンは停止状態に変更する。

参照実装の特定revisionに対するオフライン再監査では、52バイトのerase stub全体、3つの引数、未使用領域、実行マジックをpacket内の位置ごとに比較する。完了応答はWebHIDの127バイト形式と、Report IDを含む128バイト形式の双方をテストし、正規化後の先頭値 `0xFF`だけを完了として扱う。2026-09-08時点でこれらは参照実装と一致しており、erase送信の再開条件にはしない。次の調査はflash statusの読み取り診断とする。

### 8.13 復旧用binからの直接復元

保存済みbinのファイル名に含まれるaddressとCRC32を読み、実ファイルのCRC32と64バイト容量を検証する。flashがunlock済みかつread protectionなしの場合だけ、CH32V003参照実装どおり `CTLR=0x00010000`、`CTLR=0x00090000`でpage programming bufferを初期化し、64バイトwrite packetを送る。直後に全64バイトを読み直し、ファイルとの完全一致を必須とする。新しいeraseは行わない。

2026-09-06の実機確認では、`uiapduino_flash_08000000_crc32_BED6A734 (2).bin`の容量、address `0x08000000`、CRC32 `0xBED6A734`を検証して直接復元を実行した。書き戻し後の全64バイトがファイルと完全一致し、CRC32も `0xBED6A734`へ戻った。これにより直接復元経路は確認済みとするが、失敗したerase経路は引き続き停止する。

### 8.14 flash status読み取り専用診断

erase失敗の原因を実機の内容を変更せずに絞るため、次の3レジスタを読み取り専用RAM stubで取得する。

- `FLASH_CTLR (0x40022010)`
- `FLASH_STATR (0x4002200C)`
- `FLASH_OBTKEYR (0x4002201C)`

STATRは `BSY (bit 0)`、`WRPRTERR (bit 4)`、`EOP (bit 5)`、`MODE (bit 14)`、`LOCK (bit 15)`を解釈する。画面には生の3値とBUSY、書き込み保護エラー、処理完了フラグを表示する。全結果は `FLASH_STATUS_DIAGNOSTIC`として診断ログへ残し、読み取りに要した完了確認回数も記録する。この診断はTanStack Queryの独立したquery keyとmutationで管理し、接続解除時に結果を破棄する。unlock・erase・writeは行わない。

2026-09-08の実機確認では `CTLR=0x00008080`、`STATR=0x00008000`、`OBTKEYR=0x03FFFFDC`だった。`BSY=false`、`WRPRTERR=false`、`EOP=false`、`MODE=false`、`LOCK=true`であり、通常のロック待機状態として表示した。この結果だけでerase失敗原因は確定せず、erase送信は再開しない。

## 9. 安全境界

- 対象VID/PIDを固定する
- 書き込み機能と診断機能を画面とコードで分離する
- 任意のHIDデバイスを選択させない
- 未知のコマンドを推測して送らない
- RAM往復テストでは実行マジック値を送らない
- 書き込みプロトコルは参照実装を確認してから実装する
- 書き込み前にバイナリのサイズと対象アドレスを検証する
- 書き込み中断時の復旧手順が確立するまで一般利用へ出さない
- unlock実行時にも直前preflightを必須とし、画面表示済みの古い結果だけを信頼しない

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

### 10.1 Phase 1 Blocklyプロトタイプ

公式 `blockly` packageをアプリへ同梱し、日本語表示の編集画面を提供する。最初の専用ブロックは次に限定する。

- LEDをつける／けす
- 指定したミリ秒だけ待つ（0〜5000ms）
- 指定回数繰り返す（1〜20回）

workspaceは直接JavaScriptとして評価せず、`led`、`wait`、`repeat`からなる型付き中間命令列へ変換する。初期workspaceには「点灯 → 500ms待つ → 消灯 → 500ms待つ」を3回繰り返す例を配置する。

画面内実行は中間命令列だけを解釈し、LEDシミュレーターを更新する。実行状態、LED状態、編集中の命令列はTanStack Queryで管理し、停止時は実行を中断してLEDを消灯する。このプロトタイプからWebHID、unlock、erase、writeへ到達する経路は作らない。

Blockly workspaceは公式serialization APIでJSONへ変換し、version付きのデータとして `localStorage`の `uiapduino:blockly-workspace:v1`へ変更のたびに保存する。ページ表示時は保存済みデータを優先し、存在しない場合、JSONが壊れている場合、未対応versionの場合は初期点滅例を使う。保存内容はサーバーへ送信しない。

作品のファイル保存では、`format: "uiapduino-blockly-project"`、`version: 1`、ISO形式の保存日時、Blockly workspaceをJSONに格納し、`.uiap.json`の拡張子でダウンロードする。読み込みは1MB以下に限定し、JSON、format、version、workspace、保存日時を検証する。検証後も現在のworkspaceを置き換える前に確認し、読み込んだ作品をブラウザ内の自動保存にも反映する。ファイルはサーバーへ送信しない。

「最初のブロックに戻す」は確認後に実行中のシミュレーターを停止し、保存済みworkspaceを削除して初期点滅例を再配置する。画面には自動保存時刻、前回データの復元、保存不可の状態を表示する。編集中の状態表示はTanStack Query、永続化処理は独立したpersistence moduleへ分離する。

シミュレーターの命令解釈はUIコンポーネントから独立したruntime moduleで行う。adapterはLED状態の更新、Blockly block IDのハイライト、待機処理だけを受け持つ。`repeat`は内側の命令を順に実行し、各 `led`、`wait`および繰り返し開始時に該当ブロックをハイライトする。LED操作と繰り返し開始のハイライトは180ms以上表示し、子どもが現在位置を追えるようにする。

停止操作は `AbortSignal`で待機を中断し、LEDを消灯してハイライトを解除する。正常終了時もハイライトを解除する。実行順と停止済みsignalで命令を開始しないことを自動テストで固定する。

2026-09-09にBlocklyとデバイス診断を機能別フォルダへ再配置した。動作仕様は変更せず、Component、状態調整、純粋処理、型、テストの所在を分離した。

同日に、作品をversion付き `.uiap.json`としてPCへ保存し、再読込できる機能を追加した。ファイル形式の生成と検証はUIから独立した純粋関数とし、正常な往復、不正format、未対応version、ファイル名を自動テストする。

### 10.2 Phase 2 BoardAdapterと教育用ランタイム境界

中間命令列の実行関数は、次の2つを別々に受け取る。

- `BoardAdapter`: LED状態の変更と中断可能な待機
- `ExecutionObserver`: 実行中block IDの通知

シミュレーターはTanStack QueryのLED状態を更新する `BoardAdapter`を使う。実機Adapterも同じ型を実装するが、ファームウェア側との通信仕様が確定するまで作成・接続しない。

教育用ランタイムのメッセージは8バイト固定長とする。UIAPduino HID Arduino core `1.2.14`のWebHID Onlyモードでは、ブラウザ→ボードがEP0 Feature Report（最大32バイト）、ボード→ブラウザがEP1 Input Report（8バイト）であるため、両方向を8バイトへ統一する。

| byte | 内容                           |
| ---: | ------------------------------ |
| 0〜3 | ASCII `UIAP`                   |
|    4 | protocol version `0x01`        |
|    5 | command。応答時はbit 7を立てる |
|    6 | 8bit sequence                  |
|    7 | 命令payloadまたは応答status    |

初期command `0x01`はLED出力で、payload `0`を消灯、`1`を点灯とする。応答statusは `0=ok`、`1=unsupported-command`、`2=invalid-payload`、`3=device-error`とする。sequenceは要求と応答の対応確認に使う。

`firmware/workshop-runtime/workshop-runtime.ino`はWebHID受信時に8バイト長、識別子、version、要求command、payloadを検証する。LED命令ではArduino pin 2を更新し、同じcommandとsequenceを持つ8バイト応答を返す。不正入力と未対応commandではLEDを変更せずstatusを返す。

`RuntimeBoardAdapter`はLED命令のsequenceを0〜255で循環させ、送信したcommandとsequenceが一致する成功応答だけで操作完了とする。異なるsequenceの古い応答は最大8件まで無視し、デバイスのエラーstatusと1秒以内に応答がない場合は失敗にする。待機処理は `AbortSignal`による即時停止に対応する。通信先は注入可能な `RuntimeTransport`とし、実機descriptor確定まではWebHID実装を接続しない。
時間制御は `runtimeTiming.ts`へ分離し、応答timeoutと中断可能な待機を独立してテストする。`RuntimeBoardAdapter`は命令生成、送信、応答照合、sequence管理だけを担当する。

`WebHidRuntimeTransport`は既定のReport ID `0`を使用して8バイトのFeature Reportを送信し、同じReport IDの `inputreport` eventだけを受け取る。先に到着した応答はFIFO queueへ保持し、待機中なら最古の待機へ直接渡す。終了時はlistenerを解除し、待機中の受信をすべて失敗させ、queueを破棄する。未接続deviceと8バイト以外の命令は送信前に拒否する。

通常動作モードの実機確認はbootloader診断とは別の接続ボタンから行う。選択ダイアログは `0x1209:0xD004`だけに絞り、接続後に製品名、VID/PID、HID descriptor、Input/Output/Feature Report構成を表示する。ここではFeature Report送信、LED命令、flash操作を行わない。USB切断時はランタイム側の表示だけを解除する。

descriptorがInput Reportを持つランタイム候補と判定された後だけ、専用のLED往復確認を表示する。この操作はReport ID `0`の8バイトFeature Reportで点灯を要求し、成功応答後に約400ms待って消灯を要求する。点灯・消灯それぞれの送信値と受信値を16進数で共通診断ログへ残す。途中で失敗した場合は消灯命令を追加で試し、元のエラーを表示・記録する。

2026-09-11の実機確認では、点灯要求`55 49 41 50 01 01 00 01`と応答`55 49 41 50 01 81 00 00`、消灯要求`55 49 41 50 01 01 01 00`と応答`55 49 41 50 01 81 01 00`を確認した。両応答ともcommand `0x01`、対応sequence、status `0x00`が一致し、LEDも約400ms点灯した。

Blocklyの実行先はTanStack Queryで`simulator`または`uiapduino`として管理する。`uiapduino`は通常動作モードのdeviceがopen中だけ選択・実行でき、実行ごとに`WebHidRuntimeTransport`と`RuntimeBoardAdapter`のsessionを生成する。命令解釈とblock highlightは画面実行と共有する。正常終了時はプログラム最後のLED状態を維持し、停止・エラー時は消灯を追加試行してlistenerを破棄する。切断やtimeoutの元エラーは消灯失敗で上書きしない。

実機sessionは`navigator.hid`のdisconnectも独立して監視する。対象deviceの切断時はtransportをdisposeし、待機中のInput Report受信を即時rejectする。通常動作診断側のdevice state更新と実行sessionの終了は同じdisconnect eventから行うが、listenerの責務と寿命は分離する。再接続後の実行では新しいtransport、Adapter、listenerを生成する。

2026-09-11にUSB切断後の通常動作モード再接続とBlocklyからの再点灯に成功した。再接続後のdevice、transport、Adapterによる新しいsessionが正常に動作した。切断時の画面・ログ文言と実機でのtimeout表示は引き続き確認する。

同日の実行中切断では、`RUNTIME_DISCONNECT`の直後に`BLOCKLY_RUN`が`Failed to write the feature report.`でエラー終了し、再接続後の次回実行は正常完了した。安全な失敗と復旧は成立したため、ブラウザ由来の送信エラーだけを日本語のUSB確認・再接続案内へ変換する。残る実機確認は応答timeoutである。

Blockly実行は`BLOCKLY_RUN`として開始、成功、エラーを記録し、利用者による停止は`BLOCKLY_STOP`としてwarningを記録する。ログには実行先とトップレベル命令数を含める。応答timeoutは1秒を上限とし、故意に実機を無応答にする試験は行わずfake transportの自動テストで固定する。

2026-09-11にBlocklyの初期3回点滅プログラムを実機実行し、ブロックの順序どおりLEDが動作することを確認した。実行先切り替え、命令解釈、WebHID transactionの主要経路は成立した。切断・再接続・timeoutの実機表示は引き続き確認する。

ボタン入力は基板上のリセット／boot切替ボタンを通常GPIOとして扱わない。初期教材では競合の少ないD5（PC3）を`INPUT_PULLUP`にし、外付けタクトスイッチをD5とGNDの間へ接続する。command `0x02`のrequest payloadは`0`固定、成功responseの末尾は未押下`0`、押下`1`とする。まず通常動作カードの単発診断で実機状態を確認し、その結果が安定してから共通中間命令とBlocklyの「ボタンが押されるまで待つ」へ追加する。

教育用ランタイムの初回導入は、停止中のBrowser Studio独自erase経路を使わず、公式 `UIAPduino HID` core `1.2.14`に含まれる`uiapflash`を使う。Arduino CLI用の`scripts/workshop-runtime.sh`では`setup`、`build`、`upload`を分離し、実機を書き換える操作を明確にする。Arduino IDE 2.xの標準Uploadも代替手順として維持する。Boardは `HID ProMicro CH32V003`、USBは `WebHID Only`、Optimizeは `Smallest (-Os) with LTO`に固定する。Upload後はボタンを押さずに通常接続し、ランタイム診断を行う。

CLIまたはArduino IDEのUploadが失敗した場合は連続して再試行せず、出力を保存して切り分ける。公式Board ManagerではmacOSが動作確認中とされているため、成功するまでは教育用ランタイムの実機書き込みを完了扱いにしない。

Blockly workspace、LED simulator、ランタイムdescriptor表示は親gridの利用可能幅を超えない。幅の狭い画面では見出し、操作ボタン、診断内容を縦に並べ、横並びへの切り替えはdesktop幅から行う。
Blockly workspaceのcontainer幅が変化した場合は `ResizeObserver`から `Blockly.svgResize()`を呼び、内部SVGとscrollbarの寸法を同期する。
bootloader接続手順のカード群には負のmarginを使わず、直前の機能カードとの間に通常の余白を確保する。

Arduino core `1.2.14`、WebHID Only、Smallest（`-Os` + LTO）でコンパイルし、Flash 4004 / 16384 bytes、RAM 172 / 2048 bytesを確認した。ランタイム用VID/PID、WebHID APIから見えるReport ID、timeout、再送は実機確認待ちであり、bootloader用WebHID経路へ渡さない。

2026-09-11にArduino CLI `1.5.1`から公式`uiapflash`を実行し、4164 bytesのbinを4224 bytesへpaddingして書き込み、全4224 bytesのverify成功とアプリ起動を確認した。その後、通常接続の読み取り専用診断からdescriptorを確定した。

初回起動後、macOSのUSB treeでは`UIAPduino WebHID / 0x1209:0xD004`として認識されたが、IOHIDDeviceは生成されずWebHID chooserへ表示されなかった。core `1.2.14`の`config_descriptor`は実際にはConfiguration 9 + Interface 9 + HID 9 + Endpoint 7 = 34 bytesだが、`wTotalLength`が41 bytesと宣言されていた。スクリプトの`setup`または`patch-core`でこの値だけを34 bytesへ補正してからbuildする。修正版を再uploadした結果、macOSでHID interface、vendor usage page `0xFF00`、Input Report 8 bytes、Feature Report 32 bytes、Report ID `0`を確認した。続いてGitHub Pagesの読み取り専用診断からデバイス選択とHID情報取得に成功した。

### 10.3 実行モードの読み取り専用判定

接続時にブラウザが取得済みのHID Collectionを走査し、子Collectionを含むInput、Output、Feature Report IDを重複なく表示する。追加のHID送受信は行わない。

- Input/Output ReportがなくFeature Report `0xAA`だけ: `bootloader`
- InputまたはOutput Reportがある: `runtime-candidate`
- 上記以外: `unknown`

現在確認済みの `32V003 / 0x1209:0xB803`はFeature Report `0xAA`だけを持つため、書き込み用bootloaderモードと案内する。`runtime-candidate`も対応確定を意味せず、ファームウェア仕様との照合が済むまで命令を送信しない。

## 11. Blocklyチュートリアル原案

### 11.1 位置づけ

小学生向けワークショップはプロダクト全体のゴールではなく、Browser Studioの分かりやすさと教育用ランタイム方式を確かめる実証実験とする。チュートリアル型を基本にしつつ、最後は限られた部品を自由に組み合わせられる小さなサンドボックスへ移る構成を原案とする。

部品の正式採用と実ピン割り当ては未決定である。以下は技術検証と教材比較のための候補であり、D5のタクトスイッチを含め、実機確認用の仮実装を教材仕様の決定とは扱わない。

### 11.2 教材の物理構成案

- UIAPduino
- USBデータ通信対応ケーブル
- 小型ブレッドボード
- LED、抵抗、ジャンパーワイヤ
- タクトスイッチ候補
- サーボモーター候補
- I2C OLED候補

初回は講師が配線済みの状態を渡す案と、参加者がブレッドボードへ配線する案を比較する。配線を学習対象にする場合も、最初のLED成功までは完成例、実物写真、色付き配線図を用意し、電源短絡やUSB用ピンへの誤接続を防ぐ。

Blocklyでは生のピン番号を最初から見せず、「LEDポート」「ボタンポート」「サーボポート」「OLEDポート」のような教材上の名前を使う。内部で許可済みの実ピンへ対応づけ、USB、SWIO、RESETなど予約ピンは選択肢に出さない。

### 11.3 WebHIDで扱う範囲

ブラウザからピンを直接操作するのではなく、教育用ランタイムがWebHID commandを検証してからGPIOや周辺機能を操作する。チュートリアルに追加できるのは、ブラウザとfirmwareの双方で安全に実装・検証した命令だけとする。

| 部品・機能 | 想定するランタイム命令 | 備考 |
| --- | --- | --- |
| 内蔵LED | ON/OFF | 実機往復確認済み |
| ブレッドボード上のLED | 許可済み出力ポートのON/OFF | 抵抗値と実ピンは未決定 |
| タクトスイッチ | 許可済み入力ポートの読み取り | 部品採用と実ピンは未決定。D5実装は検討用 |
| サーボ | 角度またはpulse幅の範囲指定 | 電源、電流、PWM pin、安全角度を要検証 |
| I2C OLED | 定型文字・数値・簡単な絵の表示 | controller、address、library、packet分割を要検証 |
| 待機・繰り返し・条件 | ブラウザ側Execution Engine | 長時間・無限実行には停止上限を設ける |

任意GPIO、任意I2C payload、任意メモリアドレスは子ども向けブロックから送らない。部品追加ごとに、命令範囲、timeout、切断時の安全状態、シミュレーター表現、配線ミス時の挙動を確認する。

### 11.4 60〜90分の流れ（原案）

1. **つなぐ**: 配線済みUIAPduinoを通常動作モードで接続する
2. **最初の成功**: 内蔵LEDを点灯し、画面と実物の対応を知る
3. **時間を変える**: 待ち時間を変更して点滅速度を比べる
4. **短くする**: 「くり返す」で同じ動きを整理する
5. **ブレッドボードへ広げる**: 外付けLEDを安全なポートへ接続する
6. **入力を加える**: 採用決定後のボタンなどで動きを変える
7. **組み合わせる**: 検証済みならサーボまたはOLEDを1種類追加する
8. **自由制作**: 許可済み部品だけで合図、信号、表示作品を作る
9. **発表する**: 動きと工夫した点を共有し、作品をファイル保存する

最初から全ブロックを表示せず、課題ごとに使用可能なブロックを増やす。サーボとOLEDを同じ初回講座へ入れるかは、配線時間、電源安定性、講師の支援回数を見て判断する。

### 11.5 見せ方と観察項目

- 実物写真とブレッドボード配線図を画面上の部品名と一致させる
- 成功、実行中、接続切れを色だけでなく文と形でも伝える
- 技術ログは子ども向け画面から分離する
- エラーには番号だけでなく、次に試す操作を書く
- 漢字、ふりがな、文字サイズは実際の参加学年で確認する
- 接続から最初の成功までの時間、迷った回数、講師への質問回数を記録する
- 配線済み方式と参加者配線方式を少人数で比較する
- チュートリアル後に自由制作へ移れたかを観察する

### 11.6 教材設計の残タスク

- [ ] チュートリアル型と限定サンドボックス型の画面試作を比較する
- [ ] 初期部品セットを決定する
- [ ] 配線済みで渡す範囲と参加者が配線する範囲を決定する
- [ ] 各部品の電源、抵抗、許可ピン、commandを実機検証する
- [ ] 写真、配線図、完成例、講師用復旧手順を作る
- [ ] 小学生による少人数テストを行い、時間とつまずきを記録する

## 12. 実装・状態管理・テストの設計ルール

- React Componentは表示責務ごとに分け、`App.tsx`へ通信や大きな表示処理を集めない
- 機能内は必要に応じて `components`、`hooks`、`utils`、`types`へ分け、空folderを先回りして作らない
- 1ファイルに表示、状態調整、変換、通信など複数の変更理由が集まったら責務で分割する
- 外部・非同期状態はTanStack Queryで管理し、query keyを集約する
- WebHID同期や非同期結果の複製を目的に `useEffect`・`useState`を使わない。純粋な一時UI状態は適切な局所状態を選ぶ
- ComponentからWebHID packetを直接扱わず、transport、adapter、protocolを分離する
- packet生成と安全条件は純粋関数にし、実機なしでテストする
- テストは実装ファイルの隣ではなく、プロジェクト直下の `tests/<feature>/`へ置く
- GitHub Pages公開前にTypeScript buildと全自動テストを実行する
- 技術診断ログはメモリー内だけに保持し、source、個人情報、作品を自動送信・永続保存しない

## 13. 実機調査から維持する安全上の結論

- bootloaderは `0x1209:0xB803`、教育用ランタイムは `0x1209:0xD004`として別接続・別Adapterで扱う
- bootloader接続はボタンを押しながらUSBへ接続し、約1秒後に離す
- flash先頭64バイトの初回erase試験で先頭4バイトだけが`0xFF`になり、自動復旧も失敗した
- 保存済みbinから全64バイトとCRC32 `0xBED6A734`の完全復旧を実機確認済み
- status診断では `CTLR=0x00008080`、`STATR=0x00008000`、`OBTKEYR=0x03FFFFDC`、BUSYなし、書き込み保護エラーなしを確認した
- 独自erase経路は原因が確定するまで再試行しない
- 教育用ランタイムは公式`uiapflash`経由で書き込み、実機verifyに成功済み
- runtime descriptorの全長誤記を41 bytesから34 bytesへ補正し、HID interfaceを確認済み
- Blockly実行中の切断、再接続、新しいsessionからの再実行に成功済み
- Web Buildはこの停止中のerase経路へ接続せず、MVPでは実機書き込みを行わない

## 14. ドキュメント更新ルール

プロジェクト文書はREADMEと、`docs/`以下の正本2ファイルに限定する。

- `README.md`: プロジェクトの目的、現在地、利用方法
- `docs/spec.md`: 全体構想、Blockly・実機仕様、現在地、残タスク、チュートリアル原案
- `docs/spec_build.md`: コード開発・Web Buildの構想、仕様、現在地、残タスク

実装変更時は該当する正本とREADMEを同じ作業単位で更新する。長い時系列作業記録を増やさず、現在有効な仕様、安全上必要な結論、残タスクを優先して残す。詳細な過去経緯はGit履歴で確認する。
