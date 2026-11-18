/**
 * `@molecule/app-admin-table-react` cases: the generic admin-style data table
 * (column headers, rows, loading skeleton, bulk-select checkboxes, row-click
 * navigation, kebab row actions, footer slot) and the detached kebab menu.
 *
 * Column `render` functions and the `rowKey` / `rowActionsAriaLabel` /
 * `hrefFor` / `dataMolIdFor` functions are `{ $fn }` values (the renderers
 * return nodes, the rest format a string from the row); a `rowActions`
 * entry's `onSelect` is a nested `{ $callback }` spy. `footer` is a node prop,
 * carried as a `slots` entry for nodes and as a plain string in `props` where
 * a caller would pass text.
 *
 * The kebab menu's open state is internal: the trigger toggles it, a click
 * outside the popover or Escape closes it, and an item closes it. Every
 * interaction below runs against the real DOM the React reference renders.
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
  { id: 'a', name: 'Alpha', role: 'admin' },
  { id: 'b', name: 'Beta', role: 'member' },
]

/** A single row, for the replacements and the single-row case. */
const firstRow = [rows[0]!]

/** The other row, for the row-replacement case. */
const otherRow = [rows[1]!]

/** The `rowKey` function prop: a row's id. */
const rowKey = { $fn: 'rowKey', format: '{0.id}' }

/** A cell renderer: a span carrying the row's name. */
const nameCell = {
  $fn: 'renderName',
  nodes: [{ tag: 'span', attrs: { 'data-name': '' }, children: ['{0.name}'] }],
}

/** A cell renderer: the row's role as text. */
const roleCell = { $fn: 'renderRole', nodes: ['{0.role}'] }

/** The default columns: two, with string headers and node-valued cells. */
const columns = [
  { id: 'name', header: 'Name', render: nameCell },
  { id: 'role', header: 'Role', render: roleCell },
]

/** Columns carrying every alignment value and the optional class names. */
const alignedColumns = [
  {
    id: 'name',
    header: 'Name',
    render: nameCell,
    align: 'right',
    className: 'parity-cell',
    headerClassName: 'parity-head',
  },
  { id: 'role', header: 'Role', render: roleCell, align: 'center' },
  { id: 'extra', header: 'Extra', render: roleCell, align: 'left' },
]

/** A column whose header is a node rather than text. */
const nodeHeaderColumns = [
  {
    id: 'name',
    header: { $nodes: [{ tag: 'strong', attrs: { 'data-h': '' }, children: ['Name'] }] },
    render: nameCell,
  },
  { id: 'role', header: 'Role', render: roleCell },
]

/** The row-actions menu: an href item and a destructive button item. */
const rowActions = [
  {
    label: 'Edit',
    hrefFor: { $fn: 'hrefFor', format: '/products/{0.id}' },
    dataMolIdFor: { $fn: 'editId', format: 'row-action-edit-{0.id}' },
  },
  {
    label: 'Delete',
    destructive: true,
    onSelect: { $callback: 'onSelect' },
    dataMolIdFor: { $fn: 'deleteId', format: 'row-action-delete-{0.id}' },
  },
]

/** The href item on its own. */
const hrefAction = [rowActions[0]!]

/** The destructive button item on its own. */
const destructiveAction = [rowActions[1]!]

/** A menu entry whose label is a node. */
const nodeLabelActions = [
  {
    label: { $nodes: [{ tag: 'strong', attrs: { 'data-label': '' }, children: ['Edit'] }] },
    onSelect: { $callback: 'onSelect' },
    dataMolIdFor: { $fn: 'editId', format: 'row-action-edit-{0.id}' },
  },
]

/** The footer slot, the way a caller passes a pagination row. */
const footer = [{ tag: 'div', attrs: { 'data-footer': '' }, children: ['Page 1 of 3'] }]

/** The kebab trigger's selector. */
const TRIGGER = '[data-mol-id="admin-table-row-actions-trigger"]'

/** The popover element: the menu surface right after the trigger button. */
const POPOVER = `${TRIGGER} + div`

