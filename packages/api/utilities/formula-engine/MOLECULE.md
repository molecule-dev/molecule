# @molecule/api-formula-engine

Spreadsheet-style formula engine for molecule.dev.

Pure-function parser + evaluator + dependency tracker for
A1-notation formulas (`=SUM(A1:B5)`, `=IF(A1>0, "y", "n")`, etc.).
Designed for the spreadsheet flagship app and for ad-hoc line-item
math (e.g. invoice/billing computed columns).

Capabilities:
- **Arithmetic**: `+ - * / % ^` (with Excel-compatible coercions).
- **Comparison**: `= <> < <= > >=` (numbers, strings, dates, booleans).
- **String**: `&` and `CONCAT()` / `CONCATENATE()`.
- **References**: `A1`, `$A$1`, `BC42`, ranges `A1:B5`.
- **Aggregations**: `SUM`, `AVERAGE`/`AVG`, `MIN`, `MAX`, `COUNT`,
  `COUNTA`, `COUNTIF`, `SUMIF`.
- **Conditionals**: `IF`, `AND`, `OR`, `NOT`, `IFS`, `SWITCH`,
  `IFERROR`, `ISERROR`, `ISNUMBER`, `ISBLANK`.
- **Math**: `ROUND`, `ABS`, `MOD`, `POWER`, `SQRT`, `INT`, `CEILING`,
  `FLOOR`.
- **Dates**: `DATE`, `TODAY`, `NOW`, `YEAR`, `MONTH`, `DAY`,
  `DATEDIFF`/`DATEDIF` (units: D/M/Y/H/MIN/S).
- **Text**: `LEFT`, `RIGHT`, `MID`, `LEN`, `TRIM`, `UPPER`, `LOWER`,
  `SUBSTITUTE`.
- **Errors**: `#DIV/0!`, `#VALUE!`, `#REF!`, `#NAME?`, `#NUM!`,
  `#N/A`, plus engine-emitted `#CIRC!` for circular references.

The `Sheet` class wraps the lower-level helpers and provides
incremental recompute (only the transitive dependents of a changed
cell are re-evaluated). Use `parseFormula` + `evaluate` directly for
stateless one-shot math.

Pure functions, zero I/O, zero DB access, zero hardcoded UI text.

## Quick Start

```typescript
import { Sheet, parseFormula, evaluate } from '@molecule/api-formula-engine'

// Stateful: a small in-memory spreadsheet.
const sheet = new Sheet()
sheet.setValue('A1', 10)
sheet.setValue('A2', 20)
sheet.setFormula('A3', '=SUM(A1:A2)')
sheet.getValue('A3') // → 30

sheet.setValue('A1', 100)
sheet.getValue('A3') // → 120 (auto-recomputed)

// Stateless: ad-hoc evaluation against a lookup function.
const ast = parseFormula('=A1 * 1.0875')
const lineTotal = evaluate(ast, (coord) =>
  coord.col === 0 && coord.row === 0 ? 49.99 : null,
)
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-formula-engine
```

## API

### Interfaces

#### `BinaryOpNode`

AST: binary operation.

```typescript
interface BinaryOpNode {
  readonly kind: 'binary'
  readonly op: BinaryOperator
  readonly left: AstNode
  readonly right: AstNode
}
```

#### `BooleanLiteralNode`

AST: boolean literal (TRUE / FALSE).

```typescript
interface BooleanLiteralNode {
  readonly kind: 'boolean'
  readonly value: boolean
}
```

#### `CellCoord`

Cell coordinate as a 0-indexed `{ col, row }`. Column 0 = "A", row 0 = 1
(i.e. `A1` is `{ col: 0, row: 0 }`).

```typescript
interface CellCoord {
  readonly col: number
  readonly row: number
}
```

#### `CellRange`

A rectangular range of cells, half-inclusive of both corners.

```typescript
interface CellRange {
  readonly start: CellCoord
  readonly end: CellCoord
}
```

#### `ErrorLiteralNode`

AST: error literal (`#DIV/0!`, etc.).

```typescript
interface ErrorLiteralNode {
  readonly kind: 'errorLiteral'
  readonly code: FormulaErrorCode
}
```

