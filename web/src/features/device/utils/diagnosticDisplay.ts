export const errorText = (error: unknown) =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);
export const hex32 = (value: number) =>
  `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;
