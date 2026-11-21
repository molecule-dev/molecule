/**
 * `<RuleBuilder>` component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Select, styleText } from '@molecule/app-ui-angular'

import { operatorById, operatorsFor } from './operators.js'
import type {
  Rule,
  RuleField,
  RuleGroup,
  RuleGroupOp,
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

/** The context one group template renders from. */
interface GroupContext {
  $implicit: RuleGroup
  isRoot: boolean
  onReplace: (next: Rule) => void
  onRemove: () => void
}

/** The context one leaf template renders from. */
interface LeafContext {
  $implicit: RuleLeaf
  onReplace: (next: Rule) => void
  onRemove: () => void
}

/** The context the value-editor template renders from. */
interface ValueContext {
  id: string
  field: RuleField
  arity: 'binary' | 'between'
  value: RuleLeafValue | undefined
  onChange: (next: RuleLeafValue | undefined) => void
}

/**
 * Visual rule / predicate builder.
 *
 * The host IS the outer `<div>` React renders (`div[mol-rule-builder]`),
 * matching React exactly. The page frame uses ClassMap tokens so the styling
 * library can be swapped without touching consumers; a recursive
 * `<ng-template>` renders each AND / OR group, so the tree nests to any depth.
 *
 * The component is fully controlled — every interaction emits a new root rule
 * through the `onChange` input.
 */
