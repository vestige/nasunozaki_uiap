#!/usr/bin/env bash

set -euo pipefail

readonly IMAGE="uiapduino-web-build:wb1"

docker build --platform linux/amd64 -t "${IMAGE}" services/web-build
docker image inspect "${IMAGE}" \
  --format 'image={{.Id}} sizeBytes={{.Size}} architecture={{.Architecture}} os={{.Os}}'

# x86_64 emulation on Apple Silicon is slower than Lambda x86_64. The override
# only applies to this local integration check; the service default stays 30s.
docker run --rm --network none \
  --env BUILD_TIMEOUT_SECONDS=90 \
  --entrypoint python \
  "${IMAGE}" \
  -c 'import json; from handler import lambda_handler; event={"body":json.dumps({"requestVersion":1,"project":{"name":"blink","files":[{"name":"blink.ino","content":"void setup() {}\nvoid loop() {}\n"}]}})}; print(lambda_handler(event, None)["body"])'
