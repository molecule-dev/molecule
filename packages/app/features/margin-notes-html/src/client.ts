/**
 * Makes every rendered layout on the page interactive: the switches show and
 * hide their kind (desktop and phone switches stay in step), hovering or
 * focusing a block emphasises its notes and hovering a note tints the blocks
 * it covers, notes line up with the first line they cover, and on a phone the
 * bottom panel follows the section being read and a tap on a block pins its
 * notes (a second tap, or "Hide notes", lets go). Safe to call more than once.
 *
 * This function is self-contained (no imports, no module state), so
 * {@link marginNotesScript} ships it to the browser as a plain string.
 *
 * @param doc - The document to attach to (default: the global `document`).
 */
export function attachMarginNotes(doc: Document = document): void {
  const win = doc.defaultView
  if (!win) return
  const READING_LINE = 0.35
  const roots = Array.from(doc.querySelectorAll<HTMLElement>('[data-mn-root][data-mn-has-notes]'))
  for (const root of roots) {
    if (root.hasAttribute('data-mn-attached')) continue
    root.setAttribute('data-mn-attached', '')
    const words = (s: string | null): string[] => (s ?? '').split(' ').filter(Boolean)
    const kinds = words(root.getAttribute('data-mn-kinds'))
    const tapKinds = new Set(words(root.getAttribute('data-mn-tap-kinds')))
    const switches = Array.from(doc.querySelectorAll<HTMLElement>('[data-mn-switch]')).filter(
      (el) => el.getAttribute('data-mn-for') === root.id,
    )
    const shown = new Set<string>()
    for (const kind of kinds) {
      const first = switches.find((s) => s.getAttribute('data-mn-kind') === kind)
      if (!first || first.getAttribute('aria-checked') === 'true') shown.add(kind)
    }
    const gutterNotes = Array.from(root.querySelectorAll<HTMLElement>('[data-mn-where="gutter"]'))
    const panelNotes = Array.from(root.querySelectorAll<HTMLElement>('[data-mn-where="panel"]'))
    const panelById = new Map(panelNotes.map((n) => [n.getAttribute('data-mn-note') ?? '', n]))
    const blocks = Array.from(root.querySelectorAll<HTMLElement>('[data-mn-block][data-mn-notes]'))
    const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-mn-row]'))
    const panel = root.querySelector<HTMLElement>('[data-mn-panel]')
    const bar = root.querySelector<HTMLElement>('[data-mn-bar]')
    const dismiss = root.querySelector<HTMLElement>('[data-mn-dismiss]')
    const kindOf = (id: string): string => panelById.get(id)?.getAttribute('data-mn-kind') ?? ''
    const isShown = (kind: string): boolean => !kinds.includes(kind) || shown.has(kind)
    let pinned: HTMLElement | null = null
    let reading: HTMLElement | null = rows[0] ?? null

    const render = (): void => {
      for (const note of gutterNotes)
        note.hidden = !isShown(note.getAttribute('data-mn-kind') ?? '')
      for (const sw of switches) {
        sw.setAttribute('aria-checked', String(shown.has(sw.getAttribute('data-mn-kind') ?? '')))
      }
      const ids = pinned
        ? words(pinned.getAttribute('data-mn-notes'))
        : words(reading?.getAttribute('data-mn-row-notes') ?? '').filter(
            (id) => !tapKinds.has(kindOf(id)),
          )
      const visible = new Set(
        ids.filter((id) => {
          const kind = kindOf(id)
          return isShown(kind) || (pinned !== null && tapKinds.has(kind))
        }),
      )
      for (const [id, note] of panelById) note.hidden = !visible.has(id)
      if (panel) panel.toggleAttribute('data-mn-open', visible.size > 0)
      if (dismiss) dismiss.hidden = pinned === null
      for (const b of blocks) b.toggleAttribute('data-mn-pinned', b === pinned)
      if (bar) {
        // Room below the text for the bar and the open panel, so the last line clears it.
        win.requestAnimationFrame(() => {
          root.style.setProperty('--mn-bar-space', `${bar.offsetHeight + 16}px`)
        })
      }
    }

    for (const sw of switches) {
      sw.addEventListener('click', () => {
        const kind = sw.getAttribute('data-mn-kind') ?? ''
        if (shown.has(kind)) shown.delete(kind)
        else shown.add(kind)
        render()
      })
    }

    // The two-way relationship: a block emphasises its notes; a note tints its blocks.
    const setEmphasis = (ids: string[], on: boolean): void => {
      for (const note of gutterNotes) {
        if (ids.includes(note.getAttribute('data-mn-note') ?? '')) {
          note.toggleAttribute('data-mn-emphasis', on)
        }
      }
    }
    for (const block of blocks) {
      const ids = words(block.getAttribute('data-mn-notes'))
      const enter = (): void => setEmphasis(ids, true)
      const leave = (): void => setEmphasis(ids, false)
      block.addEventListener('mouseenter', enter)
      block.addEventListener('mouseleave', leave)
      block.addEventListener('focus', enter)
      block.addEventListener('blur', leave)
      block.addEventListener('click', (event) => {
        if ((event.target as Element | null)?.closest('a, button, input, select, textarea')) return
        pinned = pinned === block ? null : block
        render()
      })
      block.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        pinned = pinned === block ? null : block
        render()
      })
    }
    for (const note of gutterNotes) {
      const id = note.getAttribute('data-mn-note') ?? ''
      const tint = (on: boolean): void => {
        const accent = note.style.getPropertyValue('--mn-note-accent')
        for (const block of blocks) {
          if (!words(block.getAttribute('data-mn-notes')).includes(id)) continue
          block.toggleAttribute('data-mn-tint', on)
          if (on && accent) block.style.setProperty('--mn-tint-color', accent)
        }
      }
      note.addEventListener('mouseenter', () => tint(true))
      note.addEventListener('mouseleave', () => tint(false))
      note.addEventListener('focus', () => tint(true))
      note.addEventListener('blur', () => tint(false))
    }
    dismiss?.addEventListener('click', () => {
      pinned = null
      render()
    })

    // Phone: the section being read is the last row whose top has passed the
    // reading line — measured from positions each time, so a jump to the end
    // lands on the last section, not on the last one an event happened to see.
    let frame = 0
    const read = (): void => {
      frame = 0
      const line = win.innerHeight * READING_LINE
      let current: HTMLElement | null = rows[0] ?? null
      for (const row of rows) {
        if (row.getBoundingClientRect().top > line) break
        current = row
      }
      if (current !== reading) {
        reading = current
        if (!pinned) render()
      }
    }
    const schedule = (): void => {
      if (!frame) frame = win.requestAnimationFrame(read)
    }

    // A row that opens on a heading starts its text below the row's top; push
    // the notes down by the same distance so a note lines up with the first
    // line it covers, not the margin above it.
    const align = (): void => {
      for (const row of rows) {
        const sticky = row.querySelector<HTMLElement>('[data-mn-sticky]')
        const first = row.querySelector<HTMLElement>('[data-mn-block]')
        if (!sticky || !first) continue
        const target =
          (first.querySelector(':scope > :not([data-mn-mark])') as HTMLElement | null) ?? first
        const offset = Math.max(
          0,
          Math.round(target.getBoundingClientRect().top - row.getBoundingClientRect().top),
        )
        sticky.style.setProperty('--mn-offset', `${offset}px`)
      }
    }

    win.addEventListener('scroll', schedule, { passive: true })
    win.addEventListener('resize', () => {
      schedule()
      align()
    })
    align()
    ;(doc as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready?.then(align, align)
    read()
    render()
  }
}

/**
 * The browser script: {@link attachMarginNotes} as a string that runs itself.
 * Put it in the page once (see {@link marginNotesScriptTag}) or in your own
 * bundle; it attaches to every layout on the page when it runs, so place it
 * after the layout (end of `<body>`), or give the tag `defer`.
 */
export const marginNotesScript = `(${attachMarginNotes.toString()})(document);`

/**
 * The browser script as a `<script>` element.
 *
 * @returns `<script>…</script>`.
 */
export function marginNotesScriptTag(): string {
  return `<script data-mn-script>${marginNotesScript}</script>`
}
