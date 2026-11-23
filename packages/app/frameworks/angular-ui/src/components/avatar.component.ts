/**
 * Avatar component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { type HasElement, hostElement } from '../utilities/element.js'
import { getInitials } from '../utilities/initials.js'
import { MolIconSvg, type ResolvedIcon, resolveIcon } from '../utilities/render-icon.js'
import { styleText } from '../utilities/style.js'

/**
 * Avatar component.
 *
 * Renders the image while it loads; an image error (or no `src`) swaps to the
 * fallback: projected `[slot=fallback]` content, the name's initials, or a
 * user glyph. The image/fallback swap is a signal-driven `@if` (an error
 * re-renders); the three fallback variants are always-mounted capture points
 * taken out of the DOM per React's ternary, since projected-content presence
 * is read in the placement function (`setElementPresent`).
 */
@Component({
  selector: 'div[mol-avatar]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [MolIconSvg],
  inputs: [
    'src',
    'alt',
    'name',
    'size',
    'rounded',
    'className',
    'style',
    'testId',
    'automationId',
    'dataMolId: data-mol-id',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.data-mol-id]': 'molId()',
  },
  template: `@if (!showFallback()) {
      <img
        [src]="src"
        [attr.alt]="altText()"
        [class]="cm().avatarImage"
        (error)="imageError.set(true)"
      />
    } @else {
      <div [class]="cm().avatarFallback" #fallbackEl>
        <span [class]="cm().avatarInitials" #initialsEl>{{ initials() }}</span>
        <svg mol-icon [data]="userIcon()" #userGlyph />
        <ng-content select="[slot=fallback]"></ng-content>
      </div>
    }`,
})
export class Avatar implements HasElement<HTMLDivElement> {
  /** Image source. */
  src?: string
  /** Image alt text. */
  alt?: string
  /** Display name (drives the initials fallback and default alt). */
  name?: string
  /** Avatar size preset or an exact pixel size. */
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number = 'md'
  /** Whether the avatar is fully rounded (default true). */
  rounded = true
  /** Extra classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string
  /** A `data-mol-id` given as a plain rest attribute (React's `rootProps` precedence). */
  dataMolId?: string

  /** Set when the image fails to load. */
  readonly imageError = signal(false)

  /** The fallback container (React renders it only on the fallback branch). */
  @ViewChild('fallbackEl') fallbackEl?: ElementRef<HTMLDivElement>
  /** The initials span (detached unless the fallback branch picks it). */
  @ViewChild('initialsEl') initialsEl?: ElementRef<HTMLSpanElement>
  /** The user glyph (detached unless the fallback branch picks it). */
  @ViewChild('userGlyph', { read: ElementRef }) userGlyph?: ElementRef<SVGSVGElement>

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private readonly host: ElementRef<HTMLDivElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<div>`. */
  readonly element = hostElement(this.host)

  /** Applies the fallback ternary; projected content wins over initials and glyph. */
  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether the fallback branch renders.
   * @returns True without a src or after an image error.
   */
  showFallback(): boolean {
    return !this.src || this.imageError()
  }

  /**
   * The image alt text (name or the localized default).
   * @returns The alt text.
   */
  altText(): string {
    return (
      this.alt || this.name || this.i18n.t('ui.avatar.alt', undefined, { defaultValue: 'Avatar' })
    )
  }

  /**
   * The initials for the given name.
   * @returns Up to two uppercase characters.
   */
  initials(): string {
    return getInitials(this.name)
  }

  /**
   * The fallback user glyph.
   * @returns The resolved icon.
   */
  userIcon(): ResolvedIcon {
    return resolveIcon('user', this.cm().avatarFallbackIcon)
  }

  /**
   * Computes the avatar class list.
   * @returns The class string.
   */
  classes(): string {
    const avatarSize = typeof this.size === 'number' ? undefined : this.size
    return this.cm().cn(
      this.cm().avatar({ size: avatarSize }),
      !this.rounded && this.cm().avatarSquare,
      this.className,
    )
  }

  /**
   * The `data-mol-id` value (`automationId` wins over a rest `data-mol-id`).
   * @returns The attribute value.
   */
  molId(): string | undefined {
    return (
      this.automationId ??
      this.dataMolId ??
      this.host.nativeElement.getAttribute('data-mol-id') ??
      undefined
    )
  }

  /**
   * Serializes the merged inline style (an exact pixel size inline).
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    const customSize =
      typeof this.size === 'number' ? { width: this.size, height: this.size } : undefined
    return styleText({ ...this.style, ...customSize })
  }

  /**
   * Applies React's fallback ternary (`fallback ? fallback : name ? initials
   * : glyph`). The capture holds the initials span and the user glyph first,
   * then the projected fallback.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const fallbackHost = this.fallbackEl?.nativeElement
    if (!fallbackHost) return
    const projected = hasContent(fallbackHost, 2)
    setElementPresent(this.initialsEl?.nativeElement, !projected && !!this.name)
    setElementPresent(this.userGlyph?.nativeElement, !projected && !this.name)
  }
}
