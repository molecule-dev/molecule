/**
 * StageTimeline component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { StageStatus, StageTimelineStage } from './types.js'

/**
 * Resolve a stage's rendering status given its index and the current index.
 *
 * @param i - Zero-based stage index.
 * @param currentIndex - Index of the current stage (`-1` = none, `len` = all done).
 * @returns The rendering status for stage `i`.
 */
export function statusOf(i: number, currentIndex: number): StageStatus {
  if (i < currentIndex) return 'completed'
  if (i === currentIndex) return 'current'
  return 'upcoming'
}

/**
 * StageTimeline component.
 *
 * Multi-stage horizontal progress timeline with a current-stage marker. The
 * host IS the root `<div>` (`div[mol-stage-timeline]`), matching React's root
 * exactly: `role="list"` + the accessible label on the host, the connector rail
 * and one marker per stage inside it. Node-valued stage fields (`label`,
 * `subtitle`) are `ng-template` references rendered through
 * {@link NgTemplateOutlet}; string / number fields render as text.
 */
@Component({
  selector: 'div[mol-stage-timeline]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['stages', 'currentIndex', 'dataMolId', 'className'],
  host: {
    role: 'list',
    '[class]': 'classes()',
    '[attr.data-mol-id]': "dataMolId ?? 'stage-timeline'",
    '[attr.aria-label]': 'groupLabel()',
    '[style]': 'rootStyle()',
  },
  // prettier-ignore
  template: `
    @if (stages.length > 0) {
      <div aria-hidden="true" [style]="railStyle()" data-mol-id="stage-timeline-rail"><div style="position: absolute; inset: 0px; background: var(--mol-color-surface-variant, rgba(0,0,0,0.12))"></div><div data-mol-id="stage-timeline-rail-fill" [style]="fillStyle()"></div></div>
      @for (stage of stages; track stage.id; let i = $index) {
        <div role="listitem" [attr.data-stage-id]="stage.id" [attr.data-stage-status]="statusOfIndex(i)" data-mol-id="stage-timeline-stage" [attr.aria-current]="isCurrent(i) ? 'step' : null" [attr.aria-label]="stageAria(stage, i)" [style]="stageWrapperStyle()">
          <button type="button" (click)="handleClick(stage, $event)" [disabled]="!stage.onClick" [attr.aria-label]="stageAria(stage, i)" data-mol-id="stage-timeline-dot" [style]="dotStyle(stage, i)">{{ dotText(i) }}</button>
          <span [class]="labelClasses(i)" data-mol-id="stage-timeline-label" [style]="labelStyle(i)">@if (isTemplate(stage.label)) {<ng-container [ngTemplateOutlet]="templateOf(stage.label)"></ng-container>}@else {{{ textOf(stage.label) }}}</span>
          @if (stage.subtitle) {
            <span [class]="subtitleClasses()" data-mol-id="stage-timeline-subtitle" style="text-align: center; color: var(--mol-color-on-surface-variant, #888)">@if (isTemplate(stage.subtitle)) {<ng-container [ngTemplateOutlet]="templateOf(stage.subtitle)"></ng-container>}@else {{{ textOf(stage.subtitle) }}}</span>
          }
        </div>
      }
    }
  `,
})
export class StageTimeline {
  /** Ordered stages to render, left-to-right. */
  stages: StageTimelineStage[] = []
  /**
   * Index of the current stage (React's `currentIndex`): stages before it render
   * completed, after it upcoming; `-1` = none, `stages.length` = all done.
   */
  currentIndex = 0
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the root's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The root's accessible label.
   * @returns The translated group label.
   */
  groupLabel(): string {
    return this.i18n.t('stageTimeline.group', {}, { defaultValue: 'Stage timeline' })
  }

  /**
   * The root's inline style — the grid geometry has no ClassMap resolver — or
   * no style at all for an empty stage list (React's early return).
   * @returns The CSS text.
   */
  rootStyle(): string {
    if (this.stages.length === 0) return ''
    return `position: relative; display: grid; grid-template-columns: repeat(${this.stages.length}, minmax(0, 1fr)); align-items: start`
  }

  /**
   * The connector rail's inline style (hidden behind the dots).
   * @returns The CSS text.
   */
  railStyle(): string {
    const inset = `${(0.5 / this.stages.length) * 100}%`
    return `position: absolute; top: 14px; left: ${inset}; right: ${inset}; height: 2px; pointer-events: none`
  }

  /**
   * The rail's filled portion: how full it should be (0–100%).
   * @returns The CSS text.
   */
  fillStyle(): string {
    const denom = Math.max(1, this.stages.length - 1)
    const fillRatio = Math.max(0, Math.min(1, this.currentIndex / denom))
    return `position: absolute; top: 0px; bottom: 0px; left: 0px; width: ${
      fillRatio * 100
    }%; background: var(--mol-color-primary, #3366ff); transition: width 200ms ease`
  }

