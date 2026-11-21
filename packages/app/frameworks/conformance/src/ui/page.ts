/**
 * Page state jsdom lacks or computes differently from a browser, installed the
 * same way for every framework: the UTC time zone, an in-memory `localStorage`, a
 * recording `AudioContext`, layout geometry for chosen elements, clipboard and drag
 * data, and pointer capture.
 *
 * @module
 */

import { installFocusVisible, resetFocusVisible } from './focus-visible.js'
import type { LayoutStub, TransferFile } from './spec.js'

/** The time zone every case runs in. */
export const CASE_TIME_ZONE = 'UTC'

/**
 * Puts the process in the UTC time zone, so a date a component formats
 * (`Intl.DateTimeFormat`, `toLocaleString`) reads the same on this machine, a
 * developer's and CI. Node applies a `TZ` assignment at once to every `Date` and
 * every formatter created after it. It runs when the kit loads, before a test file's
 * own imports (a formatter a module creates as it loads keeps the zone it was
 * created in), and again before each case.
 *
 * @throws {Error} When a new formatter still resolves another zone (a runtime that ignores
 *   `TZ`): its goldens could not match another machine's.
 */
export function pinCaseTimeZone(): void {
  if (process.env.TZ !== CASE_TIME_ZONE) process.env.TZ = CASE_TIME_ZONE
  const zone = new Intl.DateTimeFormat('en-US').resolvedOptions().timeZone
  if (zone !== CASE_TIME_ZONE)
    throw new Error(
      `conformance: dates format in the ${zone} time zone although TZ is ${CASE_TIME_ZONE}; run the tests with TZ=${CASE_TIME_ZONE}`,
    )
}

pinCaseTimeZone()

/**
 * Puts the page back where every case starts, before the case mounts: at the document root (`/`,
 * no query, no hash), so no case starts on an address an earlier case left behind (a hook that
 * mirrors its state to `location.hash` while its debounce is still pending when the case ends),
 * with the same `:focus-visible` state ({@link resetFocusVisible}), and with the window focused.
 */
export function resetCasePage(): void {
  history.replaceState(null, '', '/')
  resetFocusVisible()
  setWindowFocus(true)
}

/** Whether the window has focus, as `document.hasFocus()` reports it. */
let windowFocused = true

/**
 * Sets what `document.hasFocus()` answers. jsdom's own answer turns true once anything has
 * been focused and never turns false again, so a component's unfocused branch (a sound or a
 * notification only while the user is in another tab) could not run. The `windowFocus` step
 * sets it, and every case starts focused.
 *
 * @param focused - Whether the window has focus.
 */
export function setWindowFocus(focused: boolean): void {
  windowFocused = focused
  if (typeof document === 'undefined') return
  if (Object.getOwnPropertyDescriptor(document, 'hasFocus')) return
  Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => windowFocused })
}

/** Records one call into the running case (`name`, `args`). */
export type PageRecord = (name: string, args: unknown[]) => void

/**
 * A `localStorage` or `sessionStorage` held in memory. Node 26 defines its own global
 * `localStorage`, which shadows jsdom's and is unusable without a file, so the kit
 * installs this one for every case: each framework then reads and writes the same
 * storage under every Node version.
 */
class MemoryStorage {
  readonly #entries: Map<string, string>

  /**
   * Starts the storage with some entries.
   *
   * @param entries - The entries it starts with.
   */
  constructor(entries: Record<string, string>) {
    this.#entries = new Map(Object.entries(entries))
  }

  /**
   * How many entries the storage holds.
   *
   * @returns The number of entries.
   */
  get length(): number {
    return this.#entries.size
  }

