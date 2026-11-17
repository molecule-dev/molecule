/**
 * Global objects jsdom lacks, or that cannot be the same on every run, installed
 * for one case and removed after it: a pinned `Math.random`, a recording
 * `ResizeObserver`, deterministic object URLs and a `FileReader` whose reads
 * finish before the snapshot after the step that started them.
 *
 * Every framework adapter runs its cases through the same step runner
 * (`runSteps`), so a component that resizes, reads a file or mints an object URL
 * sees exactly the same globals in every port.
 *
 * @module
 */

import type { PageRecord } from './page.js'
import type { UICase } from './spec.js'

/** What installing a case's globals hands back. */
export interface CaseGlobals {
  /** Puts back the globals the page had before the case. */
  restore(): void
}

/** Where a global may live here: `globalThis`, and `window` when it is another object. */
const globalTargets = (): object[] => {
  const targets: object[] = [globalThis]
  if (typeof window !== 'undefined' && window !== globalThis) targets.push(window)
  return targets
}

/**
 * Defines one name on `globalThis` (and `window` when it is another object) for
 * one case.
 *
 * @param name - The property (`ResizeObserver`, `FileReader`).
 * @param value - What it holds for the case.
 * @returns What puts the previous property back.
 */
function installGlobal(name: string, value: unknown): CaseGlobals {
  const targets = globalTargets()
  const previous = targets.map((target) => Object.getOwnPropertyDescriptor(target, name))
  for (const target of targets)
    Object.defineProperty(target, name, {
      configurable: true,
      enumerable: true,
      writable: true,
      value,
    })
  return {
    restore: () =>
      targets.forEach((target, index) => {
        const descriptor = previous[index]
        if (descriptor) Object.defineProperty(target, name, descriptor)
        else Reflect.deleteProperty(target, name)
      }),
  }
}

/*
 * K2 — a pinned `Math.random`.
 */

/**
 * Pins `Math.random` for one case: it returns these values in order and then
 * repeats the last one.
 *
 * @param values - The values `Math.random` returns ({@link UICase.random}).
 * @returns What puts the real `Math.random` back.
 * @throws {Error} When the case names no value (every call would be `undefined`).
 */
export function installPinnedRandom(values: number[]): CaseGlobals {
  if (values.length === 0)
    throw new Error('conformance: a case with `random` needs at least one value')
  const previous = Math.random
  let index = 0
  Math.random = (): number => {
    const value = values[Math.min(index, values.length - 1)]
    index += 1
    return value
  }
  return {
    restore: () => {
      Math.random = previous
    },
  }
}

/*
 * K6 — a recording `ResizeObserver`.
 */

/** The observers created during the running case. */
const resizeObservers = new Set<RecordingResizeObserver>()

/**
 * One `ResizeObserverEntry` for a `resize` step: the largest box is the named
 * `width` × `height`, as a browser reports one after a layout change.
 *
 * @param target - The observed element.
 * @param width - Its new width in pixels.
 * @param height - Its new height in pixels.
 * @returns The entry a callback receives.
 */
const resizeEntry = (target: Element, width: number, height: number): ResizeObserverEntry => {
  const contentRect: DOMRectReadOnly = {
    x: 0,
    y: 0,
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    toJSON: () => ({ x: 0, y: 0, width, height, top: 0, left: 0, right: width, bottom: height }),
  }
  const size: ResizeObserverSize = { inlineSize: width, blockSize: height }
  return {
    target,
    contentRect,
    borderBoxSize: [size],
    contentBoxSize: [size],
    devicePixelContentBoxSize: [size],
  }
}

/**
 * A recording `ResizeObserver`: it keeps the elements a component observes, so a
 * `resize` step can fire its callback with the geometry the step names. Nothing
 * it does is recorded as a case call: whether a component observes an element is
 * layout bookkeeping, not something a port must reproduce.
 */
class RecordingResizeObserver implements ResizeObserver {
  readonly #callback: ResizeObserverCallback
  readonly #targets = new Set<Element>()

  /**
   * Creates the observer and registers it for the running case.
   *
   * @param callback - Called with one entry per observed element a `resize` step names.
   */
  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback
    resizeObservers.add(this)
  }

  /**
   * Starts watching an element.
   *
   * @param target - The element.
   * @param _options - The box to observe (unread: every entry reports both boxes).
   */
  observe(target: Element, _options?: ResizeObserverOptions): void {
    this.#targets.add(target)
  }

  /**
   * Stops watching an element.
   *
   * @param target - The element.
   */
  unobserve(target: Element): void {
    this.#targets.delete(target)
  }

  /** Stops watching every element. */
  disconnect(): void {
    this.#targets.clear()
  }

  /**
   * Fires the callback when it observes any of these elements, with one entry
   * per observed one.
   *
   * @param elements - The elements a `resize` step's selector matched.
   * @param width - The new width in pixels.
   * @param height - The new height in pixels.
   */
  notify(elements: Element[], width: number, height: number): void {
    const entries = elements
      .filter((element) => this.#targets.has(element))
      .map((element) => resizeEntry(element, width, height))
    if (entries.length) this.#callback(entries, this)
  }
}

