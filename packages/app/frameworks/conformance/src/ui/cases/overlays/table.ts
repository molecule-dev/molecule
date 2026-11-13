/**
 * Table parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

const DATA = [
  { id: 'r1', name: 'Ada Lovelace', role: 'admin' },
  { id: 'r2', name: 'Grace Hopper', role: 'editor' },
  { id: 'r3', name: 'Alan Turing', role: 'viewer' },
]

const COLUMNS = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'role', header: 'Role' },
]

/** Table: borders, stripes, hover, loading overlay, empty state, sorting, alignment, widths, row clicks. */
export const tableCases: UIComponentCases = {
  component: 'Table',
  keyedLists: [
    { prop: 'data', selector: 'tbody tr' },
    { prop: 'data', selector: 'tbody tr', caseName: 'rowKey from a data field' },
    { prop: 'columns', selector: 'thead th' },
  ],
  cases: [
    { name: 'defaults', props: { data: DATA, columns: COLUMNS } },
    { name: 'bordered', props: { data: DATA, columns: COLUMNS, bordered: true } },
    { name: 'striped', props: { data: DATA, columns: COLUMNS, striped: true } },
    { name: 'not hoverable', props: { data: DATA, columns: COLUMNS, hoverable: false } },
    { name: 'loading overlay', props: { data: DATA, columns: COLUMNS, loading: true } },
    { name: 'empty data default message', props: { data: [], columns: COLUMNS } },
    {
      name: 'empty data with custom emptyContent',
      props: { data: [], columns: COLUMNS },
      slots: { emptyContent: [{ tag: 'strong', children: ['Nothing here yet'] }] },
    },
    {
      name: 'rowKey from a data field',
      props: { data: DATA, columns: COLUMNS, rowKey: 'id' },
    },
    {
      name: 'size prop is accepted',
      props: { data: DATA, columns: COLUMNS, size: 'sm' },
    },
    {
      name: 'className, style and testId',
      props: {
        data: DATA,
        columns: COLUMNS,
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'users',
      },
    },
    {
      name: 'sorted ascending',
      props: { data: DATA, columns: COLUMNS, sort: { key: 'name', direction: 'asc' } },
    },
    {
      name: 'sorted descending',
      props: { data: DATA, columns: COLUMNS, sort: { key: 'name', direction: 'desc' } },
    },
    {
      name: 'sortable column without an active sort',
      props: { data: DATA, columns: COLUMNS, sort: { key: 'role', direction: 'asc' } },
    },
    {
      name: 'column alignment',
      props: {
        data: DATA,
        columns: [
          { key: 'name', header: 'Name' },
          { key: 'role', header: 'Role', align: 'center' },
        ],
      },
    },
    {
      name: 'right aligned column',
      props: { data: DATA, columns: [{ key: 'role', header: 'Role', align: 'right' }] },
    },
    {
      name: 'column width',
      props: {
        data: DATA,
        columns: [
          { key: 'name', header: 'Name', width: '30%' },
          { key: 'role', header: 'Role' },
        ],
      },
    },
    {
      name: 'clicking a sortable header calls onSort',
      props: { data: DATA, columns: COLUMNS },
      callbacks: ['onSort'],
      interactions: [
        { type: 'click', selector: 'th' },
        { type: 'click', selector: 'th' },
      ],
    },
    {
      name: 'clicking a plain header does not call onSort',
      props: { data: DATA, columns: [{ key: 'role', header: 'Role' }] },
      callbacks: ['onSort'],
      interactions: [{ type: 'click', selector: 'th' }],
    },
    {
      name: 'clicking a row calls onRowClick',
      props: { data: DATA, columns: COLUMNS },
      callbacks: ['onRowClick'],
      interactions: [{ type: 'click', selector: 'tbody tr' }],
    },
    {
      name: 'rows are clickable with onRowClick',
      props: { data: DATA, columns: COLUMNS },
      callbacks: ['onRowClick'],
    },
    {
      name: 'column render returns nodes interpolated from the cell and row',
      props: {
        data: DATA,
        columns: [
          {
            key: 'name',
            header: 'Name',
            render: {
              $fn: 'renderName',
              nodes: [
                { tag: 'strong', attrs: { 'data-role': '{1.role}' }, children: ['{0} (#{2})'] },
              ],
            },
          },
          { key: 'role', header: 'Role' },
        ],
      },
    },
    {
      name: 'column render returns an interpolated string',
      props: {
        data: DATA,
        columns: [
          { key: 'name', header: 'Name' },
          { key: 'role', header: 'Role', render: { $fn: 'renderRole', format: '[{1.name}: {0}]' } },
        ],
      },
    },
    {
      name: 'rowKey as a function',
      props: {
        data: DATA,
        columns: COLUMNS,
        rowKey: { $fn: 'rowKeyFn', format: '{0.id}' },
      },
    },
  ],
}
