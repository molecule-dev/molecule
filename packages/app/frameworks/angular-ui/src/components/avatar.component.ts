/**
 * Avatar component (React parity).
 *
 * @module
 */

import {
  type AfterViewChecked,
  Component,
  ElementRef,
  inject,
  Renderer2,
  signal,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { getInitials } from '../utilities/initials.js'
import { MolIconSvg, type ResolvedIcon, resolveIcon } from '../utilities/render-icon.js'
import { styleText } from '../utilities/style.js'
import { SlotWrapper } from './button.component.js'

/**
 * Avatar component.
 *
 * Renders the image while it loads; an image error (or no `src`) swaps to the
 * fallback: projected `[slot=fallback]` content, the name's initials, or a
 * user glyph. The image/fallback swap is a signal-driven `@if` (an error
 * re-renders); the three fallback variants are always-mounted capture points
 * detached from the DOM per React's ternary, since projected-content presence
 * is only knowable at view init ({@link SlotWrapper}).
 */
@Component({
  selector: 'div[mol-avatar]',
  standalone: true,
  imports: [MolIconSvg],
  inputs: ['src', 'alt', 'name', 'size', 'rounded', 'className', 'style', 'testId'],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
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
        <ng-content select="[slot=fallback]"></ng-content>
        <span [class]="cm().avatarInitials" #initialsEl>{{ initials() }}</span>
        <svg mol-icon [data]="userIcon()" #userGlyph />
      </div>
    }`,
})
export class Avatar implements AfterViewChecked {
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

  private readonly sync = new SlotWrapper(inject(ElementRef), inject(Renderer2))

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
   * : glyph`) after view queries have resolved for this pass. Projected
   * fallback nodes are exactly the container's children that are not the two
   * always-mounted template children.
   */
  ngAfterViewChecked(): void {
    const fallbackHost = this.fallbackEl?.nativeElement
    if (!fallbackHost) return
    const projected = Array.from(fallbackHost.childNodes).some(
      (node) =>
        node !== this.initialsEl?.nativeElement &&
        node !== this.userGlyph?.nativeElement &&
        (node.nodeType === 1 || (node.nodeType === 3 && (node.textContent ?? '').trim())),
    )
    this.sync.sync(this.initialsEl?.nativeElement, !projected && !!this.name, fallbackHost)
    this.sync.sync(this.userGlyph?.nativeElement, !projected && !this.name, fallbackHost)
  }
}