  /**
   * The key at a position.
   *
   * @param index - Position in insertion order.
   * @returns The key there, or null.
   */
  key(index: number): string | null {
    return [...this.#entries.keys()][index] ?? null
  }

  /**
   * Reads one entry.
   *
   * @param key - The key.
   * @returns Its value, or null.
   */
  getItem(key: string): string | null {
    return this.#entries.get(String(key)) ?? null
  }

  /**
   * Writes one entry.
   *
   * @param key - The key.
   * @param value - The value, stored as a string like a browser does.
   */
  setItem(key: string, value: string): void {
    this.#entries.set(String(key), String(value))
  }

  /**
   * Removes one entry.
   *
   * @param key - The key to remove.
   */
  removeItem(key: string): void {
    this.#entries.delete(String(key))
  }

  /** Removes every entry. */
  clear(): void {
    this.#entries.clear()
  }

  /**
   * Every entry, for the case's `localStorage` call.
   *
   * @returns The entries, sorted by key.
   */
  contents(): Record<string, string> {
    return Object.fromEntries([...this.#entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  }
}

/** The page's `localStorage` or `sessionStorage` for one case. */
export interface CaseLocalStorage {
  /**
   * Every entry now.
   *
   * @returns The entries, sorted by key.
   */
  contents(): Record<string, string>
  /** Puts back the storage the page had before. */
  restore(): void
}

/**
 * Replaces one web storage with an in-memory one for one case.
 *
 * @param name - `localStorage` or `sessionStorage`.
 * @param entries - The entries the case starts with.
 * @returns The storage's contents and what restores the previous one.
 */
function installMemoryStorage(
  name: 'localStorage' | 'sessionStorage',
  entries: Record<string, string>,
): CaseLocalStorage {
  const storage = new MemoryStorage(entries)
  const targets: object[] = [globalThis]
  if (typeof window !== 'undefined' && window !== globalThis) targets.push(window)
  const previous = targets.map((target) => Object.getOwnPropertyDescriptor(target, name))
  for (const target of targets)
    Object.defineProperty(target, name, {
      configurable: true,
      enumerable: true,
      get: () => storage,
    })
  return {
    contents: () => storage.contents(),
    restore: () => {
      targets.forEach((target, index) => {
        const descriptor = previous[index]
        if (descriptor) Object.defineProperty(target, name, descriptor)
        else Reflect.deleteProperty(target, name)
      })
    },
  }
}

/**
 * Replaces `localStorage` with an in-memory one for one case.
 *
 * @param entries - The entries the case starts with.
 * @returns The storage's contents and what restores the previous one.
 */
export function installLocalStorage(entries: Record<string, string>): CaseLocalStorage {
  return installMemoryStorage('localStorage', entries)
}

/**
 * Replaces `sessionStorage` with an in-memory one for one case, empty unless the case
 * seeds it (`WindowContext.sessionStorage`), so nothing an earlier case wrote
 * reaches it.
 *
 * @param entries - The entries the case starts with.
 * @returns The storage's contents and what restores the previous one.
 */
export function installSessionStorage(entries: Record<string, string>): CaseLocalStorage {
  return installMemoryStorage('sessionStorage', entries)
}

/** Where the running case's audio calls go; null outside a case that asked for audio. */
let audioRecord: PageRecord | null = null

/** Names of fake audio nodes, for the `connect` calls that name their target. */
const audioNames = new WeakMap<object, string>()

/**
 * A recording `AudioParam`.
 *
 * @param path - Its call-name prefix (`audio.oscillator.frequency`).
 * @param initial - Its starting value.
 * @returns The param.
 */
function audioParam(path: string, initial: number): RecordingParam {
  let current = initial
  const log = (method: string, args: unknown[]): void => audioRecord?.(`${path}.${method}`, args)
  const param: RecordingParam = {
    get value(): number {
      return current
    },
    set value(next: number) {
      current = next
      log('value', [next])
    },
    setValueAtTime(next: number, time: number): RecordingParam {
      current = next
      log('setValueAtTime', [next, time])
      return param
    },
    linearRampToValueAtTime(next: number, time: number): RecordingParam {
      current = next
      log('linearRampToValueAtTime', [next, time])
      return param
    },
    exponentialRampToValueAtTime(next: number, time: number): RecordingParam {
      current = next
      log('exponentialRampToValueAtTime', [next, time])
      return param
    },
    setTargetAtTime(target: number, time: number, constant: number): RecordingParam {
      log('setTargetAtTime', [target, time, constant])
      return param
    },
    cancelScheduledValues(time: number): RecordingParam {
      log('cancelScheduledValues', [time])
      return param
    },
  }
  return param
}

/**
 * A recording audio node: `connect` and `disconnect` are calls naming the nodes.
 *
 * @param name - Its name in call names (`oscillator`, `gain`, `destination`).
 * @param members - Its own members.
 * @returns The node.
 */
function audioNode<T extends object>(name: string, members: T): T & AudioNodeMembers {
  const node = Object.assign(members, {
    connect: (target: object): object => {
      audioRecord?.(`audio.${name}.connect`, [audioNames.get(target) ?? 'unknown'])
      return target
    },
    disconnect: (): void => {
      audioRecord?.(`audio.${name}.disconnect`, [])
    },
  })
  audioNames.set(node, name)
  return node
}

/** What every fake audio node has. */
interface AudioNodeMembers {
  connect(target: object): object
  disconnect(): void
}

/** A recording `AudioParam`: each write and schedule is a call. */
interface RecordingParam {
  value: number
  setValueAtTime(next: number, time: number): RecordingParam
  linearRampToValueAtTime(next: number, time: number): RecordingParam
  exponentialRampToValueAtTime(next: number, time: number): RecordingParam
  setTargetAtTime(target: number, time: number, constant: number): RecordingParam
  cancelScheduledValues(time: number): RecordingParam
}

/** A recording oscillator. */
type RecordingOscillator = AudioNodeMembers & {
  type: string
  frequency: RecordingParam
  detune: RecordingParam
  onended: null
  start(when?: number): void
  stop(when?: number): void
}

/**
 * The recording `AudioContext`. It records what a component builds and plays,
 * not its construction, so a component that keeps one context across mounts
 * records the same calls in every case. Time stands still at 0.
 */
class RecordingAudioContext {
  readonly currentTime = 0
  readonly sampleRate = 44100
  state: 'running' | 'suspended' | 'closed' = 'running'
  readonly destination = audioNode('destination', {})

  /**
   * Creates an oscillator whose settings and starts are calls.
   *
   * @returns A recording oscillator.
   */
  createOscillator(): RecordingOscillator {
    audioRecord?.('audio.createOscillator', [])
    let type = 'sine'
    const oscillator = audioNode('oscillator', {
      type,
      frequency: audioParam('audio.oscillator.frequency', 440),
      detune: audioParam('audio.oscillator.detune', 0),
      onended: null,
      start: (when = 0): void => audioRecord?.('audio.oscillator.start', [when]),
      stop: (when = 0): void => audioRecord?.('audio.oscillator.stop', [when]),
    })
    Object.defineProperty(oscillator, 'type', {
      enumerable: true,
      get: () => type,
      set: (next: string) => {
        type = next
        audioRecord?.('audio.oscillator.type', [next])
      },
    })
    return oscillator
  }

  /**
   * Creates a gain node whose gain changes are calls.
   *
   * @returns A recording gain node.
   */
  createGain(): AudioNodeMembers & { gain: RecordingParam } {
    audioRecord?.('audio.createGain', [])
    return audioNode('gain', { gain: audioParam('audio.gain.gain', 1) })
  }

  /**
   * Resumes the context.
   *
   * @returns A promise that resolves at once.
   */
  async resume(): Promise<void> {
    audioRecord?.('audio.resume', [])
    this.state = 'running'
  }

  /**
   * Suspends the context.
   *
   * @returns A promise that resolves at once.
   */
  async suspend(): Promise<void> {
    audioRecord?.('audio.suspend', [])
    this.state = 'suspended'
  }

  /**
   * Closes the context.
   *
   * @returns A promise that resolves at once.
   */
  async close(): Promise<void> {
    audioRecord?.('audio.close', [])
    this.state = 'closed'
  }
}

/**
 * Installs the recording `AudioContext` for one case.
 *
 * @param record - Receives each audio call.
 * @returns What removes it again.
 */
export function installAudio(record: PageRecord): { restore(): void } {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
  Object.defineProperty(globalThis, 'AudioContext', {
    configurable: true,
    writable: true,
    value: RecordingAudioContext,
  })
  audioRecord = record
  return {
    restore: () => {
      audioRecord = null
      if (previous) Object.defineProperty(globalThis, 'AudioContext', previous)
      else Reflect.deleteProperty(globalThis, 'AudioContext')
    },
  }
}

/** The running case's layout stubs. */
let layoutStubs: LayoutStub[] = []
/** Elements already given their stub's geometry. */
let stubbed = new WeakSet<Element>()

/**
 * Sets the layout stubs for the case about to run.
 *
 * @param stubs - The case's {@link UICase.layout}, or none.
 */
export function setLayoutStubs(stubs: LayoutStub[]): void {
  layoutStubs = stubs
  stubbed = new WeakSet()
}

/**
 * Gives one element its stub's geometry.
 *
 * @param el - The element.
 * @param stub - Its stub.
 */
function stubElement(el: Element, stub: LayoutStub): void {
  const { childHeight, clientHeight, rect } = stub
  const scrollHeight = (): number | undefined =>
    childHeight === undefined ? undefined : el.children.length * childHeight
  if (childHeight !== undefined)
    Object.defineProperty(el, 'scrollHeight', {
      configurable: true,
      get: () => scrollHeight(),
    })
  if (clientHeight !== undefined)
    Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => clientHeight })
  if (stub.scrollTop !== undefined) {
    let top = stub.scrollTop
    // A browser keeps scrollTop between 0 and scrollHeight - clientHeight.
    const clamp = (value: number): number => {
      const height = scrollHeight()
      const max =
        height === undefined || clientHeight === undefined
          ? Infinity
          : Math.max(0, height - clientHeight)
      return Math.max(0, Math.min(value, max))
    }
    Object.defineProperty(el, 'scrollTop', {
      configurable: true,
      get: () => clamp(top),
      set: (next: number) => {
        top = clamp(Number(next))
      },
    })
    const scrollTo = (first?: number | ScrollToOptions, second?: number): void => {
      const next = typeof first === 'object' ? first.top : second
      if (next !== undefined) top = clamp(next)
    }
    const scrollBy = (first?: number | ScrollToOptions, second?: number): void => {
      const delta = typeof first === 'object' ? first.top : second
      if (delta !== undefined) top = clamp(clamp(top) + delta)
    }
    Object.defineProperty(el, 'scrollTo', { configurable: true, value: scrollTo })
    Object.defineProperty(el, 'scroll', { configurable: true, value: scrollTo })
    Object.defineProperty(el, 'scrollBy', { configurable: true, value: scrollBy })
  }
  if (rect) {
    const { x = 0, y = 0, width, height } = rect
    const box = {
      x,
      y,
      width,
      height,
      top: y,
      left: x,
      right: x + width,
      bottom: y + height,
      toJSON: () => ({ x, y, width, height }),
    }
    Object.defineProperty(el, 'getBoundingClientRect', { configurable: true, value: () => box })
    for (const [name, value] of [
      ['offsetWidth', width],
      ['offsetHeight', height],
      ['clientWidth', width],
    ] as const)
      Object.defineProperty(el, name, { configurable: true, get: () => value })
    if (clientHeight === undefined)
      Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => height })
  }
}

