# Web Build service

UIAPduino用C/C++を固定toolchainでビルドし、compiler diagnosticとFlash・RAM使用量を返すLambda用serviceです。実機への書き込みと成果物の永続保存は行いません。

## Container build

Dockerが利用できる環境でrepository rootから実行します。

```bash
docker build --platform linux/amd64 -t uiapduino-web-build services/web-build
```

イメージ作成、容量表示、networkなしの最小sketch buildはrepository rootからまとめて確認できます。

```bash
./services/web-build/scripts/verify-container.sh
```

UIAPduino packageのLinux toolchainはx86_64向けなので、Lambda architectureも最初は`x86_64`へ固定します。大きなtoolchain archiveは途中切断に備えて再試行付きで取得し、SHA-256が公式package indexと一致した場合だけ導入します。

Apple SiliconのMacでは、x86_64のDocker環境または`--platform linux/amd64`に対応した環境が必要です。実測結果は`docs/spec_build.md`のWB1へ記録します。

Apple Silicon上のx86_64エミュレーションは遅いため、確認scriptだけtimeoutを90秒へ広げます。serviceの既定値は30秒のままです。
