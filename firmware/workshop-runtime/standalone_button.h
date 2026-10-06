#pragma once
#include <stdint.h>

namespace uiap {
// Sample-on-read, matching the browser's DebouncedButton. Short presses between
// reads may be missed; this is not an interrupt-driven event queue.
class StandaloneButton {
 public:
  void reset() { initialized_ = stable_ = candidate_ = pending_ = false; since_ = 0; }
  bool update(bool raw, uint32_t now) {
    if (!initialized_) {
      initialized_ = true;
      stable_ = candidate_ = pending_ = raw;
      since_ = now;
    } else if (raw == stable_) {
      candidate_ = stable_;
      since_ = now;
    } else if (raw != candidate_) {
      candidate_ = raw;
      since_ = now;
    } else if (static_cast<uint32_t>(now - since_) >= 20) {
      stable_ = candidate_;
      if (stable_) pending_ = true;
    }
    return stable_;
  }
  bool consume() { const bool result = pending_; pending_ = false; return result; }
 private:
  uint32_t since_ = 0;
  bool initialized_ = false, stable_ = false, candidate_ = false, pending_ = false;
};
}
