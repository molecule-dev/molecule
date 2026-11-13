/**
 * The peer-dependency gate: every external peer is a devDependency, and the
 * version a package is tested with lies inside the range it tells npm it needs.
 */
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { peerDependencyProblems } from '../check-peer-deps.js'

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
    const out = execFileSync('node', [join(ROOT, 'scripts', 'check-peer-deps.js')], {
      cwd: ROOT,
      encoding: 'utf8',
    })
    expect(out).toContain('Peer deps OK')
  })
})
