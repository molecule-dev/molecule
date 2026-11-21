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

import { type Component, For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import type { KitEvent } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Select } from '@molecule/app-ui-solid'

import { operatorById, operatorsFor } from './operators.js'
import type {
  Rule,
  RuleBuilderProps,
  RuleField,
  RuleGroup,
  RuleLeaf,
  RuleLeafValue,
  RuleSchema,
} from './types.js'
import {
  appendToGroup,
  emptyGroup,
  emptyLeaf,
  removeById,
  replaceById,
  toggleGroupOp,
} from './utilities.js'

/**
 * Converts a React-style style object (camelCase keys) into the kebab-case
 * object Solid's style runtime applies through `setProperty`, so the rendered
 * inline style matches React's byte for byte.
 *
 * @param style - The ClassMap spacing record (`cm.sp(...)`).
 * @returns The kebab-case style record.
 */
const styleProps = (style: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(style).map(([key, value]) => [
      key.startsWith('--') ? key : key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
      value,
    ]),
  )

/**
 * Reads the string a native input event carries.
 *
 * @param event - The native input event.
 * @returns The input's current value.
 */
const inputValue = (event: KitEvent): string => (event.target as HTMLInputElement).value

/** Props of the recursive group renderer. */
interface GroupProps {
  group: RuleGroup
  schema: RuleSchema
  isRoot?: boolean
  onReplace: (next: Rule) => void
  onRemove: () => void
}

/**
 * Render one group: the `AND` / `OR` toggle row, the children, and the
 * "Add condition" / "Add group" buttons.
 *
 * @param props - Group renderer props.
 * @returns The rendered group.
 */
const Group: Component<GroupProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const toggle = (): void => {
    props.onReplace(toggleGroupOp(props.group, props.group.id) as RuleGroup)
  }

  const addCondition = (): void => {
    props.onReplace(appendToGroup(props.group, props.group.id, emptyLeaf()) as RuleGroup)
  }

  const addGroup = (): void => {
    props.onReplace(appendToGroup(props.group, props.group.id, emptyGroup()) as RuleGroup)
  }

  const removeChild = (childId: string): void => {
    props.onReplace(removeById(props.group, childId) as RuleGroup)
  }

  const replaceChild = (childId: string, next: Rule): void => {
    props.onReplace(replaceById(props.group, childId, next) as RuleGroup)
  }

  const opLabel = (): string =>
    props.group.op === 'AND'
      ? t('ruleBuilder.op.and', {}, { defaultValue: 'AND' })
      : t('ruleBuilder.op.or', {}, { defaultValue: 'OR' })

  return (
    <div
      class={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.borderAll, cm.surface)}
      style={styleProps(cm.sp({ p: 3 }))}
      data-mol-id={`rule-builder-group-${props.group.id}`}
      data-group-op={props.group.op}
    >
      <div class={cm.flex({ align: 'center', gap: 'xs' })}>
        <Button
          variant="outline"
          size="sm"
          onClick={toggle}
          aria-label={t('ruleBuilder.aria.toggleOp', {}, { defaultValue: 'Toggle AND / OR' })}
          data-mol-id={`rule-builder-group-${props.group.id}-toggle`}
        >
          {opLabel()}
        </Button>
        <span class={cm.cn(cm.textSize('xs'), cm.textMuted)}>
          {props.group.op === 'AND'
            ? t('ruleBuilder.help.allMustMatch', {}, { defaultValue: 'All conditions must match' })
            : t('ruleBuilder.help.anyMustMatch', {}, { defaultValue: 'Any condition may match' })}
        </span>
        <Show when={!props.isRoot}>
          <Button
            variant="ghost"
            size="sm"
            onClick={props.onRemove}
            aria-label={t('ruleBuilder.aria.removeGroup', {}, { defaultValue: 'Remove group' })}
            data-mol-id={`rule-builder-group-${props.group.id}-remove`}
          >
            {t('ruleBuilder.action.removeGroup', {}, { defaultValue: 'Remove group' })}
          </Button>
        </Show>
      </div>

      <div class={cm.flex({ direction: 'col', gap: 'xs' })} style={styleProps(cm.sp({ p: 2 }))}>
        <For each={props.group.children}>
          {(child) => (
            <Show
              when={child.kind === 'group'}
              fallback={
                <Leaf
                  leaf={child as RuleLeaf}
                  schema={props.schema}
                  onReplace={(next) => replaceChild(child.id, next)}
                  onRemove={() => removeChild(child.id)}
                />
              }
            >
              <Group
                group={child as RuleGroup}
                schema={props.schema}
                onReplace={(next) => replaceChild(child.id, next)}
                onRemove={() => removeChild(child.id)}
              />
            </Show>
          )}
        </For>
      </div>

      <div class={cm.flex({ align: 'center', gap: 'xs' })}>
        <Button
          variant="outline"
          size="sm"
          onClick={addCondition}
          data-mol-id={`rule-builder-group-${props.group.id}-add-condition`}
        >
          {t('ruleBuilder.action.addCondition', {}, { defaultValue: '+ Add condition' })}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={addGroup}
          data-mol-id={`rule-builder-group-${props.group.id}-add-group`}
        >
          {t('ruleBuilder.action.addGroup', {}, { defaultValue: '+ Add group' })}
        </Button>
      </div>
    </div>
  )
}

