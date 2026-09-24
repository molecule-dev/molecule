/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real ClassMap, real i18n provider and
 * the companion locale bond, driven by a real (jsdom) `<audio>` element.
 *
 * @module
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { type JSX, useRef, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
import * as chapterListLocales from '@molecule/app-locales-feature-chapter-list'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChapterList } from '../index.js'

setClassMap(classMap)
registerLocaleModule(chapterListLocales)

const chapters = [
  { id: 'c1', title: 'Intro', startTime: 0 },
  { id: 'c2', title: 'Interview', startTime: 120, thumbnail: '/episodes/42/guest.jpg' },
  { id: 'c3', title: 'Listener questions', startTime: 1800 },
]

/**
 * The README example, verbatim.
 *
 * @returns The episode player with its chapter list.
 */
function EpisodePlayer(): JSX.Element {
  const audio = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  return (
    <I18nProvider provider={getI18nProvider()}>
      <audio
        ref={audio}
        src="/episodes/42.mp3"
        controls
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
      />
      <ChapterList
        chapters={chapters}
        currentTime={currentTime}
        onSeek={(seconds) => {
          if (audio.current) audio.current.currentTime = seconds
        }}
      />
    </I18nProvider>
  )
}

/**
 * The id of the chapter currently highlighted.
 *
 * @returns The active chapter id, or null.
 */
function activeChapter(): string | null {
  return (
    document
      .querySelector('[data-mol-id="chapter-list-row"][data-active="true"]')
      ?.getAttribute('data-chapter-id') ?? null
  )
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
  })

  it('seeks the audio on click and highlights the chapter the playhead is in', () => {
    render(<EpisodePlayer />)
    const audio = document.querySelector('audio') as HTMLAudioElement

    expect(activeChapter()).toBe('c1')
    expect(screen.getByAltText('Thumbnail for Interview').getAttribute('src')).toBe(
      '/episodes/42/guest.jpg',
    )
    expect(screen.getByText('30:00')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Jump to Interview at 2:00' }))
    expect(audio.currentTime).toBe(120)

    fireEvent.timeUpdate(audio)
    expect(activeChapter()).toBe('c2')
    expect(screen.getByText('2:00 · Now playing')).toBeTruthy()
  })
})
