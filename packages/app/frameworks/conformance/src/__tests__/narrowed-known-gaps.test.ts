/**
 * A run narrowed with `CONFORMANCE_COMPONENTS` loads only the families it names, so the
 * known-gaps check must leave the other components' gaps to the full run: a narrowed run of
 * ide-vue's `ContextUsageIndicator` failed "lists only components and cases that exist" on
 * every ChatPanel gap.
 */
import { runCaseSuite } from '../ui/run.js'
import type { FrameworkAdapter } from '../ui/spec.js'

const adapter: FrameworkAdapter = {
  name: 'probe',
  exportNames: ['Probe', 'Other'],
  has: (component) => component === 'Probe' || component === 'Other',
  run: () => Promise.resolve({ snapshots: ['<div></div>'], calls: [] }),
}

runCaseSuite(
  {
    title: 'a run narrowed to one component',
    reference: '@molecule/app-probe-react',
    exports: ['Probe', 'Other'],
    families: [{ component: 'Probe', cases: [{ name: 'mounts' }] }],
    goldens: { Probe: { mounts: { snapshots: ['<div></div>'], calls: [] } } },
    readable: null,
    narrowed: true,
  },
  adapter,
  { Other: ['a case only the full run loads'] },
)
