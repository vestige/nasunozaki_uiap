# UIAPduino コード開発・Web Build仕様

更新日: 2026-09-12

## 1. この文書の役割

この文書は、UIAPduino Browser Studioの「コード開発モード」と、C/C++をUIAPduino向けにクラウドビルドするAWS基盤の仕様・実装計画の正本とする。

既存の `spec.md` はプロダクト全体、Blockly、教材構想を扱い、この文書はコード開発モードとWeb Buildに限定する。実装中に仕様を変更した場合は、この文書と `spec.md` の進捗を同じ作業単位で更新する。

### 現在の状況

- 構想・MVP仕様・AWS構成案を作成済み
- ローカルでは既存scriptからUIAPduino HID core `1.2.14`によるbuildに成功済み
- Web Build用container、AWS、Terraform、コードeditorは未実装
- 実機への書き込みは本仕様のMVPに含めない

### 残りタスクの概要

1. ローカルbuild containerで再現性、所要時間、image容量、licenseを確認する
2. Terraformで費用上限を考慮したAWS private prototypeを構築する
3. Blocklyとは別のコード開発画面を作り、Web Build APIへ接続する
4. compiler errorとFlash・RAM使用量を表示する
5. 限定公開後に実測料金と運用安全性を評価する

詳細なチェックリストは「13. 実装フェーズ」を正本とする。

## 2. 目的

利用者がブラウザ上でArduino形式のC/C++を書き、UIAPduino用の実際のtoolchainでビルド結果を確認できるようにする。

最初のMVPは次の範囲に限定する。

1. ブラウザでソースを編集する
2. AWS上の隔離されたビルド処理へソースを送る
3. 公式UIAPduino HID coreとRISC-V compilerで実際にビルドする
4. compiler error、warning、Flash使用量、RAM使用量を画面へ返す
5. 成功時も実機への書き込みは行わない

「括弧が閉じている」などのブラウザ内簡易検査と、実際のcompilerを通したWeb Buildを区別する。簡易検査だけを「ビルド成功」と表示しない。

## 3. Blocklyとの違い

現在のBlocklyはネイティブbuildではなく、ブラウザ内で中間命令へ変換し、WebHID経由で教育用ランタイムへ逐次送信する方式である。

```text
現在のBlockly
Blockly → 中間命令 → Browser Execution Engine → WebHID → 教育用ランタイム

コード開発モード
C/C++ → Web Build API → RISC-V compiler → .bin
```

Web Build基盤が成立した後、BlocklyからC/C++を生成して同じ基盤へ渡す「ネイティブbuild方式」を別途検討できる。現在のBlockly実行を自動的に置き換えない。

## 4. 対象と非対象

### 4.1 MVPの対象

- Arduino形式の単一sketch
- `setup()` と `loop()` を持つ `.ino`
- 対象board、USB mode、最適化設定をサーバー側で固定
- compilerの成功・失敗と診断情報の返却
- FlashとRAM使用量の表示
- GitHub PagesからHTTPSで呼び出す
- AWS構成をTerraformで再現する

### 4.2 MVPの非対象

- UIAPduinoへのflash書き込み
- 任意のboard package、compiler option、linker optionの指定
- URLやGit repositoryからの依存取得
- 任意ライブラリのインストール
- build成果物の永続保存
- 利用者アカウント、作品のクラウド保存、共同編集
- Blocklyからのネイティブbuild
- 一般公開に耐える無制限の匿名build API

## 5. 固定するビルド環境

再現性のため、MVPでは以下を固定し、requestから変更できないようにする。

| 項目 | 初期値 |
| --- | --- |
| Board package | UIAPduino HID |
| Core version | `1.2.14` |
| Board | HID ProMicro CH32V003 |
| USB | WebHID Onlyを初期検証値とする。通常コード向けの既定値は試作時に再評価する |
| Optimize | Smallest (`-Os` + LTO) |
| Flash上限 | `16,384 bytes` |
| RAM上限 | `2,048 bytes` |
| Host architecture | Lambdaコンテナでtoolchainが動作確認できるarchitectureに固定する |

