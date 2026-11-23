/**
 * AddressDisplay component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, ViewChild } from '@angular/core'

import { MolPlacement, setElementPresent, usePlacement } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { Address } from './types.js'

/**
 * Converts an Address object into an ordered array of non-empty display lines.
 *
 * @param a - The address fields.
 * @returns The non-empty display lines, in postal order.
 */
function joinAddress(a: Address): string[] {
  const lines: string[] = []
  if (a.line1) lines.push(a.line1)
  if (a.line2) lines.push(a.line2)
  const cityState = [a.city, a.state].filter(Boolean).join(', ')
  const cityLine = [cityState, a.postalCode].filter(Boolean).join(' ')
  if (cityLine) lines.push(cityLine)
  if (a.country) lines.push(a.country)
  return lines
}

/**
 * AddressDisplay component.
 *
 * Formatted multi-line address display with optional name, phone, leading
 * slot, and right-side actions. Set `inline` to render all fields on a single
 * line (e.g., in a table cell). The host IS the root `<div>`
 * (`div[mol-address-display]`), matching React's root exactly. The name,
 * leading and actions are projected content (`[slot=name]`, `[slot=leading]`,
 * `[slot=actions]`); a string `name` input renders as text. Same props, same
 * DOM as `@molecule/app-address-display-react`'s `AddressDisplay`.
 */
@Component({
  selector: 'div[mol-address-display]',
  standalone: true,
  inputs: ['address', 'name', 'phone', 'inline', 'className'],
  hostDirectives: [MolPlacement],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<ng-content select="[slot=leading]" />
    <div [class]="innerClass()">
      <span #nameSpan [class]="nameClass()">@if (hasName) {<ng-container>{{ name }}</ng-container>}<ng-content select="[slot=name]" /></span>
      @if (inline) {<span>{{ inlineText() }}</span>} @else {<address [style.font-style]="'normal'">@for (line of lines(); track $index) {<span [style.display]="'block'">{{ line }}</span>}</address>}
      @if (hasPhone) {<a [attr.href]="'tel:' + phone" [class]="linkClass()">{{ phone }}</a>}
    </div>
    <ng-content select="[slot=actions]" />`,
})
export class AddressDisplay {
  /** Address fields. */
  address?: Address
  /** Optional name / label preceding the address: text, or `[slot=name]` content. */
  name?: unknown
  /** Optional phone number rendered under the address. */
  phone?: string
  /** Format as a single line instead of multi-line. */
  inline?: boolean
  /** Extra classes. */
  className?: string

  /** The name span (always in the body; detached while it has nothing to render). */
  @ViewChild('nameSpan', { static: true }) private nameSpan?: ElementRef<HTMLSpanElement>

  /**
   * Keeps the name span on the page only while it renders a text input or
   * projected `[slot=name]` content, re-decided whenever either changes (a
   * name taken away and given back included).
   */
  constructor() {
    usePlacement((hasContent) => {
      const span = this.nameSpan?.nativeElement
      setElementPresent(span, this.hasName || (span ? hasContent(span) : false))
    })
  }

  /**
   * Whether a text name input is present (React's truthiness: `''` renders
   * no name).
   * @returns True when the name input renders as text.
   */
  get hasName(): boolean {
    return this.name !== undefined && this.name !== null && this.name !== ''
  }

  /**
   * Whether the phone link renders (React's truthiness: `''` renders no
   * link).
   * @returns True when the phone shows.
   */
  get hasPhone(): boolean {
    return this.phone !== undefined && this.phone !== null && this.phone !== ''
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the root class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'start', gap: 'sm' }), this.className)
  }

  /**
   * The body column's class.
   * @returns The class string.
   */
  innerClass(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(1), this.cm().textSize('sm'))
  }

  /**
   * The name span's class (React's `cm.fontWeight('semibold')`, through `cn`
   * so every binding carries a plain string).
   * @returns The class string.
   */
  nameClass(): string {
    return this.cm().cn(this.cm().fontWeight('semibold'))
  }

  /**
   * The phone link's class (React's `cm.link`, through `cn` so every binding
   * carries a plain string).
   * @returns The class string.
   */
  linkClass(): string {
    return this.cm().cn(this.cm().link)
  }

  /**
   * The address's display lines, from the current `address` input.
   * @returns The non-empty display lines, in postal order.
   */
  lines(): string[] {
    return joinAddress(this.address ?? {})
  }

  /**
   * The inline body: every field joined on one line (React's
   * `lines.join(', ')`).
   * @returns The single-line text.
   */
  inlineText(): string {
    return this.lines().join(', ')
  }
}
