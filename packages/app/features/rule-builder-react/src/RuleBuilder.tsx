/**
 * `<RuleBuilder>` — visual condition / rule builder.
 *
 * Renders a recursive AND / OR group tree with field → operator → value
 * leaves. Used by feature-flag-manager (target-audience rules),
 * ai-workflow-automator (trigger conditions), email-marketing
 * (segment definitions), iot-device-manager (automation rules), and
 * smart-home-dashboard (scene triggers).
 *
 * @module
 */

import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Select } from '@molecule/app-ui-react'

import { operatorById, operatorsFor } from './operators.js'
import type { Rule, RuleField, RuleGroup, RuleLeaf, RuleLeafValue, RuleSchema } from './types.js'
import {
  appendToGroup,
  emptyGroup,
  emptyLeaf,
  removeById,
  replaceById,
  toggleGroupOp,
} from './utilities.js'

/** Public component props. */
export interface RuleBuilderProps {
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

/**
 * Visual rule / predicate builder. The rendered tree is a recursive
 * `RuleGroup` of `RuleLeaf` predicates joined by `AND` or `OR`. The
 * component is fully controlled — every interaction emits a new root
 * rule via `onChange`.
 *
 * @param props - Component props.
 * @param props.schema
 * @param props.rules
 * @param props.onChange
 * @param props.className
 * @returns The rendered rule builder.
 */
export function RuleBuilder({ schema, rules, onChange, className }: RuleBuilderProps): ReactNode {
  const cm = getClassMap()

  const root: RuleGroup =
    rules.kind === 'group' ? rules : { kind: 'group', id: 'root', op: 'AND', children: [rules] }

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), className)}
      data-mol-id="rule-builder"
    >
      <RenderGroup
        group={root}
        schema={schema}
        isRoot
        onReplace={(next) => onChange(next)}
        onRemove={() => onChange(emptyGroup())}
      />
    </div>
  )
}

/** Internal — recursive group renderer. */
interface RenderGroupProps {
  group: RuleGroup
  schema: RuleSchema
  isRoot?: boolean
  onReplace: (next: Rule) => void
  onRemove: () => void
}

/**
 * Render a single group (one row of `AND` / `OR` toggle + children +
 * "Add condition" / "Add group" buttons).
 *
 * @param props - Group renderer props.
 * @param props.group
 * @param props.schema
 * @param props.isRoot
 * @param props.onReplace
 * @param props.onRemove
 * @returns Rendered group element.
 */