/** Gives every element a layout stub selects, and has not stubbed yet, its geometry. */
export function applyLayout(): void {
  for (const stub of layoutStubs)
    document.querySelectorAll(stub.selector).forEach((el) => {
      if (stubbed.has(el)) return
      stubbed.add(el)
      stubElement(el, stub)
    })
}

/**
 * The snapshot line for the stubbed scroll positions: `@scroll <selector> <top>,…`
 * per stub with a `scrollTop`, in document order.
 *
 * @returns The lines, or an empty string.
 */
export function layoutNote(): string {
  return layoutStubs
    .filter((stub) => stub.scrollTop !== undefined)
    .map((stub) => {
      const tops = Array.from(document.querySelectorAll(stub.selector), (el) =>
        stubbed.has(el) ? String(el.scrollTop) : '-',
      )
      return `@scroll ${stub.selector} ${tops.join(',') || 'none'}`
    })
    .join('\n')
}

/** The clipboard or drag data a `transfer` step's event carries. */
export interface TransferData {
  dropEffect: string
  effectAllowed: string
  readonly files: File[] & { item(index: number): File | null }
  readonly types: string[]
  readonly items: TransferItem[]
  getData(format: string): string
  setData(format: string, value: string): void
  clearData(format?: string): void
  setDragImage(image: Element, x: number, y: number): void
}

