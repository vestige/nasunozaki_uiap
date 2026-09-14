# Web Build service

UIAPduino用C/C++を固定toolchainでビルドし、compiler diagnosticとFlash・RAM使用量を返すLambda用serviceです。実機への書き込みと成果物の永続保存は行いません。

## Container build

Dockerが利用できる環境でrepository rootから実行します。

```bash
docker build --platform linux/amd64 -t uiapduino-web-build services/web-build
```

UIAPduino packageのLinux toolchainはx86_64向けなので、Lambda architectureも最初は`x86_64`へ固定します。

このrepositoryを編集したMacには2026-09-14時点でDocker CLIがないため、container buildと実測容量は未確認です。Docker導入後に`docs/spec_build.md`のWB1へ結果を記録します。