core `1.2.14`にはWebHID descriptor全長の既知の補正がある。通常コードのbuildに補正済みcoreを使うか、WebHIDを使わないUSB設定へ分けるかをWB1で確定する。使用したcore、compiler、補正内容はbuild responseへversionとして含める。

## 6. 入力制限

実機容量とクラウドAPI保護は別の基準で判定する。

### 6.1 API入力制限

- request全体: 64 KiB以下
- ソース全体: 64 KiB以下
- 1ファイル: 32 KiB以下
- ファイル数: 最大10
- ファイル名: ASCII英数字、`_`、`-`、`.`のみ
- 許可拡張子: `.ino`、`.c`、`.cpp`、`.h`、`.hpp`
- build timeout: 30秒
- compilerの同時実行数: Terraformで低い上限を設定
- compiler optionと環境変数: 利用者から受け取らない
- `#include`: core同梱または明示的allowlistのlibraryだけを許可

ソース容量はFlash使用量を表さない。コメントが多いソースは大きくても生成物が小さい場合があり、小さなソースでもlibraryにより生成物が大きくなる。実機適合性は必ずbuild後の値で判定する。

### 6.2 build結果の判定

| 判定 | 条件 |
| --- | --- |
| 成功 | compilerとlinkerが成功し、FlashとRAMが上限内 |
| 容量超過 | compilerは完了したがFlashまたはRAMが上限超過 |
| 失敗 | syntax、型、link、library、toolchain error |
| timeout | 30秒以内に終了しない |
| 拒否 | 入力容量、ファイル名、拡張子、libraryなどの制限違反 |

RAMは静的使用量が上限未満でもstackと動的使用領域が必要になる。画面では次の目安を表示する。

- 0〜1,024 bytes: 通常
- 1,025〜1,536 bytes: 注意
- 1,537〜2,048 bytes: 強い警告
- 2,048 bytes超過: 書き込み不可

Flashの正式な安全余白はlinker配置とbootloader領域を確認してから決める。MVPでは最大値と実測値を表示し、書き込み可否にはまだ使用しない。

## 7. API仕様

### 7.1 Endpoint

```text
POST /v1/build
Content-Type: application/json
```

### 7.2 Request

```json
{
  "requestVersion": 1,
  "project": {
    "name": "blink",
    "files": [
      {
        "name": "blink.ino",
        "content": "void setup() {}\nvoid loop() {}\n"
      }
    ]
  }
}
```

### 7.3 Response

```json
{
  "responseVersion": 1,
  "buildId": "request-scoped-id",
  "status": "success",
  "toolchain": {
    "core": "UIAPduino HID 1.2.14",
    "compiler": "pinned-version",
    "profile": "uiapduino-ch32v003-v1"
  },
  "usage": {
    "flashBytes": 4976,
    "flashLimitBytes": 16384,
    "ramBytes": 172,
    "ramLimitBytes": 2048
  },
  "diagnostics": [],
  "durationMs": 1800
}
```

失敗時のdiagnosticは、可能な範囲で `severity`、`message`、`file`、`line`、`column`を返す。compilerの生ログも開発中は返せるが、コンテナ内の絶対path、AWS情報、環境変数は除去する。本番UIは整形済みdiagnosticを優先する。

MVPでは`.bin`をresponseへ含めず、ビルド終了時に一時ファイルを削除する。次段階で成果物を返す場合は、base64で同期responseへ埋め込まず、短時間だけ有効な取得方法を別途設計する。

## 8. AWS構成

### 8.1 MVP構成（暫定）

```text
GitHub Pages
    │ HTTPS / JSON
    ▼
API Gateway HTTP API
    │
    ▼
Lambda container
    ├── request検証
    ├── 一時workspace作成
    ├── Arduino CLI + pinned toolchain
    ├── compiler実行
    ├── 診断・容量解析
    └── 一時workspace削除

ECR ── Lambda container image
CloudWatch Logs ── 制限付き運用ログ
AWS Budgets / CloudWatch Alarm ── 料金・異常呼び出し監視
```

