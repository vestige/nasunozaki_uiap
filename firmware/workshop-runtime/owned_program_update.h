#ifndef UIAP_OWNED_PROGRAM_UPDATE_H
#define UIAP_OWNED_PROGRAM_UPDATE_H
#include <stdint.h>

namespace uiap {
// An inactivity lease is not an automatic abort. A confirmed recovery must
// match the token and progress again on the board before changing any state.
class OwnedProgramUpdate {
 public:
  static constexpr uint32_t kLeaseMs = 30000;
  uint8_t token[8] = {};
  void begin(const uint8_t *owner, uint32_t now) {
    for (uint8_t i = 0; i < 8; ++i) token[i] = owner[i];
    lastProgress_ = now;
    owned_ = true;
    committed_ = false;
    expired_ = false;
  }
  void progress(uint32_t now) { lastProgress_ = now; }
  void finish(bool committed) { owned_ = false; committed_ = committed; }
  void legacy() {
    owned_ = committed_ = false;
    for (uint8_t i = 0; i < 8; ++i) token[i] = 0;
  }
  bool matches(const uint8_t *owner) const {
    for (uint8_t i = 0; i < 8; ++i) if (token[i] != owner[i]) return false;
    return true;
  }
  bool owns(const uint8_t *owner) const { return owned_ && matches(owner); }
  bool isOwned() const { return owned_; }
  void service(uint32_t now) { if (owned_ && expired(now)) expired_ = true; }
  bool expired(uint32_t now) const {
    return expired_ || static_cast<uint32_t>(now - lastProgress_) >= kLeaseMs;
  }
  uint8_t state(bool active, uint32_t now) const {
    if (!active) return committed_ ? 0x74 : 0x70;
    if (!owned_) return 0x73; // Legacy transfer: never reclaim without ownership.
    return expired(now) ? 0x72 : 0x71;
  }
  bool canRecover(bool active, const uint8_t *owner,
      uint16_t expectedOffset, uint16_t actualOffset, uint32_t now) const {
    return active && owns(owner) && expectedOffset == actualOffset && expired(now);
  }
 private:
  uint32_t lastProgress_ = 0;
  bool owned_ = false;
  bool committed_ = false;
  bool expired_ = false;
};
}
#endif
