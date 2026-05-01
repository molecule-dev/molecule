/**
 * High-level Sheet engine.
 *
 * Wraps the parser, evaluator, and dependency tracker into a small,
 * stateful container modelled after a single-sheet spreadsheet. All
 * mutation happens through `setValue` / `setFormula` / `clear`; reads
 * happen through `getValue` (returns the most recently computed value)
 * and `getFormula` (returns the formula text, if any).
 *
 * Sheets are *pure data containers* — no I/O, no DB, no async. They
 * are intentionally small so they can be embedded inside a larger
 * resource (e.g. a `Spreadsheet` resource handler) which is
 * responsible for persistence.
 *
 * @example
 * ```typescript
 * import { Sheet } from '@molecule/api-formula-engine'
 *
 * const sheet = new Sheet()
 * sheet.setValue('A1', 10)
 * sheet.setValue('A2', 20)
 * sheet.setFormula('A3', '=SUM(A1:A2)')
 * sheet.getValue('A3') // → 30
 *
 * sheet.setValue('A1', 100)
 * sheet.getValue('A3') // → 120 (auto-recomputed)
 * ```
 *
 * @module
 */

import { collectReferences, topologicalSort } from './dependencies.js'
import { evaluate } from './evaluator.js'
import { parseFormula } from './parser.js'
import { coordKey, formatCellReference, parseCellReference } from './references.js'
import type { AstNode, CellCoord, CellValue, EvaluateOptions, SheetConfig } from './types.js'
import { isError, makeError } from './values.js'

interface CellRecord {
  /** The literal value last assigned via `setValue`. */
  value: CellValue
  /** Parsed AST of the cell's formula, when one is present. */
  ast: AstNode | null
  /** Original formula text (with leading `=`), or `null`. */
  formula: string | null
  /** Coordinates this cell directly references. */
  precedents: Set<string>
  /** Last computed value (cached for read paths). */
  computed: CellValue
}

const DEFAULT_CONFIG: Required<SheetConfig> = Object.freeze({
  numCols: 16384,
  numRows: 1048576,
})

/**
 * In-memory single-sheet engine. References use A1 notation (`A1`,
 * `$A$1`, `BC42`).
 */
export class Sheet {
  private readonly cells = new Map<string, CellRecord>()
  /** dependent-of[key] = set of cells that reference `key`. */
  private readonly dependents = new Map<string, Set<string>>()
  private readonly config: Required<SheetConfig>

