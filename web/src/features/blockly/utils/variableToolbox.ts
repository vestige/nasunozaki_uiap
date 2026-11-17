import * as Blockly from "blockly/core";
import type { VariableCreateAnchor } from "../components/VariableCreatePopover";

export const UIAP_VARIABLE_CATEGORY = "UIAP_VARIABLES";
export const CREATE_UIAP_VARIABLE = "CREATE_UIAP_VARIABLE";

export function createUiapVariableFlyout(
  workspace: Blockly.WorkspaceSvg,
): Blockly.utils.toolbox.FlyoutItemInfo[] {
  const createButton: Blockly.utils.toolbox.ButtonInfo = {
    kind: "button",
    text: "数値の変数を作る",
    callbackkey: CREATE_UIAP_VARIABLE,
  };
  const variables = workspace
    .getVariableMap()
    .getAllVariables()
    .slice()
    .sort((left, right) => left.getName().localeCompare(right.getName(), "ja"));
  if (variables.length === 0) return [createButton];

  const variableField = (id: string) => ({ VAR: { id } });
  const firstVariable = variables[0];
  return [
    createButton,
    { kind: "sep", gap: 16 },
    {
      kind: "block",
      type: "uiap_variable_set",
      fields: variableField(firstVariable.getId()),
      inputs: {
        VALUE: {
          shadow: { type: "uiap_number", fields: { VALUE: 0 } },
        },
      },
    },
    ...variables.map((variable) => ({
      kind: "block" as const,
      type: "uiap_variable_get",
      fields: variableField(variable.getId()),
    })),
    { kind: "sep", gap: 16 },
    {
      kind: "block",
      type: "uiap_arithmetic",
      inputs: {
        LEFT: { shadow: { type: "uiap_number", fields: { VALUE: 0 } } },
        RIGHT: { shadow: { type: "uiap_number", fields: { VALUE: 1 } } },
      },
    },
  ];
}

export function registerUiapVariableToolbox(
  workspace: Blockly.WorkspaceSvg,
  onCreateVariable: (anchor: VariableCreateAnchor) => void,
) {
  workspace.registerButtonCallback(CREATE_UIAP_VARIABLE, (button) => {
    const bounds = button.getSvgRoot().getBoundingClientRect();
    onCreateVariable({ left: bounds.right + 10, top: bounds.top });
  });
  workspace.registerToolboxCategoryCallback(
    UIAP_VARIABLE_CATEGORY,
    createUiapVariableFlyout,
  );
}
