/**
 * `@molecule/app-data-table-ui-react` cases: the card data table (title row,
 * column headers, divided rows, loading skeleton, empty state) and the four
 * table-chrome primitives (toolbar, footer, empty row, row-with-actions).
 *
 * Every component here renders plain table elements and consumer-provided
 * nodes — there is no built-in copy and no locale bond — so the cases carry
 * their own text and compare structure, classes and callbacks only.
 *
 * `DataTableCard`'s `columns[].cell` and `rowKey` are function props (a `{ $fn }`
 * value returning nodes and a string); `title`, `titleAction`, `emptyMessage`,
 * `left`, `right`, `below` and `actions` are node props, carried as `slots` for
 * nodes and as plain strings in `props` where a caller would pass text.
 *
 * `RowWithActions` and `TableEmpty` render a `<tr>`, which React only accepts
 * inside a `<table>`'s `<tbody>`, so they are exercised as nested components in
 * a table inside a `DataTableCard` cell — the same nesting a real caller uses
 * for a drill-down table. Mounting a `<tr>` anywhere else is the DOM-nesting
 * error React reports, and the case would not be a legal use of the component.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** One row of the table under test. */
interface Row {
  /** Stable identity, what `rowKey` returns. */
  id: string
  /** The first column's value. */
  name: string
  /** The second column's value. */
  role: string
}

/** Two rows, the smallest list that proves per-row rendering. */
const rows: Row[] = [
  { id: '1', name: 'alpha', role: 'admin' },
  { id: '2', name: 'beta', role: 'member' },
]

/** A third row, for the row-replacement cases. */
const otherRows: Row[] = [{ id: '3', name: 'gamma', role: 'guest' }]

/** The `rowKey` function prop: a row's id. */
const rowKey = { $fn: 'rowKey', format: '{0.id}' }

/** A cell renderer: a span carrying the row's `name`. */
const nameCell = {
  $fn: 'cell',
  nodes: [{ tag: 'span', attrs: { 'data-name': '' }, children: ['{0.name}'] }],
}

/** A cell renderer: the row's role in an `<em>`. */
const roleCell = {
  $fn: 'cell',
  nodes: [{ tag: 'em', attrs: { 'data-role': '' }, children: ['{0.role}'] }],
}

/** The default column set: two columns, the first one's cells and headers. */
const columns = [
  { key: 'name', header: 'Name', cell: nameCell },
  { key: 'role', header: 'Role', cell: roleCell },
]

/** Columns carrying the optional header/cell class names. */
const styledColumns = [
  {
    key: 'name',
    header: 'Name',
    cell: nameCell,
    headerClassName: 'parity-head',
    cellClassName: 'parity-cell',
  },
  { key: 'role', header: 'Role', cell: roleCell },
]

/** A single column, so both the first-column and the spanning-cell paths run alone. */
const oneColumn = [{ key: 'name', header: 'Name', cell: nameCell }]

/** A node title, the way a caller passes rich markup. */
const nodeTitle = [{ tag: 'strong', attrs: { 'data-title': '' }, children: ['Team members'] }]

/** A node title action, the way a caller passes a link. */
const titleAction = [
  { tag: 'a', attrs: { 'data-action': '', href: '/members' }, children: ['View all'] },
]

/** The empty state, the way a caller fills it. */
const emptyMessage = [{ tag: 'p', attrs: { 'data-empty': '' }, children: ['No members yet.'] }]

/** Row cells, the way a caller fills `RowWithActions` children. */
const rowCells = [
  { tag: 'td', attrs: { 'data-first': '' }, children: ['alpha'] },
  { tag: 'td', attrs: { 'data-second': '' }, children: ['admin'] },
]

/** One row cell, for the cases that need a single one. */
const oneCell = [{ tag: 'td', attrs: { 'data-cell': '' }, children: ['x'] }]

/** The trailing actions of a row-with-actions. */
const actions = [{ tag: 'button', attrs: { type: 'button', 'data-act': '' }, children: ['Edit'] }]

/**
 * Wraps row nodes in the `<table><tbody>` React requires for a `<tr>`.
 *
 * @param rowNodes - The rows to place in the nested table's body.
 * @returns One `<table>` node whose body holds them.
 */
