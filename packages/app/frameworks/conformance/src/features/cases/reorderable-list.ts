/**
 * `@molecule/app-reorderable-list-react` cases: the drag-handle reorder list —
 * its rows, the optional handle, the ClassMap frame, the move-up/move-down
 * buttons and their disabled boundaries, the Alt+Arrow keyboard path on those
 * buttons, HTML5 drag start / drag over / drop, and the translated control
 * labels.
 *
 * Every row is `li`; the first row is selected as `li:nth-of-type(1)` because
 * React puts no identifying attribute on it beyond its position (each row's
 * screen-reader-only position span carries a framework-generated id).
 *
 * `renderItem(item, isDragging)` and `renderHandle()` are render functions: a
 * case passes `{ $fn, nodes }`, whose text and attributes interpolate `{0}`
 * (the item) and `{1}` (the `isDragging` flag) the way React calls them. One
 * case renders `{1}` so the drag flag reaching the renderer is compared too.
 *
 * Drags go through the kit's `transfer` step; a `dragover`/`drop` without data
 * reuses what the `dragstart` handler wrote, exactly as a browser would.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** One list item: a stable id and arbitrary data. */
const item = (id: string, label: string): { id: string; data: { label: string } } => ({
  id,
  data: { label },
})

/** The two-item list React's own suite renders. */
const TWO = [item('a', 'Alpha'), item('b', 'Beta')]

/** A three-item list, so both move directions have an interior row. */
const THREE = [item('a', 'Alpha'), item('b', 'Beta'), item('c', 'Gamma')]

/** React's `renderItem`: a labelled span carrying the item id. */
const renderItem = {
  $fn: 'renderItem',
  nodes: [{ tag: 'span', attrs: { 'data-item': '{0.id}' }, children: ['{0.data.label}'] }],
}

/** The same renderer, also showing the `isDragging` flag React passes second. */
const renderItemWithDragFlag = {
  $fn: 'renderItem',
  nodes: [
    {
      tag: 'span',
      attrs: { 'data-item': '{0.id}', 'data-dragging': '{1}' },
      children: ['{0.data.label}'],
    },
  ],
}

/** React's `renderHandle`: a "≡" glyph. */
const renderHandle = {
  $fn: 'renderHandle',
  nodes: [{ tag: 'span', attrs: { 'data-handle': '' }, children: ['≡'] }],
}

/** The move-down control of the row with this id. */
const moveDown = (id: string): string => `[data-mol-id="reorderable-move-down-${id}"]`

/** The move-up control of the row with this id. */
const moveUp = (id: string): string => `[data-mol-id="reorderable-move-up-${id}"]`

/** The n-th row (1-based). */
const row = (n: number): string => `li:nth-of-type(${n})`

/** The drag handle inside the n-th row. */
const handle = (n: number): string => `li:nth-of-type(${n}) > span`

/** Starts a drag of the n-th row, carrying its item id in `text/plain`. */
const dragStart = (
  n: number,
  id: string,
): { type: 'transfer'; selector: string; event: 'dragstart'; data: Record<string, string> } => ({
  type: 'transfer',
  selector: row(n),
  event: 'dragstart',
  data: { 'text/plain': id },
})

