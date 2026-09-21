export const BUTTON_DEBOUNCE_MS = 20;

export class DebouncedButton {
  private initialized = false;
  private stable = false;
  private candidate = false;
  private candidateSince = 0;
  private pressPending = false;

  update(rawPressed: boolean, now: number) {
    if (!this.initialized) {
      this.initialized = true;
      this.stable = rawPressed;
      this.candidate = rawPressed;
      this.candidateSince = now;
      this.pressPending = rawPressed;
      return this.stable;
    }
    if (rawPressed === this.stable) {
      this.candidate = this.stable;
      this.candidateSince = now;
      return this.stable;
    }
    if (rawPressed !== this.candidate) {
      this.candidate = rawPressed;
      this.candidateSince = now;
      return this.stable;
    }
    if (now - this.candidateSince >= BUTTON_DEBOUNCE_MS) {
      this.stable = this.candidate;
      if (this.stable) this.pressPending = true;
    }
    return this.stable;
  }

  consumePress() {
    const pressed = this.pressPending;
    this.pressPending = false;
    return pressed;
  }
}
