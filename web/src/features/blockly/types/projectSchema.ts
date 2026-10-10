// The workspace version is independent of the board's bytecode version.
export const CURRENT_PROJECT_VERSION = 5;
const supportedVersions = [1, 2, 3, 4, CURRENT_PROJECT_VERSION] as const;
export type ProjectVersion = (typeof supportedVersions)[number];
export type ProjectExtensions = { tactSwitch?: boolean; neoPixel?: boolean };

export function isSupportedProjectVersion(value: unknown): value is ProjectVersion {
  return supportedVersions.some((version) => version === value);
}
