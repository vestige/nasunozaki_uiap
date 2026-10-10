// Clone saved JSON; never mutate the user's source. Upgrade file/autosave loads.
export function migrateWorkspace(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(migrateWorkspace);
  if (!value || typeof value !== "object") return value;
  const result: Record<string, unknown> = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, migrateWorkspace(child)]),
  );
  if (result.type === "uiap_neopixel_set") {
    const fields = { ...(result.fields as Record<string, unknown> | undefined) };
    const pixel = fields.PIXEL ?? 1;
    delete fields.PIXEL;
    result.type = "uiap_neopixel_set_value";
    result.fields = fields;
    result.inputs = { ...(result.inputs as object | undefined),
      PIXEL: { shadow: { type: "uiap_number", fields: { VALUE: pixel } } },
    };
  }
  if (result.type === "uiap_neopixel_fill" || result.type === "uiap_neopixel_set_value") {
    const fields = { ...(result.fields as Record<string, unknown> | undefined) };
    const brightness = fields.BRIGHTNESS ?? 20;
    delete fields.BRIGHTNESS;
    result.type = result.type === "uiap_neopixel_fill" ? "uiap_neopixel_fill_brightness" : "uiap_neopixel_set_brightness";
    result.fields = fields;
    result.inputs = { ...(result.inputs as object | undefined),
      BRIGHTNESS: { shadow: { type: "uiap_number", fields: { VALUE: brightness } } },
    };
  }
  return result;
}