const nestedTable = (rowNodes: unknown[]): unknown[] => [
  { tag: 'table', attrs: { 'data-nested': '' }, children: [{ tag: 'tbody', children: rowNodes }] },
]

/**
 * One `DataTableCard` column whose cell renders `rowNodes` — the cell a
 * caller uses for a drill-down table.
 *
 * @param rowNodes - The nodes the cell renders for its row.
 * @returns The column definition.
 */
const nestedCellColumn = (rowNodes: unknown[]): unknown => ({
  key: 'name',
  header: 'Name',
  cell: { $fn: 'cell', nodes: rowNodes },
})

/** `@molecule/app-data-table-ui-react`. */
export const dataTableUiFeature: FeatureCases = {
  package: '@molecule/app-data-table-ui-react',
  families: [
    {
      component: 'DataTableCard',
      keyedLists: [{ prop: 'rows', selector: 'tbody tr', caseName: 'defaults, two rows' }],
      cases: [
        { name: 'defaults, two rows', props: { columns, rows, rowKey } },
        {
          name: 'a string title',
          props: { title: 'Team members', columns, rows, rowKey },
        },
        {
          name: 'a node title and a title action',
          props: { columns, rows, rowKey },
          slots: { title: nodeTitle, titleAction },
        },
        {
          name: 'a title action without a title',
          props: { columns, rows, rowKey },
          slots: { titleAction },
        },
        {
          name: 'an empty title still renders the title row',
          props: { title: '', columns, rows, rowKey },
        },
        {
          name: 'loading',
          props: { columns, rows, rowKey, loading: true },
        },
        {
          name: 'loading wins over rows',
          props: { columns, rows: otherRows, rowKey, loading: true },
        },
        {
          name: 'empty rows with an empty message',
          props: { columns, rows: [], rowKey },
          slots: { emptyMessage },
        },
        {
          name: 'empty rows without an empty message',
          props: { columns, rows: [], rowKey },
        },
        {
          name: 'loading wins over the empty message',
          props: { columns, rows: [], rowKey, loading: true },
          slots: { emptyMessage },
        },
        {
          name: 'clickable rows call onRowClick',
          props: { columns, rows, rowKey },
          callbacks: ['onRowClick'],
          interactions: [
            { type: 'click', selector: 'tbody tr:nth-child(1)' },
            { type: 'click', selector: 'tbody tr:nth-child(2)' },
          ],
        },
        {
          name: 'a click without a handler calls nothing',
          props: { columns, rows, rowKey },
          interactions: [{ type: 'click', selector: 'tbody tr:nth-child(1)' }],
        },
        {
          name: 'classes and an agent id',
          props: { columns, rows, rowKey, className: 'parity-token', dataMolId: 'members' },
        },
        {
          name: 'column class names',
          props: { columns: styledColumns, rows, rowKey },
        },
        {
          name: 'a single column spans its cells',
          props: { columns: oneColumn, rows, rowKey },
        },
        {
          name: 'a title arrives on a props change',
          props: { columns, rows, rowKey },
          interactions: [{ type: 'props', props: { title: 'Team members' } }],
        },
        {
          name: 'the title changes on a props change',
          props: { title: 'Team members', columns, rows, rowKey },
          interactions: [{ type: 'props', props: { title: 'People' } }],
        },
        {
          name: 'loading switches on and off',
          props: { columns, rows, rowKey },
          interactions: [
            { type: 'props', props: { loading: true } },
            { type: 'props', props: { loading: false } },
          ],
        },
        {
          name: 'a props change replaces the rows',
          props: { columns, rows: [rows[0]!], rowKey },
          interactions: [{ type: 'props', props: { rows: otherRows } }],
        },
        {
          name: 'a props change empties the rows and shows the empty message',
          props: { columns, rows, rowKey },
          slots: { emptyMessage },
          interactions: [{ type: 'props', props: { rows: [] } }],
        },
        {
          name: 'a click after a props change calls onRowClick for the new row',
          props: { columns, rows: [rows[0]!], rowKey },
          callbacks: ['onRowClick'],
          interactions: [
            { type: 'props', props: { rows: [rows[1]!] } },
            { type: 'click', selector: 'tbody tr:nth-child(1)' },
          ],
        },
        {
          name: 'a nested row with an actions cell',
          props: {
            columns: [
              nestedCellColumn(
                nestedTable([
                  { component: 'RowWithActions', children: rowCells, slots: { actions } },
                ]),
              ),
            ],
            rows: [rows[0]!],
            rowKey,
          },
        },
        {
          name: 'a nested row without actions or selection',
          props: {
            columns: [
              nestedCellColumn(nestedTable([{ component: 'RowWithActions', children: rowCells }])),
            ],
            rows: [rows[0]!],
            rowKey,
          },
        },
        {
          name: 'a nested selected row keeps its actions cell from clicking the row',
          props: {
            columns: [
              nestedCellColumn(
                nestedTable([
                  {
                    component: 'RowWithActions',
                    children: oneCell,
                    props: {
                      selected: true,
                      className: 'parity-token',
                      onClick: { $callback: 'onClick' },
                    },
                    slots: { actions },
                  },
                ]),
              ),
            ],
            rows: [rows[0]!],
            rowKey,
          },
          interactions: [
            { type: 'click', selector: '[data-cell]' },
            { type: 'click', selector: '[data-act]' },
          ],
        },
        {
          name: 'a nested row that is not selected',
          props: {
            columns: [
              nestedCellColumn(
                nestedTable([
                  { component: 'RowWithActions', children: rowCells, props: { selected: false } },
                ]),
              ),
            ],
            rows: [rows[0]!],
            rowKey,
          },
        },
        {
          name: 'a nested empty row',
          props: {
            columns: [
              nestedCellColumn(
                nestedTable([
                  {
                    component: 'TableEmpty',
                    props: { colSpan: 2, className: 'parity-token' },
                    children: [{ tag: 'span', attrs: { 'data-e': '' }, children: ['empty'] }],
                  },
                ]),
              ),
            ],
            rows: [rows[0]!],
            rowKey,
          },
        },
        {
          name: 'a nested empty row without content',
          props: {
            columns: [
              nestedCellColumn(nestedTable([{ component: 'TableEmpty', props: { colSpan: 3 } }])),
            ],
            rows: [rows[0]!],
            rowKey,
          },
        },
      ],
    },
    {
      component: 'TableFooter',
      cases: [
        {
          name: 'left and right slots',
          slots: {
            left: [{ tag: 'span', attrs: { 'data-left': '' }, children: ['5 selected'] }],
            right: [{ tag: 'span', attrs: { 'data-right': '' }, children: ['Page 1'] }],
          },
        },
        {
          name: 'only a left slot',
          slots: { left: [{ tag: 'span', attrs: { 'data-left': '' }, children: ['5 selected'] }] },
        },
        {
          name: 'only a right slot',
          slots: { right: [{ tag: 'span', attrs: { 'data-right': '' }, children: ['Page 1'] }] },
        },
        { name: 'neither slot' },
        { name: 'text slots', props: { left: '5 selected', right: 'Page 1' } },
        { name: 'forwards className', props: { className: 'parity-token' } },
        {
          name: 'the slots arrive on a props change',
          props: { left: '5 selected' },
          interactions: [{ type: 'props', props: { right: 'Page 2' } }],
        },
      ],
    },
    {
      component: 'TableToolbar',
      cases: [
        {
          name: 'left and right slots',
          slots: {
            left: [{ tag: 'h2', attrs: { 'data-left': '' }, children: ['Members'] }],
            right: [
              { tag: 'button', attrs: { type: 'button', 'data-right': '' }, children: ['Add'] },
            ],
          },
        },
        {
          name: 'a below row',
          slots: {
            left: [{ tag: 'h2', attrs: { 'data-left': '' }, children: ['Members'] }],
            below: [{ tag: 'div', attrs: { 'data-below': '' }, children: ['Filters'] }],
          },
        },
        { name: 'neither slot' },
        { name: 'text slots', props: { left: 'Members', right: 'Add' } },
        { name: 'forwards className', props: { className: 'parity-token' } },
        {
          name: 'the right slot arrives on a props change',
          props: { left: 'Members' },
          interactions: [{ type: 'props', props: { right: 'Add' } }],
        },
      ],
    },
  ],
}
