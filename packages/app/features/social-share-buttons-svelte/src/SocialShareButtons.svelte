<!--
  SocialShareButtons: the Svelte counterpart of
  `@molecule/app-social-share-buttons-react`'s `SocialShareButtons` — the
  Twitter(X)/LinkedIn/Facebook/Reddit/email/copy share button row. Same props,
  same DOM for the same input: each network button opens that platform's share
  URL in a new tab and `'copy'` writes the URL to the clipboard with
  "Copied!" feedback.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

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

  let {
    url,
    title,
    platforms = DEFAULT_PLATFORMS,
    size = 'sm',
    className,
  }: SocialShareButtonsProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let copied = $state(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  // Detaches the feedback timer with the component (React leaves it running;
  // the write it would make on a dead component is observable nowhere).
  $effect(() => () => clearTimeout(timer))

  /** Copies the URL, then shows the "Copied!" feedback for 1.5 s. */
  function copy(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(url).then(() => {
        copied = true
        timer = setTimeout(() => {
          copied = false
        }, 1500)
      })
    }
  }
</script>

<div class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}>
  {#each platforms as platform (platform)}
    {#if platform === 'copy'}
      <Button
        variant="outline"
        {size}
        onClick={copy}
        aria-label={t(`share.${platform}`, {}, { defaultValue: platform })}
      >
        {copied ? t('share.copied', {}, { defaultValue: 'Copied!' }) : ICON[platform]}
      </Button>
    {:else}
      <a
        href={shareUrl(platform, url, title)}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={t(`share.${platform}`, {}, { defaultValue: platform })}
      >
        <Button variant="outline" {size}>{ICON[platform]}</Button>
      </a>
    {/if}
  {/each}
</div>