/** Props of the value-editor dispatcher. */
interface ValueEditorProps {
  field: RuleField
  arity: 'binary' | 'between'
  value: RuleLeafValue | undefined
  onChange: (next: RuleLeafValue | undefined) => void
}

/**
 * Render the value-side input(s) for a leaf, picking between
 * text / number / date / select / boolean editors based on the field's
 * `type` and the operator's `arity`.
 *
 * @param props - Value-editor props.
 * @returns The rendered value editor.
 */
const ValueEditor: Component<ValueEditorProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** The `[from, to]` tuple, falling back to empty values. */
  const tuple = (): [string, string] | [number, number] => {
    const value = props.value
    if (Array.isArray(value) && value.length === 2) return value
    return props.field.type === 'number' ? [0, 0] : ['', '']
  }

  /**
   * The input type the field renders.
   *
   * @returns The native input type.
   */
  const inputType = (): 'date' | 'number' | 'text' =>
    props.field.type === 'date' ? 'date' : props.field.type === 'number' ? 'number' : 'text'

  const setFrom = (v: string): void => {
    const current = tuple()
    props.onChange(
      (props.field.type === 'number'
        ? [Number(v), (current as [number, number])[1]]
        : [v, (current as [string, string])[1]]) as RuleLeafValue,
    )
  }

  const setTo = (v: string): void => {
    const current = tuple()
    props.onChange(
      (props.field.type === 'number'
        ? [(current as [number, number])[0], Number(v)]
        : [(current as [string, string])[0], v]) as RuleLeafValue,
    )
  }

  return (
    <>
      <Show when={props.arity === 'between'}>
        <span class={cm.flex({ align: 'center', gap: 'xs' })}>
          <Input
            type={inputType()}
            value={String(tuple()[0] ?? '')}
            onChange={(event) => setFrom(inputValue(event))}
            aria-label={t('ruleBuilder.aria.valueFrom', {}, { defaultValue: 'From' })}
          />
          <span>{t('ruleBuilder.between.separator', {}, { defaultValue: '–' })}</span>
          <Input
            type={inputType()}
            value={String(tuple()[1] ?? '')}
            onChange={(event) => setTo(inputValue(event))}
            aria-label={t('ruleBuilder.aria.valueTo', {}, { defaultValue: 'To' })}
          />
        </span>
      </Show>
      <Show when={props.arity !== 'between' && props.field.type === 'select'}>
        <Select
          value={typeof props.value === 'string' ? props.value : ''}
          onValueChange={(v) => props.onChange(v)}
          options={props.field.options ?? []}
          aria-label={t('ruleBuilder.aria.value', {}, { defaultValue: 'Value' })}
        />
      </Show>
      <Show when={props.arity !== 'between' && props.field.type === 'boolean'}>
        <Select
          value={props.value === true ? 'true' : props.value === false ? 'false' : ''}
          onValueChange={(v) => props.onChange(v === 'true')}
          options={[
            { value: 'true', label: t('ruleBuilder.boolean.true', {}, { defaultValue: 'true' }) },
            {
              value: 'false',
              label: t('ruleBuilder.boolean.false', {}, { defaultValue: 'false' }),
            },
          ]}
          aria-label={t('ruleBuilder.aria.value', {}, { defaultValue: 'Value' })}
        />
      </Show>
      <Show
        when={
          props.arity !== 'between' &&
          props.field.type !== 'select' &&
          props.field.type !== 'boolean'
        }
      >
        <Input
          type={inputType()}
          value={props.value === undefined ? '' : String(props.value)}
          onChange={(event) => {
            const raw = inputValue(event)
            props.onChange(props.field.type === 'number' ? Number(raw) : raw)
          }}
          placeholder={props.field.placeholder}
          aria-label={t('ruleBuilder.aria.value', {}, { defaultValue: 'Value' })}
        />
      </Show>
    </>
  )
}

