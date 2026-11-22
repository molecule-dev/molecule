// @vitest-environment jsdom
/**
 * Unit tests for the Vue `<AudioRecorder>` — a port of
 * `@molecule/app-audio-recorder-react`'s own suite: the same test names and the
 * same behavioral assertions, rendered with Vue in jsdom. The browser
 * MediaRecorder + getUserMedia APIs are mocked the same way React's tests mock
 * them (jsdom doesn't ship either), so the lifecycle is deterministic.
 *
 * @module
 */

import { getByRole, within } from '@testing-library/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
    fontWeight: () => 'fw',
    button: (opts?: { variant?: string; color?: string; size?: string }) =>
      `button-${opts?.variant ?? 'solid'}-${opts?.color ?? 'default'}-${opts?.size ?? 'md'}`,
    touchTargetCompact: 'touch-target-compact',
  }),
}))

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
import type { AudioRecorderProps } from '../types.js'

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
   *
   * @param type - The event type.
   * @param listener - The listener.
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

const mounted: Array<{ app: ReturnType<typeof createApp>; host: HTMLElement }> = []

beforeEach(() => {
  FakeMediaRecorder.instances = []
  mockTrackStop = vi.fn()
  mockGetUserMedia = vi.fn(async () => ({
    getTracks: () => [{ stop: mockTrackStop }],
  }))
  ;(globalThis as { MediaRecorder?: unknown }).MediaRecorder = FakeMediaRecorder
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia: mockGetUserMedia } },
  })
})

afterEach(() => {
  for (const { app, host } of mounted.splice(0)) {
    app.unmount()
    host.remove()
  }
  document.body.innerHTML = ''
  delete (globalThis as { MediaRecorder?: unknown }).MediaRecorder
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: originalNavigator,
  })
})

/**
 * Renders an {@link AudioRecorder} with the given props and remembers it for
 * teardown.
 *
 * @param props - The recorder props.
 * @returns The mounted host element.
 */
const render = (props: AudioRecorderProps): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  // `maxDurationSeconds` has a runtime default (0 = unlimited), so Vue's
  // resolved-props type requires it; supply the default here and let the
  // caller override it.
  const resolved: Required<Pick<AudioRecorderProps, 'maxDurationSeconds'>> & AudioRecorderProps = {
    maxDurationSeconds: 0,
    ...props,
  }
  const app = createApp(defineComponent({ render: (): VNodeChild => h(AudioRecorder, resolved) }))
  app.mount(host)
  mounted.push({ app, host })
  return host
}

/** Lets the recorder's pending promises and Vue's re-render settle. */
const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

/**
 * Clicks an element the way a user would, then settles.
 *
 * @param el - The element.
 */
const click = async (el: Element | null): Promise<void> => {
  if (!el) throw new Error('no element to click')
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flush()
}

