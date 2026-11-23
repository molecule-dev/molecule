// @vitest-environment jsdom
/**
 * Unit tests of `AudioRecorder` — the port of
 * `@molecule/app-audio-recorder-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular adapter
 * uses) and asserts the same behavior.
 *
 * The browser MediaRecorder + getUserMedia APIs are mocked the same way React's
 * tests mock them (jsdom doesn't ship either), so the lifecycle is
 * deterministic.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { getByRole, within } from '@testing-library/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-angular', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@molecule/app-angular')
  return {
    ...actual,
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
  }
})

const { AudioRecorder } = await import('../audio-recorder.component.js')

/** The host template: every input bound from `p`. */
const TEMPLATE = `<div mol-audio-recorder [onRecorded]="p['onRecorded']" [onError]="p['onError']" [mimeType]="p['mimeType']" [maxDurationSeconds]="p['maxDurationSeconds']" [dataMolId]="p['dataMolId']" [className]="p['className']"></div>`

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

/** A mounted spec host: its DOM, change detection, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs change detection. */
  detect(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

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

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
  delete (globalThis as { MediaRecorder?: unknown }).MediaRecorder
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: originalNavigator,
  })
})

/**
 * Mounts an {@link AudioRecorder} with the given props and remembers it for
 * teardown.
 *
 * @param props - The recorder props.
 * @returns The mounted host.
 */
const mountRecorder = async (props: Record<string, unknown>): Promise<Mounted> => {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [AudioRecorder],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: TEMPLATE,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const entry: Mounted = {
    host,
    detect: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(entry)
  return entry
}

/** Lets the recorder's pending promises and Angular's change detection settle. */
const flush = async (m: Mounted): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  m.detect()
}

/**
 * Clicks an element the way a user would, then settles.
 *
 * @param m - The mounted host.
 * @param el - The element.
 */
const click = async (m: Mounted, el: Element | null): Promise<void> => {
  if (!el) throw new Error('no element to click')
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flush(m)
}

describe('<AudioRecorder>', () => {
  it('renders idle state with a Record button', async () => {
    await mountRecorder({ onRecorded: () => {} })
    expect(getByRole(document.body, 'button', { name: /record/i })).toBeDefined()
    const status = getByRole(document.body, 'group').querySelector(
      '[data-mol-id="audio-recorder-status"]',
    )
    expect(status?.textContent).toContain('Ready')
  })

  it('forwards dataMolId to the wrapper', async () => {
    const { host } = await mountRecorder({ dataMolId: 'voice-note', onRecorded: () => {} })
    expect(host.querySelector('[data-mol-id="voice-note"]')).not.toBeNull()
  })

  it('starts recording when Record is clicked', async () => {
    const m = await mountRecorder({ onRecorded: () => {} })
    await click(m, getByRole(document.body, 'button', { name: /record/i }))
    expect(mockGetUserMedia).toHaveBeenCalledTimes(1)
    expect(FakeMediaRecorder.instances).toHaveLength(1)
    expect(FakeMediaRecorder.instances[0]?.state).toBe('recording')
    expect(getByRole(document.body, 'button', { name: /pause/i })).toBeDefined()
    expect(getByRole(document.body, 'button', { name: /^stop$/i })).toBeDefined()
  })

  it('pauses and resumes via the buttons', async () => {
    const m = await mountRecorder({ onRecorded: () => {} })
    await click(m, getByRole(document.body, 'button', { name: /record/i }))
    await click(m, getByRole(document.body, 'button', { name: /pause/i }))
    expect(FakeMediaRecorder.instances[0]?.state).toBe('paused')
    expect(getByRole(document.body, 'button', { name: /resume/i })).toBeDefined()
    await click(m, getByRole(document.body, 'button', { name: /resume/i }))
    expect(FakeMediaRecorder.instances[0]?.state).toBe('recording')
  })

  it('emits onRecorded with a Blob when stopped', async () => {
    const onRecorded = vi.fn()
    const m = await mountRecorder({ onRecorded })
    await click(m, getByRole(document.body, 'button', { name: /record/i }))
    await click(m, getByRole(document.body, 'button', { name: /^stop$/i }))
    expect(onRecorded).toHaveBeenCalledTimes(1)
    const arg = onRecorded.mock.calls[0]?.[0]
    expect(arg.blob).toBeInstanceOf(Blob)
    expect(arg.mimeType).toBe('audio/webm')
    expect(typeof arg.durationSeconds).toBe('number')
  })

  it('uses a custom mimeType when supported', async () => {
    const onRecorded = vi.fn()
    const m = await mountRecorder({ mimeType: 'audio/ogg;codecs=opus', onRecorded })
    await click(m, getByRole(document.body, 'button', { name: /record/i }))
    await click(m, getByRole(document.body, 'button', { name: /^stop$/i }))
    expect(onRecorded.mock.calls[0]?.[0].mimeType).toBe('audio/ogg;codecs=opus')
  })

  it('stops the underlying mic stream when recording finishes', async () => {
    const m = await mountRecorder({ onRecorded: () => {} })
    await click(m, getByRole(document.body, 'button', { name: /record/i }))
    await click(m, getByRole(document.body, 'button', { name: /^stop$/i }))
    expect(mockTrackStop).toHaveBeenCalled()
  })

  it('shows an error message when getUserMedia rejects', async () => {
    const onError = vi.fn()
    mockGetUserMedia.mockImplementationOnce(async () => {
      throw new Error('NotAllowedError')
    })
    const m = await mountRecorder({ onRecorded: () => {}, onError })
    await click(m, getByRole(document.body, 'button', { name: /record/i }))
    expect(onError).toHaveBeenCalledTimes(1)
    expect(within(document.body).getByRole('alert').textContent).toMatch(/microphone/i)
  })

  it('shows an unsupported message when MediaRecorder is missing', async () => {
    delete (globalThis as { MediaRecorder?: unknown }).MediaRecorder
    const onError = vi.fn()
    const m = await mountRecorder({ onRecorded: () => {}, onError })
    await click(m, getByRole(document.body, 'button', { name: /record/i }))
    expect(onError).toHaveBeenCalledTimes(1)
    expect(within(document.body).getByRole('alert').textContent).toMatch(/not supported/i)
  })

  it('surfaces MediaRecorder error events', async () => {
    const onError = vi.fn()
    const m = await mountRecorder({ onRecorded: () => {}, onError })
    await click(m, getByRole(document.body, 'button', { name: /record/i }))
    FakeMediaRecorder.instances[0]?.triggerError()
    m.detect()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(within(document.body).getByRole('alert')).toBeDefined()
  })

  it('exposes data-state attribute reflecting the current lifecycle', async () => {
    const m = await mountRecorder({ onRecorded: () => {} })
    const wrapper = m.host.querySelector('[data-mol-id="audio-recorder"]') as HTMLElement
    expect(wrapper.getAttribute('data-state')).toBe('idle')
    await click(m, getByRole(document.body, 'button', { name: /record/i }))
    expect(wrapper.getAttribute('data-state')).toBe('recording')
    await click(m, getByRole(document.body, 'button', { name: /pause/i }))
    expect(wrapper.getAttribute('data-state')).toBe('paused')
    await click(m, getByRole(document.body, 'button', { name: /^stop$/i }))
    expect(wrapper.getAttribute('data-state')).toBe('processed')
  })
})
