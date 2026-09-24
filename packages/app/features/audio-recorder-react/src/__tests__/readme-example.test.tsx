// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the browser capture APIs jsdom
 * lacks (MediaRecorder, getUserMedia, URL.createObjectURL) are stubbed.
 *
 * @module
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AudioRecorder, type AudioRecording } from '../index.js'

/** In-memory stand-in for the browser MediaRecorder. */
class FakeMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  mimeType: string
  private listeners: Record<string, ((e?: unknown) => void) | undefined> = {}

  /**
   * Creates a recorder that reports the requested MIME type.
   *
   * @param _stream - Ignored media stream.
   * @param opts - Recorder options; `mimeType` is echoed back.
   */
  constructor(_stream: MediaStream, opts?: MediaRecorderOptions) {
    this.mimeType = opts?.mimeType ?? 'audio/webm'
  }

  /**
   * Registers a single listener per event type.
   *
   * @param type - Event type.
   * @param listener - Listener to call.
   */
  addEventListener(type: string, listener: (e?: unknown) => void): void {
    this.listeners[type] = listener
  }

  /** Starts recording. */
  start(): void {
    this.state = 'recording'
  }

  /** Emits one data chunk then the stop event. */
  stop(): void {
    this.state = 'inactive'
    this.listeners.dataavailable?.({ data: new Blob(['voice'], { type: this.mimeType }) })
    this.listeners.stop?.()
  }
}

/**
 * The README example, verbatim.
 *
 * @returns The rendered voice-note recorder with playback.
 */
function VoiceNote(): React.JSX.Element {
  const [note, setNote] = useState<{ url: string; seconds: number } | null>(null)
  const handleRecorded = ({ blob, durationSeconds }: AudioRecording): void =>
    setNote({ url: URL.createObjectURL(blob), seconds: durationSeconds })
  return (
    <section>
      <AudioRecorder
        mimeType="audio/webm"
        maxDurationSeconds={300}
        dataMolId="voice-note-recorder"
        onRecorded={handleRecorded}
      />
      {note && <audio controls src={note.url} data-mol-id="voice-note-playback" />}
    </section>
  )
}

const originalNavigator = globalThis.navigator
const createObjectURL = vi.fn((_blob: Blob) => 'blob:voice-note-1')

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  beforeEach(() => {
    ;(globalThis as { MediaRecorder?: unknown }).MediaRecorder = FakeMediaRecorder
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) } },
    })
    URL.createObjectURL = createObjectURL
  })
  afterEach(() => {
    cleanup()
    delete (globalThis as { MediaRecorder?: unknown }).MediaRecorder
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    })
  })

  it('records, stops, and plays the captured blob back', async () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <VoiceNote />
      </I18nProvider>,
    )
    const root = view.container.querySelector('[data-mol-id="voice-note-recorder"]') as HTMLElement
    expect(root.dataset.state).toBe('idle')
    expect(view.container.querySelector('[data-mol-id="voice-note-playback"]')).toBeNull()

    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Record' }))
    })
    expect(root.dataset.state).toBe('recording')

    fireEvent.click(view.getByRole('button', { name: 'Stop' }))
    expect(root.dataset.state).toBe('processed')
    const blob = createObjectURL.mock.calls[0]?.[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob?.type).toBe('audio/webm')
    const playback = view.container.querySelector('[data-mol-id="voice-note-playback"]')
    expect(playback?.getAttribute('src')).toBe('blob:voice-note-1')
  })
})