function RenderGroup({ group, schema, isRoot, onReplace, onRemove }: RenderGroupProps): ReactNode {
  const cm = getClassMap()
  const { t } = useTranslation()

  const toggle = (): void => {
    onReplace(toggleGroupOp(group, group.id) as RuleGroup)
  }

  const addCondition = (): void => {
    onReplace(appendToGroup(group, group.id, emptyLeaf()) as RuleGroup)
  }

  const addGroup = (): void => {
    onReplace(appendToGroup(group, group.id, emptyGroup()) as RuleGroup)
  }

  const removeChild = (childId: string): void => {
    onReplace(removeById(group, childId) as RuleGroup)
  }

  const replaceChild = (childId: string, next: Rule): void => {
    onReplace(replaceById(group, childId, next) as RuleGroup)
  }

  const opLabel =
    group.op === 'AND'
      ? t('ruleBuilder.op.and', {}, { defaultValue: 'AND' })
      : t('ruleBuilder.op.or', {}, { defaultValue: 'OR' })

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.borderAll, cm.surface)}
      style={cm.sp({ p: 3 })}
      data-mol-id={`rule-builder-group-${group.id}`}
      data-group-op={group.op}
    >
      <div className={cm.flex({ align: 'center', gap: 'xs' })}>
        <Button
          variant="outline"
          size="sm"
          onClick={toggle}
          aria-label={t('ruleBuilder.aria.toggleOp', {}, { defaultValue: 'Toggle AND / OR' })}
          data-mol-id={`rule-builder-group-${group.id}-toggle`}
        >
          {opLabel}
        </Button>
        <span className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
          {group.op === 'AND'
            ? t('ruleBuilder.help.allMustMatch', {}, { defaultValue: 'All conditions must match' })
            : t('ruleBuilder.help.anyMustMatch', {}, { defaultValue: 'Any condition may match' })}
        </span>
        {!isRoot && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            aria-label={t('ruleBuilder.aria.removeGroup', {}, { defaultValue: 'Remove group' })}
            data-mol-id={`rule-builder-group-${group.id}-remove`}
          >
            {t('ruleBuilder.action.removeGroup', {}, { defaultValue: 'Remove group' })}
          </Button>
        )}
      </div>

      <div className={cm.flex({ direction: 'col', gap: 'xs' })} style={cm.sp({ p: 2 })}>
        {group.children.map((child) =>
          child.kind === 'group' ? (
            <RenderGroup
              key={child.id}
              group={child}
              schema={schema}
              onReplace={(next) => replaceChild(child.id, next)}
              onRemove={() => removeChild(child.id)}
            />
          ) : (
            <RenderLeaf
              key={child.id}
              leaf={child}
              schema={schema}
              onReplace={(next) => replaceChild(child.id, next)}
              onRemove={() => removeChild(child.id)}
            />
          ),
        )}
      </div>

      <div className={cm.flex({ align: 'center', gap: 'xs' })}>
        <Button
          variant="outline"
          size="sm"
          onClick={addCondition}
          data-mol-id={`rule-builder-group-${group.id}-add-condition`}
        >
          {t('ruleBuilder.action.addCondition', {}, { defaultValue: '+ Add condition' })}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={addGroup}
          data-mol-id={`rule-builder-group-${group.id}-add-group`}
        >
          {t('ruleBuilder.action.addGroup', {}, { defaultValue: '+ Add group' })}
        </Button>
      </div>
    </div>
  )
}

/** Internal — single leaf renderer. */
interface RenderLeafProps {
  leaf: RuleLeaf
  schema: RuleSchema
  onReplace: (next: Rule) => void
  onRemove: () => void
}

/**
 * Render a single field → operator → value row.
 *
 * @param props - Leaf renderer props.
 * @param props.leaf
 * @param props.schema
 * @param props.onReplace
 * @param props.onRemove
 * @returns Rendered leaf element.
 */