@Component({
  selector: 'div[mol-rule-builder]',
  standalone: true,
  imports: [Button, Input, Select, NgTemplateOutlet],
  inputs: ['schema', 'rules', 'onChange', 'className'],
  host: {
    '[class]': 'classes()',
    'data-mol-id': 'rule-builder',
  },
  template: `<ng-container
      [ngTemplateOutlet]="groupTpl"
      [ngTemplateOutletContext]="rootContext()"
    ></ng-container>
    <ng-template
      #groupTpl
      let-group
      let-isRoot="isRoot"
      let-onReplace="onReplace"
      let-onRemove="onRemove"
    >
      <div
        [class]="groupClasses()"
        [style]="groupStyle()"
        [attr.data-mol-id]="'rule-builder-group-' + group.id"
        [attr.data-group-op]="group.op"
      >
        <div [class]="rowClasses()">
          <button
            mol-button
            [variant]="'outline'"
            [size]="'sm'"
            (click)="toggle(group, onReplace)"
            [attr.aria-label]="toggleLabel()"
            [attr.data-mol-id]="'rule-builder-group-' + group.id + '-toggle'"
          >
            {{ opLabel(group) }}
          </button>
          <span [class]="helpClasses()">{{ helpText(group) }}</span>
          @if (!isRoot) {
            <button
              mol-button
              [variant]="'ghost'"
              [size]="'sm'"
              (click)="onRemove()"
              [attr.aria-label]="removeGroupLabel()"
              [attr.data-mol-id]="'rule-builder-group-' + group.id + '-remove'"
            >
              {{ removeGroupText() }}
            </button>
          }
        </div>
        <div [class]="childrenClasses()" [style]="childrenStyle()">
          @for (child of group.children; track child.id) {
            @if (isGroup(child)) {
              <ng-container
                [ngTemplateOutlet]="groupTpl"
                [ngTemplateOutletContext]="groupContextOf(group, child, onReplace)"
              ></ng-container>
            } @else {
              <ng-container
                [ngTemplateOutlet]="leafTpl"
                [ngTemplateOutletContext]="leafContextOf(group, child, onReplace)"
              ></ng-container>
            }
          }
        </div>
        <div [class]="rowClasses()">
          <button
            mol-button
            [variant]="'outline'"
            [size]="'sm'"
            (click)="addCondition(group, onReplace)"
            [attr.data-mol-id]="'rule-builder-group-' + group.id + '-add-condition'"
          >
            {{ addConditionText() }}
          </button>
          <button
            mol-button
            [variant]="'ghost'"
            [size]="'sm'"
            (click)="addGroup(group, onReplace)"
            [attr.data-mol-id]="'rule-builder-group-' + group.id + '-add-group'"
          >
            {{ addGroupText() }}
          </button>
        </div>
      </div>
    </ng-template>
    <ng-template #leafTpl let-leaf let-onReplace="onReplace" let-onRemove="onRemove">
      <div [class]="leafClasses()" [attr.data-mol-id]="'rule-builder-leaf-' + leaf.id">
        <div
          mol-select
          [id]="leaf.id + '-field'"
          [value]="leaf.field"
          [options]="fieldOptions()"
          (valueChange)="setField(leaf, onReplace, $event)"
          [attr.aria-label]="fieldLabel()"
        ></div>
        @if (fieldOf(leaf); as field) {
          <div
            mol-select
            [id]="leaf.id + '-op'"
            [value]="leaf.op"
            [options]="operatorOptions(field)"
            (valueChange)="setOp(leaf, onReplace, $event)"
            [attr.aria-label]="operatorLabel()"
          ></div>
          @if (opOf(field, leaf); as op) {
            @if (arityOf(op) === 'between') {
              <ng-container
                [ngTemplateOutlet]="valueTpl"
                [ngTemplateOutletContext]="valueContextOf(leaf, field, 'between', onReplace)"
              ></ng-container>
            } @else if (arityOf(op) === 'binary') {
              <ng-container
                [ngTemplateOutlet]="valueTpl"
                [ngTemplateOutletContext]="valueContextOf(leaf, field, 'binary', onReplace)"
              ></ng-container>
            }
          }
        }
        <button
          mol-button
          [variant]="'ghost'"
          [size]="'sm'"
          (click)="onRemove()"
          [attr.aria-label]="removeConditionLabel()"
          [attr.data-mol-id]="'rule-builder-leaf-' + leaf.id + '-remove'"
        >
          {{ removeConditionText() }}
        </button>
      </div>
    </ng-template>
    <ng-template
      #valueTpl
      let-id="id"
      let-field="field"
      let-arity="arity"
      let-value="value"
      let-onChange="onChange"
    >
      @if (arity === 'between') {
        <span [class]="rowClasses()">
          <div
            mol-input
            [id]="id + '-from'"
            [type]="inputType(field)"
            [value]="fromText(field, value)"
            (change)="setFrom(field, value, onChange, $event)"
            [attr.aria-label]="fromLabel()"
          ></div>
          <span>{{ separatorText() }}</span>
          <div
            mol-input
            [id]="id + '-to'"
            [type]="inputType(field)"
            [value]="toText(field, value)"
            (change)="setTo(field, value, onChange, $event)"
            [attr.aria-label]="toLabel()"
          ></div>
        </span>
      } @else if (field.type === 'select') {
        <div
          mol-select
          [id]="id + '-value'"
          [value]="selectValue(value)"
          [options]="field.options ?? []"
          (valueChange)="onChange($event)"
          [attr.aria-label]="valueLabel()"
        ></div>
      } @else if (field.type === 'boolean') {
        <div
          mol-select
          [id]="id + '-value'"
          [value]="booleanValue(value)"
          [options]="booleanOptions()"
          (valueChange)="setBoolean(onChange, $event)"
          [attr.aria-label]="valueLabel()"
        ></div>
      } @else {
        <div
          mol-input
          [id]="id + '-value'"
          [type]="inputType(field)"
          [value]="valueText(value)"
          [placeholder]="field.placeholder"
          (change)="setRawValue(field, onChange, $event)"
          [attr.aria-label]="valueLabel()"
        ></div>
      }
    </ng-template>`,
})
export class RuleBuilder {
  /** Field catalog the user picks from. */
  schema: RuleSchema = { fields: [] }
  /** Current rule tree (controlled). */
  rules: Rule = { kind: 'leaf', id: '', field: '', op: '' }
  /** Called whenever the user mutates the tree, with the full new root rule. */
  onChange?: (next: Rule) => void
  /** Optional extra root-level class. */
  className?: string

  /**
   * Reactive translation, read in the injection context so the view re-renders
   * its text (and its aria labels) on a locale switch.
   */
  private readonly i18n = useTranslation()

