<!--
  RuleBuilder: the Svelte counterpart of `@molecule/app-rule-builder-react`'s
  `RuleBuilder` — a controlled recursive AND / OR group editor of
  field-operator-value leaves. Same props (React names), same DOM for the same
  input. Each group and leaf is rendered by a snippet that calls itself for
  nested groups, so the tree nests to any depth.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Input, reactStyle, Select } from '@molecule/app-ui-svelte'

  import { operatorById, operatorsFor } from './operators.js'
  import type {
    Rule,
    RuleBuilderProps,
    RuleField,
    RuleGroup,
    RuleLeaf,
    RuleLeafValue,
  } from './types.js'
  import {
    appendToGroup,
    emptyGroup,
    emptyLeaf,
    removeById,
    replaceById,
    toggleGroupOp,
  } from './utilities.js'

  let { schema, rules, onChange, className }: RuleBuilderProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /** The root group React renders: the tree itself when it is a group. */
  const rootGroup = $derived<RuleGroup>(
    rules.kind === 'group' ? rules : { kind: 'group', id: 'root', op: 'AND', children: [rules] },
  )

  /** Narrows a rule to a group. */
  const isGroup = (rule: Rule): rule is RuleGroup => rule.kind === 'group'

  /**
   * Reads the string a native input event carries.
   * @param event - The native input event.
   * @returns The input's current value.
   */
  const inputValue = (event: Event): string => (event.target as HTMLInputElement).value
</script>

<div class={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), className)} data-mol-id="rule-builder">
  {@render groupMarkup(
    rootGroup,
    true,
    (next) => onChange(next),
    () => onChange(emptyGroup()),
  )}
</div>

