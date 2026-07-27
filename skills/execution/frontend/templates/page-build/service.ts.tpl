import request, { type RequestOptions } from '@/services/request'

export interface {{listParamsName}} {
  // TODO(api): confirm request params.
}

export interface {{listResultName}} {
  // TODO(api): confirm response shape.
}

const {{apiPathsConstName}} = {
  list: 'TODO(api): confirm endpoint path'
} as const

export function {{listFunctionName}}(params: {{listParamsName}}, options?: RequestOptions) {
  return request.post<{{listResultName}}>({{apiPathsConstName}}.list, params, options)
}
