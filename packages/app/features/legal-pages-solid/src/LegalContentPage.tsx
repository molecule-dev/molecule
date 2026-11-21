/**
 * Solid standalone Privacy / Terms page that renders the bonded legal HTML the
 * footer modal shows, inside the branded `ContentPageShell`.
 *
 * @module
 */

import { type Component, createEffect, on } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { ContentPageShell } from './ContentPageShell.jsx'
import type { LegalContentPageProps, LegalKind } from './types.js'
import { escapeHtml } from './utilities.js'

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

/**
 * Standalone Privacy / Terms page that renders the **same** bonded legal
 * HTML the footer modal shows (`content.privacyPolicy` /
 * `content.termsOfService` from `@molecule/app-locales-legal-default`),
 * wrapped in the branded `ContentPageShell`.
 *
 * This keeps the in-place footer modal and the standalone `/privacy`,
 * `/terms` routes perfectly in sync — one source of legal copy, two
 * surfaces.
 *
 * Solid counterpart of `@molecule/app-legal-pages-react`'s `LegalContentPage` —
 * the same props (React names), the same DOM for the same input.
 *
 * @param props - Component props (see {@link LegalContentPageProps}).
 * @returns The rendered legal content page.
 */
export const LegalContentPage: Component<LegalContentPageProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  // React's effect dependency list is `[loadContent, kind]`: the loader runs
  // once on mount and again whenever either changes.
  createEffect(
    on([() => props.loadContent, () => props.kind], () => {
      Promise.resolve(props.loadContent?.(MODULE[props.kind])).then(
        () => undefined,
        // A loader failure is not this page's to report: React's effect ignores
        // it the same way, and the bonded content that did register renders.
        (_error) => undefined,
      )
    }),
  )

  const html = (): string =>
    t(CONTENT_KEY[props.kind], props.appName ? { appName: escapeHtml(props.appName) } : {}, {
      defaultValue: '',
    })

  return (
    <ContentPageShell
      dataMolId={`page-${props.kind}`}
      header={props.header}
      footer={props.footer}
      eyebrow={t(
        props.eyebrowKey ?? 'nav.legal',
        {},
        { defaultValue: props.eyebrowDefault ?? 'Legal' },
      )}
      title={t(TITLE[props.kind].key, {}, { defaultValue: TITLE[props.kind].def })}
    >
      <div class={cm.prose} innerHTML={html()} />
    </ContentPageShell>
  )
}
