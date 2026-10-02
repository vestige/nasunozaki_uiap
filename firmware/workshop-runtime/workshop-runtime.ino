#include <WebHID.h>
#define NEOPIXELMIN_MAX_LEDS 8
#define NEOPIXELMIN_ATOMIC
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
constexpr uint16_t kStandaloneSlotSize = 1024;
constexpr uint8_t kStandaloneHeaderSize = 16;
constexpr uint8_t kStandaloneVersion = 1;
constexpr uint8_t kStandaloneAutostart = 0x01;
constexpr uint8_t kStandaloneEnd = 0x00;
constexpr uint8_t kStandaloneSetLed = 0x01;
constexpr uint8_t kStandaloneWait = 0x02;
constexpr uint8_t kStandaloneRepeat = 0x10;
constexpr uint8_t kStandaloneForever = 0x11;
constexpr uint8_t kStandaloneMaxDepth = 8;
constexpr uint16_t kStandaloneMaxWait = 5000;
constexpr uint8_t kStandaloneMaxRepeat = 20;
NeoPixelmin pixels(kNeoPixelCount, NEOPIXELMIN_PIN, NEO_GRB + NEO_KHZ800);
uint8_t neoRed = 0;
uint8_t neoGreen = 0;
uint8_t neoBlue = 0;
uint8_t neoBrightness = 20;
bool standaloneProgramReady = false;

// The browser replaces this entire slot in the compiled image. volatile keeps
// the compiler from constant-folding the empty development image: the bytes in
// flash can differ after a Blockly program has been embedded.
const volatile uint8_t standaloneProgramSlot[kStandaloneSlotSize]
    __attribute__((used, aligned(4), section(".rodata.uiap_program"))) = {
        0x55, 0x49, 0x42, 0x50,  // "UIBP"
        kStandaloneVersion,
        0x00,                    // flags: empty image does not autostart
        0x00, 0x00,              // payload length
        0xff, 0xff,              // CRC-16/CCITT-FALSE of an empty payload
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
};

uint8_t scaledNeoChannel(uint8_t channel) {
  return static_cast<uint8_t>((static_cast<uint16_t>(channel) * neoBrightness) / 100u);
}

bool hasMagic(const uint8_t *message) {
  for (uint8_t index = 0; index < sizeof(kMagic); index++) {
    if (message[index] != kMagic[index]) return false;
  }
  return true;
}

uint16_t standaloneUint16(uint16_t offset) {
  return static_cast<uint16_t>(standaloneProgramSlot[offset]) |
         (static_cast<uint16_t>(standaloneProgramSlot[offset + 1]) << 8);
}

uint16_t standaloneCrc16(uint16_t offset, uint16_t length) {
  uint16_t crc = 0xffff;
  for (uint16_t index = 0; index < length; index++) {
    crc ^= static_cast<uint16_t>(standaloneProgramSlot[offset + index]) << 8;
    for (uint8_t bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000u) != 0
          ? static_cast<uint16_t>((crc << 1) ^ 0x1021u)
          : static_cast<uint16_t>(crc << 1);
    }
  }
  return crc;
}

bool standaloneHasBytes(uint16_t cursor, uint16_t count, uint16_t end) {
  return cursor <= end && count <= static_cast<uint16_t>(end - cursor);
}

bool validateStandaloneRange(uint16_t start, uint16_t end, uint8_t depth,
                             bool requireEnd) {
  if (depth > kStandaloneMaxDepth || start > end) return false;
  uint16_t cursor = start;
  while (cursor < end) {
    const uint8_t opcode = standaloneProgramSlot[cursor++];
    if (opcode == kStandaloneEnd) return requireEnd && cursor == end;
    if (opcode == kStandaloneSetLed) {
      if (!standaloneHasBytes(cursor, 1, end) || standaloneProgramSlot[cursor] > 1) return false;
      cursor++;
    } else if (opcode == kStandaloneWait) {
      if (!standaloneHasBytes(cursor, 2, end) || standaloneUint16(cursor) > kStandaloneMaxWait) return false;
      cursor += 2;
    } else if (opcode == kStandaloneRepeat) {
      if (!standaloneHasBytes(cursor, 3, end)) return false;
      const uint8_t count = standaloneProgramSlot[cursor++];
      const uint16_t bodyLength = standaloneUint16(cursor);
      cursor += 2;
      if (count < 1 || count > kStandaloneMaxRepeat ||
          !standaloneHasBytes(cursor, bodyLength, end) ||
          !validateStandaloneRange(cursor, cursor + bodyLength, depth + 1, false)) return false;
      cursor += bodyLength;
    } else if (opcode == kStandaloneForever) {
      if (!standaloneHasBytes(cursor, 2, end)) return false;
      const uint16_t bodyLength = standaloneUint16(cursor);
      cursor += 2;
      if (bodyLength == 0 || !standaloneHasBytes(cursor, bodyLength, end) ||
          !validateStandaloneRange(cursor, cursor + bodyLength, depth + 1, false)) return false;
      cursor += bodyLength;
    } else {
      return false;
    }
  }
  return !requireEnd;
}

