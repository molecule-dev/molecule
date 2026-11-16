import { RestrictToHorizontalAxis, RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers'
import type { DragEndEvent } from '@dnd-kit/dom'
import { Accessibility, DragDropManager, KeyboardSensor, PointerSensor } from '@dnd-kit/dom'
import { Sortable } from '@dnd-kit/dom/sortable'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  DND_KIT_WAIT,
  installDndKitDom,
  pickUpWithKey,
  releaseWithKey,
  waitForDndKitAnnouncement,
  waitForSortableRows,
} from '@molecule/app-framework-conformance/drag-drop'
import { addTranslations, getLocale, setLocale } from '@molecule/app-i18n'

import {
  coreDragOver,
  coreDragStart,
  resolveSortableAxis,
  sortableListDrop,
  sortableListModifiers,
  sortableListPlugins,
  sortableListSensors,
} from '../sortable-list.js'
import { sortableListInstructions, SortableListLocale } from '../sortable-list-locale.js'

interface Item {
  id: string
  name: string
}

const items: Item[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
]

let manager: DragDropManager | undefined

/**
 * Mounts the three items as dnd-kit sortables in one list, with the shared
 * plugins, and records each drag-end event.
 *
 * @returns The manager, the sortables and the recorded drag ends.
 */
async function mountList(): Promise<{
  sortables: Sortable[]
  ends: DragEndEvent[]
  rows: HTMLElement[]
}> {
  const list = document.createElement('ul')
  document.body.append(list)
  manager = new DragDropManager({
    sensors: sortableListSensors(),
    plugins: sortableListPlugins({
      labelOf: (id) => items.find((item) => item.id === id)?.name ?? id,
      count: () => items.length,
    }),
  })
  const ends: DragEndEvent[] = []
  manager.monitor.addEventListener('dragend', (event) => ends.push(event))
  const rows = items.map((item) => {
    const row = document.createElement('li')
    row.textContent = item.name
    list.append(row)
    return row
  })
  const sortables = items.map(
    (item, index) => new Sortable({ id: item.id, index, element: rows[index] }, manager),
  )
  await waitForSortableRows(rows)
  return { sortables, ends, rows }
}

beforeAll(installDndKitDom)
afterEach(() => {
  manager?.destroy()
  manager = undefined
  document.body.innerHTML = ''
})

describe('sortableListSensors', () => {
  it('is a pointer sensor and a keyboard sensor', () => {
    const sensors = sortableListSensors()
    expect(sensors).toHaveLength(2)
    expect(sensors.map((sensor) => ('plugin' in sensor ? sensor.plugin : sensor))).toEqual([
      PointerSensor,
      KeyboardSensor,
    ])
  })

  it('cancels on Escape unless cancelOnEscape is false', () => {
    const codes = (config: Parameters<typeof sortableListSensors>[0]): unknown =>
      sortableListSensors(config)
        .map((sensor) => ('options' in sensor ? sensor.options : undefined))
        .find((options) => options && 'keyboardCodes' in options)
    expect(codes({})).toMatchObject({ keyboardCodes: { cancel: ['Escape'] } })
    expect(codes({ cancelOnEscape: false })).toMatchObject({ keyboardCodes: { cancel: [] } })
  })

  it('starts a pointer drag after the delay, else after the distance, else at once', () => {
    const constraints = (config: Parameters<typeof sortableListSensors>[0]): unknown => {
      const pointer = sortableListSensors(config)[0]
      return 'options' in pointer ? pointer.options : undefined
    }
    expect(constraints({})).toEqual({ activationConstraints: undefined })
    expect(constraints({ activationDistance: 8 })).toMatchObject({
      activationConstraints: [{ options: { value: 8 } }],
    })
    expect(constraints({ activationDelay: 200, activationDistance: 8 })).toMatchObject({
      activationConstraints: [{ options: { value: 200, tolerance: 8 } }],
    })
  })
})

describe('resolveSortableAxis and sortableListModifiers', () => {
  it('takes the axis, else the strategy, else vertical', () => {
    expect(resolveSortableAxis('horizontal', 'vertical')).toBe('horizontal')
    expect(resolveSortableAxis(undefined, 'grid')).toBe('both')
    expect(resolveSortableAxis(undefined, 'horizontal')).toBe('horizontal')
    expect(resolveSortableAxis()).toBe('vertical')
  })

  it('holds a drag to the axis', () => {
    expect(sortableListModifiers('vertical')).toEqual([RestrictToVerticalAxis])
    expect(sortableListModifiers('horizontal')).toEqual([RestrictToHorizontalAxis])
    expect(sortableListModifiers('both')).toEqual([])
  })
})

