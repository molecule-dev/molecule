/**
 * Unit tests for `<AudioRecorder>` — mic permission + MediaRecorder wrapper.
 * Mocks the browser MediaRecorder + getUserMedia APIs (jsdom doesn't ship
 * either) so we can drive the lifecycle deterministically.
 *
 * @module
 */

// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
    fontWeight: () => 'fw',
  }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      let s = opts?.defaultValue ?? _key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          s = s.replaceAll(`{{${k}}}`, String(v))
        }
      }
      return s
    },
  }),
}))

import { AudioRecorder } from '../AudioRecorder.js'

interface FakeRecorderListeners {
  dataavailable?: (e: BlobEvent) => void
  stop?: () => void
  error?: () => void
}

/**
 * Minimal in-memory stub that replaces the browser MediaRecorder in jsdom tests.
 */
class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = []
  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  mimeType: string
  private listeners: FakeRecorderListeners = {}

  constructor(_stream: MediaStream, opts?: MediaRecorderOptions) {
    this.mimeType = opts?.mimeType ?? 'audio/webm'
    FakeMediaRecorder.instances.push(this)
  }

  /**
   * Registers a listener for the given recorder event type.
   */
  addEventListener<K extends keyof FakeRecorderListeners>(
    type: K,
    listener: NonNullable<FakeRecorderListeners[K]>,
  ): void {
    this.listeners[type] = listener as FakeRecorderListeners[K]
  }

  /**
   * No-op stub satisfying the EventTarget interface shape.
   */
  removeEventListener(): void {
    /* no-op */
  }

  /**
   * Transitions state to recording.
   */
  start(): void {
    this.state = 'recording'
  }

  /**
   * Transitions state to paused.
   */
  pause(): void {
    this.state = 'paused'
  }

  /**
   * Transitions state back to recording from paused.
   */
  resume(): void {
    this.state = 'recording'
  }

  /**
   * Finalises recording: fires the dataavailable and stop events then marks state inactive.
   */
  stop(): void {
    this.state = 'inactive'
    this.listeners.dataavailable?.({
      data: new Blob(['hello'], { type: this.mimeType }),
    } as BlobEvent)
    this.listeners.stop?.()
  }

  /**
   * Simulates a MediaRecorder error event for testing error-handling paths.
   */
  triggerError(): void {
    this.listeners.error?.()
  }
}

const originalNavigator = globalThis.navigator
let mockGetUserMedia: ReturnType<typeof vi.fn>
let mockTrackStop: ReturnType<typeof vi.fn>

beforeEach(() => {
  FakeMediaRecorder.instances = []
  mockTrackStop = vi.fn()
  mockGetUserMedia = vi.fn(async () => ({
    getTracks: () => [{ stop: mockTrackStop }],
  }))
  ;(globalThis as { MediaRecorder?: unknown }).MediaRecorder =
    FakeMediaRecorder as unknown as typeof MediaRecorder
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia: mockGetUserMedia } },
  })
})

afterEach(() => {
  cleanup()
  delete (globalThis as { MediaRecorder?: unknown }).MediaRecorder
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: originalNavigator,
  })
})