#### `EvaluateOptions`

Options shared by `evaluate` and the `Sheet.recompute` family.

```typescript
interface EvaluateOptions {
  /** Override the clock used by `TODAY()` / `NOW()`. Defaults to `Date.now()`. */
  readonly now?: () => Date
}
```

#### `FormulaError`

Spreadsheet error value. Returned (never thrown) by `evaluate`/`getValue`
to allow downstream cells to propagate it like Excel.

```typescript
interface FormulaError {
  readonly type: 'error'
  readonly code: FormulaErrorCode
  readonly message?: string
}
```

#### `FunctionCallNode`

AST: function call (e.g. `SUM(A1:A10)`, `IF(A1>0, "y", "n")`).

```typescript
interface FunctionCallNode {
  readonly kind: 'call'
  readonly name: string
  readonly args: AstNode[]
}
```

#### `FunctionContext`

Context handed to function implementations. Currently exposes the
`now` function so date/time helpers can be made deterministic for
tests via `evaluateOptions.now`.

```typescript
interface FunctionContext {
  /** Returns the current date-time. */
  readonly now: () => Date
}
```

#### `NumberLiteralNode`

AST: numeric literal.

```typescript
interface NumberLiteralNode {
  readonly kind: 'number'
  readonly value: number
}
```

#### `RangeNode`

AST: cell range (e.g. `A1:B5`).

```typescript
interface RangeNode {
  readonly kind: 'range'
  readonly range: CellRange
  readonly text: string
}
```

#### `ReferenceNode`

AST: cell reference (e.g. `A1`, `$A$1`).

```typescript
interface ReferenceNode {
  readonly kind: 'reference'
  readonly coord: CellCoord
  /** Original textual representation, preserved for diagnostics. */
  readonly text: string
}
```

#### `SheetConfig`

Sheet-level configuration. `numCols` / `numRows` are advisory bounds
used when validating references; out-of-bounds references produce
`#REF!`.

```typescript
interface SheetConfig {
  /** Maximum number of columns. Default: 16384 (Excel's XFD). */
  readonly numCols?: number
  /** Maximum number of rows. Default: 1048576 (Excel's row count). */
  readonly numRows?: number
}
```

#### `StringLiteralNode`

AST: string literal (double-quoted).

```typescript
interface StringLiteralNode {
  readonly kind: 'string'
  readonly value: string
}
```

#### `Token`

Lexical token. `value` is the raw source text; `op` carries the
normalized operator string for `kind: 'op'` tokens.

```typescript
interface Token {
  readonly kind: TokenKind
  readonly value: string
  readonly position: number
  readonly errorCode?: FormulaErrorCode
}
```

#### `UnaryOpNode`

AST: unary operation (e.g. `-A1`, `A1%`).

```typescript
interface UnaryOpNode {
  readonly kind: 'unary'
  readonly op: UnaryOperator
  readonly operand: AstNode
}
```

### Types

#### `AstNode`

AST node kinds emitted by the parser.

```typescript
type AstNode =
  | NumberLiteralNode
  | StringLiteralNode
  | BooleanLiteralNode
  | ErrorLiteralNode
  | ReferenceNode
  | RangeNode
  | UnaryOpNode
  | BinaryOpNode
  | FunctionCallNode
```

#### `BinaryOperator`

Binary operators. `^` = power, `&` = string concat,
`=`/`<>` = equality, `<`/`<=`/`>`/`>=` = ordering.

```typescript
type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '^'
  | '&'
  | '='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
```

#### `CellValue`

Possible cell values. `null` represents an empty cell; numbers, strings,
booleans, and `Date`s are all valid scalar values. `FormulaError`
represents a propagating error.

```typescript
type CellValue = number | string | boolean | Date | null | FormulaError
```

#### `FormulaErrorCode`

Spreadsheet error codes. Errors propagate through expressions: any
arithmetic or function call involving a `FormulaError` returns the
left-most error unchanged (Excel-compatible semantics).

```typescript
type FormulaErrorCode =
  | '#DIV/0!'
  | '#VALUE!'
  | '#REF!'
  | '#NAME?'
  | '#NUM!'
  | '#N/A'
  | '#CIRC!'
```

