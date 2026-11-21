/**
 * `@molecule/app-rule-builder-react` cases: the recursive AND / OR group editor,
 * its field → operator → value leaves, every value editor the field types
 * choose, and every tree edit the buttons perform.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** One leaf of the rule tree, as the component's props carry it. */
interface Leaf {
  kind: 'leaf'
  id: string
  field: string
  op: string
  value?: unknown
}

/** One group of the rule tree. */
interface Group {
  kind: 'group'
  id: string
  op: 'AND' | 'OR'
  children: Array<Leaf | Group>
}

/** The schema the cases render, covering every built-in field type. */
const schema = {
  fields: [
    {
      name: 'country',
      label: 'Country',
      type: 'select',
      options: [
        { value: 'US', label: 'United States' },
        { value: 'CA', label: 'Canada' },
      ],
    },
    { name: 'plan', label: 'Plan', type: 'text' },
    { name: 'spend', label: 'Spend', type: 'number' },
    { name: 'active', label: 'Active', type: 'boolean' },
    { name: 'signup', label: 'Signed up', type: 'date' },
    {
      name: 'tier',
      label: 'Tier',
      type: 'text',
      operators: [
        { id: 'matches', label: 'matches' },
        { id: 'absent', label: 'is absent', arity: 'unary' },
        { id: 'within', label: 'within', arity: 'between' },
      ],
    },
    { name: 'qty', label: 'Qty', type: 'number', placeholder: 'e.g. 10' },
    { name: 'region', label: 'Region', type: 'select' },
    { name: 'flag', label: 'Flag', type: 'boolean', operators: [{ id: 'set', label: 'is set' }] },
    { name: 'nothing', label: 'Nothing', type: 'text', operators: [] },
  ],
}

/** A leaf with a fresh id. */
const leaf = (id: string, field: string, op: string, value?: unknown): Leaf => ({
  kind: 'leaf',
  id,
  field,
  op,
  ...(value === undefined ? {} : { value }),
})

/** A group around its children. */
const group = (id: string, op: 'AND' | 'OR', children: Array<Leaf | Group>): Group => ({
  kind: 'group',
  id,
  op,
  children,
})

/** The AND root with one blank leaf, the tree a new builder starts from. */
const blank = group('root', 'AND', [leaf('a', '', '')])

/** A single-leaf tree used by the leaf cases. */
const oneLeaf = (child: Leaf): Group => group('root', 'AND', [child])

/** The nested tree: an AND group holding a leaf and an OR group of two leaves. */
const nested = group('root', 'AND', [
  leaf('a', 'plan', 'eq', 'pro'),
  group('inner', 'OR', [leaf('b', 'spend', 'gt', 10), leaf('c', 'active', 'isTrue')]),
])

/** The toggle button of the root group. */
const rootToggle = '[data-mol-id="rule-builder-group-root-toggle"]'
/** The toggle button of the nested group. */
const innerToggle = '[data-mol-id="rule-builder-group-inner-toggle"]'
/** The root group's "Add condition" button. */
const addCondition = '[data-mol-id="rule-builder-group-root-add-condition"]'
/** The root group's "Add group" button. */
const addGroup = '[data-mol-id="rule-builder-group-root-add-group"]'
/** The nested group's remove button. */
const removeGroup = '[data-mol-id="rule-builder-group-inner-remove"]'
/** The first leaf's remove button. */
const removeLeaf = '[data-mol-id="rule-builder-leaf-a-remove"]'
/** The first leaf's field dropdown. */
const fieldSelect = '[data-mol-id="rule-builder-leaf-a"] select[aria-label="Field"]'
/** The first leaf's operator dropdown. */
const operatorSelect = '[data-mol-id="rule-builder-leaf-a"] select[aria-label="Operator"]'
/** The first leaf's value dropdown (select / boolean fields). */
const valueSelect = '[data-mol-id="rule-builder-leaf-a"] select[aria-label="Value"]'
/** The first leaf's value input (text / number / date fields). */
const valueInput = '[data-mol-id="rule-builder-leaf-a"] input[aria-label="Value"]'
/** The first leaf's "from" input (between operators). */
const fromInput = '[data-mol-id="rule-builder-leaf-a"] input[aria-label="From"]'
/** The first leaf's "to" input (between operators). */
const toInput = '[data-mol-id="rule-builder-leaf-a"] input[aria-label="To"]'

