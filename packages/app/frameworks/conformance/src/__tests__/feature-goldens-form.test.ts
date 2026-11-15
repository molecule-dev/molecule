/**
 * Feature goldens in one file or per component: what a recording writes and what a
 * run reads back, including a recording narrowed to some components.
 *
 * @module
 */

import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { readFeatureGoldensAt, writeFeatureGoldensAt } from '../features/run.js'
import type { FeatureGoldens } from '../features/spec.js'

const result = (text: string) => ({ snapshots: [text], calls: [] })
const goldens = (panel: string, item: string): FeatureGoldens => ({
  exports: ['Panel'],
  values: { VERSION: 1 },
  cases: { Panel: { 'at rest': result(panel) }, MessageItem: { 'one message': result(item) } },
})

let root: string
let file: string
let dir: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'feature-goldens-'))
  file = join(root, 'demo.json')
  dir = join(root, 'demo')
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('feature goldens form', () => {
  it('reads back one file', () => {
    writeFeatureGoldensAt(file, dir, goldens('a', 'b'), { perComponent: false, components: null })
    expect(readdirSync(root)).toEqual(['demo.json'])
    expect(readFeatureGoldensAt(file, dir)).toEqual(goldens('a', 'b'))
  })

  it('reads back a directory per component, with index.json for the rest', () => {
    writeFeatureGoldensAt(file, dir, goldens('a', 'b'), { perComponent: true, components: null })
    expect(readdirSync(dir).sort()).toEqual(['MessageItem.json', 'Panel.json', 'index.json'])
    expect(readFeatureGoldensAt(file, dir)).toEqual(goldens('a', 'b'))
  })

  it('a narrowed recording rewrites only its components and keeps the others and the index', () => {
    writeFeatureGoldensAt(file, dir, goldens('a', 'b'), { perComponent: true, components: null })
    const narrowed: FeatureGoldens = {
      exports: [],
      values: {},
      cases: { MessageItem: { 'one message': result('B') } },
    }
    writeFeatureGoldensAt(file, dir, narrowed, { perComponent: true, components: ['MessageItem'] })
    expect(readFeatureGoldensAt(file, dir)).toEqual(goldens('a', 'B'))
  })

  it('refuses a narrowed recording of a one-file feature, which would drop the other components', () => {
    expect(() =>
      writeFeatureGoldensAt(file, dir, goldens('a', 'b'), {
        perComponent: false,
        components: ['Panel'],
      }),
    ).toThrow('record the whole feature')
  })

  it('a full recording drops the file of a component no family renders any more', () => {
    writeFeatureGoldensAt(file, dir, goldens('a', 'b'), { perComponent: true, components: null })
    const panelOnly: FeatureGoldens = {
      ...goldens('a', 'b'),
      cases: { Panel: { 'at rest': result('a') } },
    }
    writeFeatureGoldensAt(file, dir, panelOnly, { perComponent: true, components: null })
    expect(readdirSync(dir).sort()).toEqual(['Panel.json', 'index.json'])
  })

  it('switching form removes the other one, so a stale copy is never read', () => {
    writeFeatureGoldensAt(file, dir, goldens('a', 'b'), { perComponent: false, components: null })
    writeFeatureGoldensAt(file, dir, goldens('c', 'd'), { perComponent: true, components: null })
    expect(existsSync(file)).toBe(false)
    expect(readFeatureGoldensAt(file, dir)).toEqual(goldens('c', 'd'))
    writeFeatureGoldensAt(file, dir, goldens('e', 'f'), { perComponent: false, components: null })
    expect(existsSync(dir)).toBe(false)
    expect(readFeatureGoldensAt(file, dir)).toEqual(goldens('e', 'f'))
  })

  it('reads nothing before a recording', () => {
    expect(readFeatureGoldensAt(file, dir)).toBeNull()
  })
})