{#snippet groupMarkup(
  group: RuleGroup,
  isRoot: boolean,
  onReplace: (next: Rule) => void,
  onRemove: () => void,
)}
  <div
    class={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.borderAll, cm.surface)}
    use:reactStyle={cm.sp({ p: 3 })}
    data-mol-id={`rule-builder-group-${group.id}`}
    data-group-op={group.op}
  >
    <div class={cm.flex({ align: 'center', gap: 'xs' })}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onReplace(toggleGroupOp(group, group.id) as RuleGroup)}
        aria-label={t('ruleBuilder.aria.toggleOp', {}, { defaultValue: 'Toggle AND / OR' })}
        data-mol-id={`rule-builder-group-${group.id}-toggle`}
      >
        {group.op === 'AND'
          ? t('ruleBuilder.op.and', {}, { defaultValue: 'AND' })
          : t('ruleBuilder.op.or', {}, { defaultValue: 'OR' })}
      </Button>
      <span class={cm.cn(cm.textSize('xs'), cm.textMuted)}>
        {group.op === 'AND'
          ? t('ruleBuilder.help.allMustMatch', {}, { defaultValue: 'All conditions must match' })
          : t('ruleBuilder.help.anyMustMatch', {}, { defaultValue: 'Any condition may match' })}
      </span>
      {#if !isRoot}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={t('ruleBuilder.aria.removeGroup', {}, { defaultValue: 'Remove group' })}
          data-mol-id={`rule-builder-group-${group.id}-remove`}
        >
          {t('ruleBuilder.action.removeGroup', {}, { defaultValue: 'Remove group' })}
        </Button>
      {/if}
    </div>

    <div class={cm.flex({ direction: 'col', gap: 'xs' })} use:reactStyle={cm.sp({ p: 2 })}>
      {#each group.children as child (child.id)}
        {#if isGroup(child)}
          {@render groupMarkup(
            child,
            false,
            (next) => onReplace(replaceById(group, child.id, next)),
            () => onReplace(removeById(group, child.id)),
          )}
        {:else}
          {@render leafMarkup(
            child,
            (next) => onReplace(replaceById(group, child.id, next)),
            () => onReplace(removeById(group, child.id)),
          )}
        {/if}
      {/each}
    </div>

    <div class={cm.flex({ align: 'center', gap: 'xs' })}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onReplace(appendToGroup(group, group.id, emptyLeaf()) as RuleGroup)}
        data-mol-id={`rule-builder-group-${group.id}-add-condition`}
      >
        {t('ruleBuilder.action.addCondition', {}, { defaultValue: '+ Add condition' })}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onReplace(appendToGroup(group, group.id, emptyGroup()) as RuleGroup)}
        data-mol-id={`rule-builder-group-${group.id}-add-group`}
      >
        {t('ruleBuilder.action.addGroup', {}, { defaultValue: '+ Add group' })}
      </Button>
    </div>
  </div>
{/snippet}

{#snippet leafMarkup(leaf: RuleLeaf, onReplace: (next: Rule) => void, onRemove: () => void)}
  {@const field = schema.fields.find((f) => f.name === leaf.field)}
  {@const ops = field ? operatorsFor(field) : []}
  {@const op = field ? operatorById(field, leaf.op) : undefined}
  {@const arity = op?.arity ?? 'binary'}
  <div
    class={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}
    data-mol-id={`rule-builder-leaf-${leaf.id}`}
  >
    <Select
      value={leaf.field}
      onValueChange={(name: string) => {
        const f = schema.fields.find((x) => x.name === name)
        const firstOp = f ? operatorsFor(f)[0] : undefined
        onReplace({ ...leaf, field: name, op: firstOp?.id ?? '', value: undefined })
      }}
      options={[
        {
          value: '',
          label: t('ruleBuilder.field.placeholder', {}, { defaultValue: 'Select field…' }),
        },
        ...schema.fields.map((f) => ({ value: f.name, label: f.label })),
      ]}
      aria-label={t('ruleBuilder.aria.field', {}, { defaultValue: 'Field' })}
    />
    {#if field}
      <Select
        value={leaf.op}
        onValueChange={(opId: string) => onReplace({ ...leaf, op: opId, value: undefined })}
        options={ops.map((o) => ({ value: o.id, label: o.label }))}
        aria-label={t('ruleBuilder.aria.operator', {}, { defaultValue: 'Operator' })}
      />
    {/if}
    {#if field && op && arity !== 'unary'}
      {@render valueMarkup(field, arity, leaf.value, (value) => onReplace({ ...leaf, value }))}
    {/if}
    <Button
      variant="ghost"
      size="sm"
      onClick={onRemove}
      aria-label={t(
        'ruleBuilder.aria.removeCondition',
        {},
        {
          defaultValue: 'Remove condition',
        },
      )}
      data-mol-id={`rule-builder-leaf-${leaf.id}-remove`}
    >
      {t('ruleBuilder.action.removeCondition', {}, { defaultValue: 'Remove' })}
    </Button>
  </div>
{/snippet}

{#snippet valueMarkup(
  field: RuleField,
  arity: 'binary' | 'between',
  value: RuleLeafValue | undefined,
  onChange: (next: RuleLeafValue | undefined) => void,
)}
  {#if arity === 'between'}
    {@const tuple =
      Array.isArray(value) && value.length === 2
        ? value
        : field.type === 'number'
          ? ([0, 0] as [number, number])
          : (['', ''] as [string, string])}
    {@const inputType =
      field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
    <span class={cm.flex({ align: 'center', gap: 'xs' })}>
      <Input
        type={inputType}
        value={String(tuple[0] ?? '')}
        onChange={(event: Event) => {
          const v = inputValue(event)
          onChange(
            (field.type === 'number'
              ? [Number(v), (tuple as [number, number])[1]]
              : [v, (tuple as [string, string])[1]]) as RuleLeafValue,
          )
        }}
        aria-label={t('ruleBuilder.aria.valueFrom', {}, { defaultValue: 'From' })}
      />
      <span>{t('ruleBuilder.between.separator', {}, { defaultValue: '–' })}</span>
      <Input
        type={inputType}
        value={String(tuple[1] ?? '')}
        onChange={(event: Event) => {
          const v = inputValue(event)
          onChange(
            (field.type === 'number'
              ? [(tuple as [number, number])[0], Number(v)]
              : [(tuple as [string, string])[0], v]) as RuleLeafValue,
          )
        }}
        aria-label={t('ruleBuilder.aria.valueTo', {}, { defaultValue: 'To' })}
      />
    </span>
  {:else if field.type === 'select'}
    <Select
      value={typeof value === 'string' ? value : ''}
      onValueChange={(v: string) => onChange(v)}
      options={field.options ?? []}
      aria-label={t('ruleBuilder.aria.value', {}, { defaultValue: 'Value' })}
    />
  {:else if field.type === 'boolean'}
    <Select
      value={value === true ? 'true' : value === false ? 'false' : ''}
      onValueChange={(v: string) => onChange(v === 'true')}
      options={[
        { value: 'true', label: t('ruleBuilder.boolean.true', {}, { defaultValue: 'true' }) },
        { value: 'false', label: t('ruleBuilder.boolean.false', {}, { defaultValue: 'false' }) },
      ]}
      aria-label={t('ruleBuilder.aria.value', {}, { defaultValue: 'Value' })}
    />
  {:else}
    {@const inputType =
      field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
    <Input
      type={inputType}
      value={value === undefined ? '' : String(value)}
      onChange={(event: Event) => {
        const raw = inputValue(event)
        onChange(field.type === 'number' ? Number(raw) : raw)
      }}
      placeholder={field.placeholder}
      aria-label={t('ruleBuilder.aria.value', {}, { defaultValue: 'Value' })}
    />
  {/if}
{/snippet}
