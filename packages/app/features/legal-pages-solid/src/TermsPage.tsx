/**
 * Solid default Terms-of-service page scaffold.
 *
 * @module
 */

import type { Component } from 'solid-js'
import { Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'

import { LegalPageLayout } from './LegalPageLayout.jsx'
import type { TermsPageProps } from './types.js'

/**
 * Default Terms-of-service page scaffold.
 *
 * With no props, renders the canonical boilerplate Terms
 * (`<main><h1>{t('terms.title')}</h1><p>{t('terms.intro')}</p></main>`).
 * Pass `children` to render real content (e.g. `LegalPageSection`s).
 *
 * Solid counterpart of `@molecule/app-legal-pages-react`'s `TermsPage` — the
 * same props (React names), the same DOM for the same input.
 *
 * @param props - Component props (see {@link TermsPageProps}).
 * @returns The rendered terms page.
 */
export const TermsPage: Component<TermsPageProps> = (props) => {
  const { t } = useTranslation()

  return (
    <LegalPageLayout
      dataMolId="page-terms"
      title={t(
        props.titleKey ?? 'terms.title',
        {},
        {
          defaultValue: props.titleDefault ?? 'Terms',
        },
      )}
      stackGap={props.stackGap}
    >
      <Show
        when={props.children}
        fallback={
          <p>
            {t(
              props.introKey ?? 'terms.intro',
              {},
              {
                defaultValue:
                  props.introDefault ??
                  'This is the Terms page. Replace this placeholder with real content.',
              },
            )}
          </p>
        }
      >
        {props.children}
      </Show>
    </LegalPageLayout>
  )
}
