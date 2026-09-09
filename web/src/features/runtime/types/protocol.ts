export type RuntimeResponse = {
  command: number;
  sequence: number;
  status: "ok" | "unsupported-command" | "invalid-payload" | "device-error";
};