  /**
   * @param config - Sheet configuration.
   */
  constructor(config: SheetConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Set a literal value at a cell.
   *
   * @param ref - A1-style cell reference (e.g. `A1`, `$B$3`).
   * @param value - Literal value (number, string, boolean, Date, or null).
   * @param options - Evaluation options forwarded to recompute.
   */
  setValue(ref: string, value: CellValue, options: EvaluateOptions = {}): void {
    const coord = this.refToCoord(ref)
    this.assignCell(coord, value, null, null, options)
  }

  /**
   * Set a formula at a cell. The formula text may include or omit the
   * leading `=`. The formula is parsed eagerly and `#NAME?` /
   * `#VALUE!` errors caused by parser failures are stored as the
   * cell's value.
   *
   * @param ref - A1-style cell reference.
   * @param formula - Formula text (e.g. `=SUM(A1:A10)` or `SUM(A1:A10)`).
   * @param options - Evaluation options forwarded to recompute.
   */
  setFormula(ref: string, formula: string, options: EvaluateOptions = {}): void {
    const coord = this.refToCoord(ref)
    let ast: AstNode | null = null
    let parseError: CellValue | null = null
    try {
      ast = parseFormula(formula)
    } catch (e) {
      parseError = makeError('#VALUE!', (e as Error).message)
    }
    if (parseError) {
      this.assignCell(coord, parseError, null, formula, options)
      return
    }
    this.assignCell(coord, null, ast, formula, options)
  }

  /**
   * Clear a cell (remove value, formula, and dependency edges).
   *
   * @param ref - A1-style cell reference.
   * @param options - Evaluation options forwarded to recompute.
   */
  clear(ref: string, options: EvaluateOptions = {}): void {
    const coord = this.refToCoord(ref)
    const key = coordKey(coord)
    const existing = this.cells.get(key)
    if (existing) {
      for (const dep of existing.precedents) {
        this.dependents.get(dep)?.delete(key)
      }
    }
    this.cells.delete(key)
    this.recomputeDownstream(key, options)
  }

  /**
   * Read the most recently computed value for a cell.
   *
   * @param ref - A1-style cell reference.
   * @returns Cell value (`null` if the cell is empty).
   */
  getValue(ref: string): CellValue {
    const coord = this.refToCoord(ref)
    const key = coordKey(coord)
    const cell = this.cells.get(key)
    return cell ? cell.computed : null
  }

  /**
   * Return the formula text for a cell, or `null` if the cell holds a
   * literal value or is empty.
   *
   * @param ref - A1-style cell reference.
   * @returns Formula text (with leading `=`) or `null`.
   */
  getFormula(ref: string): string | null {
    const coord = this.refToCoord(ref)
    const key = coordKey(coord)
    return this.cells.get(key)?.formula ?? null
  }

  /**
   * Recompute every formula cell. Useful after bulk edits or when
   * `now()` semantics change.
   *
   * @param options - Evaluation options.
   */
  recomputeAll(options: EvaluateOptions = {}): void {
    const keys = [...this.cells.keys()]
    const { order, cycle } = topologicalSort(this.dependents, keys)
    for (const k of order) this.evaluateKey(k, options, cycle)
    for (const k of cycle) {
      const cell = this.cells.get(k)
      if (!cell) continue
      cell.computed = makeError('#CIRC!')
    }
  }

  /**
   * Evaluate a free-standing formula string against this sheet's data.
   * Does NOT mutate the sheet. Useful for ad-hoc evaluations such as
   * invoice line-item totals or computed-column previews.
   *
   * @param formula - Formula text.
   * @param options - Evaluation options.
   * @returns Evaluated cell value.
   */
  evaluateFormula(formula: string, options: EvaluateOptions = {}): CellValue {
    let ast: AstNode
    try {
      ast = parseFormula(formula)
    } catch (e) {
      return makeError('#VALUE!', (e as Error).message)
    }
    return evaluate(ast, (coord) => this.cells.get(coordKey(coord))?.computed ?? null, options)
  }

  // --- Internals ---

  private refToCoord(ref: string): CellCoord {
    const coord = parseCellReference(ref)
    if (!coord) throw new Error(`Invalid cell reference: ${ref}`)
    if (coord.col >= this.config.numCols || coord.row >= this.config.numRows) {
      throw new Error(`Reference out of bounds: ${ref}`)
    }
    return coord
  }

  private assignCell(
    coord: CellCoord,
    value: CellValue,
    ast: AstNode | null,
    formula: string | null,
    options: EvaluateOptions,
  ): void {
    const key = coordKey(coord)
    const existing = this.cells.get(key)
    if (existing) {
      for (const dep of existing.precedents) {
        this.dependents.get(dep)?.delete(key)
      }
    }
    const precedents = new Set<string>()
    if (ast) {
      for (const c of collectReferences(ast)) {
        const k = coordKey(c)
        precedents.add(k)
        let set = this.dependents.get(k)
        if (!set) {
          set = new Set()
          this.dependents.set(k, set)
        }
        set.add(key)
      }
    }
    const record: CellRecord = {
      value,
      ast,
      formula,
      precedents,
      computed: value,
    }
    this.cells.set(key, record)
    if (ast) this.evaluateKey(key, options, new Set())
    this.recomputeDownstream(key, options)
  }

  private recomputeDownstream(rootKey: string, options: EvaluateOptions): void {
    // Find every transitive dependent of the changed cell.
    const affected = new Set<string>()
    const stack = [rootKey]
    while (stack.length > 0) {
      const k = stack.pop()!
      const outs = this.dependents.get(k)
      if (!outs) continue
      for (const t of outs) {
        if (!affected.has(t)) {
          affected.add(t)
          stack.push(t)
        }
      }
    }
    if (affected.size === 0) return
    const keys = [...affected]
    const { order, cycle } = topologicalSort(this.dependents, keys)
    for (const k of order) this.evaluateKey(k, options, cycle)
    for (const k of cycle) {
      const cell = this.cells.get(k)
      if (!cell) continue
      cell.computed = makeError('#CIRC!')
    }
  }

  private evaluateKey(key: string, options: EvaluateOptions, cycleSet: ReadonlySet<string>): void {
    const cell = this.cells.get(key)
    if (!cell) return
    if (cycleSet.has(key)) {
      cell.computed = makeError('#CIRC!')
      return
    }
    if (!cell.ast) {
      cell.computed = cell.value
      return
    }
    const value = evaluate(
      cell.ast,
      (coord) => {
        const k = coordKey(coord)
        if (cycleSet.has(k)) return makeError('#CIRC!')
        const target = this.cells.get(k)
        return target ? target.computed : null
      },
      options,
    )
    cell.computed = value
    if (isError(value)) {
      cell.value = value
    }
  }
}

/**
 * Reformat a cell coordinate as A1-style text. Re-exported for
 * convenience.
 *
 * @param coord - Cell coordinate.
 * @returns A1-style reference text.
 */
export function refOf(coord: CellCoord): string {
  return formatCellReference(coord)
}
