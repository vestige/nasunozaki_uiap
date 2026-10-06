#include "../../firmware/workshop-runtime/standalone_vm.h"
#include "../../firmware/workshop-runtime/standalone_button.h"
#include <cassert>
#include <iostream>
#include <vector>
#include <string>
static unsigned ticks = 0, calls = 0;
static uiap::StandaloneButton buttonState;
static bool service() { return ++ticks < 500; }
static bool waitMs(uint16_t ms) { return ms != 500 && service(); }
static bool button(bool consume) {
  ++calls;
  const bool pressed = calls <= 5 || (calls >= 11 && calls <= 15);
  const bool stable = buttonState.update(pressed, calls * 50);
  return consume ? buttonState.consume() : stable;
}
static void led(bool on) { std::cout << "L " << on << '\n'; }
static void neo(uint8_t i, uint8_t r, uint8_t g, uint8_t b, uint8_t brightness) {
  std::cout << "N " << unsigned(i) << ' ' << unsigned(r) << ' ' << unsigned(g)
    << ' ' << unsigned(b) << ' ' << unsigned(brightness) << '\n';
}
int main(int argc, char** argv) {
  if (argc > 1 && std::string(argv[1]) == "reset") {
    uiap::StandaloneVm vm;
    const uiap::VmHost host = {service, waitMs, button, led, neo};
    const uint8_t set[] = {0x20, 0, 1, 1, 0};
    const uint8_t get[] = {0x20, 1, 3, 0, 0};
    assert(vm.run(set, sizeof(set), 2, host));
    assert(!vm.run(get, sizeof(get), 2, host));
    return 0;
  }
  if (argc > 1 && std::string(argv[1]) == "button") {
    uiap::StandaloneButton b;
    assert(!b.update(false, 0));
    assert(!b.update(true, 1));
    assert(!b.update(false, 5));
    assert(!b.update(true, 10));
    assert(!b.update(true, 29));
    assert(b.update(true, 30));
    assert(b.consume());
    assert(b.update(true, 1000));
    assert(!b.consume());
    b.update(false, 1001); b.update(false, 1021);
    b.update(true, 1022); b.update(true, 1042);
    assert(b.consume());
    b.reset(); assert(b.update(true, 0)); assert(b.consume()); assert(!b.consume());
    b.reset(); b.update(false, 0xfffffff0); b.update(true, 0xfffffff5);
    assert(b.update(true, 9)); assert(b.consume());
    return 0;
  }
  std::vector<uint8_t> data;
  unsigned n;
  while (std::cin >> n) data.push_back(static_cast<uint8_t>(n));
  if (data.empty()) return 2;
  uiap::StandaloneVm vm;
  const uint8_t version = data[0];
  std::cout << "VALID " << vm.validate(data.data() + 1, data.size() - 1, version) << '\n';
  if (argc == 1 || std::string(argv[1]) != "validate") {
    const bool ok = vm.run(data.data() + 1, data.size() - 1, version, {service, waitMs, button, led, neo});
    std::cout << "DONE " << ok << '\n';
  }
}
