import { useCallback, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

/**
 *
 */
export type SocialPlatform = 'twitter' | 'x' | 'linkedin' | 'facebook' | 'reddit' | 'email' | 'copy'

interface SocialShareButtonsProps {
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

/**
 *
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
 * feedback. Keep the component itself cosmetic-only; apps override
 * icons via `className` on the wrapping element.
 * @param root0
 * @param root0.url
 * @param root0.title
 * @param root0.platforms
 * @param root0.size
 * @param root0.className
 */
export function SocialShareButtons({
  url,
  title,
  platforms = DEFAULT_PLATFORMS,
  size = 'sm',
  className,
}: SocialShareButtonsProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
    }
  }, [url])
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}>
      {platforms.map((p) => {
        const label = t(`share.${p}`, {}, { defaultValue: p })
        if (p === 'copy') {
          return (
            <Button key={p} variant="outline" size={size} onClick={copy} aria-label={label}>
              {copied ? t('share.copied', {}, { defaultValue: 'Copied!' }) : ICON[p]}
            </Button>
          )
        }
        return (
          <a
            key={p}
            href={shareUrl(p, url, title)}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={label}
          >
            <Button variant="outline" size={size}>
              {ICON[p]}
            </Button>
          </a>
        )
      })}
    </div>
  )
}