/**
 * Fires every recording `ResizeObserver` the running case created that watches
 * one of these elements, as a browser does when a layout change resizes them.
 *
 * @param elements - The elements matching the `resize` step's selector.
 * @param width - The new width in pixels.
 * @param height - The new height in pixels.
 */
export function notifyResize(elements: Element[], width: number, height: number): void {
  for (const observer of resizeObservers) observer.notify(elements, width, height)
}

/**
 * Installs the recording `ResizeObserver` jsdom lacks, for one case.
 *
 * @returns What removes it again.
 */
export function installResizeObserver(): CaseGlobals {
  resizeObservers.clear()
  const installed = installGlobal('ResizeObserver', RecordingResizeObserver)
  return {
    restore: () => {
      resizeObservers.clear()
      installed.restore()
    },
  }
}

/*
 * K8 — deterministic object URLs.
 */

/**
 * Installs recording `URL.createObjectURL` / `URL.revokeObjectURL` for one case.
 * The first URL it mints is `blob:conformance/1`, then `/2`, and so on, counting
 * from 1 for each case; each call is recorded (`URL.createObjectURL` with the
 * URL the component received, `URL.revokeObjectURL` with the URL it revoked), so
 * a case that shows an image differs from one that does not.
 *
 * @param record - Receives each call.
 * @returns What puts the previous statics back.
 */
export function installObjectUrls(record: PageRecord): CaseGlobals {
  const previous = (['createObjectURL', 'revokeObjectURL'] as const).map((name) =>
    Object.getOwnPropertyDescriptor(URL, name),
  )
  let count = 0
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: (): string => {
      count += 1
      const url = `blob:conformance/${count}`
      record('URL.createObjectURL', [url])
      return url
    },
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: (url: string): void => {
      record('URL.revokeObjectURL', [url])
    },
  })
  return {
    restore: () =>
      (['createObjectURL', 'revokeObjectURL'] as const).forEach((name, index) => {
        const descriptor = previous[index]
        if (descriptor) Object.defineProperty(URL, name, descriptor)
        else Reflect.deleteProperty(URL, name)
      }),
  }
}

/*
 * K11 — a `FileReader` whose reads finish within the step that starts them.
 */

/** The read formats a `FileReader` produces. */
type ReadFormat = 'dataURL' | 'arrayBuffer' | 'binaryString' | 'text'

/** The method name that asks for each format. */
const READ_METHOD: Record<ReadFormat, string> = {
  dataURL: 'readAsDataURL',
  arrayBuffer: 'readAsArrayBuffer',
  binaryString: 'readAsBinaryString',
  text: 'readAsText',
}

/** The progress events a read fires, in order. */
type ReaderEvent = 'loadstart' | 'progress' | 'load' | 'loadend' | 'abort' | 'error'

/** Where the running case's `FileReader` calls go; null outside a case. */
let readRecord: PageRecord | null = null

/**
 * What one read produces.
 *
 * @param format - The format the component asked for.
 * @param bytes - The file's bytes.
 * @param type - The file's MIME type (`application/octet-stream` when empty).
 * @returns The reader's `result`.
 */
function encodedResult(format: ReadFormat, bytes: Uint8Array, type: string): string | ArrayBuffer {
  if (format === 'arrayBuffer') {
    const buffer = new ArrayBuffer(bytes.length)
    new Uint8Array(buffer).set(bytes)
    return buffer
  }
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  if (format === 'text') return new TextDecoder().decode(bytes)
  if (format === 'binaryString') return binary
  return `data:${type};base64,${btoa(binary)}`
}

/**
 * A recording `FileReader`: jsdom's queues three tasks per read, and under the
 * kit's fake timers each `advance` / `settle` moves one of them, so a read a
 * case starts finished only after three steps. This one reads the blob's
 * already-resolved `arrayBuffer()` in a microtask, so `load` fires before the
 * snapshot after the step that called `readAsDataURL` (or `readAsArrayBuffer`),
 * whether or not the case uses fake timers. It records each read by format and
 * file (`FileReader.readAsDataURL` with `[name, type, size]`).
 */
class RecordingFileReader extends EventTarget implements FileReader {
  readonly EMPTY = 0
  readonly LOADING = 1
  readonly DONE = 2
  onabort: ((this: FileReader, event: ProgressEvent<EventTarget>) => void) | null = null
  onerror: ((this: FileReader, event: ProgressEvent<EventTarget>) => void) | null = null
  onload: ((this: FileReader, event: ProgressEvent<EventTarget>) => void) | null = null
  onloadend: ((this: FileReader, event: ProgressEvent<EventTarget>) => void) | null = null
  onloadstart: ((this: FileReader, event: ProgressEvent<EventTarget>) => void) | null = null
  onprogress: ((this: FileReader, event: ProgressEvent<EventTarget>) => void) | null = null

