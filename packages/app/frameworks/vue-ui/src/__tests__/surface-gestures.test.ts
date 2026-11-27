// @vitest-environment jsdom
import { createApp, h, withDirectives } from 'vue'

import { runSurfaceGestureConformance } from '@molecule/app-framework-conformance/ui'

import { vWebDrag } from '../drag.js'

runSurfaceGestureConformance('vue', (container, options) => {
  const app = createApp({
    render: () =>
      withDirectives(
        h('section', { 'data-testid': 'gesture-surface', 'aria-label': 'Editing surface' }, [
          h('button', 'Edit'),
        ]),
        [[vWebDrag, options]],
      ),
  })
  app.mount(container)
  return () => app.unmount()
})
