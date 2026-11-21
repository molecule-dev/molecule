/**
 * `@molecule/app-spreadsheet-grid-react` cases: the virtualized grid's
 * geometry (default and custom sizes, frozen rows and columns, an empty grid),
 * its sparse cell data and `renderCell`, in-cell editing (double-click, Enter /
 * F2, Escape, blur, numeric and empty drafts, a mousedown that commits),
 * selection (click, Shift+click, the roving tabindex, mouse-enter without a
 * pressed button), copy/paste as TSV (including the grid edge and empty cells),
 * vertical scrolling of the rendered window, and prop changes.
 *
 * `onCellChange` and `onSelectionChange` are the callbacks; the only component
 * export is `SpreadsheetGrid` and the rest are the pure helpers compared by
 * value.
 *
 * @module
 */

import type { CaseA11y } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** A sparse cell map: column letter + row number → value. */
const cells = (): Map<string, string | number | boolean | null> =>
  new Map<string, string | number | boolean | null>([
    ['A1', 'apple'],
    ['B2', 42],
    ['C3', true],
  ])

/**
 * A numeric cell map. The first case's data carries no prose: its locale-switch
 * snapshot is what the kit's pseudo-locale check reads, and cell text is the
 * caller's data (a `Map` the check cannot see inside), not package copy.
 */
const numbers = (): Map<string, number> =>
  new Map<string, number>([
    ['A1', 1],
    ['B2', 42],
    ['C3', 3.5],
  ])

/** A denser map, for the cases that scroll or re-render with other data. */
const wideCells = (): Map<string, string | number | boolean | null> =>
  new Map<string, string | number | boolean | null>([
    ['A1', 'North'],
    ['B1', 120],
    ['A2', 'South'],
    ['B2', 90],
    ['C1', false],
  ])

/** The selection of a single cell. */
const at = (r1: number, c1: number): Record<string, number> => ({ r1, c1, r2: r1, c2: c1 })

/** A `renderCell` renderer node, drawn for every cell. */
const badgeNodes = [{ tag: 'strong', attrs: { 'data-badge': '' }, children: ['★'] }]

/** The two callbacks every interactive case passes. */
const callbacks = ['onCellChange', 'onSelectionChange']

/**
 * The rules React's own grid markup breaks: its cell boxes sit inside plain
 * divs instead of `role="row"` rows, so axe reports the grid's required
 * children and every gridcell's required parent. The ports reproduce React's
 * DOM exactly, so each case that renders cells declares both — the markup is
 * React's, not the case's, and changing it would change the rendered DOM.
 */
const GRID_STRUCTURE: CaseA11y = {
  expect: ['aria-required-children', 'aria-required-parent'],
  reason:
    'React renders the cell boxes inside plain divs rather than role="row" rows, so axe reports the grid required children and each gridcell required parent',
}

/** The empty grid renders its header row with no columnheader cells. */
const EMPTY_GRID: CaseA11y = {
  expect: ['aria-required-children'],
  reason: 'the empty grid renders its header row with no columnheader cells',
}

