/**
 * NodeEditorSection component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { rendersNode } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * NodeEditorSection component.
 *
 * Labeled section inside the properties panel: the label uses the canonical
 * 11px uppercase-tracking-widest style, with an optional trailing node on the
 * right of the label row. The host IS the outer `<div>`
 * (`div[mol-node-editor-section]`), matching React's root exactly.
 *
 * Node props are projected content: `label` is `[slot=label]`, `trailing` is
 * `[slot=trailing]`, and children are the default projection. Plain strings
 * may also be passed to `label` / `trailing` as inputs.
 */
@Component({
  selector: 'div[mol-node-editor-section]',
  standalone: true,
  inputs: ['label', 'children', 'trailing', 'gap', 'htmlFor'],
  host: {
    '[class]': 'classes()',
  },
  template: `<div [class]="rowClasses()">
      <label [class]="labelClasses()" [attr.for]="htmlFor">
        @if (hasLabel) {
          {{ label }}
        }
        <ng-content select="[slot=label]"
      /></label>
      @if (hasTrailing) {
        {{ trailing }}
      }
      <ng-content select="[slot=trailing]" />
    </div>
    <ng-content />`,
})
export class NodeEditorSection {
  /** Section label — a string input, or `[slot=label]` projected content. */
  label?: unknown
  /** Section content is projected; the input is accepted for prop parity. */
  children?: unknown
  /** Optional trailing node — a string input, or `[slot=trailing]` projected content. */
  trailing?: unknown
  /**
   * Id of the form control this label names (`<label for>`). Set it when the
   * section holds a single labelable control, so the control gets a name.
   */
  htmlFor?: string
  /** Stack gap between section header and children (React's default `3` applied at read time). */
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether a string label input renders (a projected label is not).
   * @returns True when the label input renders as text.
   */
  get hasLabel(): boolean {
    return rendersNode(this.label)
  }

  /**
   * Whether a string trailing input renders (`trailing ?? null`).
   * @returns True when the trailing input renders as text.
   */
  get hasTrailing(): boolean {
    return rendersNode(this.trailing)
  }

  /**
   * The host's class list (React's `cm.stack(gap)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().stack(this.gap ?? 3)
  }

  /**
   * The label row's class list.
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ justify: 'between', align: 'center' })
  }

  /**
   * The label's class list.
   * @returns The class string.
   */
  labelClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.fontWeight('bold'), cm.nodeEditorPanelSectionLabel)
  }
}
