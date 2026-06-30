import type { {{listParamsName}}, {{listResultName}} } from '{{serviceModulePath}}'

export interface {{pageStateName}} {
  params: {{listParamsName}}
}

export type {{pageListResultName}} = {{listResultName}}

export interface {{pageViewModelName}} {
  // TODO(api): map confirmed response fields to page view model.
}