  #readyState: 0 | 1 | 2 = 0
  #result: string | ArrayBuffer | null = null
  #terminated = false

  /** The reader's state: 0 empty, 1 loading, 2 done. */
  get readyState(): 0 | 1 | 2 {
    return this.#readyState
  }

  /** The bytes read, in the format asked for, or null while loading. */
  get result(): string | ArrayBuffer | null {
    return this.#result
  }

  /** The read's error (a read of a blob in memory never fails). */
  get error(): DOMException | null {
    return null
  }

  /**
   * Stops a read in progress.
   */
  abort(): void {
    if (this.#readyState !== this.LOADING) return
    this.#readyState = this.DONE
    this.#result = null
    this.#terminated = true
    this.#fire('abort', 0, 0)
    this.#fire('loadend', 0, 0)
  }

  /**
   * Reads a blob as an `ArrayBuffer`.
   *
   * @param blob - The blob (or file).
   */
  readAsArrayBuffer(blob: Blob): void {
    this.#read(blob, 'arrayBuffer')
  }

  /**
   * Reads a blob as a binary string.
   *
   * @param blob - The blob (or file).
   */
  readAsBinaryString(blob: Blob): void {
    this.#read(blob, 'binaryString')
  }

  /**
   * Reads a blob as a `data:` URL.
   *
   * @param blob - The blob (or file).
   */
  readAsDataURL(blob: Blob): void {
    this.#read(blob, 'dataURL')
  }

  /**
   * Reads a blob as text.
   *
   * @param blob - The blob (or file).
   * @param _encoding - The text encoding (unread: always UTF-8).
   */
  readAsText(blob: Blob, _encoding?: string): void {
    this.#read(blob, 'text')
  }

  /**
   * Reads one blob into the format asked for, in a microtask.
   *
   * @param blob - The blob (or file).
   * @param format - What `result` should hold.
   */
  #read(blob: Blob, format: ReadFormat): void {
    if (this.#readyState === this.LOADING)
      throw new Error('conformance: a FileReader cannot read while it is already reading')
    this.#readyState = this.LOADING
    this.#result = null
    this.#terminated = false
    const name = blob instanceof File ? blob.name : ''
    const type = blob.type || 'application/octet-stream'
    readRecord?.(`FileReader.${READ_METHOD[format]}`, [name, blob.type, blob.size])
    void blob.arrayBuffer().then((buffer) => {
      if (this.#terminated) {
        this.#terminated = false
        return
      }
      const bytes = new Uint8Array(buffer)
      this.#fire('loadstart', 0, bytes.length)
      if (bytes.length) this.#fire('progress', bytes.length, bytes.length)
      this.#result = encodedResult(format, bytes, type)
      this.#readyState = this.DONE
      this.#fire('load', bytes.length, bytes.length)
      this.#fire('loadend', bytes.length, bytes.length)
    })
  }

  /**
   * Dispatches one event, then calls the matching `on…` handler (a listener and
   * the property both fire, as a browser's do).
   *
   * @param type - The event type.
   * @param loaded - Bytes loaded so far.
   * @param total - The blob's size in bytes.
   */
  #fire(type: ReaderEvent, loaded: number, total: number): void {
    const event = new ProgressEvent(type, { lengthComputable: total > 0, loaded, total })
    this.dispatchEvent(event)
    const handlers: Record<
      ReaderEvent,
      ((this: FileReader, event: ProgressEvent<EventTarget>) => void) | null
    > = {
      loadstart: this.onloadstart,
      progress: this.onprogress,
      load: this.onload,
      loadend: this.onloadend,
      abort: this.onabort,
      error: this.onerror,
    }
    handlers[type]?.call(this, event)
  }
}

/**
 * Installs the recording `FileReader` for one case: its reads resolve in a
 * microtask, so the snapshot after the step that started a read shows the
 * result under fake timers too.
 *
 * @param record - Receives each read.
 * @returns What removes it again.
 */
export function installFileReader(record: PageRecord): CaseGlobals {
  readRecord = record
  const installed = installGlobal('FileReader', RecordingFileReader)
  return {
    restore: () => {
      readRecord = null
      installed.restore()
    },
  }
}

/**
 * Installs every global the kit replaces for one case ({@link UICase.random}, the
 * recording `ResizeObserver`, the deterministic object URLs and the recording
 * `FileReader`).
 *
 * @param testCase - The case about to run.
 * @param record - Receives the object-URL and file-read calls.
 * @returns What puts the previous globals back.
 */
export function installCaseGlobals(testCase: UICase, record: PageRecord): CaseGlobals {
  const installed = [
    testCase.random ? installPinnedRandom(testCase.random) : null,
    installResizeObserver(),
    installObjectUrls(record),
    installFileReader(record),
  ].filter((entry): entry is CaseGlobals => entry !== null)
  return {
    restore: () => {
      for (const entry of installed.reverse()) entry.restore()
    },
  }
}
