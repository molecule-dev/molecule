/**
 * The peer-dependency gate: every external peer is a devDependency, and the
 * version a package is tested with lies inside the range it tells npm it needs.
 */
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { dependencyPeerProblems, peerDependencyProblems } from '../check-peer-deps.js'

const ROOT = join(import.meta.dirname, '..', '..')

describe('peerDependencyProblems', () => {
  it('refuses a peer range that excludes the tested devDependency version', () => {
    // The shape @molecule/app-angular shipped: an exact peer below the tested version.
    const problems = peerDependencyProblems(
      {
        name: '@molecule/app-x',
        peerDependencies: { '@angular/core': '22.0.0', 'vue-router': '^4.3.0' },
        devDependencies: { '@angular/core': '22.2.3', 'vue-router': '5.4.0' },
      },
      'packages/app/x',
    )
    expect(problems).toHaveLength(2)
    expect(problems[0]).toContain('tested with @angular/core@22.2.3')
    expect(problems[0]).toContain('"22.0.0" excludes that version')
    expect(problems[1]).toContain('tested with vue-router@5.4.0')
    expect(problems[1]).toContain('"^4.3.0 || ^5.0.0"')
  })

  it('accepts a range that includes the tested version', () => {
    expect(
      peerDependencyProblems(
        {
          name: '@molecule/app-x',
          peerDependencies: { '@angular/core': '^22.0.0', 'vue-router': '^4.3.0 || ^5.0.0' },
          devDependencies: { '@angular/core': '22.2.3', 'vue-router': '5.4.0' },
        },
        'packages/app/x',
      ),
    ).toEqual([])
  })

  it('still requires every external peer as a devDependency, and skips @molecule peers', () => {
    const problems = peerDependencyProblems(
      {
        name: '@molecule/app-x',
        peerDependencies: { pg: '^8.0.0', '@molecule/app-ui': '^1.0.1', 'react-native': '*' },
        devDependencies: {},
      },
      'packages/app/x',
    )
    expect(problems).toEqual([
      '@molecule/app-x has peerDependency "pg" but it\'s missing from devDependencies.\n' +
        '  Add it: npm install pg --save-dev --workspace=packages/app/x',
    ])
  })

  it('passes on the tree', () => {
    // The tree check also runs dependencyPeerProblems (below) over every manifest.
    const out = execFileSync('node', [join(ROOT, 'scripts', 'check-peer-deps.js')], {
      cwd: ROOT,
      encoding: 'utf8',
    })
    expect(out).toContain('Peer deps OK')
  })
})

describe('dependencyPeerProblems', () => {
  const overlay = {
    name: '@molecule/app-overlay-dom',
    peerDependencies: { '@molecule/app-ui': '^1.9.0', 'focus-trap': '^7.0.0' },
    peerDependenciesMeta: { 'focus-trap': { optional: true } },
  }
  const manifests = new Map([[overlay.name, overlay]])

  it('refuses a peer below the floor a dependency requires of the same peer', () => {
    // The shape the Svelte UI kit had: ^1.5.0 over a dependency that needs ^1.9.0.
    expect(
      dependencyPeerProblems(
        {
          name: '@molecule/app-ui-svelte',
          dependencies: { '@molecule/app-overlay-dom': '1.0.0' },
          peerDependencies: { '@molecule/app-ui': '^1.5.0' },
        },
        'packages/app/frameworks/svelte-ui',
        manifests,
      ),
    ).toEqual([
      '@molecule/app-ui-svelte peers on @molecule/app-ui "^1.5.0", but its dependency @molecule/app-overlay-dom requires "^1.9.0".\n' +
        '  Raise the peer in packages/app/frameworks/svelte-ui/package.json to "^1.9.0" (and say so in its changeset).',
    ])
  })

  it('accepts a peer at or above the dependency floor, and skips optional and undeclared peers', () => {
    for (const range of ['^1.9.0', '^1.10.0']) {
      expect(
        dependencyPeerProblems(
          {
            name: '@molecule/app-ui-svelte',
            dependencies: { '@molecule/app-overlay-dom': '1.0.0', lodash: '4.17.21' },
            peerDependencies: { '@molecule/app-ui': range, 'focus-trap': '^6.0.0' },
          },
          'packages/app/frameworks/svelte-ui',
          manifests,
        ),
      ).toEqual([])
    }
    expect(
      dependencyPeerProblems(
        { name: '@molecule/app-x', dependencies: { '@molecule/app-overlay-dom': '1.0.0' } },
        'packages/app/x',
        manifests,
      ),
    ).toEqual([])
  })
})
