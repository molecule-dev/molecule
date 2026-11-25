import React, { useCallback, useState } from 'react'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { Anchor, Box } from '@molecule/app-ui-react/elements'

/**
 * Supported social/sharing platforms for the share-buttons widget.
 */
export type SocialPlatform = 'twitter' | 'x' | 'linkedin' | 'facebook' | 'reddit' | 'email' | 'copy'

/** Props for the {@link SocialShareButtons} component. */
export interface SocialShareButtonsProps {
  /** URL to share. */
  url: string
  /** Optional share text / title. */
  title?: string
  /** Platforms to include (order = display order). */
  platforms?: SocialPlatform[]
  /** Visual size. */
  size?: 'sm' | 'md'
  /** Extra classes. */
  className?: string
}

const DEFAULT_PLATFORMS: SocialPlatform[] = ['twitter', 'linkedin', 'facebook', 'copy']

const ICON: Record<SocialPlatform, string> = {
  twitter: '𝕏',
  x: '𝕏',
  linkedin: 'in',
  facebook: 'f',
  reddit: 'r',
  email: '✉',
  copy: '⧉',
}

/** The translation function shape we use here — matches `useTranslation().t`. */
type TFn = (
  key: string,
  values?: Record<string, string | number | boolean | Date>,
  options?: { defaultValue?: string },
) => string

/**
 * Resolve a platform's accessible label through ONE literal `t()` key per
 * platform (a runtime-built `` `share.${platform}` `` cannot be checked
 * against the locale bond). The defaults are the platforms' English names — the
 * text the bond's `en.ts` holds for these keys.
 *
 * @param platform - The platform.
 * @param t - The `useTranslation()` `t` function.
 * @returns The localized platform label.
 */
function platformLabel(platform: SocialPlatform, t: TFn): string {
  switch (platform) {
    case 'twitter':
      return t('share.twitter', {}, { defaultValue: 'Twitter' })
    case 'x':
      return t('share.x', {}, { defaultValue: 'X' })
    case 'linkedin':
      return t('share.linkedin', {}, { defaultValue: 'LinkedIn' })
    case 'facebook':
      return t('share.facebook', {}, { defaultValue: 'Facebook' })
    case 'reddit':
      return t('share.reddit', {}, { defaultValue: 'Reddit' })
    case 'email':
      return t('share.email', {}, { defaultValue: 'Email' })
    case 'copy':
      return t('share.copy', {}, { defaultValue: 'Copy' })
  }
}

/**
 * Returns the share-sheet URL for a given platform, URL, and optional title.
 * @param platform
 * @param url
 * @param title
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
 * Row of share buttons — opens each platform's share sheet in a new
 * tab. `'copy'` copies the URL to the clipboard with "Copied!"
 * feedback, through `@molecule/app-clipboard`'s `copyTextWithFallback()`:
 * the Clipboard API where available, the legacy copy command otherwise,
 * and `false` where no copy happened (the button then stays unchanged).
 * Keep the component itself cosmetic-only; apps override
 * icons via `className` on the wrapping element.
 * @param props - Component props (see {@link SocialShareButtonsProps}).
 */
export function SocialShareButtons({
  url,
  title,
  platforms = DEFAULT_PLATFORMS,
  size = 'sm',
  className,
}: SocialShareButtonsProps): React.JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    void copyTextWithFallback(url).then((copiedOk) => {
      if (!copiedOk) return
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [url])
  return (
    <Box as="div" className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}>
      {platforms.map((p) => {
        const label = platformLabel(p, t)
        if (p === 'copy') {
          return (
            <Button key={p} variant="outline" size={size} onClick={copy} aria-label={label}>
              {copied ? t('share.copied', {}, { defaultValue: 'Copied!' }) : ICON[p]}
            </Button>
          )
        }
        return (
          <Anchor
            key={p}
            href={shareUrl(p, url, title)}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={label}
          >
            <Button variant="outline" size={size}>
              {ICON[p]}
            </Button>
          </Anchor>
        )
      })}
    </Box>
  )
}