/** `@molecule/app-admin-table-react`. */
export const adminTableFeature: FeatureCases = {
  package: '@molecule/app-admin-table-react',
  families: [
    {
      component: 'AdminTable',
      keyedLists: [{ prop: 'rows', selector: 'tbody tr', caseName: 'defaults, two rows' }],
      cases: [
        { name: 'defaults, two rows', props: { rows, columns, rowKey } },
        { name: 'a single row', props: { rows: firstRow, columns, rowKey } },
        { name: 'no rows', props: { rows: [], columns, rowKey } },
        { name: 'no columns', props: { rows, columns: [], rowKey } },
        {
          name: 'loading with the default skeleton row count',
          props: { rows, columns, rowKey, loading: true },
        },
        {
          name: 'loading with a custom skeleton row count',
          props: { rows, columns, rowKey, loading: true, skeletonRowCount: 3 },
        },
        {
          name: 'loading with no skeleton rows',
          props: { rows, columns, rowKey, loading: true, skeletonRowCount: 0 },
        },
        {
          name: 'bulk select renders a leading checkbox column',
          props: { rows, columns, rowKey, bulkSelect: true },
        },
        {
          name: 'a selected row is checked under control',
          props: {
            rows,
            columns,
            rowKey,
            bulkSelect: true,
            selectedIds: ['b'],
          },
          callbacks: ['onSelectedIdsChange'],
        },
        {
          name: 'selectedIds is ignored without a change handler',
          props: { rows, columns, rowKey, bulkSelect: true, selectedIds: ['b'] },
        },
        {
          name: 'uncontrolled selection toggles internally',
          props: { rows, columns, rowKey, bulkSelect: true },
          interactions: [
            { type: 'check', selector: '[data-mol-id="admin-table-select-a"]', checked: true },
            { type: 'check', selector: '[data-mol-id="admin-table-select-b"]', checked: true },
            { type: 'check', selector: '[data-mol-id="admin-table-select-a"]', checked: false },
          ],
        },
        {
          name: 'controlled selection reports the new ids',
          props: { rows, columns, rowKey, bulkSelect: true, selectedIds: [] },
          callbacks: ['onSelectedIdsChange'],
          interactions: [
            { type: 'check', selector: '[data-mol-id="admin-table-select-a"]', checked: true },
          ],
        },
        {
          name: 'clickable rows call onRowClick',
          props: { rows, columns, rowKey },
          callbacks: ['onRowClick'],
          interactions: [
            { type: 'click', selector: 'tbody tr:nth-child(1)' },
            { type: 'click', selector: 'tbody tr:nth-child(2)' },
          ],
        },
        {
          name: 'a click without a handler calls nothing',
          props: { rows, columns, rowKey },
          interactions: [{ type: 'click', selector: 'tbody tr:nth-child(1)' }],
        },
        {
          name: 'Enter and Space activate a clickable row',
          props: { rows, columns, rowKey },
          callbacks: ['onRowClick'],
          interactions: [
            { type: 'keydown', selector: 'tbody tr:nth-child(1)', key: 'Enter' },
            { type: 'keydown', selector: 'tbody tr:nth-child(2)', key: ' ' },
          ],
        },
        {
          name: 'a key press without a handler calls nothing',
          props: { rows, columns, rowKey },
          interactions: [{ type: 'keydown', selector: 'tbody tr:nth-child(1)', key: 'Enter' }],
        },
        {
          name: 'clicking a row checkbox does not open the row',
          props: { rows, columns, rowKey, bulkSelect: true },
          callbacks: ['onRowClick'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="admin-table-select-a"]' },
            { type: 'click', selector: 'tbody tr:nth-child(1) td:nth-child(2)' },
          ],
        },
        {
          name: 'row actions add a trailing actions column',
          props: { rows, columns, rowKey, rowActions },
        },
        {
          name: 'an empty row-actions list adds no column',
          props: { rows, columns, rowKey, rowActions: [] },
        },
        {
          name: 'row actions, bulk select and loading widen the skeleton',
          props: {
            rows,
            columns,
            rowKey,
            loading: true,
            skeletonRowCount: 2,
            bulkSelect: true,
            rowActions,
          },
        },
        {
          name: 'a per-row aria label for the actions menu',
          props: {
            rows,
            columns,
            rowKey,
            rowActions: destructiveAction,
            rowActionsAriaLabel: { $fn: 'ariaLabel', format: 'Actions for {0.name}' },
          },
        },
        {
          name: 'column alignment and class names',
          props: { rows, columns: alignedColumns, rowKey },
        },
        {
          name: 'a node column header',
          props: { rows, columns: nodeHeaderColumns, rowKey },
        },
        {
          name: 'a footer slot',
          props: { rows, columns, rowKey },
          slots: { footer },
        },
        {
          name: 'a text footer',
          props: { rows, columns, rowKey, footer: 'Page 1 of 3' },
        },
        {
          name: 'classes and an agent id',
          props: {
            rows,
            columns,
            rowKey,
            className: 'parity-token',
            tbodyDataMolId: 'admin-rows',
          },
        },
        {
          name: 'loading switches on and off',
          props: { rows, columns, rowKey },
          interactions: [
            { type: 'props', props: { loading: true } },
            { type: 'props', props: { loading: false } },
          ],
        },
        {
          name: 'a props change replaces the rows',
          props: { rows: firstRow, columns, rowKey },
          interactions: [{ type: 'props', props: { rows: otherRow } }],
        },
        {
          name: 'a props change turns on the row actions',
          props: { rows, columns, rowKey },
          interactions: [{ type: 'props', props: { rowActions } }],
        },
        {
          name: 'a props change turns on bulk select',
          props: { rows, columns, rowKey },
          interactions: [{ type: 'props', props: { bulkSelect: true } }],
        },
        {
          name: 'a click after a props change calls onRowClick for the new row',
          props: { rows: firstRow, columns, rowKey },
          callbacks: ['onRowClick'],
          interactions: [
            { type: 'props', props: { rows: otherRow } },
            { type: 'click', selector: 'tbody tr:nth-child(1)' },
          ],
        },
      ],
    },
    {
      component: 'AdminTableRowActions',
      cases: [
        {
          name: 'the kebab trigger',
          props: { row: rows[0], actions: hrefAction, ariaLabel: 'Row actions' },
        },
        {
          // No label here: the trigger's name comes from the component's
          // translated default (`adminTable.aria.rowActions`).
          name: 'no aria label, the translated default',
          props: { row: rows[0], actions: hrefAction },
        },
        {
          name: 'an open menu with an href and a destructive button',
          props: { row: rows[0], actions: rowActions, ariaLabel: 'Row actions' },
          interactions: [{ type: 'click', selector: TRIGGER }],
        },
        {
          name: 'a custom aria label',
          props: { row: rows[0], actions: rowActions, ariaLabel: 'Product actions' },
        },
        {
          name: 'a node label',
          props: { row: rows[0], actions: nodeLabelActions, ariaLabel: 'Row actions' },
          interactions: [{ type: 'click', selector: TRIGGER }],
        },
        {
          name: 'an href item links and closes the menu',
          props: { row: rows[0], actions: hrefAction, ariaLabel: 'Row actions' },
          interactions: [
            { type: 'click', selector: TRIGGER },
            { type: 'click', selector: '[data-mol-id="row-action-edit-a"]' },
          ],
        },
        {
          name: 'a button item runs its action and closes the menu',
          props: { row: rows[0], actions: destructiveAction, ariaLabel: 'Row actions' },
          interactions: [
            { type: 'click', selector: TRIGGER },
            { type: 'click', selector: '[data-mol-id="row-action-delete-a"]' },
          ],
        },
        {
          name: 'a deferred action settles after the menu closes',
          props: { row: rows[0], actions: destructiveAction, ariaLabel: 'Row actions' },
          callbackResults: { onSelect: { defer: true } },
          interactions: [
            { type: 'click', selector: TRIGGER },
            { type: 'click', selector: '[data-mol-id="row-action-delete-a"]' },
            { type: 'settle', callback: 'onSelect', value: null },
          ],
        },
        {
          name: 'a click inside the menu keeps it open',
          props: { row: rows[0], actions: hrefAction, ariaLabel: 'Row actions' },
          interactions: [
            { type: 'click', selector: TRIGGER },
            { type: 'click', selector: POPOVER },
          ],
        },
        {
          name: 'a click outside closes the menu',
          props: { row: rows[0], actions: hrefAction, ariaLabel: 'Row actions' },
          interactions: [
            { type: 'click', selector: TRIGGER },
            { type: 'click', selector: 'body' },
          ],
        },
        {
          name: 'Escape closes the menu',
          props: { row: rows[0], actions: hrefAction, ariaLabel: 'Row actions' },
          interactions: [
            { type: 'click', selector: TRIGGER },
            { type: 'keydown', selector: TRIGGER, key: 'Escape' },
          ],
        },
        {
          name: 'Escape closes an open menu from inside it',
          props: { row: rows[0], actions: hrefAction, ariaLabel: 'Row actions' },
          interactions: [
            { type: 'click', selector: TRIGGER },
            { type: 'keydown', selector: '[data-mol-id="row-action-edit-a"]', key: 'Escape' },
          ],
        },
        {
          name: 'the trigger toggles the menu closed again',
          props: { row: rows[0], actions: hrefAction, ariaLabel: 'Row actions' },
          interactions: [
            { type: 'click', selector: TRIGGER },
            { type: 'click', selector: TRIGGER },
          ],
        },
        {
          name: 'a menu entry without an agent id',
          props: {
            row: rows[0],
            actions: [{ label: 'Archive', onSelect: { $callback: 'onSelect' } }],
            ariaLabel: 'Row actions',
          },
          interactions: [{ type: 'click', selector: TRIGGER }],
        },
      ],
    },
  ],
}