  /**
   * The bonded ClassMap (styling tokens resolve at render time).
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The rendered root group: the given tree itself when it is a group,
   * otherwise an implicit AND group wrapping the bare leaf (React's
   * `rules.kind === 'group' ? rules : {...}`).
   * @returns The root group.
   */
  rootGroup(): RuleGroup {
    return this.rules.kind === 'group'
      ? this.rules
      : { kind: 'group', id: 'root', op: 'AND', children: [this.rules] }
  }

  /**
   * The root group's template context.
   * @returns The group context.
   */
  rootContext(): GroupContext {
    return {
      $implicit: this.rootGroup(),
      isRoot: true,
      onReplace: (next) => this.onChange?.(next),
      onRemove: () => this.onChange?.(emptyGroup()),
    }
  }

  /**
   * Narrows a rule to a group.
   * @param rule - The rule.
   * @returns Whether it is a group.
   */
  isGroup(rule: Rule): rule is RuleGroup {
    return rule.kind === 'group'
  }

  /**
   * The next tree after `child` is replaced inside `parent` (React's
   * `replaceChild` closure).
   * @param parent - The parent group.
   * @param child - The child being replaced.
   * @param onReplace - The parent's own replacement callback.
   * @returns The child replacement callback.
   */
  childReplace(
    parent: RuleGroup,
    child: Rule,
    onReplace: (next: Rule) => void,
  ): (next: Rule) => void {
    return (next) => onReplace(replaceById(parent, child.id, next))
  }

  /**
   * The next tree after `child` is removed from `parent` (React's
   * `removeChild` closure).
   * @param parent - The parent group.
   * @param child - The child being removed.
   * @param onReplace - The parent's own replacement callback.
   * @returns The child removal callback.
   */
  childRemove(parent: RuleGroup, child: Rule, onReplace: (next: Rule) => void): () => void {
    return () => onReplace(removeById(parent, child.id))
  }

  /**
   * The template context of a nested group.
   * @param parent - The enclosing group.
   * @param child - The nested group.
   * @param onReplace - The enclosing group's replacement callback.
   * @returns The group context.
   */
  groupContextOf(
    parent: RuleGroup,
    child: RuleGroup,
    onReplace: (next: Rule) => void,
  ): GroupContext {
    return {
      $implicit: child,
      isRoot: false,
      onReplace: this.childReplace(parent, child, onReplace),
      onRemove: this.childRemove(parent, child, onReplace),
    }
  }

  /**
   * The template context of a leaf.
   * @param parent - The enclosing group.
   * @param child - The leaf.
   * @param onReplace - The enclosing group's replacement callback.
   * @returns The leaf context.
   */
  leafContextOf(parent: RuleGroup, child: RuleLeaf, onReplace: (next: Rule) => void): LeafContext {
    return {
      $implicit: child,
      onReplace: this.childReplace(parent, child, onReplace),
      onRemove: this.childRemove(parent, child, onReplace),
    }
  }

  /**
   * The template context of a leaf's value editor.
   * @param leaf - The leaf that owns the value.
   * @param field - The leaf's field descriptor.
   * @param arity - The operator's arity.
   * @param onReplace - The leaf's replacement callback.
   * @returns The value-editor context.
   */
  valueContextOf(
    leaf: RuleLeaf,
    field: RuleField,
    arity: 'binary' | 'between',
    onReplace: (next: Rule) => void,
  ): ValueContext {
    return {
      id: leaf.id,
      field,
      arity,
      value: leaf.value,
      onChange: (value) => onReplace({ ...leaf, value }),
    }
  }

  /**
   * Flips a group's operator between AND and OR.
   * @param group - The group.
   * @param onReplace - The group's replacement callback.
   */
  toggle(group: RuleGroup, onReplace: (next: Rule) => void): void {
    onReplace(toggleGroupOp(group, group.id) as RuleGroup)
  }

  /**
   * Appends an empty leaf to a group.
   * @param group - The group.
   * @param onReplace - The group's replacement callback.
   */
  addCondition(group: RuleGroup, onReplace: (next: Rule) => void): void {
    onReplace(appendToGroup(group, group.id, emptyLeaf()) as RuleGroup)
  }

