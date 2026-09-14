FROM public.ecr.aws/lambda/python:3.13

ARG ARDUINO_CLI_VERSION=1.5.1
ARG ARDUINO_CLI_SHA256=28a8e119c498a25607821c36cb2dc49e8463941b261a0d99091baa7bc692dd2b
ARG UIAP_CORE_VERSION=1.2.14
ARG UIAP_INDEX_URL=https://raw.githubusercontent.com/tarosay/board_manager_files/main/package_uiap_hid_index.json
ARG RISCV_TOOLCHAIN_ARCHIVE=xpack-riscv-none-elf-gcc-14.2.0-2-linux-x64.tar.gz
ARG RISCV_TOOLCHAIN_URL=https://github.com/tarosay/arduino_core_ch32/releases/download/0.1.0/xpack-riscv-none-elf-gcc-14.2.0-2-linux-x64.tar.gz
ARG RISCV_TOOLCHAIN_SHA256=0ab93937aab882c3a69f63eff4fe8fc6e360e4a23776004fa116ad692e699d23

RUN dnf install -y gzip tar && dnf clean all
RUN curl -fsSLo /tmp/arduino-cli.tar.gz \
      "https://github.com/arduino/arduino-cli/releases/download/v${ARDUINO_CLI_VERSION}/arduino-cli_${ARDUINO_CLI_VERSION}_Linux_64bit.tar.gz" \
    && echo "${ARDUINO_CLI_SHA256}  /tmp/arduino-cli.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/arduino-cli.tar.gz -C /usr/local/bin arduino-cli \
    && rm /tmp/arduino-cli.tar.gz

RUN mkdir -p /etc/arduino-cli /opt/arduino-data /opt/arduino-downloads/packages /tmp/arduino-user \
    && arduino-cli config init --dest-dir /etc/arduino-cli \
    && arduino-cli config set directories.data /opt/arduino-data --config-file /etc/arduino-cli/arduino-cli.yaml \
    && arduino-cli config set directories.downloads /opt/arduino-downloads --config-file /etc/arduino-cli/arduino-cli.yaml \
    && arduino-cli config set directories.user /tmp/arduino-user --config-file /etc/arduino-cli/arduino-cli.yaml \
    && arduino-cli core update-index --additional-urls "${UIAP_INDEX_URL}" --config-file /etc/arduino-cli/arduino-cli.yaml \
    && curl --fail --location --retry 5 --retry-all-errors --continue-at - \
      --output "/opt/arduino-downloads/packages/${RISCV_TOOLCHAIN_ARCHIVE}" "${RISCV_TOOLCHAIN_URL}" \
    && echo "${RISCV_TOOLCHAIN_SHA256}  /opt/arduino-downloads/packages/${RISCV_TOOLCHAIN_ARCHIVE}" | sha256sum -c - \
    && arduino-cli core install "UIAP_HID:ch32v@${UIAP_CORE_VERSION}" --additional-urls "${UIAP_INDEX_URL}" --config-file /etc/arduino-cli/arduino-cli.yaml \
    && sed -i 's/0x29, 0x00,  \/\/ wTotalLength = 41 (9+9+9+7+7)/0x22, 0x00,  \/\/ wTotalLength = 34 (9+9+9+7)/' \
      "/opt/arduino-data/packages/UIAP_HID/hardware/ch32v/${UIAP_CORE_VERSION}/cores/arduino/usb_config.h" \
    && rm -rf /opt/arduino-downloads/*

COPY src/ ${LAMBDA_TASK_ROOT}/

ENV ARDUINO_CLI=/usr/local/bin/arduino-cli
ENV ARDUINO_CONFIG=/etc/arduino-cli/arduino-cli.yaml

CMD ["handler.lambda_handler"]
