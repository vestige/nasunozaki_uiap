# UIAPduino Block Workshop

UIAPduinoを使い、小学生がブラウザだけで電子工作とブロックプログラミングを体験できる教材を目指すプロジェクトです。

最初のバージョンでは、Blocklyで組み立てたプログラムをブラウザ上で実行し、WebHID経由でUIAPduinoを操作します。サイトはGitHub Pagesで公開し、ChromeまたはEdgeから利用する想定です。

## ドキュメント

- [実装方針と初期設計](docs/initial-design.md)
- [Phase 0 実機調査記録](docs/phase-0-device-investigation.md)

## 現在の状態

Phase 0を進行中です。WebHID対応ブラウザとUIAPduinoの情報を確認する診断ページを実装しています。

## ローカルで診断ページを開く

```bash
cd web
npm install
npm run dev
```
