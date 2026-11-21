/**
 * Feature goldens in one file, per component, or per group of a component's cases: what a
 * recording writes and what a run reads back, including a recording narrowed to some
 * components.
 *
 * @module
 */

import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  featureGoldensGroups,
  readFeatureGoldensAt,
  writeFeatureGoldensAt,
} from '../features/run.js'
import type { FeatureCases, FeatureGoldens } from '../features/spec.js'
import { withoutGoldensGroups } from '../ui/run.js'

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

/** Panel's cases in two groups, the way a component with many cases names them. */
const grouped = (send: string, undo: string): FeatureGoldens => ({
  ...goldens('a', 'b'),
  cases: {
    Panel: { 'send: one': result(send), 'undo: one': result(undo), 'undo: two': result(undo) },
    MessageItem: { 'one message': result('b') },
  },
})
const groups = { Panel: { 'send: one': '03-send', 'undo: one': '24-undo', 'undo: two': '24-undo' } }

describe('feature goldens stored per group', () => {
  it('writes a grouped component as one file per group and reads it back whole', () => {
    writeFeatureGoldensAt(file, dir, grouped('s', 'u'), {
      perComponent: true,
      components: null,
      groups,
    })
    expect(readdirSync(dir).sort()).toEqual(['MessageItem.json', 'Panel', 'index.json'])
    expect(readdirSync(join(dir, 'Panel')).sort()).toEqual(['03-send.json', '24-undo.json'])
    expect(readFeatureGoldensAt(file, dir)).toEqual(grouped('s', 'u'))
  })

  it('a group no case names any more leaves no file behind', () => {
    writeFeatureGoldensAt(file, dir, grouped('s', 'u'), {
      perComponent: true,
      components: null,
      groups,
    })
    const sendOnly: FeatureGoldens = {
      ...grouped('s', 'u'),
      cases: { ...grouped('s', 'u').cases, Panel: { 'send: one': result('s') } },
    }
    writeFeatureGoldensAt(file, dir, sendOnly, { perComponent: true, components: null, groups })
    expect(readdirSync(join(dir, 'Panel'))).toEqual(['03-send.json'])
    expect(readFeatureGoldensAt(file, dir)).toEqual(sendOnly)
  })

  it('a component that starts or stops naming groups leaves no copy of the other form', () => {
    writeFeatureGoldensAt(file, dir, grouped('s', 'u'), { perComponent: true, components: null })
    expect(existsSync(join(dir, 'Panel.json'))).toBe(true)
    writeFeatureGoldensAt(file, dir, grouped('S', 'U'), {
      perComponent: true,
      components: null,
      groups,
    })
    expect(existsSync(join(dir, 'Panel.json'))).toBe(false)
    expect(readFeatureGoldensAt(file, dir)).toEqual(grouped('S', 'U'))
    writeFeatureGoldensAt(file, dir, grouped('x', 'y'), { perComponent: true, components: null })
    expect(existsSync(join(dir, 'Panel'))).toBe(false)
    expect(readFeatureGoldensAt(file, dir)).toEqual(grouped('x', 'y'))
  })

  it('a full recording drops the directory of a component no family renders any more', () => {
    writeFeatureGoldensAt(file, dir, grouped('s', 'u'), {
      perComponent: true,
      components: null,
      groups,
    })
    const itemOnly: FeatureGoldens = {
      ...goldens('a', 'b'),
      cases: { MessageItem: { 'one message': result('b') } },
    }
    writeFeatureGoldensAt(file, dir, itemOnly, { perComponent: true, components: null, groups })
    expect(readdirSync(dir).sort()).toEqual(['MessageItem.json', 'index.json'])
  })

  it('refuses a recorded case of a grouped component that has no group', () => {
    expect(() =>
      writeFeatureGoldensAt(file, dir, grouped('s', 'u'), {
        perComponent: true,
        components: null,
        groups: { Panel: { 'send: one': '03-send' } },
      }),
    ).toThrow('its recorded case "undo: one" has none')
  })
})

describe('featureGoldensGroups', () => {
  const feature = (
    cases: FeatureCases['families'][number]['cases'],
    perComponent = true,
  ): FeatureCases => ({
    package: '@molecule/app-demo-react',
    goldensPerComponent: perComponent,
    families: [
      { component: 'Panel', cases },
      { component: 'MessageItem', cases: [{ name: 'one message' }] },
    ],
  })

  it('maps each case of a grouped component to its group, and leaves ungrouped components out', () => {
    const cases = [
      { name: 'send: one', goldensGroup: '03-send' },
      { name: 'undo: one', goldensGroup: '24-undo' },
    ]
    expect(featureGoldensGroups(feature(cases))).toEqual({
      Panel: { 'send: one': '03-send', 'undo: one': '24-undo' },
    })
  })

  it('refuses a component where only some cases name a group', () => {
    const cases = [{ name: 'send: one', goldensGroup: '03-send' }, { name: 'undo: one' }]
    expect(() => featureGoldensGroups(feature(cases))).toThrow('"undo: one" names no goldensGroup')
  })

  it('refuses groups on a feature stored in one file', () => {
    const cases = [{ name: 'send: one', goldensGroup: '03-send' }]
    expect(() => featureGoldensGroups(feature(cases, false))).toThrow('need goldensPerComponent')
  })

  it('refuses a group that is not a file name', () => {
    const cases = [{ name: 'send: one', goldensGroup: '../send' }]
    expect(() => featureGoldensGroups(feature(cases))).toThrow(
      'must be letters, digits, - and _ only',
    )
  })
})

describe('the UI kit', () => {
  it('refuses a case that names a goldens group: its goldens are one file', () => {
    expect(() =>
      withoutGoldensGroups({
        component: 'Button',
        cases: [{ name: 'at rest', goldensGroup: 'a' }],
      }),
    ).toThrow('goldensGroup is for feature components stored per component')
    const family = { component: 'Button', cases: [{ name: 'at rest' }] }
    expect(withoutGoldensGroups(family)).toBe(family)
  })
})