  /**
   * A stage's rendering status.
   * @param i - The stage's zero-based index.
   * @returns Its status.
   */
  statusOfIndex(i: number): StageStatus {
    return statusOf(i, this.currentIndex)
  }

  /**
   * Whether a stage is the current one.
   * @param i - The stage's zero-based index.
   * @returns True for the current stage.
   */
  isCurrent(i: number): boolean {
    return this.statusOfIndex(i) === 'current'
  }

  /**
   * Whether a stage is completed.
   * @param i - The stage's zero-based index.
   * @returns True for a completed stage.
   */
  isCompleted(i: number): boolean {
    return this.statusOfIndex(i) === 'completed'
  }

  /**
   * The marker's text: a tick for a completed stage, its position otherwise.
   * @param i - The stage's zero-based index.
   * @returns The text to render.
   */
  dotText(i: number): string {
    return this.isCompleted(i) ? '✓' : String(i + 1)
  }

  /**
   * The stage's accessible label, built from React's i18n key and default
   * message (only a plain string label is carried into it).
   * @param stage - The stage.
   * @param i - The stage's zero-based index.
   * @returns The aria label.
   */
  stageAria(stage: StageTimelineStage, i: number): string {
    return this.i18n.t(
      'stageTimeline.stage',
      {
        label: typeof stage.label === 'string' ? stage.label : '',
        index: i + 1,
        total: this.stages.length,
        status: this.statusOfIndex(i),
      },
      { defaultValue: 'Stage {{index}} of {{total}}: {{label}} ({{status}})' },
    )
  }

  /**
   * The wrapper column's inline style.
   * @returns The CSS text.
   */
  stageWrapperStyle(): string {
    return 'position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0px'
  }

  /**
   * The dot's inline style — geometry and status colors have no ClassMap
   * resolver, and every color is a `--mol-color-*` token.
   * @param stage - The stage the dot belongs to.
   * @param i - The stage's zero-based index.
   * @returns The CSS text.
   */
  dotStyle(stage: StageTimelineStage, i: number): string {
    const completed = this.isCompleted(i)
    const current = this.isCurrent(i)
    const parts = [
      'width: 28px',
      'height: 28px',
      'border-radius: 50%',
      `border: 2px solid ${
        completed || current
          ? 'var(--mol-color-primary, #3366ff)'
          : 'var(--mol-color-outline, rgba(0,0,0,0.25))'
      }`,
      `background: ${
        completed
          ? 'var(--mol-color-primary, #3366ff)'
          : current
            ? 'var(--mol-color-primary-container, rgba(51,102,255,0.18))'
            : 'var(--mol-color-surface, transparent)'
      }`,
      `color: ${completed ? 'var(--mol-color-on-primary, #fff)' : 'inherit'}`,
      'display: inline-flex',
      'align-items: center',
      'justify-content: center',
      'font-size: 14px',
      'font-weight: 700',
      `cursor: ${stage.onClick ? 'pointer' : 'default'}`,
    ]
    if (current)
      parts.push('box-shadow: 0 0 0 4px var(--mol-color-primary-container, rgba(51,102,255,0.18))')
    parts.push('transition: box-shadow 200ms ease, background 200ms ease')
    // React merges `{ ...dotStyle, padding: 0 }` onto the button.
    parts.push('padding: 0px')
    return parts.join('; ')
  }

  /**
   * The label span's class list.
   * @param i - The stage's zero-based index.
   * @returns The class string.
   */
  labelClasses(i: number): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight(this.isCurrent(i) ? 'semibold' : 'normal'))
  }

  /**
   * The label span's inline style.
   * @param i - The stage's zero-based index.
   * @returns The CSS text.
   */
  labelStyle(i: number): string {
    const color = this.isCurrent(i)
      ? 'var(--mol-color-primary, #3366ff)'
      : this.isCompleted(i)
        ? 'var(--mol-color-on-surface, inherit)'
        : 'var(--mol-color-on-surface-variant, #666)'
    return `text-align: center; color: ${color}`
  }

  /**
   * The subtitle span's class list.
   * @returns The class string.
   */
  subtitleClasses(): string {
    return this.cm().textSize('xs')
  }

  /**
   * Calls a stage's own click handler with the native event, as React's
   * `onClick={stage.onClick}` does.
   * @param stage - The stage that was clicked.
   * @param event - The click event.
   */
  handleClick(stage: StageTimelineStage, event: Event): void {
    const onClick = stage.onClick as ((event: Event) => void) | undefined
    onClick?.(event)
  }

  /**
   * Whether a stage field holds a node (an `ng-template` reference) rather than
   * text.
   * @param value - The stage field.
   * @returns True when it renders through a template outlet.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * Narrows a value to an embedded template.
   * @param value - A stage field.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * The text a stage field renders (React renders strings and numbers as text).
   * @param value - The stage field.
   * @returns The text, or `''` for a node value.
   */
  textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
}
