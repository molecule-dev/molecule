// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte'

import { runSurfaceGestureConformance } from '@molecule/app-framework-conformance/ui'

import SurfaceGestureHost from './SurfaceGestureHost.svelte'

runSurfaceGestureConformance('svelte', (container, options) => {
  const app = mount(SurfaceGestureHost, { target: container, props: { options } })
  flushSync()
  return () => {
    void unmount(app)
  }
})
