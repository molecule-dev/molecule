/**
 * A conformance case gets its own timeout, not the package's `testTimeout`: the first case in a
 * file pays the framework's warm-up, and Angular's took over the packages' 10 s on a loaded
 * machine, failing a case whose DOM matched.
 */
import { vi } from 'vitest'

import { runCaseSuite } from '../ui/run.js'
import type { FrameworkAdapter } from '../ui/spec.js'

// Stands in for the package's own default: a case slower than this must still pass.
vi.setConfig({ testTimeout: 100 })

const slowAdapter: FrameworkAdapter = {
  name: 'slow',
  exportNames: ['Probe'],
  has: (component) => component === 'Probe',
  run: () =>
    new Promise((resolve) =>
      setTimeout(() => resolve({ snapshots: ['<div></div>'], calls: [] }), 300),
    ),
}

runCaseSuite(
  {
    title: 'a slow first case',
    reference: '@molecule/app-probe-react',
    exports: ['Probe'],
    families: [{ component: 'Probe', cases: [{ name: 'mounts after a slow warm-up' }] }],
    goldens: {
      Probe: { 'mounts after a slow warm-up': { snapshots: ['<div></div>'], calls: [] } },
    },
    readable: null,
    narrowed: false,
  },
  slowAdapter,
  {},
)
