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

| 項目 | 値 |
|---|---|
| Product Name | `32V003` |
| Vendor ID | `0x1209` |
| Product ID | `0xB803` |
| HID Collection | 1個 |
| Usage Page | `0x0001` |
| Usage | `0x00FF` |
| Collection Type | `1` |
| Feature Report ID | `0xAA` |
| Feature Report Count | `127` |
| Feature Report Size | `8 bit` |
| Feature Report Payload | `127 bytes` |
| Input Report | なし |
| Output Report | なし |

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

| 項目 | 採用技術 |
|---|---|
| UI | React |
| UIコンポーネント | daisyUI |
| CSS | Tailwind CSS |
| ビルド | Vite |
| USB通信 | WebHID |
| 公開 | GitHub Pages |
| CI/CD | GitHub Actions |

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

診断画面では、明示的に別の操作を選ぶまでFeature Reportの送信やフラッシュ書き込みを行わない。

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

| 項目 | 結果 |
|---|---|
| WebHID戻り値 | 128 bytes |
| 先頭バイト | `0x00` |
| payload候補 | 127 bytes |
| 内容 | 全バイト `0x00` |

WebHID仕様では、`receiveFeatureReport()`の戻り値はOSが返した内容をそのまま含み、Report IDを使う機器では先頭バイトが含まれる場合がある。そのため、descriptorの `127 bytes` と実測の `128 bytes` の差はOSが返した先頭1バイトによるものと解釈する。

全ゼロ応答から確認できるのは、ブラウザ、OS、USB HID EP0、ブートローダー間でGET_REPORTが完了したことまでである。ブートローダーのバージョンや状態を取得できたことは意味しない。

これはUSBシリアル通信ではない。CDC、UART、Web Serial APIは使用しておらず、USB HIDのFeature ReportをEP0制御転送で読み取っている。

## 8. Phase 0の通信調査順序

```text
1. HID descriptor取得                 完了
2. Feature Report GET_REPORT          完了（128 bytes、全0）
3. 参照実装から既知コマンドを特定      次の作業
4. 非破壊の識別／状態コマンドを送る    未実施
5. 書き込みパケットを生成              未実施
6. 最小バイナリを書き込む              未実施
7. 実行と復旧を確認                    未実施
```

読み取り診断は手順2の通信経路確認に必要であり、最終プロダクトの通常操作として残す必要はない。開発者向け診断機能として扱う。

## 9. 安全境界

- 対象VID/PIDを固定する
- 書き込み機能と診断機能を画面とコードで分離する
- 任意のHIDデバイスを選択させない
- 未知のコマンドを推測して送らない
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