/** Props of the leaf renderer. */
interface LeafProps {
  leaf: RuleLeaf
  schema: RuleSchema
  onReplace: (next: Rule) => void
  onRemove: () => void
}

/**
 * Render a single field → operator → value row.
 *
 * @param props - Leaf renderer props.
 * @returns The rendered leaf.
 */
const Leaf: Component<LeafProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const field = (): RuleField | undefined =>
    props.schema.fields.find((f) => f.name === props.leaf.field)
  const ops = (): ReturnType<typeof operatorsFor> => {
    const f = field()
    return f ? operatorsFor(f) : []
  }
  const op = (): ReturnType<typeof operatorById> => {
    const f = field()
    return f ? operatorById(f, props.leaf.op) : undefined
  }
  const arity = (): 'unary' | 'binary' | 'between' => op()?.arity ?? 'binary'

  const setField = (name: string): void => {
    const f = props.schema.fields.find((x) => x.name === name)
    const firstOp = f ? operatorsFor(f)[0] : undefined
    props.onReplace({
      ...props.leaf,
      field: name,
      op: firstOp?.id ?? '',
      value: undefined,
    })
  }

  const setOp = (opId: string): void => {
    props.onReplace({ ...props.leaf, op: opId, value: undefined })
  }

  const setValue = (value: RuleLeafValue | undefined): void => {
    props.onReplace({ ...props.leaf, value })
  }

  const fieldOptions = (): Array<{ value: string; label: string }> => [
    { value: '', label: t('ruleBuilder.field.placeholder', {}, { defaultValue: 'Select field…' }) },
    ...props.schema.fields.map((f) => ({ value: f.name, label: f.label })),
  ]

  return (
    <div
      class={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}
      data-mol-id={`rule-builder-leaf-${props.leaf.id}`}
    >
      <Select
        value={props.leaf.field}
        onValueChange={setField}
        options={fieldOptions()}
        aria-label={t('ruleBuilder.aria.field', {}, { defaultValue: 'Field' })}
      />
      <Show when={field()}>
        <Select
          value={props.leaf.op}
          onValueChange={setOp}
          options={ops().map((o) => ({ value: o.id, label: o.label }))}
          aria-label={t('ruleBuilder.aria.operator', {}, { defaultValue: 'Operator' })}
        />
      </Show>
      <Show when={field() && op() && arity() !== 'unary'}>
        <ValueEditor
          field={field()!}
          arity={arity() as 'binary' | 'between'}
          value={props.leaf.value}
          onChange={setValue}
        />
      </Show>
      <Button
        variant="ghost"
        size="sm"
        onClick={props.onRemove}
        aria-label={t(
          'ruleBuilder.aria.removeCondition',
          {},
          {
            defaultValue: 'Remove condition',
          },
        )}
        data-mol-id={`rule-builder-leaf-${props.leaf.id}-remove`}
      >
        {t('ruleBuilder.action.removeCondition', {}, { defaultValue: 'Remove' })}
      </Button>
    </div>
  )
}

/**
 * Visual rule / predicate builder. The rendered tree is a recursive
 * `RuleGroup` of `RuleLeaf` predicates joined by `AND` or `OR`. The
 * component is fully controlled — every interaction emits a new root
 * rule via `onChange`.
 *
 * This is the Solid counterpart of `@molecule/app-rule-builder-react`'s
 * `RuleBuilder`: the same props (React names), the same ClassMap tokens, and
 * the same DOM for the same input.
 *
 * @param props - Component props (see {@link RuleBuilderProps}).
 * @returns The rendered rule builder.
 */
export const RuleBuilder: Component<RuleBuilderProps> = (props) => {
  const cm = getClassMap()

  /**
   * The root group React renders: the given tree itself when it is a
   * group, otherwise an implicit AND group wrapping the bare leaf.
   *
   * @returns The root group.
   */
  const rootGroup = (): RuleGroup =>
    props.rules.kind === 'group'
      ? props.rules
      : { kind: 'group', id: 'root', op: 'AND', children: [props.rules] }

  return (
    <div
      class={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), props.className)}
      data-mol-id="rule-builder"
    >
      <Group
        group={rootGroup()}
        schema={props.schema}
        isRoot
        onReplace={(next) => props.onChange(next)}
        onRemove={() => props.onChange(emptyGroup())}
      />
    </div>
  )
}
