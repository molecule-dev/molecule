/**
 * SortPicker component (React parity).
 *
 * @module
 */

import type { AfterViewInit } from '@angular/core'
import { Component, ElementRef, signal, ViewChild } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Select } from '@molecule/app-ui-angular'

import type { SortOption } from './types.js'

/**
 * Whether a node is something a caller can see (an element, or a non-blank
 * text node).
 *
 * @param node - The DOM node.
 * @returns True when it renders anything.
 */
const hasRenderable = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0)

/**
 * SortPicker component.
 *
 * Standalone sort-by selector: a single-select `<Select>` with a conventional
 * "Sort by" label, rendered inline (default) or above the control. The host IS
 * the outer `<div>` React renders (`div[mol-sort-picker]`), with the same
 * classes. A node-valued `label` is projected content (`[slot=label]`); a
 * string `label` renders as text.
 *
 * Angular projection needs the `<ng-content>` capture point mounted, so the
 * projected label is assumed present until
 * {@link SortPicker.ngAfterViewInit} proves nothing was projected and the
 * translated default is rendered instead (React would never render both).
 */
@Component({
  selector: 'div[mol-sort-picker]',
  standalone: true,
  imports: [Select],
  inputs: ['value', 'onChange', 'options', 'label', 'ariaLabel', 'labelPosition', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<span #labelEl [class]="labelClasses()">{{ labelText() }}<ng-content select="[slot=label]" />{{ colon() }}</span><div #selectHost mol-select [options]="options ?? []" [value]="value" (valueChange)="handleValueChange($event)"></div>{{ syncAccessibleName() }}`,
})
export class SortPicker implements AfterViewInit {
  /** The currently selected option value. */
  value?: string
  /** Called with the selected value when the user picks an option. */
  onChange?: (value: string) => void
  /** The options to list. */
  options?: SortOption[]
  /** Label: a string rendered as text, or a node projected as `[slot=label]`. */
  label?: unknown
  /** Accessible name for the underlying `<select>`. */
  ariaLabel?: string
  /** Where to render the label. Defaults to `'inline'`. */
  labelPosition?: 'inline' | 'above'
  /** Extra classes. */
  className?: string

  /** The label span (projected content lands here; read once). */
  @ViewChild('labelEl') private labelEl?: ElementRef<HTMLSpanElement>
  /** The `Select` host, whose rest attributes belong on its native `<select>`. */
  @ViewChild('selectHost', { read: ElementRef }) private selectHost?: ElementRef<HTMLElement>

  /**
   * Whether a `[slot=label]` projection landed: true (optimistically) until
   * the first view proves otherwise.
   */
  private readonly labelProjected = signal<boolean>(true)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch.
   */
  private readonly i18n = useTranslation()

  /**
   * Reads the label span's first render: when neither a string input nor
   * projected content landed, React would render the translated default, so
   * the optimistic "projected" assumption is withdrawn. A projection is an
   * element child, or text the component's own two interpolations cannot
   * account for. Also writes the select's accessible name once, because the
   * first render happens before the view query resolves.
   */
  ngAfterViewInit(): void {
    const el = this.labelEl?.nativeElement
    if (!el) return
    const own = (typeof this.label === 'string' ? this.label : '') + this.colon()
    const projected = Array.from(el.children).some(hasRenderable) || (el.textContent ?? '') !== own
    this.labelProjected.set(projected)
    this.syncAccessibleName()
  }

  /**
   * Keeps the accessible name on the native `<select>` where React's `...rest`
   * spread puts it — the only element the caller can name.
   *
   * The render template calls this rather than a change-detection hook: a
   * locale switch (and any other signal-driven change) refreshes this view's
   * template WITHOUT running view hooks, so a hook would leave the select
   * named in the previous language. Called from the template it runs with
   * every render, including those, and is idempotent.
   *
   * @returns An empty string (the interpolation renders nothing).
   */
  syncAccessibleName(): string {
    const select = this.selectHost?.nativeElement.querySelector('select')
    if (select) {
      const label = this.selectAriaLabel()
      if (select.getAttribute('aria-label') !== label) select.setAttribute('aria-label', label)
    }
    return ''
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether the label renders above the select (React's `'above'` layout).
   * @returns True for the "above" layout.
   */
  isAbove(): boolean {
    return this.labelPosition === 'above'
  }

  /**
   * Computes the wrapper class list (React's
   * `cm.cn(cm.stack(1) | cm.flex({ align: 'center', gap: 'sm' }), className)`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return this.isAbove()
      ? cm.cn(cm.stack(1), this.className)
      : cm.cn(cm.flex({ align: 'center', gap: 'sm' }), this.className)
  }

  /**
   * Computes the label span's class list.
   * @returns The class string.
   */
  labelClasses(): string {
    const cm = this.cm()
    return this.isAbove() ? cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) : cm.textSize('sm')
  }

  /**
   * The label's leading text: a string `label` input, else the translated
   * default when nothing was projected (React's `label ?? defaultLabel`), else
   * nothing because the projected `[slot=label]` node renders in its place.
   * @returns The label text.
   */
  labelText(): string {
    if (typeof this.label === 'string') return this.label
    return this.labelProjected() ? '' : this.defaultLabel()
  }

  /**
   * The label's trailing colon (React renders `{labelNode}:` inline; the
   * "above" layout has no colon).
   * @returns `':'` for the inline layout, else an empty string.
   */
  colon(): string {
    return this.isAbove() ? '' : ':'
  }

  /**
   * The translated default label (React's `t('sort.label', …, 'Sort by')`).
   * @returns The label text.
   */
  defaultLabel(): string {
    return this.i18n.t('sort.label', {}, { defaultValue: 'Sort by' })
  }

  /**
   * The select's accessible name: an explicit `ariaLabel`, else the label when
   * it is a string, else the translated default. Never `String()` a node.
   * @returns The `aria-label` value.
   */
  selectAriaLabel(): string {
    return this.ariaLabel ?? (typeof this.label === 'string' ? this.label : this.defaultLabel())
  }

  /**
   * Reports a picked option through the `onChange` callback (React's
   * `onValueChange`).
   *
   * @param next - The selected option value.
   */
  handleValueChange(next: string): void {
    this.onChange?.(next)
  }
}