describe('<AudioRecorder>', () => {
  it('renders idle state with a Record button', () => {
    render({ onRecorded: () => {} })
    expect(getByRole(document.body, 'button', { name: /record/i })).toBeDefined()
    const status = getByRole(document.body, 'group').querySelector(
      '[data-mol-id="audio-recorder-status"]',
    )
    expect(status?.textContent).toContain('Ready')
  })

  it('forwards dataMolId to the wrapper', () => {
    const host = render({ dataMolId: 'voice-note', onRecorded: () => {} })
    expect(host.querySelector('[data-mol-id="voice-note"]')).not.toBeNull()
  })

  it('starts recording when Record is clicked', async () => {
    render({ onRecorded: () => {} })
    await click(getByRole(document.body, 'button', { name: /record/i }))
    expect(mockGetUserMedia).toHaveBeenCalledTimes(1)
    expect(FakeMediaRecorder.instances).toHaveLength(1)
    expect(FakeMediaRecorder.instances[0]?.state).toBe('recording')
    expect(getByRole(document.body, 'button', { name: /pause/i })).toBeDefined()
    expect(getByRole(document.body, 'button', { name: /^stop$/i })).toBeDefined()
  })

  it('pauses and resumes via the buttons', async () => {
    render({ onRecorded: () => {} })
    await click(getByRole(document.body, 'button', { name: /record/i }))
    await click(getByRole(document.body, 'button', { name: /pause/i }))
    expect(FakeMediaRecorder.instances[0]?.state).toBe('paused')
    expect(getByRole(document.body, 'button', { name: /resume/i })).toBeDefined()
    await click(getByRole(document.body, 'button', { name: /resume/i }))
    expect(FakeMediaRecorder.instances[0]?.state).toBe('recording')
  })

  it('emits onRecorded with a Blob when stopped', async () => {
    const onRecorded = vi.fn()
    render({ onRecorded })
    await click(getByRole(document.body, 'button', { name: /record/i }))
    await click(getByRole(document.body, 'button', { name: /^stop$/i }))
    expect(onRecorded).toHaveBeenCalledTimes(1)
    const arg = onRecorded.mock.calls[0]?.[0]
    expect(arg.blob).toBeInstanceOf(Blob)
    expect(arg.mimeType).toBe('audio/webm')
    expect(typeof arg.durationSeconds).toBe('number')
  })

  it('uses a custom mimeType when supported', async () => {
    const onRecorded = vi.fn()
    render({ mimeType: 'audio/ogg;codecs=opus', onRecorded })
    await click(getByRole(document.body, 'button', { name: /record/i }))
    await click(getByRole(document.body, 'button', { name: /^stop$/i }))
    expect(onRecorded.mock.calls[0]?.[0].mimeType).toBe('audio/ogg;codecs=opus')
  })

  it('stops the underlying mic stream when recording finishes', async () => {
    render({ onRecorded: () => {} })
    await click(getByRole(document.body, 'button', { name: /record/i }))
    await click(getByRole(document.body, 'button', { name: /^stop$/i }))
    expect(mockTrackStop).toHaveBeenCalled()
  })

  it('shows an error message when getUserMedia rejects', async () => {
    const onError = vi.fn()
    mockGetUserMedia.mockImplementationOnce(async () => {
      throw new Error('NotAllowedError')
    })
    render({ onRecorded: () => {}, onError })
    await click(getByRole(document.body, 'button', { name: /record/i }))
    expect(onError).toHaveBeenCalledTimes(1)
    expect(within(document.body).getByRole('alert').textContent).toMatch(/microphone/i)
  })

  it('shows an unsupported message when MediaRecorder is missing', async () => {
    delete (globalThis as { MediaRecorder?: unknown }).MediaRecorder
    const onError = vi.fn()
    render({ onRecorded: () => {}, onError })
    await click(getByRole(document.body, 'button', { name: /record/i }))
    expect(onError).toHaveBeenCalledTimes(1)
    expect(within(document.body).getByRole('alert').textContent).toMatch(/not supported/i)
  })

  it('surfaces MediaRecorder error events', async () => {
    const onError = vi.fn()
    render({ onRecorded: () => {}, onError })
    await click(getByRole(document.body, 'button', { name: /record/i }))
    FakeMediaRecorder.instances[0]?.triggerError()
    await nextTick()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(within(document.body).getByRole('alert')).toBeDefined()
  })

  it('exposes data-state attribute reflecting the current lifecycle', async () => {
    const host = render({ onRecorded: () => {} })
    const wrapper = host.querySelector('[data-mol-id="audio-recorder"]') as HTMLElement
    expect(wrapper.getAttribute('data-state')).toBe('idle')
    await click(getByRole(document.body, 'button', { name: /record/i }))
    expect(wrapper.getAttribute('data-state')).toBe('recording')
    await click(getByRole(document.body, 'button', { name: /pause/i }))
    expect(wrapper.getAttribute('data-state')).toBe('paused')
    await click(getByRole(document.body, 'button', { name: /^stop$/i }))
    expect(wrapper.getAttribute('data-state')).toBe('processed')
  })
})
