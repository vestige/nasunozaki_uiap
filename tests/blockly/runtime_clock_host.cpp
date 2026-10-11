#include "../../firmware/workshop-runtime/runtime_clock.h"
#include <cassert>
#include <stdint.h>
#include <iostream>

int main() {
  uiap::RuntimeClock clock;
  uint32_t previous = 0;
  uint64_t ticks = 0;
  auto check = [&](uint32_t now) {
    ticks += static_cast<uint32_t>(now - previous);
    previous = now;
    assert(clock.update(now) == static_cast<uint32_t>(ticks / 48000u));
  };
  // First reading is time since counter zero, as in the installed core.
  check(0); check(47999); check(48000); check(48001); check(48001);
  check(0xffffffffu); check(0); check(1); // max delta and hardware wrap
  check(previous + 47999); check(previous + 47999); // retained fractions
  uint32_t random = 123456789u;
  for (unsigned i = 0; i < 100000; ++i) {
    random = random * 1664525u + 1013904223u;
    check(previous + random);
  }
  assert(ticks / 48000u > 0xffffffffu); // millis wraps, not just SysTick
  uiap::RuntimeClock lateStart;
  assert(lateStart.update(0xffffffffu) == 0xffffffffu / 48000u);
  assert(lateStart.update(0) == static_cast<uint32_t>(uint64_t(0x100000000ULL) / 48000u));
  std::cout << "clock matches 64-bit reference\n";
}
