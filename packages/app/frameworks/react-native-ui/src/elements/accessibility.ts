/**
 * Maps an element's web accessibility props to React Native's.
 *
 * @module
 */

import { isValidElement, type ReactNode } from 'react'
import { Platform, type ViewProps } from 'react-native'

import { formatNumber, t } from '@molecule/app-i18n'
import type { AriaAttributes, AriaBoolean, DataAttributes, ElementRole } from '@molecule/app-ui'

/**
 * The React Native role (`role` prop) of each element role: the same name, the closest one React
 * Native has (`gridcell` is `cell`), or none (text semantics such as `paragraph` and `code`, and
 * `textbox`, which a `TextInput` already is).
 */
const ROLE: Readonly<Record<ElementRole, ViewProps['role']>> = {
  alert: 'alert',
  alertdialog: 'alertdialog',
  application: 'application',
  article: 'article',
  banner: 'banner',
  blockquote: undefined,
  button: 'button',
  caption: undefined,
  cell: 'cell',
  checkbox: 'checkbox',
  code: undefined,
  columnheader: 'columnheader',
  combobox: 'combobox',
  complementary: 'complementary',
  contentinfo: 'contentinfo',
  definition: 'definition',
  deletion: undefined,
  dialog: 'dialog',
  directory: 'directory',
  document: 'document',
  emphasis: undefined,
  feed: 'feed',
  figure: 'figure',
  form: 'form',
  generic: undefined,
  grid: 'grid',
  gridcell: 'cell',
  group: 'group',
  heading: 'heading',
  img: 'img',
  insertion: undefined,
  link: 'link',
  list: 'list',
  listbox: 'list',
  listitem: 'listitem',
  log: 'log',
  main: 'main',
  marquee: 'marquee',
  math: 'math',
  menu: 'menu',
  menubar: 'menubar',
  menuitem: 'menuitem',
  menuitemcheckbox: 'menuitem',
  menuitemradio: 'menuitem',
  meter: 'meter',
  navigation: 'navigation',
  none: 'none',
  note: 'note',
  option: 'option',
  paragraph: undefined,
  presentation: 'presentation',
  progressbar: 'progressbar',
  radio: 'radio',
  radiogroup: 'radiogroup',
  region: 'region',
  row: 'row',
  rowgroup: 'rowgroup',
  rowheader: 'rowheader',
  scrollbar: 'scrollbar',
  search: 'searchbox',
  searchbox: 'searchbox',
  separator: 'separator',
  slider: 'slider',
  spinbutton: 'spinbutton',
  status: 'status',
  strong: undefined,
  subscript: undefined,
  superscript: undefined,
  switch: 'switch',
  tab: 'tab',
  table: 'table',
  tablist: 'tablist',
  tabpanel: 'tabpanel',
  term: 'term',
  textbox: undefined,
  time: undefined,
  timer: 'timer',
  toolbar: 'toolbar',
  tooltip: 'tooltip',
  tree: 'tree',
  treegrid: 'treegrid',
  treeitem: 'treeitem',
}

/** The role a web tag implies, where React Native has one. */
const IMPLIED: Readonly<Record<string, NonNullable<ViewProps['role']>>> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  ul: 'list',
  ol: 'list',
  li: 'listitem',
  nav: 'navigation',
  main: 'main',
  aside: 'complementary',
  article: 'article',
  button: 'button',
  form: 'form',
  fieldset: 'group',
  table: 'table',
  thead: 'rowgroup',
  tbody: 'rowgroup',
  tfoot: 'rowgroup',
  tr: 'row',
  th: 'columnheader',
  td: 'cell',
  figure: 'figure',
}

/** The level of a heading tag, which react-native-web renders as that `h1`–`h6`. */
const HEADING_LEVEL: Readonly<Record<string, number>> = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 }

/** The accessibility and identity props every native element receives. */
export type NativeAccessibility = Pick<
  ViewProps,
  | 'role'
  | 'id'
  | 'testID'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-hidden'
  | 'aria-disabled'
  | 'aria-expanded'
  | 'aria-selected'
  | 'aria-checked'
  | 'aria-busy'
  | 'aria-live'
  | 'aria-modal'
  | 'aria-valuemax'
  | 'aria-valuemin'
  | 'aria-valuenow'
  | 'aria-valuetext'
  | 'aria-level'
  | 'accessibilityHint'
> & {
  accessibilityCollectionItem?: {
    rowIndex: number
    columnIndex: number
    rowSpan: number
    columnSpan: number
    heading: boolean
  }
}

/**
 * A boolean ARIA value as a device reads it: React DOM's spelling `'true'`/`'false'` as a boolean.
 *
 * @param value - The prop's value.
 * @returns The boolean, or `undefined` when the prop is unset.
 */
function ariaFlag(value: AriaBoolean | undefined): boolean | undefined {
  return value === undefined ? undefined : value === true || value === 'true'
}

/** The element props {@link nativeAccessibility} reads. */
export type AccessibilitySource = AriaAttributes &
  DataAttributes & { id?: string; role?: ElementRole; children?: ReactNode }

