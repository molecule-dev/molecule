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

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Select } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

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

/**
 * Reads the string a native input event carries.
 *
 * @param event - The native input event.
 * @returns The input's current value.
 */
const inputValue = (event: Event): string => (event.target as HTMLInputElement).value

/**
 * Visual rule / predicate builder. The rendered tree is a recursive
 * `RuleGroup` of `RuleLeaf` predicates joined by `AND` or `OR`. The
 * component is fully controlled — every interaction emits a new root
 * rule via `onChange`.
 *
 * Vue counterpart of `@molecule/app-rule-builder-react`'s `RuleBuilder` —
 * the same props (React names) and the same DOM for the same input.
 *
 * @param props - Component props (see {@link RuleBuilderProps}).
 * @returns The rendered rule builder.
 */
export const RuleBuilder = defineComponent({
  name: 'RuleBuilder',
  props: {
    schema: {
      type: Object as PropType<RuleSchema>,
      required: true,
    },
    rules: {
      type: Object as PropType<Rule>,
      required: true,
    },
    onChange: {
      type: Function as PropType<(next: Rule) => void>,
      required: true,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

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

    /**
     * Render one group: the `AND` / `OR` toggle row, the children, and the
     * "Add condition" / "Add group" buttons.
     *
     * @param group - The group to render.
     * @param isRoot - Whether this is the root (which has no remove button).
     * @param onReplace - Receives the group's replacement.
     * @param onRemove - Removes this group from its parent.
     * @returns The rendered group.
     */
    const renderGroup = (
      group: RuleGroup,
      isRoot: boolean,
      onReplace: (next: Rule) => void,
      onRemove: () => void,
    ): VNode => {
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

      const children: VNodeChild[] = group.children.map((child) =>
        child.kind === 'group'
          ? renderGroup(
              child,
              false,
              (next) => replaceChild(child.id, next),
              () => removeChild(child.id),
            )
          : renderLeaf(
              child,
              (next) => replaceChild(child.id, next),
              () => removeChild(child.id),
            ),
      )

      const header: VNodeChild[] = [
        h(
          Button,
          {
            variant: 'outline',
            size: 'sm',
            onClick: toggle,
            'aria-label': t('ruleBuilder.aria.toggleOp', {}, { defaultValue: 'Toggle AND / OR' }),
            'data-mol-id': `rule-builder-group-${group.id}-toggle`,
          },
          [opLabel],
        ),
        h('span', { class: cm.cn(cm.textSize('xs'), cm.textMuted) }, [
          group.op === 'AND'
            ? t('ruleBuilder.help.allMustMatch', {}, { defaultValue: 'All conditions must match' })
            : t('ruleBuilder.help.anyMustMatch', {}, { defaultValue: 'Any condition may match' }),
        ]),
      ]
      if (!isRoot)
        header.push(
          h(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              onClick: onRemove,
              'aria-label': t('ruleBuilder.aria.removeGroup', {}, { defaultValue: 'Remove group' }),
              'data-mol-id': `rule-builder-group-${group.id}-remove`,
            },
            [t('ruleBuilder.action.removeGroup', {}, { defaultValue: 'Remove group' })],
          ),
        )

      return h(
        'div',
        {
          class: cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.borderAll, cm.surface),
          style: cm.sp({ p: 3 }),
          'data-mol-id': `rule-builder-group-${group.id}`,
          'data-group-op': group.op,
        },
        [
          h('div', { class: cm.flex({ align: 'center', gap: 'xs' }) }, header),
          h(
            'div',
            { class: cm.flex({ direction: 'col', gap: 'xs' }), style: cm.sp({ p: 2 }) },
            children,
          ),
          h('div', { class: cm.flex({ align: 'center', gap: 'xs' }) }, [
            h(
              Button,
              {
                variant: 'outline',
                size: 'sm',
                onClick: addCondition,
                'data-mol-id': `rule-builder-group-${group.id}-add-condition`,
              },
              [t('ruleBuilder.action.addCondition', {}, { defaultValue: '+ Add condition' })],
            ),
            h(
              Button,
              {
                variant: 'ghost',
                size: 'sm',
                onClick: addGroup,
                'data-mol-id': `rule-builder-group-${group.id}-add-group`,
              },
              [t('ruleBuilder.action.addGroup', {}, { defaultValue: '+ Add group' })],
            ),
          ]),
        ],
      )
    }

    /**
     * Render the value-side input(s) for a leaf, picking between
     * text / number / date / select / boolean editors based on the field's
     * `type` and the operator's `arity`.
     *
     * @param field - The leaf's field descriptor.
     * @param arity - The operator's arity (`binary` or `between`).
     * @param value - The leaf's current value.
     * @param onChange - Receives the next value.
     * @returns The rendered value editor.
     */
    const renderValueEditor = (
      field: RuleField,
      arity: 'binary' | 'between',
      value: RuleLeafValue | undefined,
      onChange: (next: RuleLeafValue | undefined) => void,
    ): VNode => {
      if (arity === 'between') {
        const tuple =
          Array.isArray(value) && value.length === 2
            ? value
            : field.type === 'number'
              ? ([0, 0] as [number, number])
              : (['', ''] as [string, string])
        const inputType =
          field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'
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
        return h('span', { class: cm.flex({ align: 'center', gap: 'xs' }) }, [
          h(Input, {
            type: inputType,
            value: String(tuple[0] ?? ''),
            onChange: (event: Event) => setFrom(inputValue(event)),
            'aria-label': t('ruleBuilder.aria.valueFrom', {}, { defaultValue: 'From' }),
          }),
          h('span', {}, [t('ruleBuilder.between.separator', {}, { defaultValue: '–' })]),
          h(Input, {
            type: inputType,
            value: String(tuple[1] ?? ''),
            onChange: (event: Event) => setTo(inputValue(event)),
            'aria-label': t('ruleBuilder.aria.valueTo', {}, { defaultValue: 'To' }),
          }),
        ])
      }

      if (field.type === 'select') {
        const options = field.options ?? []
        return h(Select, {
          value: typeof value === 'string' ? value : '',
          onValueChange: (v: string) => onChange(v),
          options,
          'aria-label': t('ruleBuilder.aria.value', {}, { defaultValue: 'Value' }),
        })
      }

      if (field.type === 'boolean') {
        const opts = [
          { value: 'true', label: t('ruleBuilder.boolean.true', {}, { defaultValue: 'true' }) },
          { value: 'false', label: t('ruleBuilder.boolean.false', {}, { defaultValue: 'false' }) },
        ]
        return h(Select, {
          value: value === true ? 'true' : value === false ? 'false' : '',
          onValueChange: (v: string) => onChange(v === 'true'),
          options: opts,
          'aria-label': t('ruleBuilder.aria.value', {}, { defaultValue: 'Value' }),
        })
      }

      const inputType = field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'
      return h(Input, {
        type: inputType,
        value: value === undefined ? '' : String(value),
        onChange: (event: Event) => {
          const raw = inputValue(event)
          onChange(field.type === 'number' ? Number(raw) : raw)
        },
        placeholder: field.placeholder,
        'aria-label': t('ruleBuilder.aria.value', {}, { defaultValue: 'Value' }),
      })
    }

    /**
     * Render a single field → operator → value row.
     *
     * @param leaf - The leaf to render.
     * @param onReplace - Receives the leaf's replacement.
     * @param onRemove - Removes this leaf from its group.
     * @returns The rendered leaf.
     */
    const renderLeaf = (
      leaf: RuleLeaf,
      onReplace: (next: Rule) => void,
      onRemove: () => void,
    ): VNode => {
      const field = props.schema.fields.find((f) => f.name === leaf.field)
      const ops = field ? operatorsFor(field) : []
      const op = field ? operatorById(field, leaf.op) : undefined
      const arity = op?.arity ?? 'binary'

      const setField = (name: string): void => {
        const f = props.schema.fields.find((x) => x.name === name)
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
        {
          value: '',
          label: t('ruleBuilder.field.placeholder', {}, { defaultValue: 'Select field…' }),
        },
        ...props.schema.fields.map((f) => ({ value: f.name, label: f.label })),
      ]

      const operatorOptions = ops.map((o) => ({ value: o.id, label: o.label }))

      const row: VNodeChild[] = [
        h(Select, {
          value: leaf.field,
          onValueChange: setField,
          options: fieldOptions,
          'aria-label': t('ruleBuilder.aria.field', {}, { defaultValue: 'Field' }),
        }),
      ]
      if (field)
        row.push(
          h(Select, {
            value: leaf.op,
            onValueChange: setOp,
            options: operatorOptions,
            'aria-label': t('ruleBuilder.aria.operator', {}, { defaultValue: 'Operator' }),
          }),
        )
      if (field && op && arity !== 'unary')
        row.push(renderValueEditor(field, arity, leaf.value, setValue))
      row.push(
        h(
          Button,
          {
            variant: 'ghost',
            size: 'sm',
            onClick: onRemove,
            'aria-label': t(
              'ruleBuilder.aria.removeCondition',
              {},
              {
                defaultValue: 'Remove condition',
              },
            ),
            'data-mol-id': `rule-builder-leaf-${leaf.id}-remove`,
          },
          [t('ruleBuilder.action.removeCondition', {}, { defaultValue: 'Remove' })],
        ),
      )

      return h(
        'div',
        {
          class: cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
          'data-mol-id': `rule-builder-leaf-${leaf.id}`,
        },
        row,
      )
    }

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), props.className),
          'data-mol-id': 'rule-builder',
        },
        [
          renderGroup(
            rootGroup(),
            true,
            (next) => props.onChange(next),
            () => props.onChange(emptyGroup()),
          ),
        ],
      )
  },
})