/** `@molecule/app-rule-builder-react`. */
export const ruleBuilderFeature: FeatureCases = {
  package: '@molecule/app-rule-builder-react',
  families: [
    {
      component: 'RuleBuilder',
      cases: [
        { name: 'empty AND group', props: { schema, rules: blank }, callbacks: ['onChange'] },
        {
          name: 'OR group and its help text',
          props: { schema, rules: group('root', 'OR', [leaf('l1', '', '')]) },
          callbacks: ['onChange'],
        },
        {
          name: 'text leaf with a value',
          props: { schema, rules: oneLeaf(leaf('a', 'plan', 'eq', 'pro')) },
          callbacks: ['onChange'],
        },
        {
          name: 'number leaf with a value',
          props: { schema, rules: oneLeaf(leaf('a', 'spend', 'gt', 42)) },
          callbacks: ['onChange'],
        },
        {
          name: 'number leaf with zero',
          props: { schema, rules: oneLeaf(leaf('a', 'spend', 'gte', 0)) },
          callbacks: ['onChange'],
        },
        {
          name: 'number leaf with no value',
          props: { schema, rules: oneLeaf(leaf('a', 'spend', 'lt')) },
          callbacks: ['onChange'],
        },
        {
          name: 'text leaf with a placeholder',
          props: { schema, rules: oneLeaf(leaf('a', 'qty', 'lte', 10)) },
          callbacks: ['onChange'],
        },
        {
          name: 'select leaf with a value',
          props: { schema, rules: oneLeaf(leaf('a', 'country', 'eq', 'US')) },
          callbacks: ['onChange'],
        },
        {
          name: 'select leaf with a non-string value',
          props: { schema, rules: oneLeaf(leaf('a', 'country', 'neq', 42)) },
          callbacks: ['onChange'],
        },
        {
          name: 'boolean leaf with true',
          props: { schema, rules: oneLeaf(leaf('a', 'active', 'isTrue')) },
          callbacks: ['onChange'],
        },
        {
          name: 'boolean leaf with false',
          props: { schema, rules: oneLeaf(leaf('a', 'active', 'isFalse')) },
          callbacks: ['onChange'],
        },
        {
          name: 'date leaf with a value',
          props: { schema, rules: oneLeaf(leaf('a', 'signup', 'before', '2026-01-15')) },
          callbacks: ['onChange'],
        },
        {
          name: 'between on a number',
          props: { schema, rules: oneLeaf(leaf('a', 'spend', 'between', [10, 20])) },
          callbacks: ['onChange'],
        },
        {
          name: 'between on a date',
          props: {
            schema,
            rules: oneLeaf(leaf('a', 'signup', 'between', ['2026-01-01', '2026-02-01'])),
          },
          callbacks: ['onChange'],
        },
        {
          name: 'between with no value',
          props: { schema, rules: oneLeaf(leaf('a', 'spend', 'between')) },
          callbacks: ['onChange'],
        },
        {
          name: 'between with a single-element value',
          props: { schema, rules: oneLeaf(leaf('a', 'tier', 'within', ['only'])) },
          callbacks: ['onChange'],
        },
        {
          name: 'unary operator hides the value editor',
          props: { schema, rules: oneLeaf(leaf('a', 'plan', 'isEmpty')) },
          callbacks: ['onChange'],
        },
        {
          name: 'operator outside the catalog',
          props: { schema, rules: oneLeaf(leaf('a', 'plan', 'nope')) },
          callbacks: ['onChange'],
        },
        {
          name: 'field outside the schema',
          props: { schema, rules: oneLeaf(leaf('a', 'missing', 'eq')) },
          callbacks: ['onChange'],
        },
        {
          name: 'custom operator catalog',
          props: { schema, rules: oneLeaf(leaf('a', 'tier', 'matches', 'gold')) },
          callbacks: ['onChange'],
        },
        {
          name: 'custom unary operator',
          props: { schema, rules: oneLeaf(leaf('a', 'tier', 'absent')) },
          callbacks: ['onChange'],
        },
        {
          name: 'field with no operators',
          props: { schema, rules: oneLeaf(leaf('a', 'nothing', '')) },
          callbacks: ['onChange'],
        },
        {
          name: 'select field with no options',
          props: { schema, rules: oneLeaf(leaf('a', 'region', 'eq', 'eu')) },
          callbacks: ['onChange'],
        },
        {
          name: 'nested groups',
          props: { schema, rules: nested },
          callbacks: ['onChange'],
        },
        {
          name: 'bare leaf root',
          props: { schema, rules: leaf('only', 'plan', 'contains', 'pro') },
          callbacks: ['onChange'],
        },
        {
          name: 'extra class',
          props: { schema, rules: blank, className: 'parity-token' },
          callbacks: ['onChange'],
        },
        {
          name: 'empty schema',
          props: { schema: { fields: [] }, rules: blank },
          callbacks: ['onChange'],
        },
        {
          name: 'toggles the root operator',
          props: { schema, rules: blank },
          callbacks: ['onChange'],
          interactions: [
            { type: 'click', selector: rootToggle },
            { type: 'click', selector: rootToggle },
          ],
        },
        {
          name: 'toggles a nested group operator',
          props: { schema, rules: nested },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: innerToggle }],
        },
        {
          name: 'adds a condition',
          props: { schema, rules: blank },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: addCondition }],
        },
        {
          name: 'adds a group',
          props: { schema, rules: blank },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: addGroup }],
        },
        {
          name: 'removes a condition',
          props: { schema, rules: nested },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: removeLeaf }],
        },
        {
          name: 'removes a nested group',
          props: { schema, rules: nested },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: removeGroup }],
        },
        {
          name: 'selects a field',
          props: { schema, rules: blank },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: fieldSelect, value: 'spend' }],
        },
        {
          name: 'selects a field with no operators',
          props: { schema, rules: blank },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: fieldSelect, value: 'nothing' }],
        },
        {
          name: 'selects an operator',
          props: { schema, rules: oneLeaf(leaf('a', 'spend', 'gt', 10)) },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: operatorSelect, value: 'between' }],
        },
        {
          name: 'types a text value',
          props: { schema, rules: oneLeaf(leaf('a', 'plan', 'eq')) },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: valueInput, value: 'pro' }],
        },
        {
          name: 'types a number value',
          props: { schema, rules: oneLeaf(leaf('a', 'spend', 'gt')) },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: valueInput, value: '42' }],
        },
        {
          name: 'types a date value',
          props: { schema, rules: oneLeaf(leaf('a', 'signup', 'before')) },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: valueInput, value: '2026-03-01' }],
        },
        {
          name: 'types both between values',
          props: { schema, rules: oneLeaf(leaf('a', 'spend', 'between', [1, 2])) },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: fromInput, value: '5' },
            { type: 'input', selector: toInput, value: '9' },
          ],
        },
        {
          name: 'types a between value on a text field',
          props: { schema, rules: oneLeaf(leaf('a', 'tier', 'within')) },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: toInput, value: 'z' }],
        },
        {
          name: 'chooses a boolean value',
          props: { schema, rules: oneLeaf(leaf('a', 'flag', 'set', true)) },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: valueSelect, value: 'false' }],
        },
        {
          name: 'chooses a select value',
          props: { schema, rules: oneLeaf(leaf('a', 'country', 'eq', 'US')) },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: valueSelect, value: 'CA' }],
        },
        {
          name: 'replaces the rules prop',
          props: { schema, rules: blank },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { rules: oneLeaf(leaf('z', 'plan', 'eq', 'pro')) } },
          ],
        },
        {
          name: 'replaces the schema prop',
          props: { schema, rules: oneLeaf(leaf('a', 'plan', 'eq', 'pro')) },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'props',
              props: { schema: { fields: [{ name: 'note', label: 'Note', type: 'text' }] } },
            },
          ],
        },
      ],
    },
  ],
  values: [
    { export: 'OP' },
    { export: 'defaultOperators' },
    { export: 'makeId', calls: [[]] },
    { export: 'emptyLeaf', calls: [[]] },
    { export: 'emptyGroup', calls: [[], ['AND'], ['OR']] },
    {
      export: 'operatorsFor',
      calls: [
        [{ name: 'plan', label: 'Plan', type: 'text' }],
        [{ name: 'spend', label: 'Spend', type: 'number' }],
        [{ name: 'signup', label: 'Signed up', type: 'date' }],
        [{ name: 'country', label: 'Country', type: 'select' }],
        [{ name: 'active', label: 'Active', type: 'boolean' }],
        [
          {
            name: 'tier',
            label: 'Tier',
            type: 'text',
            operators: [{ id: 'matches', label: 'matches' }],
          },
        ],
      ],
    },
    {
      export: 'operatorById',
      calls: [
        [{ name: 'spend', label: 'Spend', type: 'number' }, 'gt'],
        [{ name: 'spend', label: 'Spend', type: 'number' }, 'between'],
        [{ name: 'spend', label: 'Spend', type: 'number' }, 'unknown'],
      ],
    },
    {
      export: 'replaceById',
      calls: [
        [nested, 'b', leaf('b2', 'plan', 'eq', 'pro')],
        [nested, 'inner', group('inner', 'AND', [leaf('b', 'spend', 'gt', 10)])],
        [nested, 'absent', leaf('x', '', '')],
      ],
    },
    {
      export: 'removeById',
      calls: [
        [nested, 'b'],
        [nested, 'inner'],
        [nested, 'root'],
      ],
    },
    {
      export: 'appendToGroup',
      calls: [
        [nested, 'inner', leaf('d', 'plan', 'eq', 'free')],
        [nested, 'root', group('extra', 'OR', [leaf('e', '', '')])],
        [nested, 'absent', leaf('f', '', '')],
      ],
    },
    {
      export: 'toggleGroupOp',
      calls: [
        [nested, 'root'],
        [nested, 'inner'],
        [nested, 'absent'],
      ],
    },
  ],
}