ECRは利用者のsourceやbuild成果物を保存する場所ではない。Arduino CLI、RISC-V compiler、UIAPduino core、API実装をまとめたLambda実行用container imageを保管する。containerの作成はDocker、保管はECR、実行はLambdaという責務に分ける。

Lambdaをcontainer image方式で使う場合、imageはECRへ置き、Lambdaはそのimage URIまたはdigestを参照する。AWS公式仕様ではcontainer imageは非圧縮10GBまで利用できる。一方、ZIPとLambda Layerの合計は展開後250MBまでである。compiler一式の実容量が未計測なので、現時点では容量と再現性に余裕のあるcontainer + ECRを有力候補とする。

ECR採用はまだ確定ではない。WB1でtoolchain、core、APIを含む容量とbuild時間を測り、次を比較してから確定する。

| 配布方式 | 利点 | 検討事項 |
| --- | --- | --- |
| Lambda container + ECR | 非圧縮10GBまで、Dockerでlocal/AWS環境を合わせやすい、digestでversion固定・rollback可能 | ECRが増える、image容量とcold startを測る必要がある |
| Lambda ZIP + Layer | ECRが不要でAWS resourceを減らせる | functionと全Layerの展開後合計250MBまで |
| CodeBuild | build単位の環境と相性がよい | 起動時間、非同期API、費用、成果物受け渡しが複雑になる |

採用条件は「最小構成」だけでなく、toolchain versionの固定、localとAWSの再現性、起動時間、費用、安全な更新とrollbackを含めて判断する。ECRを採用した場合はimage scanとlifecycle policyを有効にし、古いimageを無制限に保管しない。

toolchainとcoreは実行時にdownloadせず、version固定でimageまたはZIPへ含める。Lambdaの一時workspaceには `/tmp` を使い、sourceと成果物をrequest終了後に削除する。

初期段階ではVPCとNAT Gatewayを作らない。常時料金が発生する構成を避け、ビルド処理から外部networkへ依存しない。network隔離の要件とLambdaの実行特性が合わない場合は、公開前にCodeBuildなどビルド単位の隔離環境へ移行する。

### 8.2 Terraformで管理するもの

`infra/web-build/`をTerraform root moduleとし、少なくとも次をコード管理する。

- AWS providerとrequired version
- ECR repository
- ECR lifecycle policy
- Lambda function
- Lambda execution roleと最小権限policy
- Lambda reserved concurrency
- API Gateway v2 HTTP API、route、integration、stage
- GitHub Pagesとlocalhostだけを許可するCORS
- CloudWatch Log Groupと短いretention
- Lambda error、throttle、durationのCloudWatch Alarm
- AWS Budgetと通知先を受け取るvariable
- 共通tag
- endpoint、repository、function名のoutput

コンテナのbuildとECRへのpushはTerraformの責務に含めない。Terraformはinfra state、CIはimage artifactとdigestを管理し、Lambdaは可能ならtagではなくimage digestで更新する。

container方式を採用する場合の初回deployは次の流れに分ける。

1. TerraformでECR repositoryを先に作る
2. localまたはCIでcontainerをbuildし、ECRへpushする
3. pushしたimage digestを取得する
4. digestをTerraform variableへ渡し、LambdaとHTTP APIを作る

Terraformの`local-exec`などからDocker buildやpushを実行しない。infra stateとbuild artifactを混ぜず、同じdigestを指定すれば同じLambda実行環境を再現できるようにする。

最初はlocal stateで個人検証し、共同運用前にS3 backendとstate lockを別のbootstrapとして用意する。backend自身を同じstateから無理に作らない。

### 8.3 想定ディレクトリ

```text
infra/
  web-build/
    versions.tf
    providers.tf
    variables.tf
    locals.tf
    ecr.tf
    iam.tf
    lambda.tf
    api-gateway.tf
    observability.tf
    outputs.tf
    terraform.tfvars.example

services/
  web-build/
    Dockerfile
    src/
    scripts/
    tests/

web/src/features/code-editor/
  components/
  hooks/
  types/
  utils/

tests/
  code-editor/
  web-build/
```