/** `@molecule/app-spreadsheet-grid-react`. */
export const spreadsheetGridFeature: FeatureCases = {
  package: '@molecule/app-spreadsheet-grid-react',
  values: [
    { export: 'columnLetter', calls: [[0], [1], [25], [26], [27], [701], [702]] },
    {
      export: 'cellRef',
      calls: [
        [0, 0],
        [2, 1],
        [99, 25],
      ],
    },
    { export: 'formatCellValue', calls: [[null], [undefined], ['hi'], [42], [true], [false]] },
    {
      export: 'normalizeSelection',
      calls: [
        [{ r1: 5, c1: 7, r2: 1, c2: 2 }],
        [{ r1: 0, c1: 0, r2: 0, c2: 0 }],
        [{ r1: 2, c1: 0, r2: 2, c2: 4 }],
      ],
    },
    {
      export: 'isInSelection',
      calls: [
        [{ r1: 1, c1: 1, r2: 3, c2: 3 }, 0, 0],
        [{ r1: 1, c1: 1, r2: 3, c2: 3 }, 1, 1],
        [{ r1: 1, c1: 1, r2: 3, c2: 3 }, 3, 3],
        [{ r1: 1, c1: 1, r2: 3, c2: 3 }, 4, 4],
        [{ r1: 3, c1: 3, r2: 1, c2: 1 }, 2, 2],
      ],
    },
    {
      export: 'serializeSelectionTsv',
      calls: [
        [
          new Map<string, string | number>([
            ['A1', 1],
            ['B1', 2],
            ['A2', 'hello'],
          ]),
          { r1: 0, c1: 0, r2: 1, c2: 1 },
        ],
        [
          new Map<string, string | boolean>([
            ['B2', true],
            ['C2', false],
          ]),
          { r1: 1, c1: 1, r2: 1, c2: 2 },
        ],
        [new Map<string, string | number>(), { r1: 0, c1: 0, r2: 0, c2: 0 }],
      ],
    },
    { export: 'parseClipboardTsv', calls: [['1\t2\n3\t4'], ['a\tb\r\nc\td\r\n'], ['']] },
    {
      export: 'computeVisibleRange',
      calls: [
        [0, 100, 28, 100],
        [280, 100, 28, 100],
        [0, 100, 28, 0],
        [0, 100, 0, 100],
        [0, 100, 28, 100, 5],
        [112, 332, 28, 8],
      ],
    },
  ],
  families: [
    {
      component: 'SpreadsheetGrid',
      cases: [
        // First, so the derived locale-switch case re-renders the translated
        // grid and cell-editor labels.
        {
          name: 'default sizes with sparse cells',
          props: { rows: 4, columns: 4, cells: numbers(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
        },
        {
          name: 'an empty grid renders no cells',
          props: { rows: 0, columns: 0, cells: new Map(), selection: at(0, 0) },
          callbacks,
          a11y: EMPTY_GRID,
        },
        {
          name: 'custom geometry and a data-mol-id',
          props: {
            rows: 3,
            columns: 3,
            cells: cells(),
            selection: at(0, 0),
            cellWidth: 60,
            cellHeight: 20,
            gutterWidth: 30,
            headerHeight: 22,
            viewportWidth: 300,
            viewportHeight: 160,
            dataMolId: 'sheet',
          },
          callbacks,
          a11y: GRID_STRUCTURE,
        },
        {
          name: 'frozen row and column',
          props: {
            rows: 6,
            columns: 5,
            cells: wideCells(),
            selection: at(1, 1),
            frozenRows: 1,
            frozenCols: 1,
          },
          callbacks,
          a11y: GRID_STRUCTURE,
        },
        {
          name: 'frozen rows without frozen columns',
          props: {
            rows: 6,
            columns: 3,
            cells: cells(),
            selection: at(0, 0),
            frozenRows: 2,
          },
          callbacks,
          a11y: GRID_STRUCTURE,
        },
        {
          name: 'frozen columns without frozen rows',
          props: {
            rows: 3,
            columns: 6,
            cells: cells(),
            selection: at(0, 0),
            frozenCols: 2,
          },
          callbacks,
          a11y: GRID_STRUCTURE,
        },
        {
          name: 'the selection anchor carries the roving tabindex',
          props: { rows: 3, columns: 3, cells: cells(), selection: at(1, 2) },
          callbacks,
          a11y: GRID_STRUCTURE,
        },
        {
          name: 'renderCell draws its nodes for every cell',
          props: {
            rows: 3,
            columns: 3,
            cells: cells(),
            selection: at(0, 0),
            renderCell: { $fn: 'renderCell', nodes: badgeNodes },
          },
          callbacks,
          a11y: GRID_STRUCTURE,
        },
        {
          name: 'renderCell formats from the value and the ref',
          props: {
            rows: 2,
            columns: 2,
            cells: cells(),
            selection: at(0, 0),
            renderCell: {
              $fn: 'renderCell',
              nodes: [{ tag: 'span', attrs: { 'data-cell': '' }, children: ['{1}={0}'] }],
            },
          },
          callbacks,
          a11y: GRID_STRUCTURE,
        },
        {
          name: 'editing: double-click, type and Enter commit a number',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            { type: 'dblclick', selector: '[data-mol-id="spreadsheet-grid-cell-B2"]' },
            { type: 'input', selector: '[data-mol-id="spreadsheet-grid-editor-B2"]', value: '17' },
            {
              type: 'keydown',
              selector: '[data-mol-id="spreadsheet-grid-editor-B2"]',
              key: 'Enter',
            },
          ],
        },
        {
          name: 'editing: Escape cancels without committing',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            { type: 'dblclick', selector: '[data-mol-id="spreadsheet-grid-cell-A1"]' },
            {
              type: 'input',
              selector: '[data-mol-id="spreadsheet-grid-editor-A1"]',
              value: 'discarded',
            },
            {
              type: 'keydown',
              selector: '[data-mol-id="spreadsheet-grid-editor-A1"]',
              key: 'Escape',
            },
          ],
        },
        {
          name: 'editing: focus moving to another cell commits the draft',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            { type: 'dblclick', selector: '[data-mol-id="spreadsheet-grid-cell-A1"]' },
            {
              type: 'input',
              selector: '[data-mol-id="spreadsheet-grid-editor-A1"]',
              value: 'pear',
            },
            { type: 'focus', selector: '[data-mol-id="spreadsheet-grid-cell-B2"]' },
          ],
        },
        {
          name: 'editing: an empty draft clears the cell',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            { type: 'dblclick', selector: '[data-mol-id="spreadsheet-grid-cell-A1"]' },
            { type: 'input', selector: '[data-mol-id="spreadsheet-grid-editor-A1"]', value: '' },
            {
              type: 'keydown',
              selector: '[data-mol-id="spreadsheet-grid-editor-A1"]',
              key: 'Enter',
            },
          ],
        },
        {
          name: 'editing: a decimal draft commits a number',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            { type: 'dblclick', selector: '[data-mol-id="spreadsheet-grid-cell-B2"]' },
            { type: 'input', selector: '[data-mol-id="spreadsheet-grid-editor-B2"]', value: '4.5' },
            {
              type: 'keydown',
              selector: '[data-mol-id="spreadsheet-grid-editor-B2"]',
              key: 'Enter',
            },
          ],
        },
        {
          name: 'editing: a mousedown elsewhere commits the open edit and moves the selection',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            { type: 'dblclick', selector: '[data-mol-id="spreadsheet-grid-cell-A1"]' },
            { type: 'input', selector: '[data-mol-id="spreadsheet-grid-editor-A1"]', value: 'fig' },
            { type: 'pointerdown', selector: '[data-mol-id="spreadsheet-grid-cell-B2"]' },
          ],
        },
        {
          name: 'Enter opens the editor at the selection anchor from a focused cell',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(1, 1) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            { type: 'keydown', selector: '[data-mol-id="spreadsheet-grid-cell-B2"]', key: 'Enter' },
          ],
        },
        {
          name: 'F2 opens the editor at the selection anchor',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(2, 2) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [{ type: 'keydown', selector: '[role="grid"]', key: 'F2' }],
        },
        {
          name: 'keyboard shortcuts are ignored while editing',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            { type: 'dblclick', selector: '[data-mol-id="spreadsheet-grid-cell-A1"]' },
            { type: 'keydown', selector: '[role="grid"]', key: 'Enter' },
          ],
        },
        {
          name: 'copy and paste shortcuts leave the DOM alone',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            { type: 'keydown', selector: '[role="grid"]', key: 'c', ctrlKey: true },
            { type: 'keydown', selector: '[role="grid"]', key: 'v', metaKey: true },
          ],
        },
        {
          name: 'paste writes TSV from the selection anchor',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            { type: 'pointerdown', selector: '[data-mol-id="spreadsheet-grid-cell-B2"]' },
            { type: 'props', props: { selection: at(1, 1) } },
            {
              type: 'transfer',
              selector: '[role="grid"]',
              event: 'paste',
              data: { 'text/plain': '10\t20\n30\t40' },
            },
          ],
        },
        {
          name: 'paste past the grid edge writes only the cells inside it',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            { type: 'props', props: { selection: at(3, 3) } },
            {
              type: 'transfer',
              selector: '[role="grid"]',
              event: 'paste',
              data: { 'text/plain': '10\t20\n30\t40' },
            },
          ],
        },
        {
          name: 'paste of empty values clears cells',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            {
              type: 'transfer',
              selector: '[role="grid"]',
              event: 'paste',
              data: { 'text/plain': 'x\t\n\ty' },
            },
          ],
        },
        {
          name: 'paste without text changes nothing',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            {
              type: 'transfer',
              selector: '[role="grid"]',
              event: 'paste',
              data: { 'text/plain': '' },
            },
          ],
        },
        {
          name: 'selection: a click selects a cell and a shift-click extends it',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            { type: 'click', selector: '[data-mol-id="spreadsheet-grid-cell-A1"]' },
            { type: 'props', props: { selection: at(0, 0) } },
            {
              type: 'click',
              selector: '[data-mol-id="spreadsheet-grid-cell-C3"]',
              modifiers: { shiftKey: true },
            },
            { type: 'props', props: { selection: { r1: 0, c1: 0, r2: 2, c2: 2 } } },
          ],
        },
        {
          name: 'selection: a mouse-enter without a pressed button does not extend',
          props: { rows: 4, columns: 4, cells: cells(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            { type: 'pointerdown', selector: '[data-mol-id="spreadsheet-grid-cell-A1"]' },
            { type: 'mouseenter', selector: '[data-mol-id="spreadsheet-grid-cell-B2"]' },
          ],
        },
        {
          name: 'scrolling moves the rendered rows',
          props: {
            rows: 8,
            columns: 3,
            cells: wideCells(),
            selection: at(0, 0),
          },
          callbacks,
          a11y: GRID_STRUCTURE,
          layout: [{ selector: '[data-mol-id="spreadsheet-grid-scroll"]', scrollTop: 112 }],
          interactions: [
            {
              type: 'event',
              selector: '[data-mol-id="spreadsheet-grid-scroll"]',
              event: 'scroll',
              bubbles: true,
            },
          ],
        },
        {
          name: 'a cells and selection change re-renders the grid',
          props: { rows: 3, columns: 3, cells: cells(), selection: at(0, 0) },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [{ type: 'props', props: { cells: wideCells(), selection: at(1, 1) } }],
        },
        {
          name: 'a geometry change re-renders at the new sizes',
          props: {
            rows: 2,
            columns: 2,
            cells: cells(),
            selection: at(0, 0),
            cellWidth: 40,
            cellHeight: 16,
            viewportWidth: 200,
            viewportHeight: 120,
          },
          callbacks,
          a11y: GRID_STRUCTURE,
          interactions: [
            {
              type: 'props',
              props: {
                rows: 5,
                columns: 5,
                viewportWidth: 420,
                viewportHeight: 260,
              },
            },
          ],
        },
      ],
    },
  ],
}
