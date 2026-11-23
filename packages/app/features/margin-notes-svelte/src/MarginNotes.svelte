<!--
  MarginNotes: the Svelte counterpart of `@molecule/app-margin-notes-react`'s
  `MarginNotes` — long-form text with notes beside each paragraph. Desktop: a
  prose column and a narrower notes column; each note lines up with the block(s)
  it belongs to and appears once. Phone: a bar fixed to the bottom shows the
  notes for the section being read, with the kind switches in it. Same props
  (React names), same ClassMap tokens, same i18n keys, same DOM for the same
  input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Icon, Switch } from '@molecule/app-ui-svelte'

  import { buildRows, defaultShownKinds } from './rows.js'
  import { styleString } from './style.js'
  import type { MarginNote, MarginNotesProps } from './types.js'

  /** Where a phone reader's "current section" is read: this fraction down the viewport. */
  const READING_LINE = 0.35

  let {
    blocks,
    notes = [],
    kinds = [],
    markLabel,
    measure = '38rem',
    gutterWidth = '18rem',
    shownKinds,
    onShownKindsChange,
    className,
    style,
    ...rest
  }: MarginNotesProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // Every `t(…)` runs inside a `$derived` or the markup: it reads the i18n
  // version under the hood, so a locale switch re-renders it the way React's
  // render-time `t` calls re-run on a re-render.
  const pinLabel = $derived(
    t('marginNotes.aria.pin', undefined, { defaultValue: 'Pin the notes for this section' }),
  )
  // A named mark is an image named by `markLabel`; an unnamed one is
  // decorative (axe-core rejects an image with no name).
  const markNamed = $derived(typeof markLabel === 'string' && markLabel.trim().length > 0)
  const togglesLabel = $derived(
    t('marginNotes.aria.toggles', undefined, { defaultValue: 'Show or hide notes' }),
  )
  const notesLabel = $derived(t('marginNotes.aria.notes', undefined, { defaultValue: 'Notes' }))
  const panelLabel = $derived(
    t('marginNotes.aria.panel', undefined, { defaultValue: 'Notes for this section' }),
  )
  const dismissLabel = $derived(t('marginNotes.dismiss', undefined, { defaultValue: 'Hide notes' }))

  const rows = $derived(buildRows(blocks, notes))
  const notesById = $derived(new Map(notes.map((n) => [n.id, n])))
  const hasNotes = $derived(rows.some((r) => r.notes.length > 0))

  // Which kinds show. From props in the FIRST render (never an effect), so the
  // prerendered page already has the reader's defaults.
  // svelte-ignore state_referenced_locally
  let ownShown = $state<string[]>(defaultShownKinds(kinds))
  const shown = $derived(shownKinds ?? ownShown)
  const switchable = $derived(new Set(kinds.map((k) => k.id)))
  const isShown = (note: MarginNote): boolean =>
    !switchable.has(note.kind) || shown.includes(note.kind)
  const setShown = (kind: string, on: boolean): void => {
    const next = on ? [...new Set([...shown, kind])] : shown.filter((k) => k !== kind)
    if (shownKinds === undefined) ownShown = next
    onShownKindsChange?.(next)
  }

  // The two-way relationship: a hovered/focused block emphasises its notes; a
  // hovered/focused note tints the blocks it covers.
  let activeBlock = $state<string | null>(null)
  let activeNote = $state<string | null>(null)
  const activeBlockNotes = $derived(
    new Set((activeBlock ? blocks.find((x) => x.id === activeBlock) : undefined)?.noteIds ?? []),
  )

  // Phone: the section being read, and a block the reader pinned.
  const firstWithNotes = $derived(rows.find((r) => r.noteIds.length > 0)?.id ?? null)
  // svelte-ignore state_referenced_locally
  let readingRow = $state<string | null>(firstWithNotes)
  let pinnedBlock = $state<string | null>(null)
  const rowRefs: Record<string, HTMLElement> = {}

  /**
   * Tracks a row element for measurement, and drops it when the row goes.
   *
   * @param node - The row element.
   * @param id - The row's id.
   * @returns The action's lifecycle hooks.
   */
  function trackRow(node: HTMLElement, id: string): { destroy: () => void } {
    rowRefs[id] = node
    return { destroy: () => delete rowRefs[id] }
  }

  // The section being read follows scroll and resize, exactly as React's effect.
  $effect(() => {
    if (!hasNotes || typeof window === 'undefined') return
    let frame = 0
    const read = (): void => {
      frame = 0
      const line = window.innerHeight * READING_LINE
      let current: string | null = null
      for (const row of rows) {
        const el = rowRefs[row.id]
        if (!el) continue
        if (el.getBoundingClientRect().top > line) break
        if (row.noteIds.length > 0) current = row.id
      }
      readingRow = current ?? firstWithNotes
    }
    const onScroll = (): void => {
      if (!frame) frame = window.requestAnimationFrame(read)
    }
    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  })

  // A row that opens on a heading starts its text below the row's top; push
  // the notes down by the same distance (React's layout effect).
  let noteOffsets = $state<Record<string, number>>({})
  $effect(() => {
    if (!hasNotes) return
    const measureOffsets = (): void => {
      const next: Record<string, number> = {}
      for (const row of rows) {
        if (row.notes.length === 0) continue
        const rowEl = rowRefs[row.id]
        const blockEl = document.getElementById(row.blocks[0].id)
        const first = blockEl?.firstElementChild ?? blockEl
        if (!rowEl || !first) continue
        const top = first.getBoundingClientRect().top - rowEl.getBoundingClientRect().top
        const offset = Math.max(0, Math.round(top))
        if (offset) next[row.id] = offset
      }
      if (JSON.stringify(noteOffsets) !== JSON.stringify(next)) noteOffsets = next
    }
    measureOffsets()
    window.addEventListener('resize', measureOffsets)
    return () => window.removeEventListener('resize', measureOffsets)
  })

  // Kinds that reach the panel only through a block's pin (notes about one paragraph).
  const tapOnly = $derived(new Set(kinds.filter((k) => k.panel === 'tap').map((k) => k.id)))
  const panelNoteIds = $derived.by(() => {
    if (pinnedBlock) return blocks.find((b) => b.id === pinnedBlock)?.noteIds ?? []
    const ids = rows.find((r) => r.id === readingRow)?.noteIds ?? []
    // A tap kind follows the reader too once its switch is ON: turning the
    // switch on must show something on a phone, not wait for a pin.
    return ids.filter((id) => {
      const note = notesById.get(id)
      return !!note && (!tapOnly.has(note.kind) || isShown(note))
    })
  })
  // A pinned block's tap-kind notes show whatever their switch says; follow-kind
  // notes keep obeying their switch.
  const inPanel = (note: MarginNote): boolean =>
    isShown(note) || (pinnedBlock !== null && tapOnly.has(note.kind))
  const panelNotes = $derived.by(() =>
    panelNoteIds.map((id) => notesById.get(id)).filter((n): n is MarginNote => !!n && inPanel(n)),
  )

  /**
   * The outer wrapper's inline style (React's `containerStyle`).
   *
   * @returns The `style` attribute text.
   */
  const containerStyle = $derived(
    styleString({
      ...style,
      maxWidth: hasNotes ? `calc(${measure} + ${gutterWidth} + 4rem)` : measure,
    }),
  )
