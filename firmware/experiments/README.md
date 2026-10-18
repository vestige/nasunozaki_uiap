# 調査専用ファーム

`begin-diagnostics.patch` は #65 の調査で実機へ導入した、読み取り専用command 0x26を追加する差分です。配布版のソース・binには含めません。内容と検証結果は [調査記録](../../docs/standalone-write-timeout.md)を参照してください。

再調査する場合は、別の作業用ブランチで配布版ソースへ適用してビルドします。調査用binは配布用binへ上書きせず、実機導入前に対象と容量を確認してください。公開する場合は、ソース・bin・build-infoを同時に更新し、通常の配布検証を通す必要があります。

配布前のローカル検証は `web` で `npm run verify:release` を実行します。GitHub Pagesの公開処理も同じコマンドで、ファームの整合性確認・配布物生成・Webビルド・全テストを行います。入力の整合性確認だけなら、リポジトリ直下で `python3 scripts/package-workshop-runtime.py --check` を実行できます（配布物を書き換えません）。
