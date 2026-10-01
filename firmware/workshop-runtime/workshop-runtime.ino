#include <WebHID.h>
#define NEOPIXELMIN_MAX_LEDS 8
#include <NeoPixelmin.h>

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

namespace {
constexpr uint8_t kMessageSize = 8;
constexpr uint8_t kVersion = 1;
constexpr uint8_t kSetLed = 0x01;
constexpr uint8_t kReadButton = 0x02;
constexpr uint8_t kNeoRed = 0x10;
constexpr uint8_t kNeoGreen = 0x11;
constexpr uint8_t kNeoBlue = 0x12;
constexpr uint8_t kNeoBrightness = 0x13;
constexpr uint8_t kNeoApply = 0x14;
constexpr uint8_t kNeoClear = 0x15;
constexpr uint8_t kButtonPin = 5;  // D5 / PC3. Connect a switch between D5 and GND.
constexpr uint8_t kNeoPixelCount = 8;
constexpr uint8_t kResponse = 0x80;
constexpr uint8_t kOk = 0;
constexpr uint8_t kUnsupportedCommand = 1;
constexpr uint8_t kInvalidPayload = 2;
constexpr uint8_t kMagic[] = {0x55, 0x49, 0x41, 0x50};  // "UIAP"
NeoPixelmin pixels(kNeoPixelCount, NEOPIXELMIN_PIN, NEO_GRB + NEO_KHZ800);
uint8_t neoRed = 0;
uint8_t neoGreen = 0;
uint8_t neoBlue = 0;
uint8_t neoBrightness = 20;

uint8_t scaledNeoChannel(uint8_t channel) {
  return static_cast<uint8_t>((static_cast<uint16_t>(channel) * neoBrightness) / 100u);
}

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

  // Windows HID requires the full 32-byte Feature Report declared by the
  // descriptor. The UIAP protocol remains in the first 8 bytes.
  if (length < kMessageSize || !hasMagic(message) ||
      message[4] != kVersion || (command & kResponse) != 0) {
    sendResponse(command, sequence, kInvalidPayload);
    return;
  }
  if (command == kReadButton) {
    if (message[7] != 0) {
      sendResponse(command, sequence, kInvalidPayload);
      return;
    }
    // For READ_BUTTON, the final response byte is the sampled state (0 or 1).
    sendResponse(command, sequence, digitalRead(kButtonPin) == LOW ? 1 : 0);
    return;
  }
  if (command == kNeoRed || command == kNeoGreen || command == kNeoBlue) {
    if (command == kNeoRed) neoRed = message[7];
    if (command == kNeoGreen) neoGreen = message[7];
    if (command == kNeoBlue) neoBlue = message[7];
    sendResponse(command, sequence, kOk);
    return;
  }
  if (command == kNeoBrightness) {
    if (message[7] < 1 || message[7] > 100) {
      sendResponse(command, sequence, kInvalidPayload);
      return;
    }
    neoBrightness = message[7];
    sendResponse(command, sequence, kOk);
    return;
  }
  if (command == kNeoApply) {
    if (message[7] > kNeoPixelCount) {
      sendResponse(command, sequence, kInvalidPayload);
      return;
    }
    if (message[7] == 0) {
      for (uint8_t index = 0; index < kNeoPixelCount; index++) {
        pixels.setPixelColor(index, scaledNeoChannel(neoRed), scaledNeoChannel(neoGreen), scaledNeoChannel(neoBlue));
      }
    } else {
      pixels.setPixelColor(message[7] - 1, scaledNeoChannel(neoRed), scaledNeoChannel(neoGreen), scaledNeoChannel(neoBlue));
    }
    pixels.show();
    sendResponse(command, sequence, kOk);
    return;
  }
  if (command == kNeoClear) {
    if (message[7] != 0) {
      sendResponse(command, sequence, kInvalidPayload);
      return;
    }
    pixels.clear();
    pixels.show();
    sendResponse(command, sequence, kOk);
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
  pinMode(kButtonPin, INPUT_PULLUP);
  pixels.begin();
  // The strip can ignore a frame sent while its power is still stabilizing.
  // Wait briefly, then send the cleared buffer twice so startup is always off.
  delay(20);
  pixels.clear();
  pixels.show();
  delay(1);
  pixels.show();
  WebHID.begin();
}

void loop() {
  if (!WebHID.available()) return;

  uint8_t message[32] = {0};
  const uint8_t length = WebHID.recv(message, sizeof(message));
  handleMessage(message, length);
}
