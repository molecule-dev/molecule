/**
 * AST evaluator.
 *
 * Walks an AST node and produces a `CellValue`. Cell references are
 * resolved through a caller-supplied `resolveCell` lookup function so
 * the evaluator stays decoupled from the underlying sheet storage.
 *
 * Pure function — no I/O, no globals.
 *
 * @module
 */

import { BUILTIN_FUNCTIONS } from './functions.js'
import { iterateRange } from './references.js'
import type { AstNode, CellCoord, CellValue, EvaluateOptions, FunctionContext } from './types.js'
import { compareValues, isError, makeError, toNumber, toStringValue } from './values.js'

/**
 * Function used to resolve a cell coordinate to its value. Returns
 * `null` for empty cells. Implementations may evaluate dependent
 * formulas (in which case they should detect cycles and return a
 * `#CIRC!` error to the caller).
 */
export type ResolveCell = (coord: CellCoord) => CellValue

/**
 * Evaluate an AST in the context of a cell-resolution function.
 *
 * @param node - Root AST node.
 * @param resolveCell - Function returning the value of a referenced cell.
 * @param options - Evaluation options.
 * @returns Evaluated cell value (errors are returned, not thrown).
 */
export function evaluate(
  node: AstNode,
  resolveCell: ResolveCell,
  options: EvaluateOptions = {},
): CellValue {
  const ctx: FunctionContext = {
    now: options.now ?? (() => new Date()),
  }
  return evalNode(node, resolveCell, ctx)
}

function evalNode(node: AstNode, resolveCell: ResolveCell, ctx: FunctionContext): CellValue {
  switch (node.kind) {
    case 'number':
      return node.value
    case 'string':
      return node.value
    case 'boolean':
      return node.value
    case 'errorLiteral':
      return makeError(node.code)
    case 'reference':
      return resolveCell(node.coord)
    case 'range':
      // A range used outside a function context coerces to its first cell.
      return resolveCell(node.range.start)
    case 'unary':
      return evalUnary(node.op, evalNode(node.operand, resolveCell, ctx))
    case 'binary':
      return evalBinary(
        node.op,
        evalNode(node.left, resolveCell, ctx),
        evalNode(node.right, resolveCell, ctx),
      )
    case 'call':
      return evalCall(node.name, node.args, resolveCell, ctx)
  }
}

function evalUnary(op: '+' | '-' | '%', operand: CellValue): CellValue {
  if (isError(operand)) return operand
  const n = toNumber(operand)
  if (isError(n)) return n
  switch (op) {
    case '+':
      return n
    case '-':
      return -n
    case '%':
      return n / 100
  }
}

function evalBinary(op: string, left: CellValue, right: CellValue): CellValue {
  if (isError(left)) return left
  if (isError(right)) return right
  if (op === '&') {
    const l = toStringValue(left)
    if (isError(l)) return l
    const r = toStringValue(right)
    if (isError(r)) return r
    return l + r
  }
  if (op === '=' || op === '<>' || op === '<' || op === '<=' || op === '>' || op === '>=') {
    const cmp = compareValues(left, right)
    if (isError(cmp)) return cmp
    switch (op) {
      case '=':
        return cmp === 0
      case '<>':
        return cmp !== 0
      case '<':
        return cmp < 0
      case '<=':
        return cmp <= 0
      case '>':
        return cmp > 0
      case '>=':
        return cmp >= 0
    }
  }
  // Arithmetic
  const l = toNumber(left)
  if (isError(l)) return l
  const r = toNumber(right)
  if (isError(r)) return r
  switch (op) {
    case '+':
      return l + r
    case '-':
      return l - r
    case '*':
      return l * r
    case '/':
      if (r === 0) return makeError('#DIV/0!')
      return l / r
    case '^': {
      const v = l ** r
      if (!Number.isFinite(v)) return makeError('#NUM!')
      return v
    }
    default:
      return makeError('#VALUE!', `Unknown operator: ${op}`)
  }
}

function evalCall(
  name: string,
  argNodes: AstNode[],
  resolveCell: ResolveCell,
  ctx: FunctionContext,
): CellValue {
  const fn = BUILTIN_FUNCTIONS[name]
  if (!fn) return makeError('#NAME?', `Unknown function: ${name}`)
  // Evaluate each argument: ranges expand into arrays.
  const args: Array<CellValue | CellValue[]> = []
  for (const arg of argNodes) {
    if (arg.kind === 'range') {
      const expanded: CellValue[] = []
      for (const c of iterateRange(arg.range)) {
        expanded.push(resolveCell(c))
      }
      args.push(expanded)
    } else {
      args.push(evalNode(arg, resolveCell, ctx))
    }
  }
  return fn(args, ctx)
}
