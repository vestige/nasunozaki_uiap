#include <WebHID.h>

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

namespace {
constexpr uint8_t kMessageSize = 8;
constexpr uint8_t kVersion = 1;
constexpr uint8_t kSetLed = 0x01;
constexpr uint8_t kResponse = 0x80;
constexpr uint8_t kOk = 0;
constexpr uint8_t kUnsupportedCommand = 1;
constexpr uint8_t kInvalidPayload = 2;
constexpr uint8_t kMagic[] = {0x55, 0x49, 0x41, 0x50};  // "UIAP"

bool hasMagic(const uint8_t *message) {
  for (uint8_t index = 0; index < sizeof(kMagic); index++) {
    if (message[index] != kMagic[index]) return false;
  }
  return true;
}

void sendResponse(uint8_t command, uint8_t sequence, uint8_t status) {
  uint8_t response[kMessageSize] = {
      kMagic[0], kMagic[1], kMagic[2], kMagic[3],
      kVersion, static_cast<uint8_t>(command | kResponse), sequence, status,
  };
  WebHID.send(response, sizeof(response));
}

void handleMessage(const uint8_t *message, uint8_t length) {
  const uint8_t command = length > 5 ? message[5] : 0;
  const uint8_t sequence = length > 6 ? message[6] : 0;

  if (length != kMessageSize || !hasMagic(message) ||
      message[4] != kVersion || (command & kResponse) != 0) {
    sendResponse(command, sequence, kInvalidPayload);
    return;
  }
  if (command != kSetLed) {
    sendResponse(command, sequence, kUnsupportedCommand);
    return;
  }
  if (message[7] > 1) {
    sendResponse(command, sequence, kInvalidPayload);
    return;
  }

  digitalWrite(LED_BUILTIN, message[7] == 1 ? HIGH : LOW);
  sendResponse(command, sequence, kOk);
}
}  // namespace

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  WebHID.begin();
}

void loop() {
  if (!WebHID.available()) return;

  uint8_t message[32] = {0};
  const uint8_t length = WebHID.recv(message, sizeof(message));
  handleMessage(message, length);
}
