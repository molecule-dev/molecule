/**
 * One React per app, and an `optimizeDeps.include` that names only what is
 * installed. Run against real directories, not mocks of the resolver.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// The plugins load native binaries and are not under test (as in index.test.ts).
vi.mock('@tailwindcss/vite', () => ({ default: () => ({ name: 'tailwindcss' }) }))
vi.mock('@vitejs/plugin-react', () => ({ default: () => ({ name: 'react' }) }))
vi.mock('vite-plugin-pwa', () => ({ VitePWA: () => ({ name: 'pwa' }) }))

import { isInstalled, singleReactAliases } from '../config.js'

let root: string
const pkg = (dir: string, name: string): void => {
  mkdirSync(join(root, dir, 'node_modules', name), { recursive: true })
  writeFileSync(
    join(root, dir, 'node_modules', name, 'package.json'),
    JSON.stringify({ name, main: 'index.js' }),
  )
  writeFileSync(join(root, dir, 'node_modules', name, 'index.js'), 'module.exports = {}\n')
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'vite-single-'))
  // The workspace's React, one level above the app, and the app's own copy.
  pkg('.', 'react')
  pkg('.', '@scope/esm-only')
  mkdirSync(join(root, 'app'), { recursive: true })
  writeFileSync(join(root, 'app', 'package.json'), '{"name":"app"}')
  pkg('app', 'react-dom')
})
afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('singleReactAliases', () => {
  it('pins react and react-dom to the copies this app resolves', () => {
    expect(singleReactAliases(join(root, 'app'))).toEqual({
      react: join(root, 'node_modules', 'react'),
      'react-dom': join(root, 'app', 'node_modules', 'react-dom'),
    })
  })

  it('pins nothing when React is not installed', () => {
    expect(singleReactAliases(tmpdir())).toEqual({})
  })
})

describe('isInstalled', () => {
  it('finds a package at or above the app, by subpath and by scope', () => {
    expect(isInstalled('react/jsx-runtime', join(root, 'app'))).toBe(true)
    expect(isInstalled('react-dom/client', join(root, 'app'))).toBe(true)
    expect(isInstalled('@scope/esm-only/sub', join(root, 'app'))).toBe(true)
  })

  it('reports a package that is not installed', () => {
    expect(isInstalled('void-elements', join(root, 'app'))).toBe(false)
  })
})
