/**
 * SocialShareButtons component (React parity).
 *
 * @module
 */

import { Component, type OnDestroy, signal } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { copyTextWithFallback } from '@molecule/app-clipboard'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

import type { SocialPlatform } from './types.js'

/** The platforms React renders when `platforms` is omitted. */
const DEFAULT_PLATFORMS: SocialPlatform[] = ['twitter', 'linkedin', 'facebook', 'copy']

/** The text glyph each platform's button shows. */
const ICON: Record<SocialPlatform, string> = {
  twitter: '𝕏',
  x: '𝕏',
  linkedin: 'in',
  facebook: 'f',
  reddit: 'r',
  email: '✉',
  copy: '⧉',
}

/**
 * Returns the share-sheet URL for a given platform, URL, and optional title.
 *
 * @param platform - The platform whose share sheet is opened.
 * @param url - The URL to share (percent-encoded into the sheet's query).
 * @param title - The share text, when given.
 * @returns The platform's share URL.
 */
function shareUrl(platform: SocialPlatform, url: string, title?: string): string {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title ?? '')
  switch (platform) {
    case 'twitter':
    case 'x':
      return `https://twitter.com/intent/tweet?url=${u}&text=${t}`
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`
    case 'reddit':
      return `https://www.reddit.com/submit?url=${u}&title=${t}`
    case 'email':
      return `mailto:?subject=${t}&body=${u}`
    default:
      return url
  }
}

/**
 * SocialShareButtons component.
 *
 * Row of share buttons — opens each platform's share sheet in a new tab.
 * `'copy'` copies the URL to the clipboard with "Copied!" feedback. The host IS
 * the outer `<div>` (`div[mol-social-share-buttons]`), matching React's root
 * exactly. Styling routes through the ClassMap token
 * `cm.flex({ align: 'center', gap: 'xs' })`.
 *
 * Copying goes through `@molecule/app-clipboard`'s `copyTextWithFallback()`
 * (the Clipboard API where available, the legacy copy command otherwise;
 * `false` where no copy happened and the button then stays unchanged), as
 * in React. Platform labels each use their literal `share.<platform>` i18n
 * key and the copy feedback uses `share.copied`, read through the binding's
 * reactive `useTranslation()`, so a locale switch refreshes the text
 * (React's components re-render through `useTranslation()`).
 */
@Component({
  selector: 'div[mol-social-share-buttons]',
  standalone: true,
  imports: [Button],
  inputs: ['url', 'title', 'platforms', 'size', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: `@for (platform of platformsList(); track platform) {
    @if (platform === 'copy') {
      <button
        mol-button
        [variant]="'outline'"
        [size]="size ?? 'sm'"
        [attr.aria-label]="label(platform)"
        (click)="copy()"
      >
        {{ buttonLabel() }}
      </button>
    } @else {
      <a
        [href]="shareUrlFor(platform)"
        target="_blank"
        rel="noreferrer noopener"
        [attr.aria-label]="label(platform)"
      >
        <button mol-button [variant]="'outline'" [size]="size ?? 'sm'">
          {{ icon(platform) }}
        </button>
      </a>
    }
  }`,
})
export class SocialShareButtons implements OnDestroy {
  /** URL to share. */
  url?: string
  /** Optional share text / title. */
  title?: string
  /** Platforms to include (order = display order; defaults to twitter, linkedin, facebook, copy). */
  platforms?: SocialPlatform[]
  /** Visual size (defaults to `'sm'` at read time). */
  size?: 'sm' | 'md'
  /** Extra classes on the outer wrapper. */
  className?: string

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  /** Whether the last copy succeeded ("Copied!" is showing). */
  private readonly copied = signal(false)

  /** The pending feedback reset timer, cleared when the component dies. */
  private timer?: ReturnType<typeof setTimeout>

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper class list (React's
   * `cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'xs' }), this.className)
  }

  /**
   * The platforms to render (React's `platforms` default parameter).
   * @returns The platform list.
   */
  platformsList(): SocialPlatform[] {
    return this.platforms ?? DEFAULT_PLATFORMS
  }

  /**
   * The platform's button glyph (React's `ICON[platform]`).
   * @param platform - The platform.
   * @returns The text glyph.
   */
  icon(platform: SocialPlatform): string {
    return ICON[platform]
  }

  /**
   * The platform's accessible label, through ONE literal `t()` key per
   * platform (a runtime-built `` `share.${platform}` `` cannot be checked
   * against the locale bond). The defaults are the platforms' English names — the
   * text the bond's `en.ts` holds for these keys.
   * @param platform - The platform.
   * @returns The label text.
   */
  label(platform: SocialPlatform): string {
    switch (platform) {
      case 'twitter':
        return this.i18n.t('share.twitter', undefined, { defaultValue: 'Twitter' })
      case 'x':
        return this.i18n.t('share.x', undefined, { defaultValue: 'X' })
      case 'linkedin':
        return this.i18n.t('share.linkedin', undefined, { defaultValue: 'LinkedIn' })
      case 'facebook':
        return this.i18n.t('share.facebook', undefined, { defaultValue: 'Facebook' })
      case 'reddit':
        return this.i18n.t('share.reddit', undefined, { defaultValue: 'Reddit' })
      case 'email':
        return this.i18n.t('share.email', undefined, { defaultValue: 'Email' })
      case 'copy':
        return this.i18n.t('share.copy', undefined, { defaultValue: 'Copy' })
    }
  }

  /**
   * The platform's share URL (React's `shareUrl(p, url, title)`).
   * @param platform - The platform.
   * @returns The share URL (the raw url for the copy platform).
   */
  shareUrlFor(platform: SocialPlatform): string {
    return shareUrl(platform, this.url ?? '', this.title)
  }

  /**
   * The copy button's text: "Copied!" while the feedback shows, the copy glyph
   * otherwise (React's `copied ? t('share.copied', …) : ICON.copy`).
   * @returns The button text.
   */
  buttonLabel(): string {
    return this.copied()
      ? this.i18n.t('share.copied', undefined, { defaultValue: 'Copied!' })
      : ICON.copy
  }

  /**
   * Copies the URL, then shows the "Copied!" feedback for 1.5 s.
   */
  copy(): void {
    void copyTextWithFallback(this.url ?? '').then((copiedOk) => {
      if (!copiedOk) return
      this.copied.set(true)
      this.timer = setTimeout(() => this.copied.set(false), 1500)
    })
  }

  /** Detaches the feedback timer with the component. */
  ngOnDestroy(): void {
    clearTimeout(this.timer)
  }
}