## 9. セキュリティ

compilerへ渡すソースは信頼しない。MVPでも次を必須とする。

- shell文字列を組み立てず、固定commandと引数配列でprocessを起動する
- projectごとに推測困難な一時directoryを作成する
- path traversalとsymlinkを拒否する
- timeout時はcompiler process全体を終了する
- request終了時に一時directoryを削除する
- toolchain、core、libraryを読み取り専用にする
- 実行roleはログ出力など必要最小限にする
- AWS credentialやsecretをbuild processへ渡さない
- source本文をCloudWatchへ記録しない
- 生のcompiler logを無制限に記録しない
- request size、rate、同時実行数を制限する
- CORSをアクセス制御とはみなさない
- 公開前に認証または使い捨てtoken、rate limit、濫用対策を追加する

Lambdaの再利用環境へ前の利用者のデータを残さない。一時領域の再利用を前提に、request開始時と終了時の両方で専用workspaceを管理する。AWSも実行環境間で利用者データを残さないことと、実行roleの最小権限を推奨している。

## 10. 料金設計

初期見積りでは2GB Lambda、1build 10秒、20 GB秒/buildを仮定する。Lambda無料枠の400,000 GB秒が利用できる場合、ほかのLambda利用がなければ約20,000 build/月が計算上の目安になる。ただしcold startと実測時間をWB1/WB2で計測して更新する。

固定費を小さくするため次を守る。

- provisioned concurrencyを使わない
- NAT Gatewayを作らない
- API GatewayはREST APIではなくHTTP APIを使う
- ECR imageの古いdigestをlifecycle policyで削除する
- CloudWatch Logsへretentionを明示する
- build成果物をS3へ永続保存しない
- reserved concurrencyで最大同時実行数を抑える
- AWS Budgetと異常呼び出しalarmをTerraformで用意する

AWS Budgetは課金の強制停止装置ではない。通知に加え、API側のrate limit、認証、同時実行上限で支出の上限を守る。

参考:

