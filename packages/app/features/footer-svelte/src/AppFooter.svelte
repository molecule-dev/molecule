<!--
  AppFooter: the Svelte counterpart of `@molecule/app-footer-react`'s
  `AppFooter` — About link, Privacy/Terms modals (or route links), language
  picker modal, and version display. Same props, same DOM for the same input:
  internal links are the binding's `Link` (react-router `<Link>`
  semantics), the legal HTML renders raw exactly like React's
  `dangerouslySetInnerHTML` (the catalog is app-supplied, the same trust
  model), and the appName is HTML-escaped before it enters that HTML.
-->
<script lang="ts">
  import { Link, useTranslation, useVersion } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Icon, Modal } from '@molecule/app-ui-svelte'

  import { escapeHtml, isExternalHref } from './html.js'
  import type { AppFooterProps } from './types.js'

  let {
    appName,
    aboutHref,
    legalMode = 'modal',
    loadContent,
    privacyTo = '/privacy',
    termsTo = '/terms',
    className,
    dataMolId,
  }: AppFooterProps = $props()

  const cm = $derived(getClassMap())
  const { t, locale, setLocale, locales } = useTranslation()
  const { state: versionState } = useVersion()

  let privacyOpen = $state(false)
  let termsOpen = $state(false)
  let languageOpen = $state(false)

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so these re-run on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const version = $derived(
    t(
      'footer.version',
      { version: $versionState.version || '1.0.0' },
      {
        defaultValue: 'v{{version}}',
      },
    ),
  )
  const aboutLabel = $derived(t('footer.about', { appName }, { defaultValue: 'About {{appName}}' }))
  const privacyTitle = $derived(t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' }))
  const termsTitle = $derived(t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' }))
  const languageLabel = $derived(t('footer.language', {}, { defaultValue: 'Language' }))
  const legalNotConfigured = $derived(
    t(
      'footer.legalNotConfigured',
      {},
      {
        defaultValue: 'This content has not been configured yet. The app owner must provide it.',
      },
    ),
  )
  const privacyHtml = $derived(
    t('content.privacyPolicy', { appName: escapeHtml(appName) }, { defaultValue: '' }),
  )
  const termsHtml = $derived(
    t('content.termsOfService', { appName: escapeHtml(appName) }, { defaultValue: '' }),
  )
  // React sorts the locale list in place when the picker renders; a copy
  // sorts the same list without mutating the provider's array. Same DOM.
  const sortedLocales = $derived([...$locales].sort((a, b) => a.name.localeCompare(b.name)))

  /**
   * Opens the Privacy modal, lazy-loading the catalog body first when the app
   * supplied a preloader — exactly React's `openPrivacy`.
   */
  async function openPrivacy(): Promise<void> {
    if (loadContent) await loadContent('privacyPolicy')
    privacyOpen = true
  }

  /**
   * Opens the Terms modal, lazy-loading the catalog body first when the app
   * supplied a preloader — exactly React's `openTerms`.
   */
  async function openTerms(): Promise<void> {
    if (loadContent) await loadContent('termsOfService')
    termsOpen = true
  }
</script>

<!-- `<footer>` (contentinfo landmark), not a bare <section> — axe's `region`
     rule requires all page content inside landmarks, and screen-reader users
     jump to the footer by landmark. -->
<footer class={cm.cn(cm.footerBar, className)} data-mol-id={dataMolId}>
  {#if isExternalHref(aboutHref)}
    <a href={aboutHref} target="_blank" rel="noopener noreferrer" class={cm.footerLink}
      >{aboutLabel}</a
    >
  {:else}
    <Link to={aboutHref} class={cm.footerLink}>{aboutLabel}</Link>
  {/if}
  {#if legalMode === 'modal'}
    <button type="button" onclick={openPrivacy} class={cm.footerButton}>{privacyTitle}</button>
    <button type="button" onclick={openTerms} class={cm.footerButton}>{termsTitle}</button>
  {:else}
    <Link to={privacyTo} class={cm.footerButton}>{privacyTitle}</Link>
    <Link to={termsTo} class={cm.footerButton}>{termsTitle}</Link>
  {/if}
  <button
    type="button"
    onclick={() => (languageOpen = true)}
    class={cm.footerButton}
    aria-label={languageLabel}
  >
    <Icon name="globe" size={14} />
    {$locales.find((entry) => entry.code === $locale)?.name}
  </button>
  <span class={cm.footerLink}>{version}</span>
</footer>

{#if legalMode === 'modal'}
  <!-- Legal HTML from the i18n catalog renders raw — the catalog is
       app-supplied, the same trust model as React's `dangerouslySetInnerHTML`.
       When the app has registered none (the locale bond ships `content.*`
       empty by design) the modal shows the placeholder instead of a
       silently-blank body, and never fabricated legal text. -->
  <Modal open={privacyOpen} onClose={() => (privacyOpen = false)} title={privacyTitle} size="lg">
    {#if privacyHtml.trim()}
      <div class={cm.prose}>{@html privacyHtml}</div>
    {:else}
      <p class={cm.prose}>{legalNotConfigured}</p>
    {/if}
  </Modal>
  <Modal open={termsOpen} onClose={() => (termsOpen = false)} title={termsTitle} size="lg">
    {#if termsHtml.trim()}
      <div class={cm.prose}>{@html termsHtml}</div>
    {:else}
      <p class={cm.prose}>{legalNotConfigured}</p>
    {/if}
  </Modal>
{/if}
<Modal open={languageOpen} onClose={() => (languageOpen = false)} title={languageLabel} size="lg">
  <div class={cm.languageGrid}>
    {#each sortedLocales as entry (entry.code)}
      <button
        type="button"
        onclick={async () => {
          await setLocale(entry.code)
          languageOpen = false
        }}
        class={entry.code === $locale ? cm.languageActive : cm.languageOption}
      >
        {entry.name}
      </button>
    {/each}
  </div>
</Modal>
