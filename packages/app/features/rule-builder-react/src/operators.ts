/**
 * Default operator catalogs per field type, plus a small helper that
 * picks the catalog for a given field (preferring the field's own
 * `operators` override when provided).
 *
 * All operator labels here use English fallbacks via `t(key, ..., {
 * defaultValue })` at the call site — this module is consumed by
 * `RuleBuilder.tsx`, which translates labels through the
 * `@molecule/app-react` i18n hook before passing them to the dropdown.
 *
 * @module
 */

import type { RuleField, RuleFieldType, RuleOperator } from './types.js'

/** Operator id constants — exported so consumers can inspect leaves. */
export const OP = {
  Equals: 'eq',
  NotEquals: 'neq',
  Contains: 'contains',
  NotContains: 'notContains',
  StartsWith: 'startsWith',
  EndsWith: 'endsWith',
  GreaterThan: 'gt',
  GreaterThanOrEqual: 'gte',
  LessThan: 'lt',
  LessThanOrEqual: 'lte',
  Between: 'between',
  Before: 'before',
  After: 'after',
  IsTrue: 'isTrue',
  IsFalse: 'isFalse',
  IsEmpty: 'isEmpty',
  IsNotEmpty: 'isNotEmpty',
  In: 'in',
  NotIn: 'notIn',
} as const

/**
 * Untranslated operator descriptors per field type.
 *
 * `RuleBuilder` translates each `label` at render time; the strings
 * here are English fallbacks only, never shown directly.
 */
export const defaultOperators: Record<RuleFieldType, RuleOperator[]> = {
  text: [
    { id: OP.Equals, label: 'equals' },
    { id: OP.NotEquals, label: 'does not equal' },
    { id: OP.Contains, label: 'contains' },
    { id: OP.NotContains, label: 'does not contain' },
    { id: OP.StartsWith, label: 'starts with' },
    { id: OP.EndsWith, label: 'ends with' },
    { id: OP.IsEmpty, label: 'is empty', arity: 'unary' },
    { id: OP.IsNotEmpty, label: 'is not empty', arity: 'unary' },
  ],
  number: [
    { id: OP.Equals, label: '=' },
    { id: OP.NotEquals, label: '≠' },
    { id: OP.GreaterThan, label: '>' },
    { id: OP.GreaterThanOrEqual, label: '≥' },
    { id: OP.LessThan, label: '<' },
    { id: OP.LessThanOrEqual, label: '≤' },
    { id: OP.Between, label: 'between', arity: 'between' },
  ],
  date: [
    { id: OP.Equals, label: 'on' },
    { id: OP.Before, label: 'before' },
    { id: OP.After, label: 'after' },
    { id: OP.Between, label: 'between', arity: 'between' },
  ],
  select: [
    { id: OP.Equals, label: 'is' },
    { id: OP.NotEquals, label: 'is not' },
  ],
  boolean: [
    { id: OP.IsTrue, label: 'is true', arity: 'unary' },
    { id: OP.IsFalse, label: 'is false', arity: 'unary' },
  ],
}

/**
 * Resolve the operator catalog for `field`. Returns the field's own
 * `operators` override when provided, otherwise the built-in catalog
 * for the field's `type`.
 *
 * @param field - Field descriptor from the schema.
 * @returns Operator catalog applicable to this field.
 */
export function operatorsFor(field: RuleField): RuleOperator[] {
  return field.operators ?? defaultOperators[field.type] ?? []
}

/**
 * Look up a single operator descriptor by id within `field`'s catalog.
 *
 * @param field - Field descriptor.
 * @param opId - Operator id to look up.
 * @returns The operator descriptor, or `undefined` if `opId` isn't in the catalog.
 */
export function operatorById(field: RuleField, opId: string): RuleOperator | undefined {
  return operatorsFor(field).find((o) => o.id === opId)
}
