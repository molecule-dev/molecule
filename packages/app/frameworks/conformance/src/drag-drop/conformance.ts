/**
 * The behavior every `@molecule/app-drag-drop-dndkit-*` sortable list must
 * share, as one Vitest suite each binding runs against itself.
 *
 * A binding's test file supplies a {@link SortableListHarness} (how to mount
 * its list) and calls {@link describeSortableListConformance}. The suite
 * asserts what the user meets: each row's attributes, the translated
 * instructions, the screen-reader announcements, the keyboard pick-up, cancel
 * and drop, a disabled list and row, the `onDragStart` / `onDragEnd` /
 * `onReorder` calls, and that unmounting leaves nothing behind. Moving a
 * dragged row needs layout jsdom lacks, so the order a real move produces is
 * covered by `sortableListDrop`'s own tests in `@molecule/app-drag-drop-dndkit`.
 *
 * @module
 */

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { addTranslations, getLocale, setLocale } from '@molecule/app-i18n'

import {
  DND_KIT_WAIT,
  dndKitAnnouncement,
  installDndKitDom,
  isDndKitDragging,
  pickUpWithKey,
  pressKey,
  releaseWithKey,
  settleDndKit,
  waitForDndKitAnnouncement,
  waitForSortableRows,
} from './dom.js'

/** An item of the conformance list. */
export interface ConformanceItem {
  /** The item's id: `'a'`, `'b'` or `'c'`. */
  id: string
  /** Its name: `'Alpha'`, `'Beta'` or `'Gamma'`. */
  title: string
}

/** The three items every case renders, in this order. */
export const conformanceItems: readonly ConformanceItem[] = [
  { id: 'a', title: 'Alpha' },
  { id: 'b', title: 'Beta' },
  { id: 'c', title: 'Gamma' },
]

/** What a harness passes to the binding's list, beyond the items. */
export interface ConformanceListProps {
  /** The items, always {@link conformanceItems}. */
  items: ConformanceItem[]
  /** The list's `onReorder`. */
  onReorder: (items: ConformanceItem[]) => void
  /** The list's `onDragStart`. */
  onDragStart: (event: unknown) => void
  /** The list's `onDragEnd`. */
  onDragEnd: (event: unknown) => void
  /** The list's `getItemLabel`, when the case sets one. */
  getItemLabel?: (item: ConformanceItem) => string
  /** The list's `disabled`. */
  disabled?: boolean
  /** The list's `config`. */
  config?: { cancelOnEscape?: boolean }
  /** Ids of the rows to render with their item `disabled` option set. */
  disabledIds: string[]
}

/** A mounted conformance list. */
export interface MountedConformanceList {
  /**
   * The element a row's item ref is attached to.
   *
   * @param id - The row's item id.
   * @returns The row element.
   */
  row: (id: string) => HTMLElement
  /** Unmounts the list. */
  unmount: () => void | Promise<void>
}

/** How one framework's binding mounts its sortable list for the suite. */
export interface SortableListHarness {
  /**
   * Renders the binding's `SortableList` with `props`, one row per item
   * (each row's text is the item's `title`, with the item ref on the row
   * element), into `document.body`.
   *
   * @param props - The list's props.
   * @returns The mounted list.
   */
  mount: (props: ConformanceListProps) => MountedConformanceList | Promise<MountedConformanceList>
  /**
   * Renders one row outside any list, if the framework can express that; the
   * suite expects it to throw `useSortableItem must be called inside a
   * <SortableList>.` (or the framework's equivalent message, given here).
   */
  mountRowOutsideList?: { run: () => unknown; message: string }
}

const INSTRUCTIONS =
  'To pick up an item, press Space or Enter. While dragging, use the arrow keys to move it. Press Space or Enter again to drop it in its new position, or Escape to cancel.'

/** A locale no bond ships, with a marked text for each key the list reads. */
const SWITCH_LOCALE = 'x-conformance'
const SWITCHED = {
  'dragDrop.sortable.instructions': 'XX instructions',
  'dragDrop.sortable.roleDescription': 'XX sortable',
  'dragDrop.sortable.pickedUp': 'XX {{label}} {{position}}/{{total}}',
  'dragDrop.sortable.movedOver': 'XX over',
  'dragDrop.sortable.cancelled': 'XX cancelled',
  'dragDrop.sortable.dropped': 'XX dropped',
}