#### `FormulaFunction`

Function implementation signature. Functions receive already-evaluated
argument expressions: ranges are expanded into flat `CellValue[]`
arrays. Functions return a `CellValue` (including `FormulaError` for
domain errors).

```typescript
type FormulaFunction = (
  args: ReadonlyArray<CellValue | ReadonlyArray<CellValue>>,
  ctx: FunctionContext,
) => CellValue
```

#### `ResolveCell`

Function used to resolve a cell coordinate to its value. Returns
`null` for empty cells. Implementations may evaluate dependent
formulas (in which case they should detect cycles and return a
`#CIRC!` error to the caller).

```typescript
type ResolveCell = (coord: CellCoord) => CellValue
```

#### `TokenKind`

Lexical token kinds.

```typescript
type TokenKind =
  | 'number'
  | 'string'
  | 'boolean'
  | 'error'
  | 'identifier'
  | 'reference'
  | 'range'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'comma'
```

#### `UnaryOperator`

Unary operators supported by the parser.

```typescript
type UnaryOperator = '+' | '-' | '%'
```

### Classes

#### `Sheet`

In-memory single-sheet engine. References use A1 notation (`A1`,
`$A$1`, `BC42`).

### Functions

#### `collectReferences(node)`

Walk an AST and collect every coordinate it references (single
references and every cell inside ranges).

```typescript
function collectReferences(node: AstNode): CellCoord[]
```

- `node` — Root AST node.

**Returns:** Flat list of referenced coordinates (may contain duplicates).

#### `columnIndexToLetters(index)`

Convert a 0-indexed column to letters (`0`→`A`, `25`→`Z`, `26`→`AA`).

```typescript
function columnIndexToLetters(index: number): string
```

- `index` — 0-indexed column.

**Returns:** Column letters (uppercase).

#### `columnLettersToIndex(letters)`

Convert a column letter (`A`, `Z`, `AA`, `XFD`) to a 0-indexed column.

```typescript
function columnLettersToIndex(letters: string): number
```

- `letters` — Column letters (case-insensitive).

**Returns:** 0-indexed column number.

#### `compareValues(left, right)`

Compare two scalar cell values (Excel ordering: number < string,
boolean compared as 0/1 within numbers).

```typescript
function compareValues(left: CellValue, right: CellValue): number | FormulaError
```

- `left` — Left operand.
- `right` — Right operand.

**Returns:** -1, 0, 1, or `FormulaError` if uncomparable.

#### `coordKey(coord)`

Encode a coordinate to a cache-friendly string key (`"col,row"`).

```typescript
function coordKey(coord: CellCoord): string
```

- `coord` — Cell coordinate.

**Returns:** Stable string key.

#### `dateToSerial(date)`

Convert a `Date` to an Excel serial number (days since 1899-12-30).

```typescript
function dateToSerial(date: Date): number
```

- `date` — Date instance.

**Returns:** Excel serial date.

#### `evaluate(node, resolveCell, options)`

Evaluate an AST in the context of a cell-resolution function.

```typescript
function evaluate(node: AstNode, resolveCell: ResolveCell, options?: EvaluateOptions): CellValue
```

- `node` — Root AST node.
- `resolveCell` — Function returning the value of a referenced cell.
- `options` — Evaluation options.

**Returns:** Evaluated cell value (errors are returned, not thrown).

#### `firstError(values)`

Returns the first error encountered in a flat list, or `null` if none.

```typescript
function firstError(values: readonly CellValue[]): FormulaError | null
```

- `values` — Cell values to scan.

**Returns:** The first error value, or `null`.

#### `formatCellReference(coord)`

Format a cell coordinate as A1-style text (`{col:0,row:0}` → `A1`).

```typescript
function formatCellReference(coord: CellCoord): string
```

- `coord` — Cell coordinate.

**Returns:** A1-style reference text.

#### `isError(value)`

Type-guard for `FormulaError`.

```typescript
function isError(value: unknown): boolean
```

- `value` — Cell value to inspect.