/** Reads the visible text used by default to name a container. */
function childText(child: ReactNode): string {
  if (typeof child === 'string' || typeof child === 'number') return String(child)
  if (Array.isArray(child)) return child.map(childText).filter(Boolean).join(' ')
  if (isValidElement<AriaAttributes & { hidden?: boolean; children?: ReactNode }>(child)) {
    if (child.props.hidden || ariaFlag(child.props['aria-hidden'])) return ''
    return child.props['aria-label'] ?? childText(child.props.children)
  }
  return ''
}

/** Maps one-based positions at the native API boundary, and supplies speech for other metadata. */
function collectionAccessibility(
  props: AccessibilitySource,
  role: ViewProps['role'],
  level: number | undefined,
): Pick<NativeAccessibility, 'aria-label' | 'accessibilityHint' | 'accessibilityCollectionItem'> {
  const row = props['aria-rowindex']
  const col = props['aria-colindex']
  const rows = props['aria-rowcount']
  const cols = props['aria-colcount']
  // RN 0.79's Android Paper view config exposes item metadata. Fabric and iOS need speech.
  const item =
    Platform.OS === 'android' &&
    !('nativeFabricUIManager' in globalThis) &&
    row !== undefined &&
    row >= 1 &&
    col !== undefined &&
    col >= 1
      ? {
          rowIndex: row - 1,
          columnIndex: col - 1,
          rowSpan: 1,
          columnSpan: 1,
          heading: role === 'rowheader' || role === 'columnheader',
        }
      : undefined
  const parts: string[] = []
  if (level !== undefined && level >= 1)
    parts.push(
      t('ui.a11y.level', { level: formatNumber(level) }, { defaultValue: 'Level {{level}}' }),
    )
  if (!item && row !== undefined && row >= 1)
    parts.push(
      t('ui.a11y.rowPosition', { row: formatNumber(row) }, { defaultValue: 'Row number {{row}}' }),
    )
  if (!item && col !== undefined && col >= 1)
    parts.push(
      t(
        'ui.a11y.columnPosition',
        { column: formatNumber(col) },
        { defaultValue: 'Column number {{column}}' },
      ),
    )
  if (rows !== undefined && rows >= 0)
    parts.push(
      t(
        'ui.a11y.rowTotal',
        { count: rows, total: formatNumber(rows) },
        { defaultValue: '{{total}} rows' },
      ),
    )
  if (cols !== undefined && cols >= 0)
    parts.push(
      t(
        'ui.a11y.columnTotal',
        { count: cols, total: formatNumber(cols) },
        { defaultValue: '{{total}} columns' },
      ),
    )
  const label = props['aria-label']
  if (parts.length === 0) return { 'aria-label': label, accessibilityCollectionItem: item }
  const description = parts.join(', ')
  const name = label ?? childText(props.children).trim()
  // A platform-resolved label or an opaque child can keep its platform-computed name.
  if (props['aria-labelledby'] || !name) {
    return {
      'aria-label': label,
      accessibilityHint: description,
      accessibilityCollectionItem: item,
    }
  }
  return {
    'aria-label': t(
      'ui.a11y.withDetails',
      { label: name, details: description },
      { defaultValue: '{{label}}, {{details}}' },
    ),
    accessibilityCollectionItem: item,
  }
}

/**
 * React Native's accessibility props for an element: its role (explicit, or the one its tag
 * implies), the ARIA attributes React Native applies (`aria-pressed` and `aria-current` read as
 * selected), its id, and `data-mol-id` (else `data-testid`) as its `testID`. Other `data-*` attributes and ARIA
 * attributes React Native has no equivalent for are left out.
 *
 * @param props - The element's props.
 * @param tag - The element's web tag.
 * @returns The native props.
 */
export function nativeAccessibility(props: AccessibilitySource, tag?: string): NativeAccessibility {
  const role = props.role ? ROLE[props.role] : tag ? IMPLIED[tag] : undefined
  const pressed = props['aria-pressed']
  const current = props['aria-current']
  const checked = props['aria-checked']
  const testID = props['data-mol-id'] ?? props['data-testid']
  const live = props['aria-live']
  const level = props['aria-level'] ?? (tag ? HEADING_LEVEL[tag] : undefined)
  return {
    ...collectionAccessibility(props, role, level),
    role,
    id: props.id,
    testID: testID === undefined ? undefined : String(testID),
    'aria-labelledby': props['aria-labelledby'],
    'aria-hidden': ariaFlag(props['aria-hidden']),
    'aria-disabled': ariaFlag(props['aria-disabled']),
    'aria-expanded': ariaFlag(props['aria-expanded']),
    'aria-selected':
      ariaFlag(props['aria-selected']) ??
      (pressed === undefined ? undefined : pressed === true || pressed === 'true') ??
      (current === undefined ? undefined : current !== false && current !== 'false'),
    'aria-checked': checked === 'mixed' ? 'mixed' : ariaFlag(checked),
    'aria-busy': ariaFlag(props['aria-busy']),
    'aria-live': live,
    'aria-modal': ariaFlag(props['aria-modal']),
    'aria-valuemax': props['aria-valuemax'],
    'aria-valuemin': props['aria-valuemin'],
    'aria-valuenow': props['aria-valuenow'],
    'aria-valuetext': props['aria-valuetext'],
    'aria-level': level,
  }
}
