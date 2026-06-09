# @molecule/app-rule-builder-react

Visual condition / rule builder for React.

Exports:
- `<RuleBuilder>` — controlled tree editor for AND / OR groups of
  field-operator-value leaves.
- `RuleSchema`, `RuleField`, `RuleOperator`, `Rule`, `RuleGroup`,
  `RuleLeaf`, `RuleLeafValue`, `RuleGroupOp`, `RuleFieldType` types.
- `defaultOperators`, `operatorsFor`, `operatorById`, `OP` operator
  catalog helpers.
- `emptyGroup`, `emptyLeaf`, `replaceById`, `removeById`,
  `appendToGroup`, `toggleGroupOp`, `makeId` pure tree utilities.

Used by feature-flag-manager (audience targeting),
ai-workflow-automator (trigger conditions), email-marketing
(segments), iot-device-manager + smart-home-dashboard (scenes /
automations).

## Quick Start

```tsx
import {
  RuleBuilder,
  emptyGroup,
  type Rule,
  type RuleSchema,
} from '@molecule/app-rule-builder-react'

const schema: RuleSchema = {
  fields: [
    { name: 'country', label: 'Country', type: 'select', options: [{ value: 'US', label: 'United States' }] },
    { name: 'plan', label: 'Plan', type: 'text' },
    { name: 'spend', label: 'Spend', type: 'number' },
  ],
}

function Demo() {
  const [rules, setRules] = useState<Rule>(emptyGroup('AND'))
  return <RuleBuilder schema={schema} rules={rules} onChange={setRules} />
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-rule-builder-react
```

## API

### Interfaces

#### `RuleBuilderProps`

Public component props.

```typescript
interface RuleBuilderProps {
  /** Field catalog the user picks from. */
  schema: RuleSchema
  /** Current rule tree (controlled). */
  rules: Rule
  /**
   * Called whenever the user mutates the tree — receives the full new
   * root rule. Output is a deterministic JSON-serializable structure.
   */
  onChange: (next: Rule) => void
  /** Optional extra root-level class. */
  className?: string
}
```

#### `RuleField`

Field descriptor in the schema — the rule builder uses it to render
the field dropdown, infer the value editor, and (when no explicit
`operators` list is given) pick a default operator catalog by `type`.

```typescript
interface RuleField {
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
```

#### `RuleGroup`

Group rule — a logical conjunction (AND) or disjunction (OR) of
children. Children may themselves be groups, allowing arbitrary
nesting like `(A AND (B OR C) AND D)`.

```typescript
interface RuleGroup {
  /** Discriminator. */
  kind: 'group'
  /** Stable id. */
  id: string
  /** Logical operator joining the children. */
  op: RuleGroupOp
  /** Child rules — groups or leaves, in display order. */
  children: Rule[]
}
```

#### `RuleLeaf`

Leaf rule — a single `field op value` predicate.

`value` is opaque to the builder for `text` / `number` / `select` /
`boolean` (it stores whatever the input produced — string for text /
select / date, number for number, boolean for boolean). For `between`
arity operators it's stored as a `[from, to]` two-element tuple.

```typescript
interface RuleLeaf {
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
```

#### `RuleOperator`

Operator descriptor — `id` is what's stored on the leaf, `label` is
what's shown in the operator dropdown.

`arity` controls how many value inputs are rendered:
- `'unary'` — no value input (e.g. `is empty`, `exists`)
- `'binary'` — one value input (default)
- `'between'` — two value inputs (rendered as `from`/`to`)

```typescript
interface RuleOperator {
  /** Operator id stored on the leaf. */
  id: string
  /** Translated, human-readable label. */
  label: string
  /** Number of value inputs to render. Default `'binary'`. */
  arity?: 'unary' | 'binary' | 'between'
}
```

#### `RuleSchema`

Schema given to `<RuleBuilder>`. Currently only `fields` — kept as an
object so future schema-level config (max depth, group limit, etc.)
can be added without breaking the API.

```typescript
interface RuleSchema {
  /** Available fields, in the order they appear in the field dropdown. */
  fields: RuleField[]
}
```

### Types

#### `Rule`

Either a group or a leaf.

```typescript
type Rule = RuleGroup | RuleLeaf
```

#### `RuleFieldType`

Built-in field types supported by the default operator catalog and
value editors. Consumers can supply custom operator lists per field
if these don't fit.

```typescript
type RuleFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean'
```

#### `RuleGroupOp`

Logical join operator at a group level.

```typescript
type RuleGroupOp = 'AND' | 'OR'
```

#### `RuleLeafValue`

Possible leaf value encodings. See `RuleLeaf.value`.

