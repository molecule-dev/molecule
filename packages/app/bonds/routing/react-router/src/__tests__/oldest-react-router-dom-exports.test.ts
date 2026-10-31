import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

// Everything `react-router/dom` exports in 7.0.0, the oldest release the peer range
// accepts, copied from its `dist/production/dom-export.d.mts`. A name outside this list
// breaks `/dom` consumers on 7.0.0 with TS2724 (`HydratedRouterProps` did).
const REACT_ROUTER_7_0_0_DOM_EXPORTS = new Set([
  'HydratedRouter',
  'RouterProvider',
  'RouterProviderProps',
])

describe('the /dom entry on the oldest supported react-router', () => {
  it('imports only names react-router/dom 7.0.0 exports', () => {
    const source = readFileSync(new URL('../dom.tsx', import.meta.url), 'utf8')
    const imports = [
      ...source.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'react-router\/dom'/g),
    ]

    expect(imports).not.toHaveLength(0)
    const names = imports.flatMap(([, list]) =>
      list
        .split(',')
        .map(
          (part) =>
            part
              .trim()
              .replace(/^type\s+/, '')
              .split(/\s+as\s+/)[0],
        )
        .filter(Boolean),
    )
    expect(names.filter((name) => !REACT_ROUTER_7_0_0_DOM_EXPORTS.has(name))).toEqual([])
  })
})
