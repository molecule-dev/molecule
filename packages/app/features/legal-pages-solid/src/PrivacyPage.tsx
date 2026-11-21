/**
 * Solid default Privacy-policy page scaffold.
 *
 * @module
 */

import type { Component } from 'solid-js'
import { Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'

import { LegalPageLayout } from './LegalPageLayout.jsx'
import type { PrivacyPageProps } from './types.js'

/**
 * Default Privacy-policy page scaffold.
 *
 * With no props, renders the canonical boilerplate Privacy page. Pass
 * `children` to render real content.
 *
 * Solid counterpart of `@molecule/app-legal-pages-react`'s `PrivacyPage` — the
 * same props (React names), the same DOM for the same input.
 *
 * @param props - Component props (see {@link PrivacyPageProps}).
 * @returns The rendered privacy page.
 */
export const PrivacyPage: Component<PrivacyPageProps> = (props) => {
  const { t } = useTranslation()

  return (
    <LegalPageLayout
      dataMolId="page-privacy"
      title={t(
        props.titleKey ?? 'privacy.title',
        {},
        {
          defaultValue: props.titleDefault ?? 'Privacy',
        },
      )}
      stackGap={props.stackGap}
    >
      <Show
        when={props.children}
        fallback={
          <p>
            {t(
              props.introKey ?? 'privacy.intro',
              {},
              {
                defaultValue:
                  props.introDefault ??
                  'This is the Privacy page. Replace this placeholder with real content.',
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
