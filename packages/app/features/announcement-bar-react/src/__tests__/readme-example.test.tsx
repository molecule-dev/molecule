/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider, useTranslation } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AnnouncementBar } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered update banner.
 */
function UpdateBanner(): React.JSX.Element {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(true)
  return (
    <AnnouncementBar
      kind="info"
      icon={<span aria-hidden="true">🚀</span>}
      action={{
        label: t('pwa.update', undefined, { defaultValue: 'Update' }),
        onClick: () => window.location.reload(),
      }}
      visible={visible}
      onDismiss={() => setVisible(false)}
      dataMolId="update-bar"
    >
      {t('pwa.updateAvailable', undefined, { defaultValue: 'New version available!' })}
    </AnnouncementBar>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders the update bar with message, action button and dismiss button', () => {
    const html = renderToStaticMarkup(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <UpdateBanner />
      </I18nProvider>,
    )
    expect(html).toMatch(/<div role="status" data-mol-id="update-bar" data-kind="info"/)
    expect(html).toContain('New version available!')
    expect(html).toMatch(/<button type="button"[^>]*>Update<\/button>/)
    expect(html).toMatch(/<button type="button" aria-label="Dismiss"[^>]*>×<\/button>/)
  })
})