bool validateStandaloneProgram() {
  const uint8_t expectedMagic[] = {0x55, 0x49, 0x42, 0x50};
  for (uint8_t index = 0; index < sizeof(expectedMagic); index++) {
    if (standaloneProgramSlot[index] != expectedMagic[index]) return false;
  }
  if (standaloneProgramSlot[4] != kStandaloneVersion ||
      (standaloneProgramSlot[5] & kStandaloneAutostart) == 0 ||
      (standaloneProgramSlot[5] & ~kStandaloneAutostart) != 0) return false;
  for (uint8_t index = 10; index < kStandaloneHeaderSize; index++) {
    if (standaloneProgramSlot[index] != 0) return false;
  }
  const uint16_t payloadLength = standaloneUint16(6);
  if (payloadLength == 0 || payloadLength > kStandaloneSlotSize - kStandaloneHeaderSize) return false;
  if (standaloneUint16(8) != standaloneCrc16(kStandaloneHeaderSize, payloadLength)) return false;
  return validateStandaloneRange(kStandaloneHeaderSize,
      kStandaloneHeaderSize + payloadLength, 0, true);
}

void executeStandaloneRange(uint16_t start, uint16_t end) {
  uint16_t cursor = start;
  while (cursor < end) {
    const uint8_t opcode = standaloneProgramSlot[cursor++];
    if (opcode == kStandaloneEnd) return;
    if (opcode == kStandaloneSetLed) {
      digitalWrite(LED_BUILTIN, standaloneProgramSlot[cursor++] == 1 ? HIGH : LOW);
    } else if (opcode == kStandaloneWait) {
      const uint16_t milliseconds = standaloneUint16(cursor);
      cursor += 2;
      delay(milliseconds);
    } else if (opcode == kStandaloneRepeat) {
      const uint8_t count = standaloneProgramSlot[cursor++];
      const uint16_t bodyLength = standaloneUint16(cursor);
      cursor += 2;
      for (uint8_t iteration = 0; iteration < count; iteration++) {
        executeStandaloneRange(cursor, cursor + bodyLength);
      }
      cursor += bodyLength;
    } else if (opcode == kStandaloneForever) {
      const uint16_t bodyLength = standaloneUint16(cursor);
      cursor += 2;
      while (true) executeStandaloneRange(cursor, cursor + bodyLength);
    }
  }
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
    // pixels.show() disables interrupts for the NeoPixel frame. WebHID marks a
    // Feature Report ready when its final EP0 OUT packet arrives, before the
    // control transfer's status stage is guaranteed to have run. One full-speed
    // USB frame (1 ms) gives the software USB ISR a chance to finish that stage
    // before we enter the atomic section. This delay protects the USB transfer;
    // NEOPIXELMIN_ATOMIC, not the delay, protects the NeoPixel waveform. It is a
    // conservative timing workaround until the USB core exposes an explicit
    // EP0-transfer-complete state.
    delay(1);
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
    // Apply the same EP0 completion guard as kNeoApply above.
    delay(1);
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
  standaloneProgramReady = validateStandaloneProgram();
}

void loop() {
  if (standaloneProgramReady) {
    executeStandaloneRange(kStandaloneHeaderSize,
        kStandaloneHeaderSize + standaloneUint16(6));
    standaloneProgramReady = false;
    digitalWrite(LED_BUILTIN, LOW);
  }
  if (!WebHID.available()) return;

  uint8_t message[32] = {0};
  const uint8_t length = WebHID.recv(message, sizeof(message));
  handleMessage(message, length);
}
