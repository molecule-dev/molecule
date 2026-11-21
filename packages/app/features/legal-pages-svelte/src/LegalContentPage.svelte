<!--
  LegalContentPage: the Svelte counterpart of
  `@molecule/app-legal-pages-react`'s `LegalContentPage` — the standalone
  Privacy / Terms page rendering the SAME bonded legal HTML the footer modal
  shows, inside the branded ContentPageShell. Same props, same DOM for the
  same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import ContentPageShell from './ContentPageShell.svelte'
  import { escapeHtml } from './html.js'
  import { innerHtml } from './inner-html.js'
  import type { LegalContentPageProps, LegalKind } from './types.js'

  /** The bonded i18n key holding each document's HTML. */
  const CONTENT_KEY: Record<LegalKind, string> = {
    privacy: 'content.privacyPolicy',
    terms: 'content.termsOfService',
  }

  /** The i18n key + default for each document's page title. */
  const TITLE: Record<LegalKind, { key: string; def: string }> = {
    privacy: { key: 'footer.privacyPolicy', def: 'Privacy Policy' },
    terms: { key: 'footer.termsOfService', def: 'Terms of Service' },
  }

  /** The locale-module key each document's lazy loader receives. */
  const MODULE: Record<LegalKind, 'privacyPolicy' | 'termsOfService'> = {
    privacy: 'privacyPolicy',
    terms: 'termsOfService',
  }

  let {
    kind,
    appName,
    loadContent,
    header,
    footer,
    eyebrowKey = 'nav.legal',
    eyebrowDefault = 'Legal',
  }: LegalContentPageProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // React's effect dependency list is `[loadContent, kind]`: the loader runs
  // once on mount and again whenever either changes. Reading both props here
  // is what registers the dependencies.
  $effect(() => {
    const load = loadContent
    const key = MODULE[kind]
    Promise.resolve(load?.(key)).then(
      () => undefined,
      // A loader failure is not this page's to report: React's effect ignores
      // it the same way, and the bonded content that did register renders.
      (_error) => undefined,
    )
  })

  const html = $derived(
    t(CONTENT_KEY[kind], appName ? { appName: escapeHtml(appName) } : {}, { defaultValue: '' }),
  )
  const eyebrowText = $derived(t(eyebrowKey, {}, { defaultValue: eyebrowDefault }))
  const pageTitle = $derived(t(TITLE[kind].key, {}, { defaultValue: TITLE[kind].def }))
</script>

<ContentPageShell dataMolId={`page-${kind}`} {header} {footer}
  >{#snippet eyebrow()}{eyebrowText}{/snippet}{#snippet title()}{pageTitle}{/snippet}
  <div class={cm.prose} use:innerHtml={html}></div></ContentPageShell
>
