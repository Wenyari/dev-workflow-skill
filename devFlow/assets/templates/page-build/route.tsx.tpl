import { createFileRoute } from '@tanstack/react-router'

import { {{pageComponentName}}Shell } from './components/{{pageComponentName}}Shell'

export const Route = createFileRoute('{{routePath}}')({
  component: {{pageComponentName}}
})

function {{pageComponentName}}() {
  return <{{pageComponentName}}Shell />
}
