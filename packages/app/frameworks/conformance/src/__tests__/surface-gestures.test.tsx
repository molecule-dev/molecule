// @vitest-environment jsdom
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { Box, Pressable } from '@molecule/app-ui-react/elements'

import { runSurfaceGestureConformance } from '../ui/surface-gestures.js'

runSurfaceGestureConformance('react', (container, options) => {
  const root = createRoot(container)
  const props = 'onStart' in options ? { drag: options } : options
  flushSync(() =>
    root.render(
      <Box as="section" data-testid="gesture-surface" aria-label="Editing surface" {...props}>
        <Pressable as="button">Edit</Pressable>
      </Box>,
    ),
  )
  return () => root.unmount()
})
