/**
 * The page state the step runner gives a case: `localStorage` (seeded, recorded,
 * written from another tab), the pointer `matchMedia` reports, layout geometry
 * with `@scroll` notes, pointer drags, paste and drag data, `message` events and a
 * recording `AudioContext`.
 *
 * A plain DOM "component" stands in for a framework here.
 *
 * @module
 */

import '../ui/setup.js'
import { describe, expect, it } from 'vitest'

import { CallRecorder, type MountedCase, runSteps, settle, type UICase } from '../ui/index.js'
import { pinCaseTimeZone } from '../ui/page.js'

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
  p.textContent = 'idle'
  container.appendChild(p)
  return p
}

describe('time zone', () => {
  const noonUtc = new Date(Date.UTC(2026, 4, 13, 12))
  const time = (): string =>
    new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(noonUtc)

  it('is UTC from the moment the kit loads', () => {
    expect(process.env.TZ).toBe('UTC')
    expect(time()).toBe('12:00 PM')
  })

  it('formats a case in UTC even when the zone moved before it', async () => {
    try {
      process.env.TZ = 'Europe/Tallinn'
      expect(time()).toBe('3:00 PM')
      const { readable } = await run({ name: 'a formatted time' }, (container) => {
        paragraph(container).textContent = time()
        return () => undefined
      })
      expect(JSON.stringify(readable[0])).toContain('12:00 PM')
    } finally {
      pinCaseTimeZone()
    }
  })
})

