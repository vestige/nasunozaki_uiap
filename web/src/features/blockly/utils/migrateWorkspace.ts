import { CURRENT_PROJECT_VERSION, type ProjectVersion } from "../types/projectSchema";

// Clone saved JSON; never mutate the user's source. Upgrade file/autosave loads.
export function migrateWorkspace(
  value: unknown,
  sourceVersion: ProjectVersion = CURRENT_PROJECT_VERSION,
): unknown {
  const migrated = migrateBlockShapes(value);
  return sourceVersion < 8 ? migrateProgramStructure(migrated) : migrated;
}

function migrateBlockShapes(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(migrateBlockShapes);
  if (!value || typeof value !== "object") return value;
  const result: Record<string, unknown> = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, migrateBlockShapes(child)]),
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

function migrateProgramStructure(value: unknown): unknown {
  if (!isRecord(value) || !isRecord(value.blocks) || !Array.isArray(value.blocks.blocks)) return value;
  const topBlocks = value.blocks.blocks as Array<Record<string, unknown>>;
  if (topBlocks.some((block) => block.type === "uiap_on_start" || block.type === "uiap_main_forever")) return value;

  const selected = topBlocks.map((block, index) => ({ block, index }))
    .sort((left, right) => coordinate(left.block.y) - coordinate(right.block.y) || left.index - right.index)[0];
  const x = selected ? coordinateOr(selected.block.x, 36) : 36;
  const y = selected ? coordinateOr(selected.block.y, 36) : 36;
  let startBlock: Record<string, unknown> | undefined;
  let loopBlock: Record<string, unknown> | undefined;

  if (selected) {
    startBlock = selected.block;
    let current = startBlock;
    let previous: Record<string, unknown> | undefined;
    while (isRecord(current.next) && isRecord(current.next.block)) {
      previous = current;
      current = current.next.block;
    }
    if (current.type === "uiap_forever") {
      loopBlock = inputBlock(current, "DO");
      if (previous) delete previous.next;
      else startBlock = undefined;
    }
    if (startBlock) {
      delete startBlock.x;
      delete startBlock.y;
    }
    if (loopBlock) {
      delete loopBlock.x;
      delete loopBlock.y;
    }
  }

  const wrappers: Record<string, unknown>[] = [
    { type: "uiap_on_start", x, y, ...(startBlock ? { inputs: { DO: { block: startBlock } } } : {}) },
    { type: "uiap_main_forever", x: x + 300, y, ...(loopBlock ? { inputs: { DO: { block: loopBlock } } } : {}) },
  ];
  const remaining = selected
    ? topBlocks.filter((_, index) => index !== selected.index)
    : topBlocks;
  return { ...value, blocks: { ...value.blocks, blocks: [...wrappers, ...remaining] } };
}

function inputBlock(block: Record<string, unknown>, name: string) {
  if (!isRecord(block.inputs) || !isRecord(block.inputs[name]) || !isRecord(block.inputs[name].block)) return undefined;
  return block.inputs[name].block;
}

function coordinate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function coordinateOr(value: unknown, fallback: number) {
  const result = coordinate(value);
  return Number.isFinite(result) ? result : fallback;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
