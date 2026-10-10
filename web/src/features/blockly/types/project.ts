import type { ProjectExtensions, ProjectVersion } from "./projectSchema";

export type BlocklyProjectFile = {
  format: "uiapduino-blockly-project";
  version: ProjectVersion;
  savedAt: string;
  workspace: Record<string, unknown>;
  extensions?: ProjectExtensions;
};