function RenderLeaf({ leaf, schema, onReplace, onRemove }: RenderLeafProps): ReactNode {
  const cm = getClassMap()
  const { t } = useTranslation()

  const field = schema.fields.find((f) => f.name === leaf.field)
  const ops = field ? operatorsFor(field) : []
  const op = field ? operatorById(field, leaf.op) : undefined
  const arity = op?.arity ?? 'binary'

  const setField = (name: string): void => {
    const f = schema.fields.find((x) => x.name === name)
    const firstOp = f ? operatorsFor(f)[0] : undefined
    onReplace({
      ...leaf,
      field: name,
      op: firstOp?.id ?? '',
      value: undefined,
    })
  }

  const setOp = (opId: string): void => {
    onReplace({ ...leaf, op: opId, value: undefined })
  }

  const setValue = (value: RuleLeafValue | undefined): void => {
    onReplace({ ...leaf, value })
  }

  const fieldOptions = [
    { value: '', label: t('ruleBuilder.field.placeholder', {}, { defaultValue: 'Select field…' }) },
    ...schema.fields.map((f) => ({ value: f.name, label: f.label })),
  ]

  const operatorOptions = ops.map((o) => ({ value: o.id, label: o.label }))

  return (
    <div
      className={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}
      data-mol-id={`rule-builder-leaf-${leaf.id}`}
    >
      <Select
        value={leaf.field}
        onValueChange={setField}
        options={fieldOptions}
        aria-label={t('ruleBuilder.aria.field', {}, { defaultValue: 'Field' })}
      />
      {field && (
        <Select
          value={leaf.op}
          onValueChange={setOp}
          options={operatorOptions}
          aria-label={t('ruleBuilder.aria.operator', {}, { defaultValue: 'Operator' })}
        />
      )}
      {field && op && arity !== 'unary' && (
        <ValueEditor field={field} arity={arity} value={leaf.value} onChange={setValue} />
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        aria-label={t('ruleBuilder.aria.removeCondition', {}, { defaultValue: 'Remove condition' })}
        data-mol-id={`rule-builder-leaf-${leaf.id}-remove`}
      >
        {t('ruleBuilder.action.removeCondition', {}, { defaultValue: 'Remove' })}
      </Button>
    </div>
  )
}

/** Internal — value-editor dispatcher. */
interface ValueEditorProps {
  field: RuleField
  arity: 'binary' | 'between'
  value: RuleLeafValue | undefined
  onChange: (next: RuleLeafValue | undefined) => void
}

/**
 * Render the value-side input(s) for a leaf, picking between
 * text / number / date / select / boolean editors based on the
 * field's `type` and operator's `arity`.
 *
 * @param props - Value-editor props.
 * @param props.field
 * @param props.arity
 * @param props.value
 * @param props.onChange
 * @returns Rendered value editor.
 */
function ValueEditor({ field, arity, value, onChange }: ValueEditorProps): ReactNode {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (arity === 'between') {
    const tuple =
      Array.isArray(value) && value.length === 2
        ? value
        : field.type === 'number'
          ? ([0, 0] as [number, number])
          : (['', ''] as [string, string])
    const inputType = field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'
    const setFrom = (v: string): void => {
      const next = (
        field.type === 'number'
          ? [Number(v), (tuple as [number, number])[1]]
          : [v, (tuple as [string, string])[1]]
      ) as RuleLeafValue
      onChange(next)
    }
    const setTo = (v: string): void => {
      const next = (
        field.type === 'number'
          ? [(tuple as [number, number])[0], Number(v)]
          : [(tuple as [string, string])[0], v]
      ) as RuleLeafValue
      onChange(next)
    }
    return (
      <span className={cm.flex({ align: 'center', gap: 'xs' })}>
        <Input
          type={inputType}
          value={String(tuple[0] ?? '')}
          onChange={(e) => setFrom((e.target as HTMLInputElement).value)}
          aria-label={t('ruleBuilder.aria.valueFrom', {}, { defaultValue: 'From' })}
        />
        <span>{t('ruleBuilder.between.separator', {}, { defaultValue: '–' })}</span>
        <Input
          type={inputType}
          value={String(tuple[1] ?? '')}
          onChange={(e) => setTo((e.target as HTMLInputElement).value)}
          aria-label={t('ruleBuilder.aria.valueTo', {}, { defaultValue: 'To' })}
        />
      </span>
    )
  }

  if (field.type === 'select') {
    const options = field.options ?? []
    return (
      <Select
        value={typeof value === 'string' ? value : ''}
        onValueChange={(v) => onChange(v)}
        options={options}
        aria-label={t('ruleBuilder.aria.value', {}, { defaultValue: 'Value' })}
      />
    )
  }

  if (field.type === 'boolean') {
    const opts = [
      { value: 'true', label: t('ruleBuilder.boolean.true', {}, { defaultValue: 'true' }) },
      { value: 'false', label: t('ruleBuilder.boolean.false', {}, { defaultValue: 'false' }) },
    ]
    return (
      <Select
        value={value === true ? 'true' : value === false ? 'false' : ''}
        onValueChange={(v) => onChange(v === 'true')}
        options={opts}
        aria-label={t('ruleBuilder.aria.value', {}, { defaultValue: 'Value' })}
      />
    )
  }

  const inputType = field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'
  return (
    <Input
      type={inputType}
      value={value === undefined ? '' : String(value)}
      onChange={(e) => {
        const raw = (e.target as HTMLInputElement).value
        onChange(field.type === 'number' ? Number(raw) : raw)
      }}
      placeholder={field.placeholder}
      aria-label={t('ruleBuilder.aria.value', {}, { defaultValue: 'Value' })}
    />
  )
}
