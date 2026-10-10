# Web側の責任分担（#56）

全体仕様は[概要・TODO](spec.md)を参照する。本書はWeb実装の担当範囲と安全境界を扱い、ボード単独実行は[単独実行仕様](spec_standalone.md)、容量測定は[ファーム容量調査](firmware-capacity-investigation.md)に分ける。

ボードのファーム・命令仕様・Flash配置は変更しない。Webのコード量や配信サイズと、ボードのランタイム容量は別である。

## Blockly

- `BlocklyStudio`：画面構成、表示タブ、表示切り替え。共有workspace参照で各hookを接続する。
- `useBlocklyWorkspace`：Blocklyの準備・変更通知・サイズ調整・破棄。作品や実行の処理を自分で判断せず、安定したコールバックへ通知する。
- `useBlocklyProject`：自動保存、復元、作品ファイル、拡張情報、編集時の変換結果。組み立て途中の作品も保存する。
- `useBlocklyExecution`：画面／実機での実行・停止、実行ログ、シミュレーター出力。画面破棄時にも実行を中止する。
- `types/program`：実行先に依存しない命令と値の型。
- `program`：Blocklyから共通命令への変換。
- `execution`：共通命令の実行。実機通信は`executionSession`とボードアダプタに任せる。
- `standaloneProgram`：ボード用バイト列の生成。USB送信は`writeStandaloneProgram`、パケット形式は`standaloneUpdateProtocol`が担当する。
- `blocks`：既存作品用も含むブロック定義と登録。
- `toolbox`：分類と追加時の初期入力。
- `samples/starterProgram`：最初の点滅作品。検証用の複雑な作品とは分ける。
- `types/projectSchema`：作品の対応バージョンと拡張情報の共通定義。ボードの命令バージョンとは別。
- `workspaceExtensions`：ブロック構造から必要な部品を判定。変数名やコメントの部分一致は使わない。

## 維持する安全境界

編集中の変換が失敗したら実行用命令を空にする。エラーが保存を妨げないようにし、実行・書き込みの操作時にも現在のworkspaceを再変換する。

変換時・画面実行時・ボード向けエンコード時・ファーム実行時のチェックは役割が違うため、重複を理由に削除しない。変数や式の値は実行時まで確定しない。単独実行形式のバージョンはエンコーダ内で必要な最大値を保持し、命令の順番で下がらないようにする。

workspaceを再作成しないよう、初期化・変更通知・破棄のコールバックを安定させる。hook分離だけを理由にQueryClientで共有している接続やシミュレーター状態の方式は変更しない。

## 次の整理

診断hookの基本診断・バックアップ・復旧・ログ操作の分離は別段階で進める。第三者コード`rv003usb_webflasher.js`は上流差分を維持するため分割・整形しない。
