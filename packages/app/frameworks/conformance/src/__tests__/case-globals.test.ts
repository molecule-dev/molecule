/**
 * The globals the step runner installs for a case: a pinned `Math.random` (K2),
 * an in-memory `sessionStorage` seeded and recorded like `localStorage` (K5), a
 * recording `ResizeObserver` driven by `resize` steps (K6), `isComposing` /
 * `keyCode` on a `keydown` step (K7), file sizes and deterministic object URLs
 * (K8), and a `FileReader` whose reads finish within the step that starts them
 * under fake timers (K11).
 *
 * A plain DOM "component" stands in for a framework here.
 *
 * @module
 */

import '../ui/setup.js'
import { describe, expect, it } from 'vitest'

import { CallRecorder, type MountedCase, runSteps, settle, type UICase } from '../ui/index.js'

/** The `ResizeObserver` and `FileReader` the environment had before any case ran. */
const ORIGINAL_RESIZE_OBSERVER = globalThis.ResizeObserver
const ORIGINAL_FILE_READER = globalThis.FileReader
/** The object-URL statics the environment had before any case ran. */
const ORIGINAL_CREATE_OBJECT_URL = URL.createObjectURL
const ORIGINAL_REVOKE_OBJECT_URL = URL.revokeObjectURL

/**
 * Mounts a DOM tree built by `build`, which may add listeners; `teardown` removes them.
 *
 * @param build - Builds the tree into the container and returns its teardown.
 * @returns The mount function {@link runSteps} takes.
 */
const domComponent =
  (build: (container: HTMLElement) => () => void) =>
  async (container: HTMLElement): Promise<MountedCase> => {
    const teardown = build(container)
    return {
      flush: settle,
      setProps: async () => undefined,
      location: () => '/page',
      navigate: () => undefined,
      unmount: async () => {
        teardown()
        container.replaceChildren()
      },
    }
  }

/**
 * Runs one case against a DOM component.
 *
 * @param testCase - The case.
 * @param build - The component's tree and listeners.
 * @returns The case's readable snapshots and calls.
 */
const run = async (testCase: UICase, build: (container: HTMLElement) => () => void) => {
  const result = await runSteps(testCase, domComponent(build), new CallRecorder())
  return { readable: result.readable ?? [], calls: result.calls }
}

/**
 * A paragraph whose text a test sets.
 *
 * @param container - Where it goes.
 * @returns The paragraph.
 */
const paragraph = (container: HTMLElement): HTMLParagraphElement => {
  const p = document.createElement('p')
  container.appendChild(p)
  return p
}

describe('a pinned Math.random (K2)', () => {
  it('returns the case values in order, then repeats the last one', async () => {
    const { readable } = await run({ name: 'pinned', random: [0.25, 0.75] }, (container) => {
      paragraph(container).textContent = [1, 2, 3, 4].map(() => Math.random()).join(',')
      return () => undefined
    })
    expect(readable[0]).toContain('0.25,0.75,0.75,0.75')
  })

  it('puts the real Math.random back after the case', async () => {
    const real = Math.random
    await run({ name: 'pinned', random: [0.5] }, (container) => {
      paragraph(container).textContent = String(Math.random())
      return () => undefined
    })
    expect(Math.random).toBe(real)
  })

  it('puts it back too when mount throws', async () => {
    const real = Math.random
    const failing = async (): Promise<MountedCase> => {
      throw new Error('mount failed')
    }
    await expect(
      runSteps({ name: 'throws', random: [0.5] }, failing, new CallRecorder()),
    ).rejects.toThrow('mount failed')
    expect(Math.random).toBe(real)
  })

  it('refuses a case that names no value', async () => {
    await expect(
      run({ name: 'empty', random: [] }, (container) => {
        paragraph(container)
        return () => undefined
      }),
    ).rejects.toThrow('a case with `random` needs at least one value')
  })

  it('leaves Math.random alone for a case without the field', async () => {
    const sentinel = (): number => 0.123
    const real = Math.random
    Math.random = sentinel
    try {
      const { readable } = await run({ name: 'unpinned' }, (container) => {
        paragraph(container).textContent = String(Math.random())
        return () => undefined
      })
      expect(readable[0]).toContain('0.123')
      expect(Math.random).toBe(sentinel)
    } finally {
      Math.random = real
    }
  })
})