  /**
   * Appends an empty nested group to a group.
   * @param group - The group.
   * @param onReplace - The group's replacement callback.
   */
  addGroup(group: RuleGroup, onReplace: (next: Rule) => void): void {
    onReplace(appendToGroup(group, group.id, emptyGroup()) as RuleGroup)
  }

  /**
   * The field descriptor a leaf names, if the schema has it.
   * @param leaf - The leaf.
   * @returns The field, or undefined.
   */
  fieldOf(leaf: RuleLeaf): RuleField | undefined {
    return this.schema.fields.find((f) => f.name === leaf.field)
  }

  /**
   * The operator descriptor a leaf names within its field's catalog.
   * @param field - The leaf's field.
   * @param leaf - The leaf.
   * @returns The operator, or undefined.
   */
  opOf(field: RuleField, leaf: RuleLeaf): ReturnType<typeof operatorById> {
    return operatorById(field, leaf.op)
  }

  /**
   * An operator's value arity (React's `op?.arity ?? 'binary'`).
   * @param op - The operator.
   * @returns The arity.
   */
  arityOf(op: ReturnType<typeof operatorById>): 'unary' | 'binary' | 'between' {
    return op?.arity ?? 'binary'
  }

  /**
   * Sets a leaf's field and auto-picks the field's first operator.
   * @param leaf - The leaf.
   * @param onReplace - The leaf's replacement callback.
   * @param name - The field name.
   */
  setField(leaf: RuleLeaf, onReplace: (next: Rule) => void, name: string): void {
    const field = this.schema.fields.find((f) => f.name === name)
    const firstOp = field ? operatorsFor(field)[0] : undefined
    onReplace({ ...leaf, field: name, op: firstOp?.id ?? '', value: undefined })
  }

  /**
   * Sets a leaf's operator, resetting its value.
   * @param leaf - The leaf.
   * @param onReplace - The leaf's replacement callback.
   * @param opId - The operator id.
   */
  setOp(leaf: RuleLeaf, onReplace: (next: Rule) => void, opId: string): void {
    onReplace({ ...leaf, op: opId, value: undefined })
  }

  /**
   * The value inputs' type for a field (React's `inputType`).
   * @param field - The field.
   * @returns The native input type.
   */
  inputType(field: RuleField): string {
    return field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'
  }

  /**
   * The `[from, to]` tuple of a between-valued leaf, with React's fallbacks.
   * @param field - The field.
   * @param value - The leaf's value.
   * @returns The tuple.
   */
  tupleOf(field: RuleField, value: RuleLeafValue | undefined): [string, string] | [number, number] {
    if (Array.isArray(value) && value.length === 2) return value
    return field.type === 'number' ? [0, 0] : ['', '']
  }

  /**
   * The "from" input's text.
   * @param field - The field.
   * @param value - The leaf's value.
   * @returns The text.
   */
  fromText(field: RuleField, value: RuleLeafValue | undefined): string {
    return String(this.tupleOf(field, value)[0] ?? '')
  }

  /**
   * The "to" input's text.
   * @param field - The field.
   * @param value - The leaf's value.
   * @returns The text.
   */
  toText(field: RuleField, value: RuleLeafValue | undefined): string {
    return String(this.tupleOf(field, value)[1] ?? '')
  }

  /**
   * Writes the "from" half of a between value.
   * @param field - The field.
   * @param value - The leaf's current value.
   * @param onChange - Receives the next value.
   * @param event - The native input event.
   */
  setFrom(
    field: RuleField,
    value: RuleLeafValue | undefined,
    onChange: (next: RuleLeafValue | undefined) => void,
    event: Event,
  ): void {
    const raw = (event.target as HTMLInputElement).value
    const tuple = this.tupleOf(field, value)
    onChange(
      (field.type === 'number'
        ? [Number(raw), (tuple as [number, number])[1]]
        : [raw, (tuple as [string, string])[1]]) as RuleLeafValue,
    )
  }