describe('<AudioRecorder>', () => {
  it('renders idle state with a Record button', () => {
    render(<AudioRecorder onRecorded={() => {}} />)
    expect(screen.getByRole('button', { name: /record/i })).toBeDefined()
    const status = screen.getByRole('group').querySelector('[data-mol-id="audio-recorder-status"]')
    expect(status?.textContent).toContain('Ready')
  })

  it('forwards dataMolId to the wrapper', () => {
    const { container } = render(<AudioRecorder dataMolId="voice-note" onRecorded={() => {}} />)
    expect(container.querySelector('[data-mol-id="voice-note"]')).not.toBeNull()
  })

  it('starts recording when Record is clicked', async () => {
    render(<AudioRecorder onRecorded={() => {}} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /record/i }))
    })
    expect(mockGetUserMedia).toHaveBeenCalledTimes(1)
    expect(FakeMediaRecorder.instances).toHaveLength(1)
    expect(FakeMediaRecorder.instances[0]?.state).toBe('recording')
    expect(screen.getByRole('button', { name: /pause/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /^stop$/i })).toBeDefined()
  })

  it('pauses and resumes via the buttons', async () => {
    render(<AudioRecorder onRecorded={() => {}} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /record/i }))
    })
    fireEvent.click(screen.getByRole('button', { name: /pause/i }))
    expect(FakeMediaRecorder.instances[0]?.state).toBe('paused')
    expect(screen.getByRole('button', { name: /resume/i })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /resume/i }))
    expect(FakeMediaRecorder.instances[0]?.state).toBe('recording')
  })

  it('emits onRecorded with a Blob when stopped', async () => {
    const onRecorded = vi.fn()
    render(<AudioRecorder onRecorded={onRecorded} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /record/i }))
    })
    fireEvent.click(screen.getByRole('button', { name: /^stop$/i }))
    expect(onRecorded).toHaveBeenCalledTimes(1)
    const arg = onRecorded.mock.calls[0]?.[0]
    expect(arg.blob).toBeInstanceOf(Blob)
    expect(arg.mimeType).toBe('audio/webm')
    expect(typeof arg.durationSeconds).toBe('number')
  })

  it('uses a custom mimeType when supported', async () => {
    const onRecorded = vi.fn()
    render(<AudioRecorder mimeType="audio/ogg;codecs=opus" onRecorded={onRecorded} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /record/i }))
    })
    fireEvent.click(screen.getByRole('button', { name: /^stop$/i }))
    expect(onRecorded.mock.calls[0]?.[0].mimeType).toBe('audio/ogg;codecs=opus')
  })

  it('stops the underlying mic stream when recording finishes', async () => {
    render(<AudioRecorder onRecorded={() => {}} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /record/i }))
    })
    fireEvent.click(screen.getByRole('button', { name: /^stop$/i }))
    expect(mockTrackStop).toHaveBeenCalled()
  })

  it('shows an error message when getUserMedia rejects', async () => {
    const onError = vi.fn()
    mockGetUserMedia.mockImplementationOnce(async () => {
      throw new Error('NotAllowedError')
    })
    render(<AudioRecorder onRecorded={() => {}} onError={onError} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /record/i }))
    })
    expect(onError).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert').textContent).toMatch(/microphone/i)
  })

  it('shows an unsupported message when MediaRecorder is missing', async () => {
    delete (globalThis as { MediaRecorder?: unknown }).MediaRecorder
    const onError = vi.fn()
    render(<AudioRecorder onRecorded={() => {}} onError={onError} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /record/i }))
    })
    expect(onError).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert').textContent).toMatch(/not supported/i)
  })

  it('surfaces MediaRecorder error events', async () => {
    const onError = vi.fn()
    render(<AudioRecorder onRecorded={() => {}} onError={onError} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /record/i }))
    })
    act(() => {
      FakeMediaRecorder.instances[0]?.triggerError()
    })
    expect(onError).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert')).toBeDefined()
  })

  it('exposes data-state attribute reflecting the current lifecycle', async () => {
    const { container } = render(<AudioRecorder onRecorded={() => {}} />)
    const wrapper = container.querySelector('[data-mol-id="audio-recorder"]') as HTMLElement
    expect(wrapper.getAttribute('data-state')).toBe('idle')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /record/i }))
    })
    expect(wrapper.getAttribute('data-state')).toBe('recording')
    fireEvent.click(screen.getByRole('button', { name: /pause/i }))
    expect(wrapper.getAttribute('data-state')).toBe('paused')
    fireEvent.click(screen.getByRole('button', { name: /^stop$/i }))
    expect(wrapper.getAttribute('data-state')).toBe('processed')
  })
})
