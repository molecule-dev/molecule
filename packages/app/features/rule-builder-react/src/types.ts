/**
 * Rule-builder types — schema, operators, and recursive rule trees.
 *
 * The rule tree is a discriminated union: a `RuleGroup` contains an
 * `op` (`AND` or `OR`) plus a list of children (themselves groups or
 * leaves), and a `RuleLeaf` is a `{ field, op, value }` triple.
 *
 * The schema declares the available `fields`, each typed (text, number,
 * date, select) so the builder can render the right value editor and
 * filter the operator dropdown to operators that make sense for that
 * type.
 *
 * @module
 */

/**
 * Logical join operator at a group level.
 */
export type RuleGroupOp = 'AND' | 'OR'

/**
 * Built-in field types supported by the default operator catalog and
 * value editors. Consumers can supply custom operator lists per field
 * if these don't fit.
 */
export type RuleFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean'

/**
 * Operator descriptor — `id` is what's stored on the leaf, `label` is
 * what's shown in the operator dropdown.
 *
 * `arity` controls how many value inputs are rendered:
 * - `'unary'` — no value input (e.g. `is empty`, `exists`)
 * - `'binary'` — one value input (default)
 * - `'between'` — two value inputs (rendered as `from`/`to`)
 */
export interface RuleOperator {
  /** Operator id stored on the leaf. */
  id: string
  /** Translated, human-readable label. */
  label: string
  /** Number of value inputs to render. Default `'binary'`. */
  arity?: 'unary' | 'binary' | 'between'
}

/**
 * Field descriptor in the schema — the rule builder uses it to render
 * the field dropdown, infer the value editor, and (when no explicit
 * `operators` list is given) pick a default operator catalog by `type`.
 */
export interface RuleField {
  /** Stable field identifier stored on the leaf. */
  name: string
  /** Translated, human-readable label shown in the field dropdown. */
  label: string
  /** Built-in type used to pick the value editor + default operators. */
  type: RuleFieldType
  /**
   * Operators valid for this field. Optional — when omitted, the
   * builder uses the default catalog for `type` from `defaultOperators`.
   */
  operators?: RuleOperator[]
  /**
   * For `type: 'select'` — the option list rendered as a `<Select>`.
   * Ignored for other types.
   */
  options?: Array<{ value: string; label: string }>
  /** Optional placeholder for text/number/date inputs. */
  placeholder?: string
}

/**
 * Schema given to `<RuleBuilder>`. Currently only `fields` — kept as an
 * object so future schema-level config (max depth, group limit, etc.)
 * can be added without breaking the API.
 */
export interface RuleSchema {
  /** Available fields, in the order they appear in the field dropdown. */
  fields: RuleField[]
}

/**
 * Leaf rule — a single `field op value` predicate.
 *
 * `value` is opaque to the builder for `text` / `number` / `select` /
 * `boolean` (it stores whatever the input produced — string for text /
 * select / date, number for number, boolean for boolean). For `between`
 * arity operators it's stored as a `[from, to]` two-element tuple.
 */
export interface RuleLeaf {
  /** Discriminator. */
  kind: 'leaf'
  /** Stable id (uuid-ish) — used for React keys + delete identity. */
  id: string
  /** Field name from the schema. Empty string when unset. */
  field: string
  /** Operator id from the field's operator catalog. Empty when unset. */
  op: string
  /**
   * Current value. `undefined` when unset. Encoding depends on the
   * operator's `arity`:
   * - `'unary'` — value is ignored.
   * - `'binary'` — string | number | boolean.
   * - `'between'` — `[from, to]` tuple.
   */
  value?: RuleLeafValue
}

/** Possible leaf value encodings. See `RuleLeaf.value`. */
export type RuleLeafValue = string | number | boolean | [string, string] | [number, number]

/**
 * Group rule — a logical conjunction (AND) or disjunction (OR) of
 * children. Children may themselves be groups, allowing arbitrary
 * nesting like `(A AND (B OR C) AND D)`.
 */
export interface RuleGroup {
  /** Discriminator. */
  kind: 'group'
  /** Stable id. */
  id: string
  /** Logical operator joining the children. */
  op: RuleGroupOp
  /** Child rules — groups or leaves, in display order. */
  children: Rule[]
}

/** Either a group or a leaf. */
export type Rule = RuleGroup | RuleLeaf