/** `@molecule/app-reorderable-list-react`. */
export const reorderableListFeature: FeatureCases = {
  package: '@molecule/app-reorderable-list-react',
  families: [
    {
      component: 'ReorderableList',
      cases: [
        {
          name: 'two items, whole row draggable',
          props: { items: TWO, renderItem },
          callbacks: ['onReorder'],
        },
        {
          name: 'a drag handle instead of a draggable row',
          props: { items: TWO, renderItem, renderHandle },
          callbacks: ['onReorder'],
        },
        {
          name: 'className passthrough and change',
          props: { items: TWO, renderItem, className: 'parity-token' },
          callbacks: ['onReorder'],
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
        {
          name: 'one item disables both move buttons',
          props: { items: [item('only', 'Only')], renderItem },
          callbacks: ['onReorder'],
          interactions: [
            { type: 'click', selector: moveUp('only') },
            { type: 'click', selector: moveDown('only') },
          ],
        },
        {
          name: 'an empty list renders an empty ul',
          props: { items: [], renderItem },
          callbacks: ['onReorder'],
        },
        {
          name: 'the move-down button moves the row down',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [{ type: 'click', selector: moveDown('a') }],
        },
        {
          name: 'the move-up button moves the row up',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [{ type: 'click', selector: moveUp('c') }],
        },
        {
          name: 'the boundary buttons are disabled and emit nothing',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [
            { type: 'click', selector: moveUp('a') },
            { type: 'click', selector: moveDown('c') },
          ],
        },
        {
          name: 'Alt+ArrowDown moves the row down',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [
            { type: 'keydown', selector: moveDown('a'), key: 'ArrowDown', altKey: true },
          ],
        },
        {
          name: 'Alt+ArrowUp moves the row up',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [{ type: 'keydown', selector: moveUp('c'), key: 'ArrowUp', altKey: true }],
        },
        {
          name: 'Alt+Arrow at a boundary emits nothing',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [
            { type: 'keydown', selector: moveUp('a'), key: 'ArrowUp', altKey: true },
            { type: 'keydown', selector: moveDown('c'), key: 'ArrowDown', altKey: true },
          ],
        },
        {
          name: 'a plain or unrelated key does not reorder',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [
            { type: 'keydown', selector: moveDown('a'), key: 'ArrowDown' },
            { type: 'keydown', selector: moveDown('a'), key: 'a', altKey: true },
            { type: 'keydown', selector: moveDown('a'), key: 'ArrowLeft', altKey: true },
          ],
        },
        {
          name: 'a focused move button carries the Alt+Arrow shortcut',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [
            { type: 'focus', selector: moveDown('a') },
            { type: 'keydown', selector: moveDown('a'), key: 'ArrowDown', altKey: true },
          ],
        },
        {
          name: 'a drag start marks the dragged row',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [dragStart(1, 'a')],
        },
        {
          name: 'dragging over marks the drop target',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [
            dragStart(1, 'a'),
            { type: 'transfer', selector: row(2), event: 'dragover' },
          ],
        },
        {
          name: 'dragging over the dragged row adds no drop border',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [
            dragStart(1, 'a'),
            { type: 'transfer', selector: row(1), event: 'dragover' },
          ],
        },
        {
          name: 'a drop moves the row and clears the drag state',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [
            dragStart(1, 'a'),
            { type: 'transfer', selector: row(3), event: 'dragover' },
            { type: 'transfer', selector: row(3), event: 'drop' },
          ],
        },
        {
          name: 'a drop on the dragged row is a no-op',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [dragStart(1, 'a'), { type: 'transfer', selector: row(1), event: 'drop' }],
        },
        {
          name: 'a drop of an unknown id is a no-op',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [
            {
              type: 'transfer',
              selector: row(2),
              event: 'drop',
              data: { 'text/plain': 'missing' },
            },
          ],
        },
        {
          name: 'a drop with no data is a no-op',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [{ type: 'transfer', selector: row(2), event: 'drop', data: {} }],
        },
        {
          name: 'a drag end clears the drag state',
          props: { items: THREE, renderItem },
          callbacks: ['onReorder'],
          interactions: [
            dragStart(1, 'a'),
            { type: 'transfer', selector: row(1), event: 'dragend' },
          ],
        },
        {
          name: 'the handle drags the row',
          props: { items: THREE, renderItem, renderHandle },
          callbacks: ['onReorder'],
          interactions: [
            {
              type: 'transfer',
              selector: handle(1),
              event: 'dragstart',
              data: { 'text/plain': 'a' },
            },
            { type: 'transfer', selector: row(3), event: 'dragover' },
            { type: 'transfer', selector: row(3), event: 'drop' },
            { type: 'transfer', selector: handle(1), event: 'dragend' },
          ],
        },
        {
          name: 'isDragging reaches the item renderer',
          props: { items: TWO, renderItem: renderItemWithDragFlag },
          callbacks: ['onReorder'],
          interactions: [
            dragStart(1, 'a'),
            { type: 'transfer', selector: row(1), event: 'dragend' },
          ],
        },
        {
          name: 'new items re-render the rows',
          props: { items: TWO, renderItem },
          callbacks: ['onReorder'],
          interactions: [
            { type: 'props', props: { items: [item('c', 'Gamma'), item('d', 'Delta')] } },
          ],
        },
        {
          name: 'the translations drive every label',
          props: { items: THREE, renderItem, renderHandle },
          callbacks: ['onReorder'],
          context: {
            translations: {
              en: {
                reorderableList: {
                  position: 'Row {{index}} of {{total}}',
                  dragHandle: 'Grab to move',
                  moveUp: 'Up',
                  moveDown: 'Down',
                },
              },
            },
          },
        },
      ],
      keyedLists: [{ prop: 'items', selector: 'li' }],
    },
  ],
}
