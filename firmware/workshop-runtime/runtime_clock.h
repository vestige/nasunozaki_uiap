#pragma once
#include <stdint.h>

namespace uiap {
// Main-loop-only 48MHz SysTick clock. Like the core timebase, callers must
// sample at least once per 32-bit tick wrap (~89.5s). This is not an ISR clock.
// Keep whole milliseconds and sub-ms ticks separately: delta + remainder
// could overflow uint32_t, so divide delta before adding its remainder.
class RuntimeClock {
 public:
  uint32_t update(uint32_t now) {
    const uint32_t delta = now - last_;
    last_ = now;
    milliseconds_ += delta / 48000u;
    const uint32_t ticks = remainder_ + delta % 48000u;
    if (ticks >= 48000u) {
      ++milliseconds_;
      remainder_ = ticks - 48000u;
    } else remainder_ = ticks;
    return milliseconds_;
  }
 private:
  uint32_t last_ = 0;
  uint32_t milliseconds_ = 0;
  uint32_t remainder_ = 0;
};
}
