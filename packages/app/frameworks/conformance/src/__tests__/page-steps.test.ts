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

import { getProvider as getI18nProvider } from '@molecule/app-i18n'

import { CallRecorder, type MountedCase, runSteps, settle, type UICase } from '../ui/index.js'
import { pinCaseTimeZone, resetCasePage } from '../ui/page.js'

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

describe('locales', () => {
  /**
   * A paragraph showing the current locale and the locales the provider lists,
   * kept current through the provider's change notice.
   *
   * @param container - Where it goes.
   * @returns The teardown.
   */
  const localeReadout = (container: HTMLElement): (() => void) => {
    const p = paragraph(container)
    const show = (): void => {
      const i18n = getI18nProvider()
      p.textContent = `${i18n.getLocale()} of ${i18n
        .getLocales()
        .map((l) => l.code)
        .join(',')}`
    }
    show()
    return getI18nProvider().onLocaleChange(show)
  }

  it('a case switches to any locale its translations name, for that case only', async () => {
    const { readable } = await run(
      {
        name: 'to French',
        context: { translations: { fr: {} } },
        interactions: [{ type: 'locale', locale: 'fr' }],
      },
      localeReadout,
    )
    expect(readable[0]).toContain('en of en,en-XA,fr')
    expect(readable[1]).toContain('fr of en,en-XA,fr')
    const after = await run({ name: 'no French' }, localeReadout)
    expect(after.readable[0]).toContain('en of en,en-XA\n')
  })

  it('starts a case in a locale its translations name', async () => {
    const { readable } = await run(
      { name: 'in German', context: { locale: 'de', translations: { de: {} } } },
      localeReadout,
    )
    expect(readable[0]).toContain('de of en,en-XA,de')
  })

  it('refuses a switch to a locale the case does not name, saying how to add it', async () => {
    await expect(
      run({ name: 'to French', interactions: [{ type: 'locale', locale: 'fr' }] }, localeReadout),
    ).rejects.toThrow('add `fr: {}`')
  })
})

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

  it('counts rows inside a host element the snapshot leaves out, as the snapshot shows them', async () => {
    // An Angular port renders its rows inside component hosts (`data-parity-unwrap`): 12 rows
    // in 3 hosts are still 12 rows of 100px, so a scroll to the bottom reaches 800.
    const { readable } = await run(
      {
        name: 'hosted rows',
        layout: [{ selector: '[role="log"]', childHeight: 100, clientHeight: 400, scrollTop: 0 }],
        interactions: [{ type: 'click', selector: 'button' }],
      },
      (container) => {
        const log = document.createElement('div')
        log.setAttribute('role', 'log')
        for (let host = 0; host < 3; host++) {
          const wrapper = document.createElement('div')
          wrapper.setAttribute('data-parity-unwrap', '')
          for (let i = 0; i < 4; i++) wrapper.appendChild(document.createElement('p'))
          log.appendChild(wrapper)
        }
        const bottom = document.createElement('button')
        bottom.textContent = 'bottom'
        bottom.addEventListener('click', () => log.scrollTo({ top: log.scrollHeight }))
        container.append(log, bottom)
        return () => undefined
      },
    )
    expect(readable[1]).toContain('@scroll [role="log"] 800')
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

describe('cues steps', () => {
  /**
   * A captions line fed by a `<track>`'s text track, the way a player with its
   * own controls shows captions.
   *
   * @param enable - Whether the component sets the track's mode to `hidden`.
   * @param on - Where it listens: the text track, or the `<track>` element.
   * @returns The DOM component's builder.
   */
  const captions =
    (enable: boolean, on: 'track' | 'element') =>
    (container: HTMLElement): (() => void) => {
      const audio = document.createElement('audio')
      const el = document.createElement('track')
      el.setAttribute('kind', 'captions')
      el.setAttribute('srclang', 'en')
      audio.appendChild(el)
      container.appendChild(audio)
      const p = paragraph(container)
      const track = el.track
      if (enable) track.mode = 'hidden'
      const show = (): void => {
        const cues = track.activeCues ? Array.from(track.activeCues) : []
        p.textContent = `${track.language}: [${cues.map((cue) => ('text' in cue ? cue.text : '')).join(' / ')}]`
      }
      const target: EventTarget = on === 'track' ? track : el
      target.addEventListener('cuechange', show)
      return () => target.removeEventListener('cuechange', show)
    }

  const steps: UICase = {
    name: 'captions',
    interactions: [
      { type: 'cues', selector: 'track', cues: ['Hello there.'] },
      { type: 'cues', selector: 'track', cues: ['Two', 'cues'] },
      { type: 'cues', selector: 'track', cues: [] },
    ],
  }

  it('fires cuechange at the text track and at the element, with the active cues', async () => {
    for (const on of ['track', 'element'] as const) {
      const { readable } = await run(steps, captions(true, on))
      expect(readable[1]).toContain('en: [Hello there.]')
      expect(readable[2]).toContain('en: [Two / cues]')
      expect(readable[3]).toContain('en: []')
    }
  })

  it('reports nothing while the component leaves the track disabled, as a browser does', async () => {
    const { readable } = await run(steps, captions(false, 'track'))
    expect(readable[1]).toContain('idle')
    expect(readable[1]).not.toContain('Hello')
  })

  it('fails a cues step whose selector is not a <track>', async () => {
    await expect(
      run(
        { name: 'wrong', interactions: [{ type: 'cues', selector: 'p', cues: ['x'] }] },
        captions(true, 'track'),
      ),
    ).rejects.toThrow('matched a <p>, not a <track>')
  })
})

describe('the scroll step', () => {
  /**
   * A log of ten rows whose text says where a scroll listener found it.
   *
   * @param container - Where it goes.
   * @returns The teardown.
   */
  const scrolledLog = (container: HTMLElement): (() => void) => {
    const log = document.createElement('div')
    log.setAttribute('role', 'log')
    for (let i = 0; i < 10; i++) log.appendChild(document.createElement('div'))
    container.appendChild(log)
    const p = paragraph(container)
    p.textContent = 'not scrolled'
    const onScroll = (): void => {
      p.textContent = `scrolled to ${log.scrollTop}`
    }
    log.addEventListener('scroll', onScroll)
    return () => log.removeEventListener('scroll', onScroll)
  }
  const layout = [{ selector: '[role="log"]', childHeight: 100, clientHeight: 400, scrollTop: 600 }]

  it('moves a stubbed element and fires scroll at it, kept within the content', async () => {
    const { readable } = await run(
      {
        name: 'scroll',
        layout,
        interactions: [
          { type: 'scroll', selector: '[role="log"]', top: 0 },
          { type: 'scroll', selector: '[role="log"]', top: 5000 },
        ],
      },
      scrolledLog,
    )
    expect(readable[0]).toContain('not scrolled')
    expect(readable[1]).toContain('scrolled to 0')
    expect(readable[2]).toContain('scrolled to 600')
  })

  it('fails on an element without a scrollTop stub, which jsdom would leave at 0', async () => {
    await expect(
      run(
        { name: 'unstubbed', interactions: [{ type: 'scroll', selector: '[role="log"]', top: 0 }] },
        scrolledLog,
      ),
    ).rejects.toThrow('has no layout stub with a scrollTop')
  })
})

describe('the windowFocus step', () => {
  /**
   * A paragraph showing `document.hasFocus()` whenever the window gains or loses focus.
   *
   * @param container - Where it goes.
   * @returns The teardown.
   */
  const focusReport = (container: HTMLElement): (() => void) => {
    const p = paragraph(container)
    const show = (event?: Event): void => {
      p.textContent = `${event?.type ?? 'start'}: ${document.hasFocus()}`
    }
    show()
    window.addEventListener('blur', show)
    window.addEventListener('focus', show)
    return () => {
      window.removeEventListener('blur', show)
      window.removeEventListener('focus', show)
    }
  }

  // Every adapter resets the page as it builds a case's services (`buildServices`); this
  // runner mounts directly, so it resets the page the same way first.
  it('makes document.hasFocus() false, then true again, firing blur and focus at the window', async () => {
    resetCasePage()
    const { readable } = await run(
      {
        name: 'away and back',
        interactions: [
          { type: 'windowFocus', focused: false },
          { type: 'windowFocus', focused: true },
        ],
      },
      focusReport,
    )
    expect(readable[0]).toContain('start: true')
    expect(readable[1]).toContain('blur: false')
    expect(readable[2]).toContain('focus: true')
  })

  it('starts every case focused, whatever the case before it left', async () => {
    resetCasePage()
    await run(
      { name: 'left unfocused', interactions: [{ type: 'windowFocus', focused: false }] },
      focusReport,
    )
    resetCasePage()
    const { readable } = await run({ name: 'next case', interactions: [] }, focusReport)
    expect(readable[0]).toContain('start: true')
  })
})