- [AWS Lambda料金](https://aws.amazon.com/jp/lambda/pricing/)
- [Lambdaコンテナイメージ要件](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [Lambda ZIP deployment package](https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-zip.html)
- [API Gateway料金](https://aws.amazon.com/jp/api-gateway/pricing/)
- [Amazon ECR料金](https://aws.amazon.com/jp/ecr/pricing/)
- [Lambda実行roleの最小権限](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html)

## 11. 画面仕様

コード開発モードはBlocklyと別画面・別作品形式にする。MVP画面は次の領域を持つ。

1. コードeditor
2. サンプル選択
3. ブラウザ内自動保存とファイル入出力
4. 「UIAPduino用にビルド」操作
5. 実行中、成功、compiler error、容量超過、timeout、API拒否の状態表示
6. Flash・RAM使用量
7. 行番号付きdiagnosticからeditor該当行へ移動する導線
8. 「この段階ではボードへ書き込みません」という明示

状態管理は既存方針に従いTanStack Queryを使う。editor ComponentはAWS SDKやHTTP詳細を持たず、Web Build clientをfeature内の独立moduleへ分離する。

## 12. テスト方針

### 12.1 API単体テスト

- 正常な最小sketch
- syntax errorと行番号
- link error
- Flash/RAM解析
- 64 KiB超過
- 不正拡張子とpath traversal
- 未許可library
- timeout
- compiler logのpath除去
- 一時directory cleanup

### 12.2 コンテナ統合テスト

- pinned imageから同一sketchが再現可能なbinaryを生成する
- 現在の `workshop-runtime.ino`をビルドできる
- networkなしでもビルドできる
- read-only toolchainと書き込み可能な一時領域だけで動作する

### 12.3 Terraform検証

- `terraform fmt -check`
- `terraform validate`
- 静的security scan
- planにNAT Gateway、公開S3、広すぎるIAM権限が含まれない
- log retention、reserved concurrency、alarm、budgetが存在する

### 12.4 Webテスト

- request/response変換
- diagnostic表示
- 容量ゲージの境界
- build中の重複送信防止
- timeoutと再試行案内
- ソース本文を診断ログへ残さない

## 13. 実装フェーズ

### WB0: 仕様確定（現在）

- [x] Blockly実行とネイティブbuildの違いを明文化する
- [x] MVPをbuild確認だけに限定する
- [x] 入力上限とFlash/RAM判定を定義する
- [x] AWSとTerraformの初期構成を定義する
- [x] ECRの役割とZIP・CodeBuildとの比較を明文化する
- [ ] 通常コード向けUSB設定とcore補正の扱いを決める
- [ ] toolchain実容量を測り、container + ECRまたはZIP + Layerを決定する
- [ ] AWS region、通知先、公開範囲を決める

### WB1: ローカルbuild container

- [ ] `services/web-build`を作る
- [ ] compilerとcoreをversion固定でimageへ入れる
- [ ] toolchain、core、APIを含む展開後容量を測定する
- [ ] container image容量とcold startの見積り材料を記録する
- [ ] networkなしで最小sketchをbuildする
- [ ] errorと容量を構造化する
- [ ] 30秒、64 KiB、library allowlistを実装する
- [ ] 単体・統合テストを追加する

この段階ではAWSアカウントへリソースを作らない。

### WB2: TerraformとAWS private prototype

- [ ] `infra/web-build`を作る
- [ ] WB1の比較結果に基づき、ECRまたはZIP配布をTerraform化する
- [ ] budget、alarm、reserved concurrencyを設定する
- [ ] 手動または限定tokenでのみ呼べる状態でdeployする
- [ ] cold start、build時間、GB秒、log量を測定する
- [ ] 100回・1,000回・ワークショップ想定回数で料金を再計算する

### WB3: コード開発モード画面

- [ ] Blocklyとは別のrouteを追加する
- [ ] editor、保存、ファイル入出力を実装する
- [ ] Web Build APIへ接続する
- [ ] diagnosticと容量表示を実装する
- [ ] 書き込み未対応を明示する

### WB4: 限定公開判断

- [ ] 認証・rate limit・濫用対策を決める
- [ ] core/toolchain/libraryの再配布条件を確認する
- [ ] 負荷試験と費用alarmを確認する
- [ ] privacy、source保持、利用規約上の説明を用意する

### WB5: 書き込み検討（別仕様）

- [ ] `.bin`の安全な返却方法を決める
- [ ] target、容量、address、checksumをブラウザで再検証する
- [ ] 教育用ランタイムを上書きすることを明示する
- [ ] bootloader接続、write、verify、復旧を別仕様として設計する

WB0〜WB4の完了は実機書き込みを意味しない。

## 14. 未決定事項

- AWS regionを東京に固定するか
- private prototypeの認証方式
- 料金通知先
- UIAPduino coreとtoolchainをコンテナ配布できるlicense条件
- Arduino形式を最初の唯一の入力にするか、plain Cも扱うか
- WebHIDを含まない通常コードのUSB設定
- compiler imageの実容量とLambda cold start
- Lambdaで十分な隔離が得られない場合のCodeBuild移行条件
- 将来のBlocklyネイティブbuildと現在の命令転送方式をUIでどう区別するか

## 15. MVP完了条件

次をすべて満たした時点でWeb Build MVPを完了とする。

1. GitHub Pagesのコード開発モードから最小sketchを送信できる
2. 固定versionのUIAPduino toolchainで実際にbuildされる
3. syntax errorがファイル名と行番号付きで表示される
4. FlashとRAM使用量が表示される
5. 入力制限、timeout、同時実行上限が機能する
6. sourceと成果物が永続保存されない
7. Terraformで同じAWS構成を再作成できる
8. alarmとbudget通知を確認できる
9. 1buildあたりの時間と費用を実測してこの文書へ記録する
10. 実機への書き込み経路が存在しないことを確認する
