#!/usr/bin/env bash

set -euo pipefail

readonly BOARD_INDEX_URL="https://raw.githubusercontent.com/tarosay/board_manager_files/main/package_uiap_hid_index.json"
readonly CORE="UIAP_HID:ch32v"
readonly CORE_VERSION="1.2.14"
readonly FQBN="UIAP_HID:ch32v:CH32V003"
readonly BOARD_OPTIONS="pnum=V14,upload_method=uiapflash,clock=48MHz_HSI,usb=webhid,pwm=default,xserial=none,opt=oslto,dbg=none,rtlib=none"

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly SKETCH_DIR="${PROJECT_DIR}/firmware/workshop-runtime"
readonly BUILD_DIR="${PROJECT_DIR}/.build/workshop-runtime"

usage() {
  cat <<'EOF'
UIAPduino教育用ランタイムをArduino CLIで扱います。

使い方:
  ./scripts/workshop-runtime.sh setup   公式UIAPduino coreを導入する
  ./scripts/workshop-runtime.sh patch-core  macOS用USB descriptor補正だけを行う
  ./scripts/workshop-runtime.sh build   ランタイムをコンパイルする（実機は変更しない）
  ./scripts/workshop-runtime.sh upload  ビルド済みランタイムを実機へ書き込む

upload前の接続:
  1. UIAPduinoのボタンを押し続ける
  2. USBへ接続する
  3. 約1秒待ってからボタンを離す

注意: uploadはUIAPduino上の現在のプログラムを置き換えます。
EOF
}

find_arduino_cli() {
  if command -v arduino-cli >/dev/null 2>&1; then
    command -v arduino-cli
    return
  fi

  echo "arduino-cliが見つかりません。先にArduino CLIをインストールしてください。" >&2
  exit 1
}

core_is_installed() {
  "${ARDUINO_CLI}" core list | awk '{print $1 "@" $2}' | grep -qx "${CORE}@${CORE_VERSION}"
}

require_core() {
  if ! core_is_installed; then
    echo "UIAPduino core ${CORE_VERSION}がありません。先にsetupを実行してください。" >&2
    exit 1
  fi
}

core_usb_config_path() {
  local data_dir
  data_dir="$("${ARDUINO_CLI}" config get directories.data)"
  printf '%s/packages/UIAP_HID/hardware/ch32v/%s/cores/arduino/usb_config.h\n' \
    "${data_dir}" "${CORE_VERSION}"
}

patch_webhid_descriptor() {
  require_core
  local config_file
  config_file="$(core_usb_config_path)"

  if grep -q '0x22, 0x00,  // wTotalLength = 34 (9+9+9+7)' "${config_file}"; then
    echo "WebHID descriptorは補正済みです。"
    return
  fi
  if ! grep -q '0x29, 0x00,  // wTotalLength = 41 (9+9+9+7+7)' "${config_file}"; then
    echo "想定したUSB descriptorが見つからないため、coreを変更しませんでした。" >&2
    exit 1
  fi

  sed -i.bak \
    's/0x29, 0x00,  \/\/ wTotalLength = 41 (9+9+9+7+7)/0x22, 0x00,  \/\/ wTotalLength = 34 (9+9+9+7)/' \
    "${config_file}"
  echo "macOSがHID interfaceを認識できるよう、WebHID descriptorの全長を34 bytesへ補正しました。"
}

require_descriptor_patch() {
  local config_file
  config_file="$(core_usb_config_path)"
  if ! grep -q '0x22, 0x00,  // wTotalLength = 34 (9+9+9+7)' "${config_file}"; then
    echo "WebHID descriptorが未補正です。先にsetupまたはpatch-coreを実行してください。" >&2
    exit 1
  fi
}

setup_core() {
  echo "公式UIAPduino package indexを更新します。"
  "${ARDUINO_CLI}" core update-index --additional-urls "${BOARD_INDEX_URL}"
  echo "UIAPduino core ${CORE_VERSION}を導入します。"
  "${ARDUINO_CLI}" core install "${CORE}@${CORE_VERSION}" --additional-urls "${BOARD_INDEX_URL}"
  patch_webhid_descriptor
}

build_runtime() {
  require_core
  require_descriptor_patch
  mkdir -p "${BUILD_DIR}"
  echo "教育用ランタイムをコンパイルします。実機への書き込みは行いません。"
  "${ARDUINO_CLI}" compile \
    --fqbn "${FQBN}" \
    --board-options "${BOARD_OPTIONS}" \
    --clean \
    --output-dir "${BUILD_DIR}" \
    "${SKETCH_DIR}"
  echo "生成物: ${BUILD_DIR}/workshop-runtime.ino.bin"
}

upload_runtime() {
  require_core
  local binary="${BUILD_DIR}/workshop-runtime.ino.bin"
  if [[ ! -f "${binary}" ]]; then
    echo "ビルド済みbinがありません。先にbuildを実行してください。" >&2
    exit 1
  fi

  echo "警告: UIAPduino上の現在のプログラムを置き換えます。"
  echo "ブートローダーモードで接続されていることを確認してください。"
  "${ARDUINO_CLI}" upload \
    --fqbn "${FQBN}" \
    --board-options "${BOARD_OPTIONS}" \
    --input-dir "${BUILD_DIR}" \
    "${SKETCH_DIR}"
}

readonly ARDUINO_CLI="$(find_arduino_cli)"
readonly COMMAND="${1:-}"

case "${COMMAND}" in
  setup)
    setup_core
    ;;
  patch-core)
    patch_webhid_descriptor
    ;;
  build)
    build_runtime
    ;;
  upload)
    upload_runtime
    ;;
  help|-h|--help|"")
    usage
    ;;
  *)
    echo "不明な操作です: ${COMMAND}" >&2
    usage >&2
    exit 2
    ;;
esac
