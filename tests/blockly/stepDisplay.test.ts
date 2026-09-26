import { describe, expect, it, vi } from "vitest";
import { createStepDisplayObserver } from "../../web/src/features/blockly/utils/stepDisplay";

describe("createStepDisplayObserver", () => {
  it("通常実行では実行中ブロックを通知しない", () => {
    const onInstruction = vi.fn();

    const observer = createStepDisplayObserver(false, onInstruction);

    expect(observer).toBeUndefined();
    expect(onInstruction).not.toHaveBeenCalled();
  });

  it("ステップ表示では実行中ブロックを通知する", () => {
    const onInstruction = vi.fn();
    const observer = createStepDisplayObserver(true, onInstruction);

    observer?.onInstruction?.("forever-block");

    expect(onInstruction).toHaveBeenCalledOnce();
    expect(onInstruction).toHaveBeenCalledWith("forever-block");
  });
});