describe('sortableListPlugins', () => {
  it('replaces the accessibility plugin of the defaults and adds the locale plugin', () => {
    const plugins = sortableListPlugins({ labelOf: (id) => id, count: () => 0 })
    if (typeof plugins !== 'function') throw new Error('expected a function of the defaults')
    const defaults = [Accessibility, PointerSensor]
    const resolved = plugins(defaults)
    expect(resolved).toHaveLength(3)
    expect(resolved[0]).toMatchObject({ plugin: Accessibility })
    expect(resolved[1]).toBe(PointerSensor)
    expect(resolved[2]).toMatchObject({ plugin: SortableListLocale })
  })

  it('gives each row the translated role description and follows a locale change', async () => {
    const { rows } = await mountList()
    const instructions = (): string | null | undefined =>
      document.getElementById(rows[0].getAttribute('aria-describedby') ?? '')?.textContent
    expect(rows.map((row) => row.getAttribute('aria-roledescription'))).toEqual([
      'sortable',
      'sortable',
      'sortable',
    ])
    expect(instructions()).toBe(sortableListInstructions())
    const start = getLocale()
    addTranslations('x-dnd-test', {
      'dragDrop.sortable.instructions': 'XX instructions',
      'dragDrop.sortable.roleDescription': 'XX sortable',
    })
    try {
      await setLocale('x-dnd-test')
      await vi.waitFor(() => {
        expect(rows.map((row) => row.getAttribute('aria-roledescription'))).toEqual([
          'XX sortable',
          'XX sortable',
          'XX sortable',
        ])
        expect(instructions()).toBe('XX instructions')
      }, DND_KIT_WAIT)
    } finally {
      await setLocale(start)
    }
    expect(rows[2].getAttribute('aria-roledescription')).toBe('sortable')
    expect(instructions()).toBe(sortableListInstructions())
  })

  it('stops following the locale once the list is destroyed', async () => {
    const { rows } = await mountList()
    const start = getLocale()
    manager?.destroy()
    manager = undefined
    addTranslations('x-dnd-test', { 'dragDrop.sortable.roleDescription': 'XX sortable' })
    try {
      await setLocale('x-dnd-test')
      expect(rows[0].getAttribute('aria-roledescription')).toBe('sortable')
    } finally {
      await setLocale(start)
    }
  })

  it('announces a keyboard pick-up and a cancel by label and position', async () => {
    const { rows } = await mountList()
    await pickUpWithKey(rows[1])
    await waitForDndKitAnnouncement('Picked up Beta, position 2 of 3.')
    await releaseWithKey(rows[1], 'Escape')
    await waitForDndKitAnnouncement('Reordering cancelled. Beta is back at position 2 of 3.')
  })
})

describe('sortableListDrop', () => {
  it('moves the item to the place it was dropped and names the item it displaced', async () => {
    const { sortables, ends, rows } = await mountList()
    await pickUpWithKey(rows[0])
    // jsdom has no layout, so stand in for the sortable plugin's move during the drag.
    sortables[0].index = 2
    await releaseWithKey(rows[0], 'Space')
    await expect.poll(() => ends.length, DND_KIT_WAIT).toBe(1)
    const drop = sortableListDrop(items, ends[0])
    expect(drop.reordered?.map((item) => item.id)).toEqual(['b', 'c', 'a'])
    expect(drop.event).toMatchObject({ id: 'a', overId: 'c' })
  })

  it('keeps the order on a cancel, a disabled list, or a drop in place', async () => {
    const { sortables, ends, rows } = await mountList()
    await pickUpWithKey(rows[0])
    sortables[0].index = 1
    await releaseWithKey(rows[0], 'Escape')
    await expect.poll(() => ends.length, DND_KIT_WAIT).toBe(1)
    expect(sortableListDrop(items, ends[0])).toMatchObject({
      event: { id: 'a', overId: undefined },
      reordered: null,
    })

    await pickUpWithKey(rows[1])
    await releaseWithKey(rows[1], 'Space')
    await expect.poll(() => ends.length, DND_KIT_WAIT).toBe(2)
    expect(sortableListDrop(items, ends[1])).toMatchObject({
      event: { id: 'b', overId: 'b' },
      reordered: null,
    })
    expect(sortableListDrop(items, ends[1], true).reordered).toBeNull()
  })
})

describe('coreDragStart and coreDragOver', () => {
  it('report string ids and the data, and nothing for an absent or same target', () => {
    expect(coreDragStart({ id: 1, data: { x: 1 } })).toEqual({ id: '1', data: { x: 1 } })
    expect(coreDragStart(null)).toBeUndefined()
    expect(coreDragOver({ id: 'a' }, { id: 'b' })).toEqual({
      id: 'a',
      overId: 'b',
      data: undefined,
    })
    expect(coreDragOver({ id: 'a' }, { id: 'a' })).toBeUndefined()
    expect(coreDragOver({ id: 'a' }, null)).toBeUndefined()
  })
})