/** One entry of {@link TransferData.items}. */
export interface TransferItem {
  kind: 'string' | 'file'
  type: string
  getAsFile(): File | null
  getAsString(callback: ((value: string) => void) | null): void
}

/** A format name as a browser stores it (`text` is `text/plain`, `url` is `text/uri-list`). */
const transferFormat = (format: string): string => {
  const lower = format.toLowerCase()
  return lower === 'text' ? 'text/plain' : lower === 'url' ? 'text/uri-list' : lower
}

/**
 * Builds the data of one paste or drag.
 *
 * @param files - Files it carries.
 * @param data - String entries by format.
 * @returns The data.
 */
export function createTransferData(
  files: TransferFile[],
  data: Record<string, string>,
): TransferData {
  const store = new Map(Object.entries(data).map(([k, v]) => [transferFormat(k), v]))
  const fileObjects = files.map((file) => {
    const object = new File([file.content], file.name, { type: file.type, lastModified: 0 })
    // A size the entry names wins over the content's own, so a limit can be driven.
    if (file.size !== undefined)
      Object.defineProperty(object, 'size', { configurable: true, value: file.size })
    return object
  })
  const fileList = Object.assign([...fileObjects], {
    item: (index: number): File | null => fileObjects[index] ?? null,
  })
  return {
    dropEffect: 'none',
    effectAllowed: 'all',
    files: fileList,
    get types() {
      return [...store.keys(), ...(fileObjects.length ? ['Files'] : [])]
    },
    get items() {
      return [
        ...[...store].map(([type, value]): TransferItem => ({
          kind: 'string',
          type,
          getAsFile: () => null,
          getAsString: (callback) => callback?.(value),
        })),
        ...fileObjects.map((file): TransferItem => ({
          kind: 'file',
          type: file.type,
          getAsFile: () => file,
          getAsString: () => undefined,
        })),
      ]
    },
    getData: (format) => store.get(transferFormat(format)) ?? '',
    setData: (format, value) => {
      store.set(transferFormat(format), String(value))
    },
    clearData: (format) => {
      if (format === undefined) store.clear()
      else store.delete(transferFormat(format))
    },
    setDragImage: () => undefined,
  }
}

