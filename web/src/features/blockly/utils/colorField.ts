import * as Blockly from "blockly/core";
import { colorPresets, colorToHsv, hsvToColor, normalizeColor } from "./colorPicker";

export class ColorBarField extends Blockly.Field<string> {
  constructor(value = "#ff0000") {
    super(value);
    this.EDITABLE = true;
    this.SERIALIZABLE = true;
  }
  static fromJson(options: Blockly.FieldConfig & { color?: string }) {
    return new ColorBarField(typeof options.color === "string" ? options.color : "#ff0000");
  }
  protected doClassValidation_(value: unknown) { return normalizeColor(value); }
  dispose() {
    Blockly.DropDownDiv.hideIfOwner(this as unknown as Blockly.Field<unknown>);
    super.dispose();
  }
  protected getText_() {
    const color = this.getValue();
    return `${colorPresets.find(([, hex]) => hex === color)?.[0] ?? color} ▾`;
  }
  protected showEditor_() {
    Blockly.DropDownDiv.hideWithoutAnimation();
    Blockly.DropDownDiv.clearContent();
    const panel = document.createElement("div");
    panel.className = "uiap-color-picker";
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", "NeoPixelの色をえらぶ");
    const preview = document.createElement("div");
    preview.className = "uiap-color-preview";
    const swatch = document.createElement("span");
    swatch.className = "uiap-color-swatch";
    const caption = document.createElement("span");
    preview.append(swatch, caption);
    panel.append(preview);
    const presets = document.createElement("div");
    presets.className = "uiap-color-presets";
    panel.append(presets);
    let state = colorToHsv(this.getValue() ?? "#ff0000");
    const createRange = (text: string, max: number, className: string) => {
      const label = document.createElement("label");
      label.textContent = text;
      const input = document.createElement("input");
      input.type = "range"; input.min = "0"; input.max = String(max); input.step = "1";
      input.setAttribute("aria-label", text); input.className = className;
      label.append(input); panel.append(label);
      return input;
    };
    const hue = createRange("色をえらぶ", 360, "uiap-color-hue");
    const saturation = createRange("あざやかさ", 100, "uiap-color-saturation");
    const update = (color: string) => {
      this.setValue(color);
      state = colorToHsv(color);
      hue.value = String(Math.round(state.hue));
      saturation.value = String(Math.round(state.saturation));
      swatch.style.backgroundColor = color;
      caption.textContent = colorPresets.find(([, hex]) => hex === color)?.[0] ?? color;
      saturation.style.background = `linear-gradient(to right, white, ${hsvToColor(state.hue, 100)})`;
      for (const button of Array.from(presets.querySelectorAll("button"))) button.setAttribute("aria-pressed", String(button.dataset.color === color));
    };
    for (const [name, color] of colorPresets) {
      const button = document.createElement("button");
      button.type = "button"; button.title = name; button.setAttribute("aria-label", name);
      button.dataset.color = color; button.style.backgroundColor = color;
      button.addEventListener("click", () => update(color)); presets.append(button);
    }
    hue.addEventListener("input", () => update(hsvToColor(Number(hue.value), state.saturation || 100, state.value || 1)));
    saturation.addEventListener("input", () => update(hsvToColor(state.hue, Number(saturation.value), state.value || 1)));
    const done = document.createElement("button");
    done.type = "button"; done.className = "uiap-color-done"; done.textContent = "できた";
    // hideIfOwner only uses field identity, but its declaration is non-generic.
    const owner = this as unknown as Blockly.Field<unknown>;
    done.addEventListener("click", () => Blockly.DropDownDiv.hideIfOwner(owner)); panel.append(done);
    panel.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.stopPropagation(); Blockly.DropDownDiv.hideIfOwner(owner); }
    });
    update(this.getValue() ?? "#ff0000");
    Blockly.DropDownDiv.getContentDiv().append(panel);
    Blockly.DropDownDiv.setColour("#ffffff", "#193247");
    Blockly.DropDownDiv.showPositionedByField<string>(this);
    hue.focus();
  }
}

export function registerColorBarField() {
  Blockly.fieldRegistry.register("field_uiap_color", ColorBarField);
}