  /**
   * Writes the "to" half of a between value.
   * @param field - The field.
   * @param value - The leaf's current value.
   * @param onChange - Receives the next value.
   * @param event - The native input event.
   */
  setTo(
    field: RuleField,
    value: RuleLeafValue | undefined,
    onChange: (next: RuleLeafValue | undefined) => void,
    event: Event,
  ): void {
    const raw = (event.target as HTMLInputElement).value
    const tuple = this.tupleOf(field, value)
    onChange(
      (field.type === 'number'
        ? [(tuple as [number, number])[0], Number(raw)]
        : [(tuple as [string, string])[0], raw]) as RuleLeafValue,
    )
  }

  /**
   * Writes a select field's value.
   * @param value - The leaf's current value.
   * @returns The select's value.
   */
  selectValue(value: RuleLeafValue | undefined): string {
    return typeof value === 'string' ? value : ''
  }

  /**
   * Writes a boolean field's select value.
   * @param value - The leaf's current value.
   * @returns The select's value.
   */
  booleanValue(value: RuleLeafValue | undefined): string {
    return value === true ? 'true' : value === false ? 'false' : ''
  }

  /**
   * Writes a boolean value from the select's chosen text.
   * @param onChange - Receives the next value.
   * @param chosen - The chosen option value.
   */
  setBoolean(onChange: (next: RuleLeafValue | undefined) => void, chosen: string): void {
    onChange(chosen === 'true')
  }

  /**
   * A binary text / number / date value as input text.
   * @param value - The leaf's value.
   * @returns The input text.
   */
  valueText(value: RuleLeafValue | undefined): string {
    return value === undefined ? '' : String(value)
  }

  /**
   * Writes a binary text / number / date value from the input.
   * @param field - The field.
   * @param onChange - Receives the next value.
   * @param event - The native input event.
   */
  setRawValue(
    field: RuleField,
    onChange: (next: RuleLeafValue | undefined) => void,
    event: Event,
  ): void {
    const raw = (event.target as HTMLInputElement).value
    onChange(field.type === 'number' ? Number(raw) : raw)
  }

  /**
   * The field dropdown's options, with the placeholder first.
   * @returns The options.
   */
  fieldOptions(): Array<{ value: string; label: string }> {
    return [
      {
        value: '',
        label: this.i18n.t('ruleBuilder.field.placeholder', {}, { defaultValue: 'Select field…' }),
      },
      ...this.schema.fields.map((f) => ({ value: f.name, label: f.label })),
    ]
  }

  /**
   * The operator dropdown's options for a field.
   * @param field - The field.
   * @returns The options.
   */
  operatorOptions(field: RuleField): Array<{ value: string; label: string }> {
    return operatorsFor(field).map((o) => ({ value: o.id, label: o.label }))
  }

  /**
   * The boolean value dropdown's options.
   * @returns The options.
   */
  booleanOptions(): Array<{ value: string; label: string }> {
    return [
      {
        value: 'true',
        label: this.i18n.t('ruleBuilder.boolean.true', {}, { defaultValue: 'true' }),
      },
      {
        value: 'false',
        label: this.i18n.t('ruleBuilder.boolean.false', {}, { defaultValue: 'false' }),
      },
    ]
  }

  /**
   * The outer class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ direction: 'col', gap: 'sm' }), this.className)
  }

  /**
   * One group's class list.
   * @returns The class string.
   */
  groupClasses(): string {
    return this.cm().cn(
      this.cm().flex({ direction: 'col', gap: 'xs' }),
      this.cm().borderAll,
      this.cm().surface,
    )
  }

  /**
   * One group's inline style (React's `style={cm.sp({ p: 3 })}`).
   * @returns The style attribute text.
   */
  groupStyle(): string | null {
    return styleText(this.cm().sp({ p: 3 }))
  }

  /**
   * A group's children wrapper class list.
   * @returns The class string.
   */
  childrenClasses(): string {
    return this.cm().flex({ direction: 'col', gap: 'xs' })
  }

  /**
   * A group's children wrapper inline style (React's `cm.sp({ p: 2 })`).
   * @returns The style attribute text.
   */
  childrenStyle(): string | null {
    return styleText(this.cm().sp({ p: 2 }))
  }

