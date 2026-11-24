/**
 * Solid default Privacy-policy page scaffold.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { ResolveNode, useTranslation } from '@molecule/app-solid'

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
      <ResolveNode node={props.children}>
        {(content, hasContent) => (
          <Show
            when={hasContent()}
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
            {content()}
          </Show>
        )}
      </ResolveNode>
    </LegalPageLayout>
  )
}