/**
 * Runs the sortable-list conformance suite against one binding.
 *
 * @param framework - The framework's name, for the suite title.
 * @param harness - How the binding mounts its list.
 */
export function describeSortableListConformance(
  framework: string,
  harness: SortableListHarness,
): void {
  let mounted: MountedConformanceList | undefined
  let startLocale = 'en'

  /**
   * Mounts the list with the case's props and waits until dnd-kit has made
   * every row sortable. Its accessibility plugin adds the live region and each
   * row's `tabindex`, `aria-describedby` and `aria-disabled` in one batch, and a
   * pick-up pressed before that batch would announce nothing.
   *
   * @param overrides - The case's props.
   * @returns The mounted list and its callbacks.
   */
  async function mount(overrides: Partial<ConformanceListProps> = {}): Promise<{
    list: MountedConformanceList
    onReorder: ReturnType<typeof vi.fn>
    onDragStart: ReturnType<typeof vi.fn>
    onDragEnd: ReturnType<typeof vi.fn>
  }> {
    const onReorder = vi.fn()
    const onDragStart = vi.fn()
    const onDragEnd = vi.fn()
    const list = await harness.mount({
      items: [...conformanceItems],
      onReorder,
      onDragStart,
      onDragEnd,
      getItemLabel: (item) => item.title,
      disabledIds: [],
      ...overrides,
    })
    mounted = list
    await waitForSortableRows(conformanceItems.map(({ id }) => list.row(id)))
    return { list, onReorder, onDragStart, onDragEnd }
  }

  /**
   * Presses a key on a focused row and waits a fixed time. Only for a press
   * that must change nothing: there is no state to wait for.
   *
   * @param row - The row.
   * @param code - The key's `code`.
   */
  async function press(row: HTMLElement, code: string): Promise<void> {
    row.focus()
    pressKey(row, code)
    await settleDndKit()
  }

  /**
   * Waits until a callback has been called `times` times.
   *
   * @param callback - The mock.
   * @param times - The expected call count.
   */
  async function calledTimes(callback: ReturnType<typeof vi.fn>, times: number): Promise<void> {
    await expect.poll(() => callback.mock.calls.length, DND_KIT_WAIT).toBe(times)
  }

  describe(`sortable list conformance (${framework})`, () => {
    beforeAll(() => {
      installDndKitDom()
      startLocale = getLocale()
    })
    afterEach(async () => {
      await mounted?.unmount()
      mounted = undefined
      await settleDndKit()
    })

    it('makes each row a focusable control described by the translated instructions', async () => {
      const { list } = await mount()
      for (const { id, title } of conformanceItems) {
        const row = list.row(id)
        expect(row.textContent?.trim()).toBe(title)
        expect(row.getAttribute('tabindex')).toBe('0')
        expect(row.getAttribute('role')).toBe('button')
        expect(row.getAttribute('aria-roledescription')).toBe('sortable')
        expect(row.getAttribute('aria-disabled')).toBe('false')
        expect(
          document.getElementById(row.getAttribute('aria-describedby') ?? '')?.textContent,
        ).toBe(INSTRUCTIONS)
      }
    })

    it('rewrites the instructions, role descriptions and announcements on a locale change', async () => {
      addTranslations(SWITCH_LOCALE, SWITCHED)
      const { list } = await mount()
      try {
        await setLocale(SWITCH_LOCALE)
        await vi.waitFor(() => {
          for (const { id } of conformanceItems) {
            const row = list.row(id)
            expect(row.getAttribute('aria-roledescription')).toBe(
              SWITCHED['dragDrop.sortable.roleDescription'],
            )
            expect(
              document.getElementById(row.getAttribute('aria-describedby') ?? '')?.textContent,
            ).toBe(SWITCHED['dragDrop.sortable.instructions'])
          }
        }, DND_KIT_WAIT)
        await pickUpWithKey(list.row('a'))
        await waitForDndKitAnnouncement('XX Alpha 1/3')
        await releaseWithKey(list.row('a'), 'Escape')
      } finally {
        await setLocale(startLocale)
      }
      await vi.waitFor(() => {
        expect(list.row('a').getAttribute('aria-roledescription')).toBe('sortable')
        expect(
          document.getElementById(list.row('a').getAttribute('aria-describedby') ?? '')
            ?.textContent,
        ).toBe(INSTRUCTIONS)
      }, DND_KIT_WAIT)
    })

    it('announces a pick-up by label and position, and reports it', async () => {
      const { list, onDragStart } = await mount()
      const row = list.row('b')
      await pickUpWithKey(row)
      await waitForDndKitAnnouncement('Picked up Beta, position 2 of 3.')
      await calledTimes(onDragStart, 1)
      expect(onDragStart.mock.calls[0][0]).toMatchObject({ id: 'b' })
      await releaseWithKey(row, 'Escape')
    })

    it('picks up with Enter as well as Space', async () => {
      const { list, onDragStart } = await mount()
      await pickUpWithKey(list.row('a'), 'Enter')
      await calledTimes(onDragStart, 1)
      await releaseWithKey(list.row('a'), 'Escape')
    })

    it('cancels on Escape: announces it, reports no target, and keeps the order', async () => {
      const { list, onReorder, onDragEnd } = await mount()
      const row = list.row('b')
      await pickUpWithKey(row)
      await releaseWithKey(row, 'Escape')
      await waitForDndKitAnnouncement('Reordering cancelled. Beta is back at position 2 of 3.')
      await calledTimes(onDragEnd, 1)
      expect(onDragEnd.mock.calls[0][0]).toMatchObject({ id: 'b', overId: undefined })
      expect(onReorder).not.toHaveBeenCalled()
    })

    it('a drop where the row started reports the row itself and keeps the order', async () => {
      const { list, onReorder, onDragEnd } = await mount()
      const row = list.row('b')
      await pickUpWithKey(row)
      await releaseWithKey(row, 'Space')
      await waitForDndKitAnnouncement('Dropped Beta at position 2 of 3.')
      await calledTimes(onDragEnd, 1)
      expect(onDragEnd.mock.calls[0][0]).toMatchObject({ id: 'b', overId: 'b' })
      expect(onReorder).not.toHaveBeenCalled()
    })

    it('a disabled list starts no drag', async () => {
      const { list, onDragStart } = await mount({ disabled: true })
      const row = list.row('b')
      expect(row.getAttribute('aria-disabled')).toBe('true')
      await press(row, 'Space')
      expect(onDragStart).not.toHaveBeenCalled()
      expect(isDndKitDragging(row)).toBe(false)
      expect(dndKitAnnouncement()).toBe('')
    })

    it('a disabled row starts no drag while the others do', async () => {
      const { list, onDragStart } = await mount({ disabledIds: ['b'] })
      expect(list.row('b').getAttribute('aria-disabled')).toBe('true')
      expect(list.row('a').getAttribute('aria-disabled')).toBe('false')
      await press(list.row('b'), 'Space')
      expect(onDragStart).not.toHaveBeenCalled()
      await pickUpWithKey(list.row('a'))
      await calledTimes(onDragStart, 1)
      await releaseWithKey(list.row('a'), 'Escape')
    })

    it('with cancelOnEscape false, Escape does not end the drag', async () => {
      const { list, onDragEnd } = await mount({ config: { cancelOnEscape: false } })
      const row = list.row('b')
      await pickUpWithKey(row)
      await press(row, 'Escape')
      expect(onDragEnd).not.toHaveBeenCalled()
      expect(isDndKitDragging(row)).toBe(true)
      await releaseWithKey(row, 'Space')
      await calledTimes(onDragEnd, 1)
    })

    it('names a row by its id when the list has no getItemLabel', async () => {
      const { list } = await mount({ getItemLabel: undefined })
      await pickUpWithKey(list.row('c'))
      await waitForDndKitAnnouncement('Picked up c, position 3 of 3.')
      await releaseWithKey(list.row('c'), 'Escape')
    })

    it('unmounting removes the instructions and the live region', async () => {
      const { list } = await mount()
      const describedBy = list.row('a').getAttribute('aria-describedby') ?? ''
      await list.unmount()
      mounted = undefined
      await vi.waitFor(() => {
        expect(document.getElementById(describedBy)).toBeNull()
        expect(document.querySelector('[role="status"][aria-live]')).toBeNull()
      }, DND_KIT_WAIT)
    })

    if (harness.mountRowOutsideList) {
      const { run, message } = harness.mountRowOutsideList
      it('a row outside a list fails with a clear error', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        expect(run).toThrow(message)
        spy.mockRestore()
        warn.mockRestore()
      })
    }
  })
}
