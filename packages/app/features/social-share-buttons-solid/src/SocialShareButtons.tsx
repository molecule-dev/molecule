import { type Component, createSignal, For, onCleanup } from 'solid-js'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { SocialPlatform, SocialShareButtonsProps } from './types.js'

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
 * Row of share buttons — opens each platform's share sheet in a new tab.
 * `'copy'` copies the URL to the clipboard with "Copied!" feedback.
 *
 * Copying goes through `@molecule/app-clipboard`'s `copyTextWithFallback()`
 * (the Clipboard API where available, the legacy copy command otherwise;
 * `false` where no copy happened and the button then stays unchanged), as
 * in React. Platform labels each use their literal `share.<platform>` i18n
 * key; the copy feedback uses `share.copied`.
 *
 * This is the Solid counterpart of `@molecule/app-social-share-buttons-react`:
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link SocialShareButtonsProps}).
 * @returns The rendered share-buttons row.
 */
export const SocialShareButtons: Component<SocialShareButtonsProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = createSignal(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  /** Copies the URL, then shows the "Copied!" feedback for 1.5 s. */
  const copy = (): void => {
    void copyTextWithFallback(props.url).then((copiedOk) => {
      if (!copiedOk) return
      setCopied(true)
      timer = setTimeout(() => setCopied(false), 1500)
    })
  }

  onCleanup(() => clearTimeout(timer))

  /**
   * The platform's accessible label, through ONE literal `t()` key per
   * platform (a runtime-built `` `share.${platform}` `` cannot be checked
   * against the locale bond). The defaults are the platforms' English names — the
   * text the bond's `en.ts` holds for these keys.
   */
  const label = (platform: SocialPlatform): string => {
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

  return (
    <div class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), props.className)}>
      <For each={props.platforms ?? DEFAULT_PLATFORMS}>
        {(platform) =>
          platform === 'copy' ? (
            <Button
              variant="outline"
              size={props.size ?? 'sm'}
              onClick={copy}
              aria-label={label(platform)}
            >
              {copied() ? t('share.copied', {}, { defaultValue: 'Copied!' }) : ICON[platform]}
            </Button>
          ) : (
            <a
              href={shareUrl(platform, props.url, props.title)}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={label(platform)}
            >
              <Button variant="outline" size={props.size ?? 'sm'}>
                {ICON[platform]}
              </Button>
            </a>
          )
        }
      </For>
    </div>
  )
}
