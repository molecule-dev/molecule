/**
 * Type definitions for the formula-engine.
 *
 * @module
 */

/**
 * Spreadsheet error codes. Errors propagate through expressions: any
 * arithmetic or function call involving a `FormulaError` returns the
 * left-most error unchanged (Excel-compatible semantics).
 */
export type FormulaErrorCode =
  | '#DIV/0!'
  | '#VALUE!'
  | '#REF!'
  | '#NAME?'
  | '#NUM!'
  | '#N/A'
  | '#CIRC!'

/**
 * Spreadsheet error value. Returned (never thrown) by `evaluate`/`getValue`
 * to allow downstream cells to propagate it like Excel.
 */
export interface FormulaError {
  readonly type: 'error'
  readonly code: FormulaErrorCode
  readonly message?: string
}

/**
 * Possible cell values. `null` represents an empty cell; numbers, strings,
 * booleans, and `Date`s are all valid scalar values. `FormulaError`
 * represents a propagating error.
 */
export type CellValue = number | string | boolean | Date | null | FormulaError

/**
 * Cell coordinate as a 0-indexed `{ col, row }`. Column 0 = "A", row 0 = 1
 * (i.e. `A1` is `{ col: 0, row: 0 }`).
 */
export interface CellCoord {
  readonly col: number
  readonly row: number
}

/**
 * A rectangular range of cells, half-inclusive of both corners.
 */
export interface CellRange {
  readonly start: CellCoord
  readonly end: CellCoord
}

/**
 * AST node kinds emitted by the parser.
 */
export type AstNode =
  | NumberLiteralNode
  | StringLiteralNode
  | BooleanLiteralNode
  | ErrorLiteralNode
  | ReferenceNode
  | RangeNode
  | UnaryOpNode
  | BinaryOpNode
  | FunctionCallNode

/** AST: numeric literal. */
export interface NumberLiteralNode {
  readonly kind: 'number'
  readonly value: number
}

/** AST: string literal (double-quoted). */
export interface StringLiteralNode {
  readonly kind: 'string'
  readonly value: string
}

/** AST: boolean literal (TRUE / FALSE). */
export interface BooleanLiteralNode {
  readonly kind: 'boolean'
  readonly value: boolean
}

/** AST: error literal (`#DIV/0!`, etc.). */
export interface ErrorLiteralNode {
  readonly kind: 'errorLiteral'
  readonly code: FormulaErrorCode
}

/** AST: cell reference (e.g. `A1`, `$A$1`). */
export interface ReferenceNode {
  readonly kind: 'reference'
  readonly coord: CellCoord
  /** Original textual representation, preserved for diagnostics. */
  readonly text: string
}

/** AST: cell range (e.g. `A1:B5`). */
export interface RangeNode {
  readonly kind: 'range'
  readonly range: CellRange
  readonly text: string
}

/**
 * Unary operators supported by the parser.
 */
export type UnaryOperator = '+' | '-' | '%'

/** AST: unary operation (e.g. `-A1`, `A1%`). */
export interface UnaryOpNode {
  readonly kind: 'unary'
  readonly op: UnaryOperator
  readonly operand: AstNode
}

/**
 * Binary operators. `^` = power, `&` = string concat,
 * `=`/`<>` = equality, `<`/`<=`/`>`/`>=` = ordering.
 */
export type BinaryOperator =
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

/** AST: binary operation. */
export interface BinaryOpNode {
  readonly kind: 'binary'
  readonly op: BinaryOperator
  readonly left: AstNode
  readonly right: AstNode
}

/** AST: function call (e.g. `SUM(A1:A10)`, `IF(A1>0, "y", "n")`). */
export interface FunctionCallNode {
  readonly kind: 'call'
  readonly name: string
  readonly args: AstNode[]
}

/**
 * Function implementation signature. Functions receive already-evaluated
 * argument expressions: ranges are expanded into flat `CellValue[]`
 * arrays. Functions return a `CellValue` (including `FormulaError` for
 * domain errors).
 */
export type FormulaFunction = (
  args: ReadonlyArray<CellValue | ReadonlyArray<CellValue>>,
  ctx: FunctionContext,
) => CellValue

/**
 * Context handed to function implementations. Currently exposes the
 * `now` function so date/time helpers can be made deterministic for
 * tests via `evaluateOptions.now`.
 */
export interface FunctionContext {
  /** Returns the current date-time. */
  readonly now: () => Date
}

/**
 * Options shared by `evaluate` and the `Sheet.recompute` family.
 */
export interface EvaluateOptions {
  /** Override the clock used by `TODAY()` / `NOW()`. Defaults to `Date.now()`. */
  readonly now?: () => Date
}

/**
 * Sheet-level configuration. `numCols` / `numRows` are advisory bounds
 * used when validating references; out-of-bounds references produce
 * `#REF!`.
 */
export interface SheetConfig {
  /** Maximum number of columns. Default: 16384 (Excel's XFD). */
  readonly numCols?: number
  /** Maximum number of rows. Default: 1048576 (Excel's row count). */
  readonly numRows?: number
}
