/**
 * Vue share-buttons row.
 *
 * Vue counterpart of `@molecule/app-social-share-buttons-react`'s
 * `SocialShareButtons` — the same props (React names), the same DOM for the
 * same input, the same share URLs, ClassMap tokens and i18n keys.
 *
 * @module
 */

import { defineComponent, h, onUnmounted, type PropType, ref, type VNode } from 'vue'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

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
 * Row of share buttons — opens each platform's share sheet in a new tab.
 * `'copy'` copies the URL to the clipboard with "Copied!" feedback.
 *
 * Copying goes through `@molecule/app-clipboard`'s `copyTextWithFallback()`
 * (the Clipboard API where available, the legacy copy command otherwise;
 * `false` where no copy happened and the button then stays unchanged), as
 * in React. Platform labels each use their literal `share.<platform>` i18n
 * key; the copy feedback uses `share.copied`.
 *
 * @param props - Component props (see {@link SocialShareButtonsProps}).
 * @returns The share-buttons component.
 */
export const SocialShareButtons = defineComponent({
  name: 'SocialShareButtons',
  props: {
    url: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: undefined,
    },
    platforms: {
      type: Array as PropType<SocialPlatform[]>,
      default: () => DEFAULT_PLATFORMS,
    },
    size: {
      type: String as PropType<'sm' | 'md'>,
      default: 'sm',
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * The platform's accessible label, through ONE literal `t()` key per
     * platform (a runtime-built `` `share.${platform}` `` cannot be checked
     * against the locale bond). The defaults are the platforms' English names — the
     * text the bond's `en.ts` holds for these keys.
     *
     * @param platform - The platform.
     * @returns The localized platform label.
     */
    const labelFor = (platform: SocialPlatform): string => {
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

    const copied = ref(false)
    let timer: ReturnType<typeof setTimeout> | undefined

    /** Copies the URL, then shows the "Copied!" feedback for 1.5 s. */
    const copy = (): void => {
      void copyTextWithFallback(props.url).then((copiedOk) => {
        if (!copiedOk) return
        copied.value = true
        timer = setTimeout(() => {
          copied.value = false
        }, 1500)
      })
    }

    onUnmounted(() => clearTimeout(timer))

    return (): VNode =>
      h(
        'div',
        { class: cm.cn(cm.flex({ align: 'center', gap: 'xs' }), props.className) },
        props.platforms.map((platform) => {
          const label = labelFor(platform)
          if (platform === 'copy') {
            return h(
              Button,
              {
                key: platform,
                variant: 'outline',
                size: props.size,
                onClick: copy,
                'aria-label': label,
              },
              () => [
                copied.value ? t('share.copied', {}, { defaultValue: 'Copied!' }) : ICON[platform],
              ],
            )
          }
          return h(
            'a',
            {
              key: platform,
              href: shareUrl(platform, props.url, props.title),
              target: '_blank',
              rel: 'noreferrer noopener',
              'aria-label': label,
            },
            [h(Button, { variant: 'outline', size: props.size }, () => [ICON[platform]])],
          )
        }),
      )
  },
})
