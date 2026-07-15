# @molecule/app-spreadsheet-grid-react

High-performance virtualized spreadsheet cell grid for React.

Exports:
- `<SpreadsheetGrid>` — the grid component (virtualized cells, frozen
  rows/columns, range selection, copy/paste as TSV, in-cell editing).
- Types: `SpreadsheetGridProps`, `SpreadsheetSelection`, `CellMap`,
  `CellRef`, `CellValue`.
- Helpers: `cellRef()`, `columnLetter()`, `normalizeSelection()`,
  `isInSelection()`, `formatCellValue()`, `parseClipboardTsv()`,
  `serializeSelectionTsv()`, `computeVisibleRange()`.

Pairs with `@molecule/api-formula-engine` for formula evaluation —
pass evaluated `cells` plus an optional `renderCell` to display
formula results.

## Quick Start

```tsx
import { SpreadsheetGrid, type CellMap } from '@molecule/app-spreadsheet-grid-react'

function Sheet() {
  const [cells, setCells] = useState<CellMap>(new Map())
  const [selection, setSelection] = useState({ r1: 0, c1: 0, r2: 0, c2: 0 })
  return (
    <SpreadsheetGrid
      rows={1000}
      columns={26}
      cells={cells}
      onCellChange={(ref, value) => {
        setCells((prev) => {
          const next = new Map(prev)
          if (value === null) next.delete(ref)
          else next.set(ref, value)
          return next
        })
      }}
      selection={selection}
      onSelectionChange={setSelection}
      frozenRows={1}
      frozenCols={1}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-spreadsheet-grid-react @molecule/app-i18n @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `SpreadsheetGridProps`

Props for `<SpreadsheetGrid>`.

```typescript
interface SpreadsheetGridProps {
  /** Total number of rows in the grid. */
  rows: number
  /** Total number of columns in the grid. */
  columns: number
  /** Sparse cell-data map. Cells not present render as empty. */
  cells: CellMap
  /** Called when the user commits an edit (Enter, Tab, or focus loss). */
  onCellChange: (ref: CellRef, value: CellValue) => void
  /** Current selection. */
  selection: SpreadsheetSelection
  /** Called when the user changes the selection (click, drag, Shift+click). */
  onSelectionChange: (selection: SpreadsheetSelection) => void
  /** Number of rows frozen at the top (default `0`). */
  frozenRows?: number
  /** Number of columns frozen on the left (default `0`). */
  frozenCols?: number
  /** Per-cell width in pixels (default `96`). */
  cellWidth?: number
  /** Per-cell height in pixels (default `28`). */
  cellHeight?: number
  /** Width of the row-number gutter on the left (default `48`). */
  gutterWidth?: number
  /** Height of the column-letter header (default `28`). */
  headerHeight?: number
  /** Visible viewport width in pixels (default `720`). */
  viewportWidth?: number
  /** Visible viewport height in pixels (default `360`). */
  viewportHeight?: number
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /**
   * Optional cell renderer. Receives the cached display string plus the
   * raw value. Defaults to plain text. Use to render formula results
   * (`'=A1+B1'` → evaluated number) or custom formatting.
   */
  renderCell?: (value: CellValue | undefined, ref: CellRef) => ReactElement | string
}
```

#### `SpreadsheetSelection`

Inclusive rectangular selection — `r1`/`c1` is the anchor (where the
drag started) and `r2`/`c2` is the focus (where it ended). Both are
0-indexed. A single-cell selection has `r1 === r2 && c1 === c2`.

```typescript
interface SpreadsheetSelection {
  r1: number
  c1: number
  r2: number
  c2: number
}
```

### Types

#### `CellMap`

Sparse map from `CellRef` to value. Cells not present in the map render
as empty. Using a `Map` keeps update cost O(1) regardless of grid size.

```typescript
type CellMap = Map<CellRef, CellValue>
```

#### `CellRef`

Cell reference in A1 notation (e.g. `'A1'`, `'AB17'`). Column letters are
uppercase; row numbers are 1-indexed.

```typescript
type CellRef = string
```

#### `CellValue`

Primitive value stored in a cell. Formula strings start with `'='` —
evaluation is the host application's responsibility (typically wired
through `@molecule/api-formula-engine`).

```typescript
type CellValue = string | number | boolean | null
```

### Functions

#### `cellRef(row, col)`

Build an A1 reference from 0-indexed row and column numbers.

```typescript
function cellRef(row: number, col: number): string
```

- `row` — 0-indexed row number.
- `col` — 0-indexed column number.

**Returns:** A1-style cell reference (e.g. `'B3'`).

#### `columnLetter(col)`

Convert a 0-indexed column number to its A1 letter (`0` → `'A'`, `25` →
`'Z'`, `26` → `'AA'`, `701` → `'ZZ'`, `702` → `'AAA'`).

```typescript
function columnLetter(col: number): string
```

- `col` — 0-indexed column number.

**Returns:** Uppercase A1 column letter.

#### `computeVisibleRange(scroll, viewport, itemSize, total, overscan)`

Compute the inclusive `[start, end]` window of indices to render given
the scroll offset, viewport size, item size, and total count. Adds an
`overscan` margin on each side so newly-visible cells are pre-rendered
during fast scrolls.

```typescript
function computeVisibleRange(scroll: number, viewport: number, itemSize: number, total: number, overscan?: number): [number, number]
```

- `scroll` — Current scroll position (px).
- `viewport` — Viewport size (px) along the scroll axis.
- `itemSize` — Per-item size (px) along the scroll axis.
- `total` — Total number of items.
- `overscan` — Extra items to render on each side (default `2`).

**Returns:** `[startIndex, endIndex]` (both inclusive, clamped to `[0, total)`).

#### `formatCellValue(value)`

Format a cell value for display. `null`/`undefined` render as the empty
string; booleans become `TRUE`/`FALSE` (matching common spreadsheet
tools); numbers and strings stringify as-is.

```typescript
function formatCellValue(value: CellValue | undefined): string
```

- `value` — The raw cell value.

**Returns:** Display string.

#### `isInSelection(sel, row, col)`

Test whether `(row, col)` is inside the selection.

```typescript
function isInSelection(sel: SpreadsheetSelection, row: number, col: number): boolean
```

- `sel` — Selection to test against.
- `row` — 0-indexed row number.
- `col` — 0-indexed column number.

**Returns:** `true` when the cell is in the selection.

#### `normalizeSelection(sel)`

Normalize a possibly-inverted selection so `r1 <= r2 && c1 <= c2`.

```typescript
function normalizeSelection(sel: SpreadsheetSelection): SpreadsheetSelection
```

- `sel` — Raw selection (anchor and focus).

**Returns:** Selection with `r1`/`c1` as top-left and `r2`/`c2` as bottom-right.

#### `parseClipboardTsv(text)`

Parse a TSV (tab-separated values) string into a 2D array of strings.
Empty trailing lines are ignored. Used to ingest clipboard paste data.

```typescript
function parseClipboardTsv(text: string): string[][]
```

- `text` — Clipboard text (typically TSV).

**Returns:** 2D array of cell strings — `rows[r][c]`.

#### `serializeSelectionTsv(cells, sel)`

Serialize a rectangular selection to TSV (tab-separated values) so it
can round-trip with Excel/Google Sheets via the system clipboard.

```typescript
function serializeSelectionTsv(cells: CellMap, sel: SpreadsheetSelection): string
```

- `cells` — Source cell map.
- `sel` — Selection to serialize.

**Returns:** TSV-formatted string with `\n` row separators.

#### `SpreadsheetGrid(props)`

High-performance virtualized spreadsheet cell grid.

Renders an `rows × columns` grid backed by a sparse `Map<cellRef, value>`,
with frozen rows/columns, range selection (click + drag, Shift+click),
copy/paste through the system clipboard as TSV, and in-cell editing
(double-click → input; Enter commits, Escape cancels).

Only the cells inside the visible viewport (plus a small overscan
margin) are rendered, so 10k × 10k grids stay responsive.

Pairs with `@molecule/api-formula-engine` for formula evaluation —
pass an evaluated `cells` map and a `renderCell` that can look up
formula results.

```typescript
function SpreadsheetGrid(props: SpreadsheetGridProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props (see {@link SpreadsheetGridProps}).

**Returns:** The rendered grid.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

## Translations

Translation strings are provided by `@molecule/app-locales-spreadsheet-grid`.
