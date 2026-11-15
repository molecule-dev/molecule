/**
 * PricingTable component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-angular'

import type { PricingFeature, PricingPlan } from './types.js'

/**
 * PricingTable component.
 *
 * Side-by-side pricing comparison — features × plans matrix. A header row
 * holds plan cards (name, description, price, interval, CTA); body rows show
 * per-feature availability (`true` → ✓, `false` → —, strings/templates pass
 * through). The wrapper scrolls horizontally when columns overflow.
 *
 * The host IS the outer `<div>` (`div[mol-pricing-table]`), matching React's
 * root exactly. Node-valued fields (`plans[].name`, …) are projected templates
 * in Angular (an input cannot carry a node), rendered through
 * `ngTemplateOutlet`; plain strings render as text.
 */
@Component({
  selector: 'div[mol-pricing-table]',
  standalone: true,
  imports: [Button, Card, NgTemplateOutlet],
  inputs: ['plans', 'features', 'className'],
  host: {
    style: 'overflow-x: auto',
    '[class]': 'classes()',
  },
  template: `<table style="width: 100%; border-collapse: separate; border-spacing: 0px">
    <thead>
      <tr>
        <th style="min-width: 160px; text-align: left"></th>
        @for (plan of plans; track plan.id) {
          <th style="vertical-align: top; padding: 12px">
            <div mol-card [style]="cardStyle(plan)">
              <div [class]="cm().stack(2)">
                <h3 [class]="cm().cn(cm().textSize('lg'), cm().fontWeight('bold'))">
                  @if (isTemplate(plan.name)) {
                    <ng-container [ngTemplateOutlet]="asTemplate(plan.name)"></ng-container>
                  } @else {
                    {{ text(plan.name) }}
                  }
                </h3>
                @if (plan.description) {
                  <p [class]="cm().textSize('sm')">
                    @if (isTemplate(plan.description)) {
                      <ng-container
                        [ngTemplateOutlet]="asTemplate(plan.description)"
                      ></ng-container>
                    } @else {
                      {{ text(plan.description) }}
                    }
                  </p>
                }
                <div [class]="cm().flex({ align: 'baseline', gap: 'xs' })">
                  <span [class]="cm().cn(cm().textSize('2xl'), cm().fontWeight('bold'))">
                    @if (isTemplate(plan.price)) {
                      <ng-container [ngTemplateOutlet]="asTemplate(plan.price)"></ng-container>
                    } @else {
                      {{ text(plan.price) }}
                    }
                  </span>
                  @if (plan.interval) {
                    <span [class]="cm().textSize('xs')">
                      @if (isTemplate(plan.interval)) {
                        <ng-container [ngTemplateOutlet]="asTemplate(plan.interval)"></ng-container>
                      } @else {
                        {{ text(plan.interval) }}
                      }
                    </span>
                  }
                </div>
                @if (plan.cta) {
                  @if (plan.cta.href) {
                    <a [attr.href]="plan.cta.href">
                      <button
                        mol-button
                        [variant]="'solid'"
                        [color]="plan.recommended ? 'primary' : 'secondary'"
                      >
                        @if (isTemplate(plan.cta.label)) {
                          <ng-container
                            [ngTemplateOutlet]="asTemplate(plan.cta.label)"
                          ></ng-container>
                        } @else {
                          {{ text(plan.cta.label) }}
                        }
                      </button>
                    </a>
                  } @else {
                    <button
                      mol-button
                      [variant]="'solid'"
                      [color]="plan.recommended ? 'primary' : 'secondary'"
                      (click)="invoke(plan.cta.onClick, $event)"
                    >
                      @if (isTemplate(plan.cta.label)) {
                        <ng-container
                          [ngTemplateOutlet]="asTemplate(plan.cta.label)"
                        ></ng-container>
                      } @else {
                        {{ text(plan.cta.label) }}
                      }
                    </button>
                  }
                }
              </div>
            </div>
          </th>
        }
      </tr>
    </thead>
    <tbody>
      @for (feature of features; track $index) {
        @if (feature.groupHeading) {
          <tr>
            <th [attr.colspan]="plans.length + 1" style="text-align: left; padding: 12px 8px">
              <span [class]="cm().cn(cm().textSize('xs'), cm().fontWeight('semibold'))">
                @if (isTemplate(feature.groupHeading)) {
                  <ng-container
                    [ngTemplateOutlet]="asTemplate(feature.groupHeading)"
                  ></ng-container>
                } @else {
                  {{ text(feature.groupHeading) }}
                }
              </span>
            </th>
          </tr>
        }
        <tr>
          <td style="padding: 8px; text-align: left">
            <span [class]="cm().textSize('sm')">
              @if (isTemplate(feature.label)) {
                <ng-container [ngTemplateOutlet]="asTemplate(feature.label)"></ng-container>
              } @else {
                {{ text(feature.label) }}
              }
            </span>
          </td>
          @for (plan of plans; track plan.id) {
            @let value = renderValue(feature.values[plan.id]);
            <td style="padding: 8px; text-align: center">
              <span [class]="cm().textSize('sm')">
                @if (isTemplate(value)) {
                  <ng-container [ngTemplateOutlet]="asTemplate(value)"></ng-container>
                } @else {
                  {{ text(value) }}
                }
              </span>
            </td>
          }
        </tr>
      }
    </tbody>
  </table>`,
})
export class PricingTable {
  /** The plan columns, left to right. */
  plans: PricingPlan[] = []
  /** The feature rows, top to bottom. */
  features: PricingFeature[] = []
  /** Extra classes on the outer wrapper. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(0), this.className)
  }

  /**
   * The recommended plan's outline style, in React's shape.
   * @param plan - The plan.
   * @returns The style object, or undefined for a plain column.
   */
  cardStyle(plan: PricingPlan): Record<string, string> | undefined {
    return plan.recommended
      ? { outline: '2px solid currentColor', outlineOffset: '-2px' }
      : undefined
  }

  /**
   * Whether a node-valued field arrived as a projected template.
   * @param value - The field value.
   * @returns True for a template.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * A node-valued field as a template (the `@if` above already checked it).
   * @param value - The field value.
   * @returns The template, or null when it is not one.
   */
  asTemplate(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * A node-valued field as display text.
   * @param value - The field value.
   * @returns Its text, or an empty string when absent.
   */
  text(value: unknown): string {
    return value === null || value === undefined ? '' : String(value)
  }

  /**
   * Renders a feature cell value: `true` → ✓, `false` → —, anything else
   * pass-through.
   * @param value - The per-plan feature value.
   * @returns The content to render.
   */
  renderValue(value: unknown): unknown {
    if (value === true) return '✓'
    if (value === false) return '—'
    return value
  }

  /**
   * Calls a plan's click handler with the DOM event, as React's `Button` does.
   * @param handler - The plan's `onClick`, when it has one.
   * @param event - The click event.
   */
  invoke(handler: ((event?: MouseEvent) => void) | undefined, event: MouseEvent): void {
    handler?.(event)
  }
}