describe('localStorage', () => {
  it('seeds every case from its window context and records what is left when it ends', async () => {
    const { readable, calls } = await run(
      { name: 'seeded', context: { window: { localStorage: { theme: 'dark' } } } },
      (container) => {
        paragraph(container).textContent = localStorage.getItem('theme') ?? 'none'
        localStorage.setItem('seen', '1')
        return () => undefined
      },
    )
    expect(readable[0]).toContain('dark')
    expect(calls).toContainEqual({ name: 'localStorage', args: [{ seen: '1', theme: 'dark' }] })
  })

  it('gives a case without a seed an empty storage and records nothing', async () => {
    const { readable, calls } = await run({ name: 'empty' }, (container) => {
      paragraph(container).textContent = `${localStorage.length} ${localStorage.getItem('seen')}`
      return () => undefined
    })
    expect(readable[0]).toContain('0 null')
    expect(calls).toEqual([])
  })

  it('writes from another tab and fires the storage event', async () => {
    const { readable, calls } = await run(
      {
        name: 'other tab',
        context: { window: { localStorage: {} } },
        interactions: [
          { type: 'localStorage', key: 'theme', value: 'light' },
          { type: 'localStorage', key: 'theme', value: null },
        ],
      },
      (container) => {
        const p = paragraph(container)
        const onStorage = (event: StorageEvent): void => {
          p.textContent = `${event.key} ${event.oldValue} → ${event.newValue} ${event.storageArea === localStorage}`
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
      },
    )
    expect(readable[1]).toContain('theme null → light true')
    expect(readable[2]).toContain('theme light → null true')
    expect(calls).toContainEqual({ name: 'localStorage', args: [{}] })
  })
})

describe('pointer', () => {
  const build = (container: HTMLElement): (() => void) => {
    const p = paragraph(container)
    p.textContent = ['(pointer: coarse)', '(pointer: fine)', '(hover: none)', '(any-hover: hover)']
      .map((query) => `${query}=${matchMedia(query).matches}`)
      .join(' ')
    return () => undefined
  }

  it('answers pointer and hover queries for a coarse pointer', async () => {
    const { readable } = await run({ name: 'touch', pointer: 'coarse' }, build)
    expect(readable[0]).toContain(
      '(pointer: coarse)=true (pointer: fine)=false (hover: none)=true (any-hover: hover)=false',
    )
  })

  it('answers them for a fine pointer', async () => {
    const { readable } = await run({ name: 'mouse', pointer: 'fine' }, build)
    expect(readable[0]).toContain(
      '(pointer: coarse)=false (pointer: fine)=true (hover: none)=false (any-hover: hover)=true',
    )
  })

  it('answers every one false when the case names no pointer', async () => {
    const { readable } = await run({ name: 'unset' }, build)
    expect(readable[0]).toContain(
      '(pointer: coarse)=false (pointer: fine)=false (hover: none)=false (any-hover: hover)=false',
    )
  })
})

describe('layout', () => {
  /**
   * A message list that keeps its scroll anchor when older items are prepended.
   *
   * @param container - Where it goes.
   * @returns The teardown.
   */
  const anchoredList = (container: HTMLElement): (() => void) => {
    const log = document.createElement('div')
    log.setAttribute('role', 'log')
    for (let i = 0; i < 10; i++) log.appendChild(document.createElement('p'))
    const more = document.createElement('button')
    more.textContent = 'earlier'
    more.addEventListener('click', () => {
      const before = log.scrollHeight
      for (let i = 0; i < 5; i++) log.prepend(document.createElement('p'))
      log.scrollTop += log.scrollHeight - before
    })
    const bottom = document.createElement('button')
    bottom.textContent = 'bottom'
    bottom.addEventListener('click', () => log.scrollTo({ top: log.scrollHeight }))
    container.append(log, more, bottom)
    return () => undefined
  }

  it('grows scrollHeight with children, clamps scrollTop and notes it after each step', async () => {
    const { readable } = await run(
      {
        name: 'load earlier',
        layout: [{ selector: '[role="log"]', childHeight: 100, clientHeight: 400, scrollTop: 50 }],
        interactions: [
          { type: 'click', selector: 'button:nth-of-type(1)' },
          { type: 'click', selector: 'button:nth-of-type(2)' },
        ],
      },
      anchoredList,
    )
    expect(readable[0]).toContain('@scroll [role="log"] 50')
    // 5 children of 100px were prepended: the anchor moved down by exactly 500.
    expect(readable[1]).toContain('@scroll [role="log"] 550')
    // 15 children, 400px visible: the furthest a browser scrolls is 1100.
    expect(readable[2]).toContain('@scroll [role="log"] 1100')
  })

  it('serves a rect to getBoundingClientRect and the offset sizes', async () => {
    const { readable } = await run(
      {
        name: 'rect',
        layout: [{ selector: 'section', rect: { x: 10, y: 20, width: 300, height: 200 } }],
        interactions: [{ type: 'click', selector: 'section' }],
      },
      (container) => {
        const section = document.createElement('section')
        section.addEventListener('click', () => {
          const box = section.getBoundingClientRect()
          section.textContent = `${box.left},${box.top},${box.right},${box.bottom} ${section.offsetWidth}x${section.clientHeight}`
        })
        container.appendChild(section)
        return () => undefined
      },
    )
    expect(readable[1]).toContain('10,20,310,220 300x200')
  })
})

describe('pointer steps', () => {
  it('drags with coordinates, the mouse events after each, and tracks pointer capture', async () => {
    const { readable } = await run(
      {
        name: 'drag',
        interactions: [
          { type: 'pointer', selector: '[data-handle]', event: 'pointerdown', clientX: 100 },
          { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 160 },
          { type: 'pointer', selector: '[data-handle]', event: 'pointerup', clientX: 170 },
        ],
      },
      (container) => {
        const handle = document.createElement('div')
        handle.setAttribute('data-handle', '')
        const p = paragraph(container)
        const seen: string[] = []
        let start = 0
        handle.addEventListener('pointerdown', (event) => {
          start = event.clientX
          handle.setPointerCapture(event.pointerId)
          seen.push(`down ${event.button}/${event.buttons} captured=${handle.hasPointerCapture(1)}`)
          p.textContent = seen.join('; ')
        })
        const onMove = (event: PointerEvent): void => {
          seen.push(`move ${event.clientX - start} ${event.buttons}`)
          p.textContent = seen.join('; ')
        }
        const onMouse = (event: MouseEvent): void => {
          seen.push(event.type)
          p.textContent = seen.join('; ')
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('mousedown', onMouse)
        handle.addEventListener('pointerup', (event) => {
          handle.releasePointerCapture(event.pointerId)
          seen.push(`up ${event.clientX - start} captured=${handle.hasPointerCapture(1)}`)
          p.textContent = seen.join('; ')
        })
        container.appendChild(handle)
        return () => {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('mousedown', onMouse)
        }
      },
    )
    expect(readable[3]).toContain(
      'down 0/1 captured=true; mousedown; move 60 1; up 70 captured=false',
    )
  })
})

describe('transfer steps', () => {
  it('pastes files as clipboardData and notes whether the default was prevented', async () => {
    const { readable } = await run(
      {
        name: 'paste',
        interactions: [
          {
            type: 'transfer',
            selector: 'textarea',
            event: 'paste',
            files: [{ name: 'shot.png', type: 'image/png', content: 'png' }],
          },
          { type: 'transfer', selector: 'textarea', event: 'paste', data: { text: 'hello' } },
        ],
      },
      (container) => {
        const area = document.createElement('textarea')
        const p = paragraph(container)
        area.addEventListener('paste', (event) => {
          const items = Array.from(event.clipboardData?.items ?? [])
          const files = items.filter((item) => item.kind === 'file')
          p.textContent =
            files.map((item) => `${item.getAsFile()?.name} ${item.type}`).join(',') ||
            (event.clipboardData?.getData('text/plain') ?? '')
          if (files.length) event.preventDefault()
        })
        container.appendChild(area)
        return () => undefined
      },
    )
    expect(readable[1]).toContain('shot.png image/png')
    expect(readable[1]).toContain('@paste default prevented')
    expect(readable[2]).toContain('hello')
    expect(readable[2]).toContain('@paste default kept')
  })

  it('carries what dragstart wrote to the drop, and notes the dropEffect', async () => {
    const { readable } = await run(
      {
        name: 'move',
        interactions: [
          { type: 'transfer', selector: '[data-src]', event: 'dragstart', data: {} },
          { type: 'transfer', selector: '[data-dst]', event: 'dragover' },
          { type: 'transfer', selector: '[data-dst]', event: 'drop' },
        ],
      },
      (container) => {
        const src = document.createElement('div')
        src.setAttribute('data-src', '')
        src.addEventListener('dragstart', (event) => {
          event.dataTransfer?.setData('text/plain', 'a.ts\nb.ts')
          if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
        })
        const dst = document.createElement('div')
        dst.setAttribute('data-dst', '')
        dst.addEventListener('dragover', (event) => {
          event.preventDefault()
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
        })
        dst.addEventListener('drop', (event) => {
          event.preventDefault()
          dst.textContent = `dropped ${event.dataTransfer?.getData('text').split('\n').join('+')}`
        })
        container.append(src, dst)
        return () => undefined
      },
    )
    expect(readable[2]).toContain('@dragover default prevented dropEffect=move')
    expect(readable[3]).toContain('dropped a.ts+b.ts')
  })
})

describe('message steps', () => {
  it('fails a message step whose from names no iframe', async () => {
    await expect(
      run({ name: 'no frame', interactions: [{ type: 'message', from: 'p', data: {} }] }, (c) => {
        paragraph(c)
        return () => undefined
      }),
    ).rejects.toThrow('message: p has no window')
  })

  it("sets the iframe's window as the source, and reaches no listener after unmount", async () => {
    const { readable } = await run(
      {
        name: 'cleanup',
        interactions: [
          { type: 'message', from: 'iframe', origin: 'http://preview', data: { type: 'ready' } },
          { type: 'message', origin: 'http://other', data: { type: 'second' } },
          { type: 'unmount' },
          { type: 'message', data: { type: 'late' } },
        ],
      },
      (container) => {
        const frame = document.createElement('iframe')
        container.appendChild(frame)
        // Outside the container, so the snapshots after unmount still show it.
        const status = document.createElement('output')
        document.body.appendChild(status)
        const onMessage = (event: MessageEvent): void => {
          const trusted = event.source === frame.contentWindow
          status.textContent = `${event.data.type} ${event.origin} trusted=${trusted}`
        }
        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
      },
    )
    expect(readable[1]).toContain('ready http://preview trusted=true')
    expect(readable[2]).toContain('second http://other trusted=false')
    expect(readable[4]).toContain('second http://other trusted=false')
    expect(readable[4]).not.toContain('late')
  })
})

describe('audio', () => {
  /**
   * Plays one tone the way a notification sound does.
   *
   * @param container - Where its button goes.
   * @returns The teardown.
   */
  const tone = (container: HTMLElement): (() => void) => {
    const button = document.createElement('button')
    button.addEventListener('click', () => {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 660
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    })
    container.appendChild(button)
    return () => undefined
  }

  it('records every node, connection, parameter and start', async () => {
    const { calls } = await run(
      {
        name: 'tone',
        context: { window: { audio: true } },
        interactions: [{ type: 'click', selector: 'button' }],
      },
      tone,
    )
    expect(calls.map((call) => `${call.name}(${JSON.stringify(call.args)})`)).toEqual([
      'audio.createOscillator([])',
      'audio.createGain([])',
      'audio.oscillator.connect(["gain"])',
      'audio.gain.connect(["destination"])',
      'audio.oscillator.type(["sine"])',
      'audio.oscillator.frequency.value([660])',
      'audio.gain.gain.setValueAtTime([0.15,0])',
      'audio.gain.gain.exponentialRampToValueAtTime([0.001,0.15])',
      'audio.oscillator.start([0])',
      'audio.oscillator.stop([0.15])',
    ])
  })

  it('removes the AudioContext again after the case', async () => {
    await run({ name: 'tone', context: { window: { audio: true } } }, () => () => undefined)
    expect(typeof globalThis.AudioContext).toBe('undefined')
  })
})