describe('sessionStorage (K5)', () => {
  it('seeds every case from its window context and records what is left when it ends', async () => {
    const { readable, calls } = await run(
      { name: 'seeded', context: { window: { sessionStorage: { token: 'abc' } } } },
      (container) => {
        paragraph(container).textContent = sessionStorage.getItem('token') ?? 'none'
        sessionStorage.setItem('seen', '1')
        return () => undefined
      },
    )
    expect(readable[0]).toContain('abc')
    expect(calls).toContainEqual({ name: 'sessionStorage', args: [{ seen: '1', token: 'abc' }] })
  })

  it('gives a case without a seed an empty storage and records nothing', async () => {
    const { readable, calls } = await run({ name: 'empty' }, (container) => {
      paragraph(container).textContent =
        `${sessionStorage.length} ${sessionStorage.getItem('seen')}`
      return () => undefined
    })
    expect(readable[0]).toContain('0 null')
    expect(calls).toEqual([])
  })

  it('clears what an earlier case wrote', async () => {
    await run({ name: 'writes' }, (container) => {
      paragraph(container)
      sessionStorage.setItem('leak', '1')
      return () => undefined
    })
    const { readable } = await run({ name: 'empty' }, (container) => {
      paragraph(container).textContent =
        `${sessionStorage.length} ${sessionStorage.getItem('leak')}`
      return () => undefined
    })
    expect(readable[0]).toContain('0 null')
  })

  it('puts the page sessionStorage back after the case', async () => {
    const before = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
    await run({ name: 'writes' }, (container) => {
      paragraph(container)
      sessionStorage.setItem('leak', '1')
      return () => undefined
    })
    const after = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
    expect(after).toEqual(before)
  })
})

describe('resize steps (K6)', () => {
  /**
   * A box one `ResizeObserver` watches; clicking it stops watching.
   *
   * @param log - Receives one line per fired callback.
   * @returns The DOM component's builder.
   */
  const observing =
    (log: string[]) =>
    (container: HTMLElement): (() => void) => {
      const box = document.createElement('div')
      box.setAttribute('data-box', '')
      const p = paragraph(container)
      const observer = new ResizeObserver((entries) => {
        const line = entries
          .map(
            (entry) =>
              `${entry.target === box}:${entry.contentRect.width}x${entry.contentRect.height}`,
          )
          .join('|')
        log.push(line)
        p.textContent = log.join('; ')
      })
      box.addEventListener('click', () => observer.unobserve(box))
      observer.observe(box)
      container.appendChild(box)
      return () => observer.disconnect()
    }

  it('fires the callback of an observer watching the matched element', async () => {
    const log: string[] = []
    const { readable } = await run(
      {
        name: 'resized',
        interactions: [{ type: 'resize', selector: '[data-box]', width: 320, height: 200 }],
      },
      observing(log),
    )
    expect(readable[1]).toContain('true:320x200')
  })

  it('stops firing after unobserve', async () => {
    const log: string[] = []
    const { readable } = await run(
      {
        name: 'unobserved',
        interactions: [
          { type: 'resize', selector: '[data-box]', width: 320, height: 200 },
          { type: 'click', selector: '[data-box]' },
          { type: 'resize', selector: '[data-box]', width: 640, height: 400 },
        ],
      },
      observing(log),
    )
    expect(readable[1]).toContain('true:320x200')
    expect(readable[3]).toContain('true:320x200')
    expect(readable[3]).not.toContain('640')
  })

  it('defaults a size the step omits to 0', async () => {
    const log: string[] = []
    const { readable } = await run(
      { name: 'no size', interactions: [{ type: 'resize', selector: '[data-box]' }] },
      observing(log),
    )
    expect(readable[1]).toContain('true:0x0')
  })

  it('fails a resize step that matches no element', async () => {
    await expect(
      run(
        { name: 'no element', interactions: [{ type: 'resize', selector: '[data-none]' }] },
        observing([]),
      ),
    ).rejects.toThrow('resize: no element matches [data-none]')
  })

  it('removes the ResizeObserver again after the case', async () => {
    await run(
      { name: 'resized', interactions: [{ type: 'resize', selector: '[data-box]' }] },
      observing([]),
    )
    expect(globalThis.ResizeObserver).toBe(ORIGINAL_RESIZE_OBSERVER)
  })
})

describe('keydown composition and legacy keyCode (K7)', () => {
  /**
   * A text field that shows the last key event it saw.
   *
   * @param container - Where the field goes.
   * @returns The teardown.
   */
  const keyReporter = (container: HTMLElement): (() => void) => {
    const field = document.createElement('input')
    const p = paragraph(container)
    field.addEventListener('keydown', (event) => {
      p.textContent = `${event.key} composing=${event.isComposing} keyCode=${event.keyCode}`
    })
    container.appendChild(field)
    return () => undefined
  }

  it('passes isComposing and keyCode into the dispatched event', async () => {
    const { readable } = await run(
      {
        name: 'composing',
        interactions: [
          { type: 'keydown', selector: 'input', key: 'Enter', isComposing: true, keyCode: 229 },
        ],
      },
      keyReporter,
    )
    expect(readable[1]).toContain('Enter composing=true keyCode=229')
  })

  it('defaults isComposing to false and leaves keyCode at 0', async () => {
    const { readable } = await run(
      { name: 'plain', interactions: [{ type: 'keydown', selector: 'input', key: 'Escape' }] },
      keyReporter,
    )
    expect(readable[1]).toContain('Escape composing=false keyCode=0')
  })
})