</script>

{#snippet switches(placement: 'side' | 'bar')}
  {#if kinds.length > 0}
    <div
      role="group"
      aria-label={togglesLabel}
      class={cm.flex({ direction: 'row', wrap: 'wrap', gap: 'md', align: 'center' })}
      data-mol-id={`margin-notes-switches-${placement}`}
    >
      {#each kinds as kind (kind.id)}
        <Switch
          label={kind.label}
          checked={shown.includes(kind.id)}
          onChange={(event) => setShown(kind.id, (event.target as HTMLInputElement).checked)}
          className={placement === 'bar' ? cm.touchTarget : cm.touchTargetCompact}
          data-mol-id={`margin-notes-switch-${placement}-${kind.id}`}
        />
      {/each}
    </div>
  {/if}
{/snippet}

{#snippet noteView(note: MarginNote, where: 'gutter' | 'panel')}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <aside
    hidden={where === 'panel' ? !inPanel(note) : !isShown(note)}
    tabindex={where === 'gutter' ? 0 : -1}
    data-note-kind={note.kind}
    data-note-emphasis={activeBlockNotes.has(note.id) || activeNote === note.id
      ? 'true'
      : undefined}
    data-mol-id={`margin-note-${where}-${note.id}`}
    onmouseenter={where === 'gutter'
      ? () => {
          activeNote = note.id
        }
      : undefined}
    onmouseleave={where === 'gutter'
      ? () => {
          activeNote = null
        }
      : undefined}
    onfocusin={where === 'gutter'
      ? () => {
          activeNote = note.id
        }
      : undefined}
    onfocusout={where === 'gutter'
      ? () => {
          activeNote = null
        }
      : undefined}
    class={cm.cn(
      cm.sp('p', 3),
      cm.textSize('sm'),
      cm.textMuted,
      (activeBlockNotes.has(note.id) || activeNote === note.id) && cm.bgPrimarySubtle,
      (activeBlockNotes.has(note.id) || activeNote === note.id) && cm.shadowLifted,
    )}
  >
    {#if typeof note.content === 'function'}{@render note.content?.()}{:else if note.content !== undefined && note.content !== null}{note.content}{/if}
  </aside>
{/snippet}

<div
  {...rest}
  class={cm.cn(cm.mxAuto, cm.w('full'), className)}
  style={containerStyle}
  data-mol-id="margin-notes"
>
  {#if hasNotes && kinds.length > 0}
    <div class={cm.cn(cm.hiddenBelow('md'), cm.sp('mb', 6))}>{@render switches('side')}</div>
  {/if}
  <div class={cm.cn(cm.textSize('xl'), cm.stack(0))}>
    {#each rows as row (row.id)}
      <div
        use:trackRow={row.id}
        class={cm.flex({ direction: 'row', align: 'start', gap: 'xl' })}
        data-mol-id={`margin-notes-row-${row.id}`}
      >
        <div class={cm.flex1} style={styleString({ maxWidth: measure, minWidth: 0 })}>
          {#each row.blocks as block (block.id)}
            {@const ids = block.noteIds ?? []}
            {@const interactive = ids.length > 0}
            {@const tinted = !!activeNote && ids.includes(activeNote)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              id={block.id}
              data-mol-id={`margin-notes-block-${block.id}`}
              data-block-marked={block.marked ? 'true' : undefined}
              data-block-pinned={pinnedBlock === block.id ? 'true' : undefined}
              onmouseenter={interactive
                ? () => {
                    activeBlock = block.id
                  }
                : undefined}
              onmouseleave={interactive
                ? () => {
                    activeBlock = null
                  }
                : undefined}
              onfocusin={interactive
                ? () => {
                    activeBlock = block.id
                  }
                : undefined}
              onfocusout={interactive
                ? () => {
                    activeBlock = null
                  }
                : undefined}
              class={cm.cn(cm.position('relative'), tinted && cm.bgPrimarySubtle)}
            >
              {#if block.marked}
                <span
                  role={markNamed ? 'img' : undefined}
                  aria-label={markNamed ? markLabel : undefined}
                  aria-hidden={markNamed ? undefined : 'true'}
                  data-mol-id={`margin-notes-mark-${block.id}`}
                  class={cm.cn(
                    cm.position('absolute'),
                    cm.roundedFull,
                    cm.bgPrimary,
                    cm.hiddenBelow('md'),
                  )}
                  style={styleString({
                    left: '-0.9rem',
                    top: '0.75em',
                    width: '6px',
                    height: '6px',
                  })}
                ></span>
              {/if}
              {#if typeof block.content === 'function'}{@render block.content?.()}{:else if block.content !== undefined && block.content !== null}{block.content}{/if}
              {#if interactive}
                <div class={cm.cn(cm.hiddenFrom('md'), cm.flex({ justify: 'end' }))}>
                  <button
                    type="button"
                    aria-pressed={pinnedBlock === block.id ? 'true' : 'false'}
                    aria-label={pinLabel}
                    data-mol-id={`margin-notes-pin-${block.id}`}
                    onclick={() => {
                      pinnedBlock = pinnedBlock === block.id ? null : block.id
                    }}
                    class={cm.button({ variant: 'ghost', size: 'sm' })}
                  >
                    <Icon name="pin" size={16} aria-hidden="true" />
                  </button>
                </div>
              {/if}
            </div>
          {/each}
        </div>
        {#if hasNotes}
          <div
            class={cm.cn(cm.hiddenBelow('md'), cm.stack(3))}
            style={styleString({
              width: gutterWidth,
              flexShrink: 0,
              paddingTop: noteOffsets[row.id],
            })}
            aria-label={notesLabel}
            role="complementary"
          >
            {#each row.notes as note (note.id)}{@render noteView(note, 'gutter')}{/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
  {#if hasNotes}
    <!-- Room for the phone bar, so it never covers the last paragraph. -->
    <div
      class={cm.hiddenFrom('md')}
      style={styleString({ height: '14rem' })}
      aria-hidden="true"
    ></div>
    <div
      class={cm.cn(
        cm.hiddenFrom('md'),
        cm.position('fixed'),
        cm.surface,
        cm.borderT,
        cm.shadowLifted,
        cm.sp('p', 3),
        cm.stack(2),
      )}
      style={styleString({ left: 0, right: 0, bottom: 0, zIndex: 20 })}
      data-mol-id="margin-notes-bar"
    >
      <div
        role="region"
        aria-live="polite"
        aria-label={panelLabel}
        style={styleString({ maxHeight: '40vh', overflowY: 'auto' })}
        data-mol-id="margin-notes-panel"
      >
        {#each panelNotes as note (note.id)}{@render noteView(note, 'panel')}{/each}
        {#if pinnedBlock}
          <button
            type="button"
            onclick={() => {
              pinnedBlock = null
            }}
            class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTarget)}
            data-mol-id="margin-notes-dismiss">{dismissLabel}</button
          >
        {/if}
      </div>
      {@render switches('bar')}
    </div>
  {/if}
</div>
