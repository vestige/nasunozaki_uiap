// Temporary, one-shot hardware identification test for issue #49.
// Wiring (USB disconnected): D6 / PC4 -> 1k ohm -> external-drive
// piezo -> GND. Never connect the piezo to a power pin for this test.
// This sketch does not implement the workshop HID command protocol or read
// Blockly project banks. Restore the workshop runtime after testing.
#include <WebHID.h>
#include <PWMmin.h>
#define NEOPIXELMIN_MAX_LEDS 8
#define NEOPIXELMIN_ATOMIC
#include <NeoPixelmin.h>

PWMMIN_REQUIRE_DEFAULT();
constexpr uint8_t kPiezoPin = 6;  // PC4 / TIM1 CH4; not D5 or D8.
constexpr uint8_t kLedPin = 2;    // PC0; never configure TIM2 for this test.
NeoPixelmin pixels(8, NEOPIXELMIN_PIN, NEO_GRB + NEO_KHZ800);
uint32_t phaseStarted = 0;
uint8_t phase = 0;

void silence() {
  Pwm_stop(kPiezoPin);
  // PWMmin stop restores an input. Explicit LOW discharges the piezo and
  // avoids leaving a DC voltage or floating output after the test.
  digitalWrite(kPiezoPin, LOW);
  pinMode(kPiezoPin, OUTPUT);
  digitalWrite(kLedPin, LOW);
}

void play(uint16_t hz) {
  // Hardware PWM continues without interrupts or blocking the USB loop.
  // Use only TIM1; changing the shared TIM2 frequency is unnecessary.
  Pwm_freq_TIM1(hz);
  Pwm_write(kPiezoPin, 128);
  digitalWrite(kLedPin, HIGH);
}

void setup() {
  pinMode(kLedPin, OUTPUT);
  silence();
  pixels.begin();
  pixels.clear();
  pixels.show();
  WebHID.begin();
  phaseStarted = millis();
}

void loop() {
  const uint32_t elapsed = millis() - phaseStarted;
  // Subtraction is safe across millis() wrap. No software tone loop,
  // interrupt handler, duration-blocking tone() or endless playback.
  switch (phase) {
    case 0: if (elapsed >= 1500) { play(4000); phase = 1; phaseStarted = millis(); } break;
    case 1: if (elapsed >= 200) { silence(); phase = 2; phaseStarted = millis(); } break;
    case 2: if (elapsed >= 800) { play(440); phase = 3; phaseStarted = millis(); } break;
    case 3: if (elapsed >= 500) { silence(); phase = 4; phaseStarted = millis(); } break;
    case 4: if (elapsed >= 500) { play(523); phase = 5; phaseStarted = millis(); } break;
    case 5: if (elapsed >= 500) { silence(); phase = 6; } break;
    default: break; // Remain silent until a power-cycle or reset.
  }
}
