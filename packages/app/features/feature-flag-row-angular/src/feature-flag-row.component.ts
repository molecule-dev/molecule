/**
 * FeatureFlagRow component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-angular'

import type { FeatureFlag, FlagType } from './types.js'

/**
 * Whether a value is one of the cases' projected node templates (a
 * `{ $nodes }` value inside a data prop becomes a `TemplateRef`).
 *
 * @param value - The prop value.
 * @returns True for a projected node template.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' && value !== null && 'createEmbeddedView' in value

/**
 * FeatureFlagRow component.
 *
 * Flag name + type badge + key + description on the left, one labelled
 * `<mol-switch>` per environment (with a rollout-% readout for percentage
 * flags) on the right. The host IS the outer `<div>`
 * (`div[mol-feature-flag-row]`), matching React's root exactly, so the row's
 * ClassMap classes are the host's.
 *
 * Node-valued fields (`name`, `description`, `environments[].label`) are
 * projected templates; plain strings are used as they are.
 */
@Component({
  selector: 'div[mol-feature-flag-row]',
  standalone: true,
  imports: [Switch, NgTemplateOutlet],
  inputs: ['flag', 'onToggle', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@if (flag; as current) {<div [class]="leftClasses()"><div [class]="cm.flex({ align: 'center', gap: 'sm' })"><span [class]="cm.cn(cm.fontWeight('semibold'))">@if (isTemplate(current.name)) {<ng-container [ngTemplateOutlet]="asTemplate(current.name)"></ng-container>} @else {{{ current.name }}}</span><span [class]="cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))">{{ typeLabel(current.type) }}</span></div><span [class]="cm.cn(cm.textSize('xs'))">{{ current.key }}</span>@if (current.description) {<p [class]="cm.textSize('sm')">@if (isTemplate(current.description)) {<ng-container [ngTemplateOutlet]="asTemplate(current.description)"></ng-container>} @else {{{ current.description }}}</p>}</div><div [class]="cm.flex({ align: 'center', gap: 'md' })">@for (env of current.environments; track env.id) {<div [class]="cm.cn(cm.stack(0), cm.textCenter)"><span [class]="cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))">@if (isTemplate(env.label)) {<ng-container [ngTemplateOutlet]="asTemplate(env.label)"></ng-container>} @else {{{ env.label }}}</span><div [class]="cm.flex({ align: 'center', gap: 'xs' })"><mol-switch [checked]="env.enabled" (change)="toggle(current.key, env.id, $event)" [attr.aria-label]="ariaLabel(current.key, env.id)"></mol-switch>@if (current.type === 'percentage' && env.rolloutPct !== undefined) {<span [class]="cm.textSize('xs')">{{ env.rolloutPct }}%</span>}</div></div>}</div>}`,
})
export class FeatureFlagRow {
  /** The flag to render. */
  flag?: FeatureFlag
  /** Called when an environment toggles. */
  onToggle?: (flagKey: string, envId: string, next: boolean) => void
  /** Extra classes on the outer wrapper. */
  className?: string

  /** The reactive i18n binding, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /**
   * The outer wrapper's class list (React's `cm.cn(flex, sp, className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm.cn(
      this.cm.flex({ align: 'start', justify: 'between', gap: 'md' }),
      this.cm.sp('py', 2),
      this.className,
    )
  }

  /**
   * The left column's class list (`cm.cn(cm.flex1, cm.stack(0))`).
   * @returns The class string.
   */
  leftClasses(): string {
    return this.cm.cn(this.cm.flex1, this.cm.stack(0))
  }

  /**
   * The translated type-badge label: one literal `t('flagType.<type>')` call
   * per flag type, exactly as React does (a runtime-built key such as
   * `` t(`flagType.${type}`) `` is invisible to molecule's i18n gate).
   * @param type - The flag type.
   * @returns The badge text.
   */
  typeLabel(type: FlagType): string {
    switch (type) {
      case 'boolean':
        return this.t('flagType.boolean', {}, { defaultValue: 'Boolean' })
      case 'multivariate':
        return this.t('flagType.multivariate', {}, { defaultValue: 'Multivariate' })
      case 'percentage':
        return this.t('flagType.percentage', {}, { defaultValue: 'Percentage' })
      case 'string':
        return this.t('flagType.string', {}, { defaultValue: 'String' })
    }
  }

  /**
   * The switch's translated `aria-label` (React's
   * `featureFlagRow.aria.flagInEnvironment` call, whose English default is
   * `"<flagKey> in <envId>"`).
   * @param flagKey - The flag's machine key.
   * @param envId - The environment id.
   * @returns The label text.
   */
  ariaLabel(flagKey: string, envId: string): string {
    return this.t(
      'featureFlagRow.aria.flagInEnvironment',
      { flag: flagKey, environment: envId },
      { defaultValue: '{{flag}} in {{environment}}' },
    )
  }

  /**
   * Whether a value is one of the cases' projected node templates.
   * @param value - The prop value.
   * @returns True for a projected node template.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return isTemplate(value)
  }

  /**
   * The value as a template (call under {@link FeatureFlagRow.isTemplate}).
   * @param value - The prop value.
   * @returns The template.
   */
  asTemplate(value: unknown): TemplateRef<unknown> {
    return value as TemplateRef<unknown>
  }

  /**
   * An environment switch's change: the hidden checkbox's `checked` at emit
   * time (React reads `e.target.checked` before its controlled restore).
   * @param flagKey - The flag's machine key.
   * @param envId - The environment id.
   * @param event - The native change event the UI Switch re-emitted.
   */
  toggle(flagKey: string, envId: string, event: Event): void {
    this.onToggle?.(flagKey, envId, (event.target as HTMLInputElement | null)?.checked ?? false)
  }
}