describe('file sizes and object URLs (K8)', () => {
  /**
   * A drop zone that shows the sizes of the files dropped on it.
   *
   * @param container - Where the zone goes.
   * @returns The teardown.
   */
  const sizeReporter = (container: HTMLElement): (() => void) => {
    const zone = document.createElement('div')
    zone.setAttribute('data-zone', '')
    const p = paragraph(container)
    zone.addEventListener('drop', (event) => {
      const files = Array.from(event.dataTransfer?.files ?? [])
      p.textContent = files.map((file) => `${file.name}:${file.size}`).join(',')
    })
    container.appendChild(zone)
    return () => undefined
  }

  it('reports the size a file entry names, defaulting to its content length', async () => {
    const { readable } = await run(
      {
        name: 'sizes',
        interactions: [
          {
            type: 'transfer',
            selector: '[data-zone]',
            event: 'drop',
            files: [
              { name: 'a.txt', type: 'text/plain', content: 'abcd' },
              { name: 'b.bin', type: 'application/octet-stream', content: 'x', size: 2048 },
            ],
          },
        ],
      },
      sizeReporter,
    )
    expect(readable[1]).toContain('a.txt:4,b.bin:2048')
  })

  /**
   * A button that mints and revokes one object URL.
   *
   * @param container - Where the button goes.
   * @returns The teardown.
   */
  const urlMinter = (container: HTMLElement): (() => void) => {
    const button = document.createElement('button')
    const p = paragraph(container)
    button.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob(['x']))
      URL.revokeObjectURL(url)
      p.textContent = url
    })
    container.appendChild(button)
    return () => undefined
  }

  it('mints deterministic object URLs and records each call', async () => {
    const { readable, calls } = await run(
      {
        name: 'mints',
        interactions: [
          { type: 'click', selector: 'button' },
          { type: 'click', selector: 'button' },
        ],
      },
      urlMinter,
    )
    expect(readable[1]).toContain('blob:conformance/1')
    expect(readable[2]).toContain('blob:conformance/2')
    expect(calls).toContainEqual({ name: 'URL.createObjectURL', args: ['blob:conformance/1'] })
    expect(calls).toContainEqual({ name: 'URL.revokeObjectURL', args: ['blob:conformance/1'] })
    expect(calls).toContainEqual({ name: 'URL.createObjectURL', args: ['blob:conformance/2'] })
  })

  it('counts from 1 again in the next case', async () => {
    const { readable } = await run(
      { name: 'mints', interactions: [{ type: 'click', selector: 'button' }] },
      urlMinter,
    )
    expect(readable[1]).toContain('blob:conformance/1')
  })

  it('puts the object-URL statics back after the case', async () => {
    await run({ name: 'mints', interactions: [{ type: 'click', selector: 'button' }] }, urlMinter)
    expect(URL.createObjectURL).toBe(ORIGINAL_CREATE_OBJECT_URL)
    expect(URL.revokeObjectURL).toBe(ORIGINAL_REVOKE_OBJECT_URL)
  })
})

describe('FileReader under fake timers (K11)', () => {
  /**
   * A drop zone that reads the dropped file the way a chat composer does.
   *
   * @param readAs - The read method to call.
   * @param show - Turns the reader's result into the paragraph's text.
   * @returns The DOM component's builder.
   */
  const reader =
    (readAs: 'dataURL' | 'arrayBuffer', show: (result: string | ArrayBuffer | null) => string) =>
    (container: HTMLElement): (() => void) => {
      const zone = document.createElement('div')
      zone.setAttribute('data-zone', '')
      const p = paragraph(container)
      zone.addEventListener('drop', (event) => {
        const file = event.dataTransfer?.files?.[0]
        if (!file) return
        const instance = new FileReader()
        instance.onload = () => {
          p.textContent = show(instance.result)
        }
        if (readAs === 'dataURL') instance.readAsDataURL(file)
        else instance.readAsArrayBuffer(file)
      })
      container.appendChild(zone)
      return () => undefined
    }

  const drop: UICase['interactions'] = [
    {
      type: 'transfer',
      selector: '[data-zone]',
      event: 'drop',
      files: [{ name: 'a.txt', type: 'text/plain', content: 'abc' }],
    },
  ]

  it('finishes a read started in a step before the snapshot after it', async () => {
    const { readable, calls } = await run(
      { name: 'reads', fakeTimers: true, interactions: drop },
      reader('dataURL', (result) => String(result)),
    )
    expect(readable[1]).toContain('data:text/plain;base64,YWJj')
    expect(calls).toContainEqual({
      name: 'FileReader.readAsDataURL',
      args: ['a.txt', 'text/plain', 3],
    })
  })

  it('finishes readAsArrayBuffer the same way', async () => {
    const { readable } = await run(
      { name: 'buffer', fakeTimers: true, interactions: drop },
      reader('arrayBuffer', (result) =>
        typeof result === 'string' ? '-1' : `${result?.byteLength ?? -1}`,
      ),
    )
    expect(readable[1]).toContain('3')
  })

  it('removes the recording FileReader again after the case', async () => {
    await run({ name: 'reads', fakeTimers: true, interactions: drop }, reader('dataURL', String))
    expect(globalThis.FileReader).toBe(ORIGINAL_FILE_READER)
  })
})