**Returns:** `true` if the value is a propagating error.

#### `iterateRange(range)`

Iterate every coordinate in a range. Yields top-to-bottom, left-to-right.

```typescript
function iterateRange(range: CellRange): Generator<CellCoord, any, any>
```

- `range` — Cell range.

#### `makeError(code, message)`

Construct a `FormulaError` value.

```typescript
function makeError(code: FormulaErrorCode, message?: string): FormulaError
```

- `code` — Error code.
- `message` — Optional human-readable description.

**Returns:** The error value.

#### `parseCellRange(ref)`

Parse a cell range (e.g. `A1:B5`). Normalizes so `start` is top-left
and `end` is bottom-right regardless of input ordering.

```typescript
function parseCellRange(ref: string): CellRange | null
```

- `ref` — Range text.

**Returns:** Parsed range, or `null` if invalid.

#### `parseCellReference(ref)`

Parse a single cell reference (e.g. `A1`, `$A$1`, `BC42`).

```typescript
function parseCellReference(ref: string): CellCoord | null
```

- `ref` — Reference text.

**Returns:** Parsed cell coordinate, or `null` if invalid.

#### `parseFormula(input)`

Parse a formula string into an AST.

```typescript
function parseFormula(input: string): AstNode
```

- `input` — Formula text (with or without a leading `=`).

**Returns:** Root AST node.

#### `refOf(coord)`

Reformat a cell coordinate as A1-style text. Re-exported for
convenience.

```typescript
function refOf(coord: CellCoord): string
```

- `coord` — Cell coordinate.

**Returns:** A1-style reference text.

#### `serialToDate(serial)`

Convert an Excel serial number to a `Date` (UTC).

```typescript
function serialToDate(serial: number): Date
```

- `serial` — Excel serial date.

**Returns:** Date instance.

#### `toBoolean(value)`

Coerce a cell value to a boolean (Excel-compatible).

```typescript
function toBoolean(value: CellValue): boolean | FormulaError
```

- `value` — Cell value.

**Returns:** Boolean, or `FormulaError` on failure.

#### `tokenize(input)`

Tokenize a formula string. The leading `=` (if present) is stripped
by the caller — pass the *body* of the formula here.

```typescript
function tokenize(input: string): Token[]
```

- `input` — Raw formula text (no leading `=`).

**Returns:** Flat token list.

#### `toNumber(value)`

Coerce a cell value to a number (Excel-compatible).

- `null` → 0
- boolean → 0/1
- `Date` → days since 1899-12-30 (Excel's epoch)
- string → parsed as number, `#VALUE!` if not parseable
- error → propagated unchanged

```typescript
function toNumber(value: CellValue): number | FormulaError
```

- `value` — Cell value.

**Returns:** Number, or `FormulaError` on failure.

#### `topologicalSort(dependents, keys)`

Topologically sort a set of coordinate keys by their dependency graph
such that, for any edge `a → b` (b depends on a), `a` precedes `b`
in the result.

Uses Kahn's algorithm. If a cycle is detected, the cycle members are
returned in `cycle` and excluded from `order` — callers typically
mark cycle members with a `#CIRC!` error.

```typescript
function topologicalSort(dependents: ReadonlyMap<string, ReadonlySet<string>>, keys: readonly string[]): { order: string[]; cycle: Set<string>; }
```

- `dependents` — Map from a key to the set of keys that depend on it.
- `keys` — Keys to sort.

**Returns:** `{ order, cycle }` — `order` is the topological order;
 *   `cycle` is the set of keys participating in (or downstream of) a
 *   cycle.

#### `toStringValue(value)`

Coerce a cell value to a string for display / `&` concatenation.

```typescript
function toStringValue(value: CellValue): string | FormulaError
```

- `value` — Cell value.

**Returns:** String, or `FormulaError` for propagating errors.

### Constants

#### `BUILTIN_FUNCTIONS`

Map of function names (uppercase) to implementations. Aliases like
`AVG → AVERAGE` and `DATEDIF → DATEDIFF` map to the same function
reference.

```typescript
const BUILTIN_FUNCTIONS: Readonly<Record<string, FormulaFunction>>
```
