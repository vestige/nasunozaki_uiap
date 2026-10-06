#pragma once
#include <stdint.h>

// Portable bytecode core: no USB, flash writes, allocation or Arduino dependency.
// The host services USB at every instruction and during waits. Returning false
// cancels the current run, including all nested ranges.
namespace uiap {
struct VmHost {
  bool (*service)();
  bool (*wait)(uint16_t);
  bool (*button)(bool consume);
  void (*led)(bool);
  void (*neo)(uint8_t, uint8_t, uint8_t, uint8_t, uint8_t);
};

class StandaloneVm {
 public:
  bool validate(const volatile uint8_t* bytes, uint16_t length, uint8_t version) {
    data_ = bytes;
    version_ = version;
    failed_ = false;
    return (version == 1 || version == 2) && range(0, length, 0, true, false);
  }

  bool run(const volatile uint8_t* bytes, uint16_t length, uint8_t version, VmHost host) {
    if (!validate(bytes, length, version)) return false;
    host_ = host;
    for (uint8_t i = 0; i < 16; ++i) vars_[i].type = 0;
    return range(0, length, 0, true, true);
  }

 private:
  struct Value { int32_t number; uint8_t type; }; // 0 unset, 1 boolean, 2 integer
  Value vars_[16];
  const volatile uint8_t* data_ = nullptr;
  VmHost host_{};
  uint8_t version_ = 1;
  bool failed_ = false;

  bool fits(uint16_t p, uint16_t n, uint16_t end) const {
    return p <= end && n <= end - p;
  }
  uint16_t word(uint16_t p) const {
    return static_cast<uint16_t>(data_[p]) | (static_cast<uint16_t>(data_[p + 1]) << 8);
  }
  bool fail() { failed_ = true; return false; }
  bool pause(uint16_t ms, bool execute) {
    return !execute || host_.wait(ms) || fail();
  }

  bool expr(uint16_t& p, uint16_t end, uint8_t depth, bool execute, Value& out) {
    if (depth > 8 || !fits(p, 1, end)) return fail();
    const uint8_t op = data_[p++];
    out = {0, 0};
    if (op == 1 || op == 3) {
      if (!fits(p, 1, end)) return fail();
      const uint8_t n = data_[p++];
      if (op == 1) {
        if (n > 1) return fail();
        out = {n, 1};
      } else {
        if (n >= 16) return fail();
        if (execute) {
          out = vars_[n];
          if (!out.type) return fail();
        }
      }
      return true;
    }
    if (op == 2) {
      if (!fits(p, 4, end)) return fail();
      const uint32_t bits = static_cast<uint32_t>(word(p)) |
          (static_cast<uint32_t>(word(p + 2)) << 16);
      out = {static_cast<int32_t>(bits), 2};
      p += 4;
      return true;
    }
    if (op < 4 || op > 12) return fail();
    Value left, right;
    if (!expr(p, end, depth + 1, execute, left)) return false;
    if (op == 4) {
      if (execute && left.type != 1) return fail();
      out = {!left.number, 1};
      return true;
    }
    const bool logical = op >= 11;
    if (execute && logical && left.type != 1) return fail();
    const bool skip = logical && ((op == 11 && !left.number) || (op == 12 && left.number));
    if (!expr(p, end, depth + 1, execute && !skip, right)) return false;
    if (!execute) return true;
    out.type = 1;
    if (logical) {
      if (!skip && right.type != 1) return fail();
      out.number = skip ? left.number : right.number;
    } else if (op == 5 || op == 6) {
      out.number = left.type == right.type && left.number == right.number;
      if (op == 6) out.number = !out.number;
    } else {
      if (left.type != 2 || right.type != 2) return fail();
      out.number = op == 7 ? left.number < right.number : op == 8 ? left.number <= right.number :
          op == 9 ? left.number > right.number : left.number >= right.number;
    }
    return true;
  }

  bool range(uint16_t p, uint16_t end, uint8_t depth, bool requireEnd, bool execute) {
    if (depth > 8 || p > end) return fail();
    while (p < end) {
      if (execute && (failed_ || !host_.service())) return fail();
      const uint8_t op = data_[p++];
      if (op == 0) return requireEnd && p == end;
      if (op == 1) {
        if (!fits(p, 1, end) || data_[p] > 1) return fail();
        if (execute) host_.led(data_[p] != 0);
        ++p;
        if (version_ == 2 && !pause(180, execute)) return false;
      } else if (op == 2) {
        if (!fits(p, 2, end) || word(p) > 5000) return fail();
        const uint16_t ms = word(p); p += 2;
        if (!pause(ms, execute)) return false;
      } else if (op == 0x10 || op == 0x11) {
        uint8_t count = 1;
        if (op == 0x10) {
          if (!fits(p, 1, end)) return fail();
          count = data_[p++];
          if (!count || count > 20) return fail();
        }
        if (!fits(p, 2, end)) return fail();
        const uint16_t len = word(p); p += 2;
        if (!fits(p, len, end) || (op == 0x11 && !len)) return fail();
        if (version_ == 2 && !pause(180, execute)) return false;
        do {
          if (!range(p, p + len, depth + 1, false, execute)) return false;
          if (op == 0x11 && version_ == 2 && !pause(50, execute)) return false;
        } while (execute && (op == 0x11 || --count));
        p += len;
      } else {
        if (version_ != 2) return fail();
        if (op == 0x20) {
          if (!fits(p, 1, end) || data_[p] >= 16) return fail();
          const uint8_t id = data_[p++];
          Value value;
          if (!expr(p, end, 0, execute, value)) return false;
          if (execute) vars_[id] = value;
        } else if (op >= 0x21 && op <= 0x23) {
          Value condition = {0, 1};
          if (op == 0x21) {
            if (!expr(p, end, 0, execute, condition)) return false;
            if (execute && condition.type != 1) return fail();
          } else if (execute) condition.number = host_.button(op == 0x23);
          if (!fits(p, 4, end)) return fail();
          const uint16_t yes = word(p), no = word(p + 2); p += 4;
          if (!fits(p, yes, end) || !fits(p + yes, no, end) || (op == 0x23 && no)) return fail();
          if (op == 0x22 && !pause(180, execute)) return false;
          if (!range(p, p + yes, depth + 1, false, execute && condition.number)) return false;
          p += yes;
          if (!range(p, p + no, depth + 1, false, execute && !condition.number)) return false;
          p += no;
        } else if (op == 0x30) {
          if (!fits(p, 5, end) || data_[p] > 8 || data_[p + 4] < 1 || data_[p + 4] > 100) return fail();
          if (execute) host_.neo(data_[p], data_[p+1], data_[p+2], data_[p+3], data_[p+4]);
          p += 5;
          if (!pause(180, execute)) return false;
        } else if (op == 0x32) {
          if (execute) host_.neo(0, 0, 0, 0, 100);
          if (!pause(180, execute)) return false;
        } else return fail();
      }
    }
    return !requireEnd;
  }
};
} // namespace uiap