/** One cue the kit's text track holds: its text only, since time stands still. */
interface KitCue {
  readonly text: string
  readonly startTime: number
  readonly endTime: number
}

/**
 * The text track of a `<track>` element, which jsdom does not implement. It
 * starts `disabled`, as a browser's captions track without `default` does, and
 * then reports no cues and fires no `cuechange`: a component that shows the
 * captions itself has to set `mode` to `hidden` or `showing` first.
 */
class KitTextTrack extends EventTarget {
  mode: 'disabled' | 'hidden' | 'showing' = 'disabled'
  oncuechange: ((event: Event) => void) | null = null
  private current: readonly KitCue[] = []

  /**
   * Creates the text track of one `<track>` element.
   *
   * @param element - The `<track>` element the track belongs to.
   */
  constructor(private readonly element: HTMLTrackElement) {
    super()
  }

  /** The element's `kind` attribute. */
  get kind(): string {
    return this.element.getAttribute('kind') ?? 'subtitles'
  }

  /** The element's `label` attribute. */
  get label(): string {
    return this.element.getAttribute('label') ?? ''
  }

  /** The element's `srclang` attribute. */
  get language(): string {
    return this.element.getAttribute('srclang') ?? ''
  }

  /** The cues showing now, or null while the track is disabled. */
  get activeCues(): readonly KitCue[] | null {
    return this.mode === 'disabled' ? null : this.current
  }

