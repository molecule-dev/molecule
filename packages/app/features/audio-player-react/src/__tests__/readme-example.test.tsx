/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Media events never fire under SSR,
 * so this covers the initial rendered chrome.
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

import { AudioPlayer } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered episode player.
 */
function EpisodePlayer(): React.JSX.Element {
  const { t } = useTranslation()
  const [finished, setFinished] = useState(false)
  return (
    <section>
      <AudioPlayer
        src="/audio/episode-42.mp3"
        title="Episode 42: Getting Started"
        subtitle="The Molecule Podcast"
        onPlay={() => setFinished(false)}
        onEnded={() => setFinished(true)}
      />
      {finished && <p>{t('common.completed', undefined, { defaultValue: 'Completed' })}</p>}
    </section>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders the hidden audio element, titles and the play/seek/mute controls', () => {
    const html = renderToStaticMarkup(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <EpisodePlayer />
      </I18nProvider>,
    )
    expect(html).toMatch(/<audio src="\/audio\/episode-42.mp3" preload="metadata"/)
    expect(html).toContain('Episode 42: Getting Started')
    expect(html).toContain('The Molecule Podcast')
    expect(html).toMatch(/<button[^>]*data-mol-id="audio-player-toggle"[^>]*aria-label="Play"/)
    expect(html).toMatch(/<input[^>]*aria-label="Seek"[^>]*data-mol-id="audio-player-seek"/)
    expect(html).toMatch(/<button[^>]*data-mol-id="audio-player-mute"[^>]*aria-label="Mute"/)
    expect(html).toContain('>0:00 / 0:00</span>')
    expect(html).not.toContain('Completed')
  })
})