```typescript
type RuleLeafValue = string | number | boolean | [string, string] | [number, number]
```

### Functions

#### `appendToGroup(tree, groupId, child)`

Append `child` to the children of the group identified by `groupId`.
If the id doesn't match any group, returns the tree unchanged.

```typescript
function appendToGroup(tree: Rule, groupId: string, child: Rule): Rule
```

- `tree` — Root of the rule tree.
- `groupId` — Id of the group to append to.
- `child` — Rule to append.

**Returns:** New tree with the child appended.

#### `emptyGroup(op)`

Build a fresh empty group — used when the user clicks "Add group".

```typescript
function emptyGroup(op?: RuleGroupOp): RuleGroup
```

- `op` — Initial group operator, defaults to `'AND'`.

**Returns:** A new group with one empty leaf already inside.

#### `emptyLeaf()`

Build a fresh empty leaf — used when the user clicks "Add condition".

```typescript
function emptyLeaf(): RuleLeaf
```

**Returns:** A new leaf with all fields blank and a fresh id.

#### `makeId()`

Generate a short non-cryptographic id. Sufficient for React keys and
in-memory rule identity within a single editing session.

```typescript
function makeId(): string
```

**Returns:** A short random id.

#### `operatorById(field, opId)`

Look up a single operator descriptor by id within `field`'s catalog.

```typescript
function operatorById(field: RuleField, opId: string): RuleOperator | undefined
```

- `field` — Field descriptor.
- `opId` — Operator id to look up.

**Returns:** The operator descriptor, or `undefined` if `opId` isn't in the catalog.

#### `operatorsFor(field)`

Resolve the operator catalog for `field`. Returns the field's own
`operators` override when provided, otherwise the built-in catalog
for the field's `type`.

```typescript
function operatorsFor(field: RuleField): RuleOperator[]
```

- `field` — Field descriptor from the schema.

**Returns:** Operator catalog applicable to this field.

#### `removeById(tree, targetId)`

Remove the rule with id `targetId` from the tree. The root itself
cannot be removed — when `targetId` matches the root, the tree is
returned unchanged.

```typescript
function removeById(tree: Rule, targetId: string): Rule
```

- `tree` — Root of the rule tree.
- `targetId` — Id of the rule to remove.

**Returns:** New tree with the rule removed (or the original tree if no match).

#### `replaceById(tree, targetId, replacement)`

Replace `target` (matched by id) anywhere in the tree with `replacement`.

```typescript
function replaceById(tree: Rule, targetId: string, replacement: Rule): Rule
```

- `tree` — Root of the rule tree.
- `targetId` — Id of the rule to replace.
- `replacement` — Replacement rule (same id is not required).

**Returns:** New tree with the replacement applied.

#### `RuleBuilder(props, props, props, props, props)`

Visual rule / predicate builder. The rendered tree is a recursive
`RuleGroup` of `RuleLeaf` predicates joined by `AND` or `OR`. The
component is fully controlled — every interaction emits a new root
rule via `onChange`.

```typescript
function RuleBuilder({ schema, rules, onChange, className }: RuleBuilderProps): ReactNode
```

- `props` — Component props.
- `props` — .schema
- `props` — .rules
- `props` — .onChange
- `props` — .className

**Returns:** The rendered rule builder.

#### `toggleGroupOp(tree, groupId)`

Toggle a group's `op` between `'AND'` and `'OR'`.

```typescript
function toggleGroupOp(tree: Rule, groupId: string): Rule
```

- `tree` — Root of the rule tree.
- `groupId` — Id of the group to toggle.

**Returns:** New tree with the group's op flipped (or the original tree if no match).

### Constants

#### `defaultOperators`

Untranslated operator descriptors per field type.

`RuleBuilder` translates each `label` at render time; the strings
here are English fallbacks only, never shown directly.

```typescript
const defaultOperators: Record<RuleFieldType, RuleOperator[]>
```

#### `OP`

Operator id constants — exported so consumers can inspect leaves.

```typescript
const OP: { readonly Equals: "eq"; readonly NotEquals: "neq"; readonly Contains: "contains"; readonly NotContains: "notContains"; readonly StartsWith: "startsWith"; readonly EndsWith: "endsWith"; readonly GreaterThan: "gt"; readonly GreaterThanOrEqual: "gte"; readonly LessThan: "lt"; readonly LessThanOrEqual: "lte"; readonly Between: "between"; readonly Before: "before"; readonly After: "after"; readonly IsTrue: "isTrue"; readonly IsFalse: "isFalse"; readonly IsEmpty: "isEmpty"; readonly IsNotEmpty: "isNotEmpty"; readonly In: "in"; readonly NotIn: "notIn"; }
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-rule-builder`.
