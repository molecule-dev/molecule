/**
 * StatusSummary component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { ComponentStatus, StatusGroup } from './types.js'

/** English label rendered for each status when no locale bond supplies the key. */
const STATUS_LABEL: Record<ComponentStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded performance',
  'partial-outage': 'Partial outage',
  'major-outage': 'Major outage',
  maintenance: 'Under maintenance',
}

/** The fixed semantic hue of each status (React's inline-style palette). */
const STATUS_COLOR: Record<ComponentStatus, string> = {
  operational: '#22c55e',
  degraded: '#eab308',
  'partial-outage': '#f97316',
  'major-outage': '#ef4444',
  maintenance: '#60a5fa',
}

/** The statuses from most to least severe (React's `worst` order). */
const SEVERITY_ORDER: ComponentStatus[] = [
  'major-outage',
  'partial-outage',
  'degraded',
  'maintenance',
  'operational',
]

/**
 * StatusSummary component.
 *
 * Status-page summary — grouped component list with colored badges and an
 * overall banner derived from the worst child status. The host IS the outer
 * `<div>` (`div[mol-status-summary]`), matching React's root exactly. The
 * header and footer are projected content (`[slot=header]`, `[slot=footer]`)
 * so consumers retain full control over the banner stamp and the incident
 * list. Node-valued group / component names are `ng-template` references
 * rendered through `NgTemplateOutlet`; text fields render as text.
 */
@Component({
  selector: 'div[mol-status-summary]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['groups', 'overallStatus', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div [class]="bannerClasses()" [style]="bannerStyle()"><span [class]="labelClasses()">{{ overallLabel() }}</span><ng-content select="[slot=header]"></ng-content></div>@for (group of groups; track group.id) {<section [class]="sectionClasses()"><h3 [class]="groupNameClasses()">@if (isNode(group.name)) {<ng-container [ngTemplateOutlet]="group.name" />}@else {<ng-container>{{ textOf(group.name) }}</ng-container>}</h3><ul [class]="listClasses()">@for (component of group.components; track component.id) {<li [class]="rowClasses()"><div><span [class]="componentNameClasses()">@if (isNode(component.name)) {<ng-container [ngTemplateOutlet]="component.name" />}@else {<ng-container>{{ textOf(component.name) }}</ng-container>}</span>@if (component.subtitle) {<span [class]="subtitleClasses()">@if (isNode(component.subtitle)) {<ng-container [ngTemplateOutlet]="component.subtitle" />}@else {<ng-container>{{ textOf(component.subtitle) }}</ng-container>}</span>}</div><span [class]="badgeClasses()" [style]="badgeStyle(component.status)">{{ statusLabel(component.status) }}</span></li>}</ul></section>}<ng-content select="[slot=footer]"></ng-content>`,
})
export class StatusSummary {
  /** Grouped components. */
  groups: StatusGroup[] = []
  /** Overall summary label (auto-derived at read time when omitted). */
  overallStatus?: ComponentStatus
  /** Extra classes on the outer `<div>`. */
  className?: string

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so every label re-renders on a locale switch.
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper's class list (`cm.stack(4)` + `className`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.stack(4), this.className)
  }

  /**
   * The banner's class list (flex row + padding).
   * @returns The class string.
   */
  bannerClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), cm.sp('p', 3))
  }

  /** The banner label's class list. */
  labelClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))
  }

  /** One group section's class list (`cm.stack(2)`). */
  sectionClasses(): string {
    return this.cm().stack(2)
  }

  /** One group heading's class list. */
  groupNameClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))
  }

  /** The component list's class list (`cm.stack(1)`). */
  listClasses(): string {
    return this.cm().stack(1)
  }

  /** One component row's class list (flex row, space between). */
  rowClasses(): string {
    const cm = this.cm()
    return cm.flex({ align: 'center', justify: 'between', gap: 'sm' })
  }

  /** One component name's class list. */
  componentNameClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))
  }

  /** One component subtitle's class list. */
  subtitleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.sp('ml', 2), cm.textSize('xs'))
  }

  /** One status badge's class list. */
  badgeClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.sp('px', 2), cm.textSize('xs'), cm.fontWeight('semibold'))
  }

  /**
   * Every component status in the summary, in render order.
   * @returns The statuses.
   */
  allStatuses(): ComponentStatus[] {
    return this.groups.flatMap((group) => group.components.map((component) => component.status))
  }

  /**
   * The banner's status: React's `overallStatus ?? worst(allStatuses)`.
   * @returns The overall status.
   */
  overall(): ComponentStatus {
    if (this.overallStatus) return this.overallStatus
    const statuses = this.allStatuses()
    for (const status of SEVERITY_ORDER) {
      if (statuses.includes(status)) return status
    }
    return 'operational'
  }

  /**
   * The banner label, translated through the status key with React's fallback.
   * @returns The label text.
   */
  overallLabel(): string {
    const status = this.overall()
    return this.i18n.t(`status.${status}`, {}, { defaultValue: STATUS_LABEL[status] })
  }

  /**
   * One badge's label, translated through the status key with React's fallback.
   * @param status - The component's status.
   * @returns The label text.
   */
  statusLabel(status: ComponentStatus): string {
    return this.i18n.t(`status.${status}`, {}, { defaultValue: STATUS_LABEL[status] })
  }

  /**
   * The banner's inline style, in React's declaration order.
   * @returns The style declarations.
   */
  bannerStyle(): Record<string, string> {
    return {
      background: STATUS_COLOR[this.overall()],
      color: '#fff',
      borderRadius: '8px',
    }
  }

  /**
   * One badge's inline style, in React's declaration order.
   * @param status - The component's status.
   * @returns The style declarations.
   */
  badgeStyle(status: ComponentStatus): Record<string, string> {
    return { borderRadius: '4px', background: STATUS_COLOR[status], color: '#fff' }
  }

  /**
   * Whether a field holds a node (an `ng-template` reference) rather than text.
   * @param value - The group or component field.
   * @returns True when it renders through a template outlet.
   */
  isNode(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * The text a field renders (React renders strings and numbers as text).
   * @param value - The group or component field.
   * @returns The text, or `''` for a node field.
   */
  textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
}
