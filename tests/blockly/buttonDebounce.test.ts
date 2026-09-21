import { describe, expect, it } from "vitest";
import { BUTTON_DEBOUNCE_MS, DebouncedButton } from "../../web/src/features/blockly/utils/buttonDebounce";

describe("tact switch debounce", () => {
  it("境界時間まで状態を確定しない", () => {
    const button = new DebouncedButton();
    expect(button.update(false, 0)).toBe(false);
    expect(button.update(true, 1)).toBe(false);
    expect(button.update(true, BUTTON_DEBOUNCE_MS)).toBe(false);
    expect(button.update(true, BUTTON_DEBOUNCE_MS + 1)).toBe(true);
  });

  it("チャタリングを無視して1回だけ押下イベントを返す", () => {
    const button = new DebouncedButton();
    button.update(false, 0);
    button.update(true, 1);
    button.update(false, 5);
    button.update(true, 10);
    button.update(true, 30);
    expect(button.consumePress()).toBe(true);
    expect(button.consumePress()).toBe(false);
    button.update(true, 80);
    expect(button.consumePress()).toBe(false);
  });

  it("解放を確定した後の再押下を新しい1回として扱う", () => {
    const button = new DebouncedButton();
    button.update(true, 0);
    expect(button.consumePress()).toBe(true);
    button.update(false, 10);
    button.update(false, 30);
    button.update(true, 40);
    button.update(true, 60);
    expect(button.consumePress()).toBe(true);
  });
});