  /**
   * A row of controls' class list.
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'xs' })
  }

  /**
   * The help text's class list.
   * @returns The class string.
   */
  helpClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().textMuted)
  }

  /**
   * A leaf row's class list.
   * @returns The class string.
   */
  leafClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'xs', wrap: 'wrap' })
  }

  /**
   * A group's operator label.
   * @param group - The group.
   * @returns The translated label.
   */
  opLabel(group: RuleGroup): string {
    return group.op === 'AND'
      ? this.i18n.t('ruleBuilder.op.and', {}, { defaultValue: 'AND' })
      : this.i18n.t('ruleBuilder.op.or', {}, { defaultValue: 'OR' })
  }

  /**
   * A group's help text.
   * @param group - The group.
   * @returns The translated help text.
   */
  helpText(group: RuleGroup): string {
    const op: RuleGroupOp = group.op
    return op === 'AND'
      ? this.i18n.t(
          'ruleBuilder.help.allMustMatch',
          {},
          {
            defaultValue: 'All conditions must match',
          },
        )
      : this.i18n.t(
          'ruleBuilder.help.anyMustMatch',
          {},
          {
            defaultValue: 'Any condition may match',
          },
        )
  }

  /**
   * The toggle button's accessible label.
   * @returns The translated label.
   */
  toggleLabel(): string {
    return this.i18n.t('ruleBuilder.aria.toggleOp', {}, { defaultValue: 'Toggle AND / OR' })
  }

  /**
   * The nested group's remove button accessible label.
   * @returns The translated label.
   */
  removeGroupLabel(): string {
    return this.i18n.t('ruleBuilder.aria.removeGroup', {}, { defaultValue: 'Remove group' })
  }

  /**
   * The nested group's remove button text.
   * @returns The translated text.
   */
  removeGroupText(): string {
    return this.i18n.t('ruleBuilder.action.removeGroup', {}, { defaultValue: 'Remove group' })
  }

  /**
   * The "Add condition" button text.
   * @returns The translated text.
   */
  addConditionText(): string {
    return this.i18n.t('ruleBuilder.action.addCondition', {}, { defaultValue: '+ Add condition' })
  }

  /**
   * The "Add group" button text.
   * @returns The translated text.
   */
  addGroupText(): string {
    return this.i18n.t('ruleBuilder.action.addGroup', {}, { defaultValue: '+ Add group' })
  }

  /**
   * The field dropdown's accessible label.
   * @returns The translated label.
   */
  fieldLabel(): string {
    return this.i18n.t('ruleBuilder.aria.field', {}, { defaultValue: 'Field' })
  }

  /**
   * The operator dropdown's accessible label.
   * @returns The translated label.
   */
  operatorLabel(): string {
    return this.i18n.t('ruleBuilder.aria.operator', {}, { defaultValue: 'Operator' })
  }

  /**
   * The value editor's accessible label.
   * @returns The translated label.
   */
  valueLabel(): string {
    return this.i18n.t('ruleBuilder.aria.value', {}, { defaultValue: 'Value' })
  }

  /**
   * The "from" input's accessible label.
   * @returns The translated label.
   */
  fromLabel(): string {
    return this.i18n.t('ruleBuilder.aria.valueFrom', {}, { defaultValue: 'From' })
  }

  /**
   * The "to" input's accessible label.
   * @returns The translated label.
   */
  toLabel(): string {
    return this.i18n.t('ruleBuilder.aria.valueTo', {}, { defaultValue: 'To' })
  }

  /**
   * The between separator text.
   * @returns The translated separator.
   */
  separatorText(): string {
    return this.i18n.t('ruleBuilder.between.separator', {}, { defaultValue: '–' })
  }

  /**
   * The remove-condition button's accessible label.
   * @returns The translated label.
   */
  removeConditionLabel(): string {
    return this.i18n.t(
      'ruleBuilder.aria.removeCondition',
      {},
      {
        defaultValue: 'Remove condition',
      },
    )
  }

  /**
   * The remove-condition button's text.
   * @returns The translated text.
   */
  removeConditionText(): string {
    return this.i18n.t('ruleBuilder.action.removeCondition', {}, { defaultValue: 'Remove' })
  }
}
