/**
 * AvatarStack component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-angular'

import type { AvatarStackPerson } from './types.js'

/**
 * Negative left margin that pulls each avatar over its predecessor so the
 * stack visually overlaps. This is an inline style deliberately: the
 * ClassMap spacing scale (`SpacingScale`) is `0…24`, all non-negative, so
 * neither `cm.sp('ml', n)` nor its compound style form can express a
 * negative margin — one of the sanctioned "ClassMap can't express it"
 * inline-style cases. `-0.5rem` mirrors the intended `-2` Tailwind spacing
 * step.
 */
const OVERLAP_MARGIN = '-0.5rem'

/**
 * AvatarStack component.
 *
 * Horizontal stack of overlapping avatars (assignees, attendees, etc.).
 * Renders up to `max` avatars; any remaining are summarised as `+N` in a
 * trailing chip, whose accessible name (`avatarStack.more`) and visible
 * prefix (`avatarStack.overflowPrefix`) come from `useTranslation()`, so the
 * chip follows the active locale. The host IS the outer `<div>`
 * (`div[mol-avatar-stack]`), matching React's root exactly.
 */
@Component({
  selector: 'div[mol-avatar-stack]',
  standalone: true,
  imports: [Avatar],
  inputs: ['people', 'max', 'size', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@for (person of visible(); track $index; let index = $index) {
    <span [style.margin-left]="index === 0 ? null : overlapMargin">
      <div mol-avatar [src]="person.src" [alt]="person.alt ?? person.name" [name]="person.name" [size]="avatarSize()"></div>
    </span>
  }@if (overflow() > 0) {
    <span [class]="overflowClasses()" [style.margin-left]="overlapMargin" [attr.aria-label]="overflowLabel()">{{ overflowText() }}</span>
  }`,
})
export class AvatarStack {
  /** People to render. */
  people: AvatarStackPerson[] = []
  /** Maximum visible avatars (defaults to `4` at read time). */
  max?: number
  /** Avatar size preset (defaults to `'sm'` at read time). */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes on the outer stack. */
  className?: string

  /** The overlap's negative left margin. */
  readonly overlapMargin = OVERLAP_MARGIN

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the chip's two strings on a locale switch.
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
   * The avatar size passed to every `<div mol-avatar>` (React's
   * `size = 'sm'` default parameter).
   * @returns The size preset.
   */
  avatarSize(): 'xs' | 'sm' | 'md' | 'lg' {
    return this.size ?? 'sm'
  }

  /**
   * The avatars that fit within `max` (React's `people.slice(0, max)`).
   * @returns The visible people.
   */
  visible(): AvatarStackPerson[] {
    return this.people.slice(0, this.max ?? 4)
  }

  /**
   * How many people the overflow chip summarises (React's
   * `Math.max(0, people.length - visible.length)`).
   * @returns The overflow count.
   */
  overflow(): number {
    return Math.max(0, this.people.length - this.visible().length)
  }

  /**
   * The overflow chip's accessible name (React's
   * `t('avatarStack.more', { count: overflow }, { defaultValue: '+{{count}} more' })`).
   * @returns The translated label.
   */
  overflowLabel(): string {
    return this.i18n.t(
      'avatarStack.more',
      { count: this.overflow() },
      { defaultValue: '+{{count}} more' },
    )
  }

  /**
   * The overflow chip's visible text: the translated prefix and the count
   * (React's `{t('avatarStack.overflowPrefix', undefined, …)}{overflow}`).
   * @returns The prefix followed by the overflow count.
   */
  overflowText(): string {
    return (
      this.i18n.t('avatarStack.overflowPrefix', undefined, { defaultValue: '+' }) + this.overflow()
    )
  }

  /**
   * Computes the outer stack's class list (`cm.flex({ align: 'center' })` +
   * `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'center' }), this.className)
  }

  /**
   * Computes the overflow chip's class list (`cm.flex({ align: 'center',
   * justify: 'center' })` + `cm.roundedFull` + `cm.textSize('xs')` +
   * `cm.fontWeight('medium')`).
   * @returns The class string.
   */
  overflowClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', justify: 'center' }),
      cm.roundedFull,
      cm.textSize('xs'),
      cm.fontWeight('medium'),
    )
  }
}
