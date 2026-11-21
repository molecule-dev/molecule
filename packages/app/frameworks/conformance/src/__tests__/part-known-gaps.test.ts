/**
 * A feature's parts (components its cases render that the React package does not export, such
 * as `@molecule/app-ide-react`'s MessageItem) may hold known gaps as an export does: listing a
 * part's failing case failed "lists only components and cases that exist" in every run, so a
 * port could neither list the gap nor stay green.
 */
import { runCaseSuite } from '../ui/run.js'
import type { FrameworkAdapter } from '../ui/spec.js'

const adapter: FrameworkAdapter = {
  name: 'probe',
  exportNames: ['Probe', 'Piece'],
  has: (component) => component === 'Probe' || component === 'Piece',
  // The part renders differently from its golden, so its case fails and is listed.
  run: (component) =>
    Promise.resolve({
      snapshots: [component === 'Piece' ? '<span></span>' : '<div></div>'],
      calls: [],
    }),
}

runCaseSuite(
  {
    title: 'a feature whose part holds a known gap',
    reference: '@molecule/app-probe-react',
    exports: ['Probe'],
    parts: ['Piece'],
    families: [
      { component: 'Probe', cases: [{ name: 'mounts' }] },
      { component: 'Piece', cases: [{ name: 'shows' }] },
    ],
    goldens: {
      Probe: { mounts: { snapshots: ['<div></div>'], calls: [] } },
      Piece: { shows: { snapshots: ['<div></div>'], calls: [] } },
    },
    readable: null,
    narrowed: false,
  },
  adapter,
  { Piece: ['shows'] },
)