  /** The track's cues, or null while the track is disabled. */
  get cues(): readonly KitCue[] | null {
    return this.activeCues
  }

  /**
   * Makes these cues the active ones and, unless the track is disabled, fires
   * `cuechange` at the track and at its element, as the HTML spec has it.
   *
   * @param texts - The text of each cue now showing (none: no cue).
   */
  reach(texts: string[]): void {
    this.current = Object.freeze(texts.map((text) => ({ text, startTime: 0, endTime: 0 })))
    if (this.mode === 'disabled') return
    const event = new Event('cuechange')
    this.oncuechange?.(event)
    this.dispatchEvent(event)
    this.element.dispatchEvent(new Event('cuechange'))
  }
}

/** Each `<track>` element's text track. */
const textTracks = new WeakMap<HTMLTrackElement, KitTextTrack>()

/**
 * The text track of a `<track>` element, created on first use.
 *
 * @param element - The `<track>` element.
 * @returns Its text track.
 */
function textTrackOf(element: HTMLTrackElement): KitTextTrack {
  const existing = textTracks.get(element)
  if (existing) return existing
  const track = new KitTextTrack(element)
  textTracks.set(element, track)
  return track
}

/**
 * Shows these cues on a `<track>` element's text track, as a playing media
 * element does when its position enters or leaves a cue (a `cues` step).
 *
 * @param element - The `<track>` element.
 * @param texts - The text of each cue now showing (none: no cue).
 */
export function reachCues(element: HTMLTrackElement, texts: string[]): void {
  textTrackOf(element).reach(texts)
}

/**
 * The canvas `getContext` of a page without a renderer: no context of any kind.
 *
 * @returns `null`.
 */
const noCanvasContext = (): null => null

/** Pointer ids each element captured (`setPointerCapture`). */
const captures = new WeakMap<Element, Set<number>>()

/**
 * Fills DOM methods jsdom does not implement with ones that do what a page
 * without layout would: pointer capture is tracked, `scrollIntoView` does
 * nothing, a `<track>` element has a text track (`cues` steps drive it), and a
 * `<canvas>` has no drawing context. Other methods jsdom has are left alone. Every UI case,
 * hook case and value check installs them, so each runs on the same page. It also installs the
 * kit's `:focus-visible` judgement ({@link installFocusVisible}), which jsdom gets wrong.
 */
export function installDomGaps(): void {
  installFocusVisible()
  // jsdom answers getContext with null too, after reporting "not implemented" to the
  // console; a component that draws then takes its no-context path quietly.
  if (HTMLCanvasElement.prototype.getContext !== noCanvasContext)
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      writable: true,
      value: noCanvasContext,
    })
  if (!('track' in HTMLTrackElement.prototype))
    Object.defineProperty(HTMLTrackElement.prototype, 'track', {
      configurable: true,
      get(this: HTMLTrackElement): KitTextTrack {
        return textTrackOf(this)
      },
    })
  const proto = Element.prototype
  if (!('setPointerCapture' in proto))
    Object.defineProperty(proto, 'setPointerCapture', {
      configurable: true,
      writable: true,
      value(this: Element, pointerId: number): void {
        const ids = captures.get(this) ?? new Set<number>()
        ids.add(pointerId)
        captures.set(this, ids)
      },
    })
  if (!('releasePointerCapture' in proto))
    Object.defineProperty(proto, 'releasePointerCapture', {
      configurable: true,
      writable: true,
      value(this: Element, pointerId: number): void {
        captures.get(this)?.delete(pointerId)
      },
    })
  if (!('hasPointerCapture' in proto))
    Object.defineProperty(proto, 'hasPointerCapture', {
      configurable: true,
      writable: true,
      value(this: Element, pointerId: number): boolean {
        return captures.get(this)?.has(pointerId) ?? false
      },
    })
  if (!('scrollIntoView' in proto))
    Object.defineProperty(proto, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: (): void => undefined,
    })
}
