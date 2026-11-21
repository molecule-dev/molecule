<!--
  SpreadsheetGrid: the Svelte counterpart of
  `@molecule/app-spreadsheet-grid-react`'s `SpreadsheetGrid` — a virtualized
  cell grid with frozen rows/columns, range selection, copy/paste as TSV and
  in-cell editing. Same props (React names), same DOM for the same input, and
  the same callbacks. React's `renderCell` render prop is a snippet receiving
  the value and the A1 reference.
-->
<script lang="ts">
  import { copyTextWithFallback } from '@molecule/app-clipboard'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { computeLayout, type GridCell, type GridEditing } from './layout.js'
  import type { CellValue, SpreadsheetGridProps } from './types.js'
  import {
    cellRef,
    formatCellValue,
    normalizeSelection,
    parseClipboardTsv,
    serializeSelectionTsv,
  } from './utilities.js'
  import { reactInputValue } from './value.js'

  let {
    rows,
    columns,
    cells,
    onCellChange,
    selection,
    onSelectionChange,
    frozenRows = 0,
    frozenCols = 0,
    cellWidth = 96,
    cellHeight = 28,
    gutterWidth = 48,
    headerHeight = 28,
    viewportWidth = 720,
    viewportHeight = 360,
    dataMolId,
    renderCell,
  }: SpreadsheetGridProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let scrollLeft = $state(0)
  let scrollTop = $state(0)
  let editing = $state<GridEditing | null>(null)
  /** The editor field, focused and selected once each time editing starts. */
  let editorEl = $state<HTMLInputElement | null>(null)
  /** Where the current drag started, while a mouse button is held. */
  let dragAnchor: { row: number; col: number } | null = null

  const layout = $derived(
    computeLayout(
      {
        rows,
        columns,
        cells,
        selection,
        frozenRows,
        frozenCols,
        cellWidth,
        cellHeight,
        gutterWidth,
        headerHeight,
        viewportWidth,
        viewportHeight,
        scrollLeft,
        scrollTop,
        editing,
      },
      cm,
    ),
  )

  // React's `useEffect(() => { focus(); select() }, [editing])`: runs after the
  // editor is in the DOM, and again whenever the draft changes (as React's
  // effect re-runs on each new editing object).
  $effect(() => {
    if (!editing) return
    const field = editorEl
    field?.focus()
    field?.select()
  })

  /**
   * Opens the in-cell editor on one cell, seeding the draft from its value.
   *
   * @param row - 0-indexed row.
   * @param col - 0-indexed column.
   */
  function beginEdit(row: number, col: number): void {
    editing = { row, col, draft: formatCellValue(cells.get(cellRef(row, col))) }
  }

  /** Commits the open edit: empty clears the cell, number-like text becomes a number. */
  function commitEdit(): void {
    const current = editing
    if (!current) return
    const ref = cellRef(current.row, current.col)
    const trimmed = current.draft
    let next: CellValue
    if (trimmed === '') next = null
    else if (/^-?\d+(\.\d+)?$/.test(trimmed)) next = Number(trimmed)
    else next = trimmed
    onCellChange(ref, next)
    editing = null
  }

  /** Closes the editor without committing. */
  function cancelEdit(): void {
    editing = null
  }

  /**
   * React's cell `onMouseDown`: commits an open edit, then starts or extends
   * the selection.
   *
   * @param row - 0-indexed row.
   * @param col - 0-indexed column.
   * @param shiftKey - Whether Shift was held (extend from the anchor).
   */
  function handleMouseDown(row: number, col: number, shiftKey: boolean): void {
    if (editing) commitEdit()
    if (shiftKey) {
      onSelectionChange({ r1: selection.r1, c1: selection.c1, r2: row, c2: col })
    } else {
      dragAnchor = { row, col }
      onSelectionChange({ r1: row, c1: col, r2: row, c2: col })
    }
  }

  /**
   * React's cell `onMouseEnter`: extends the selection while the primary
   * button is held.
   *
   * @param row - 0-indexed row.
   * @param col - 0-indexed column.
   * @param buttonsDown - Whether the primary button is held.
   */
  function handleMouseEnter(row: number, col: number, buttonsDown: boolean): void {
    if (!buttonsDown) return
    const anchor = dragAnchor
    if (!anchor) return
    onSelectionChange({ r1: anchor.row, c1: anchor.col, r2: row, c2: col })
  }

  /** Clears the drag anchor on mouse up. */
  function handleMouseUp(): void {
    dragAnchor = null
  }

  /**
   * React's container `onKeyDown`: copy, and Edit on Enter / F2.
   *
   * @param event - The keyboard event.
   */
  function handleKeyDown(event: KeyboardEvent): void {
    const isMod = event.ctrlKey || event.metaKey
    if (editing) return
    if (isMod && event.key.toLowerCase() === 'c') {
      event.preventDefault()
      void handleCopy()
      return
    }
    if (isMod && event.key.toLowerCase() === 'v') return
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault()
      beginEdit(selection.r1, selection.c1)
    }
  }

  /**
   * The editor field's key handling: Enter commits, Escape cancels. The grid's
   * own key handler runs only while no editor is open (React reads the state
   * the render before the event began, so a key that commits here never
   * reaches it), so the event stays on the field.
   *
   * @param event - The keyboard event.
   */
  function handleEditorKeyDown(event: KeyboardEvent): void {
    event.stopPropagation()
    if (event.key === 'Enter') {
      event.preventDefault()
      commitEdit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelEdit()
    }
  }

  /**
   * Serializes the selection to TSV and copies it through the clipboard bond.
   *
   * @returns The TSV text.
   */
  async function handleCopy(): Promise<string> {
    const tsv = serializeSelectionTsv(cells, selection)
    await copyTextWithFallback(tsv)
    return tsv
  }

  /**
   * Writes pasted TSV into cells starting at the selection anchor.
   *
   * @param text - Clipboard text (typically TSV).
   */
  function handlePaste(text: string): void {
    const grid = parseClipboardTsv(text)
    if (grid.length === 0) return
    const n = normalizeSelection(selection)
    for (let r = 0; r < grid.length; r += 1) {
      const row = grid[r]!
      for (let c = 0; c < row.length; c += 1) {
        const targetRow = n.r1 + r
        const targetCol = n.c1 + c
        if (targetRow >= rows || targetCol >= columns) continue
        const raw = row[c]!
        let next: CellValue
        if (raw === '') next = null
        else if (/^-?\d+(\.\d+)?$/.test(raw)) next = Number(raw)
        else next = raw
        onCellChange(cellRef(targetRow, targetCol), next)
      }
    }
  }

  /**
   * React's container `onPaste`: intercepts the native paste event.
   *
   * @param event - The clipboard event.
   */
  function handlePasteEvent(event: ClipboardEvent): void {
    const text = event.clipboardData ? event.clipboardData.getData('text/plain') : ''
    if (!text) return
    event.preventDefault()
    handlePaste(text)
  }

  /**
   * The editor's body: each typed value becomes the draft.
   *
   * @param event - The input event.
   */
  function handleDraftInput(event: Event): void {
    const current = editing
    if (!current) return
    editing = { ...current, draft: (event.currentTarget as HTMLInputElement).value }
  }

  /**
   * The scroller's `scroll` handler: refreshes the rendered window.
   *
   * @param event - The scroll event.
   */
  function handleScroll(event: Event): void {
    const element = event.currentTarget as HTMLDivElement
    scrollLeft = element.scrollLeft
    scrollTop = element.scrollTop
  }
</script>

{#snippet cellBox(cell: GridCell)}
  <div
    role="gridcell"
    data-mol-id="spreadsheet-grid-cell-{cell.ref}"
    tabindex={cell.anchor ? 0 : -1}
    aria-selected={cell.selected ? 'true' : undefined}
    class={cell.classes}
    style={cell.style}
    onmousedown={(event) => handleMouseDown(cell.row, cell.col, event.shiftKey)}
    onmouseenter={(event) => handleMouseEnter(cell.row, cell.col, event.buttons === 1)}
    ondblclick={() => beginEdit(cell.row, cell.col)}
  >
    {#if editing && editing.row === cell.row && editing.col === cell.col}
      <input
        bind:this={editorEl}
        data-mol-id="spreadsheet-grid-editor-{cell.ref}"
        class={layout.editorClasses}
        use:reactInputValue={{ value: editing.draft }}
        oninput={handleDraftInput}
        onblur={commitEdit}
        onkeydown={handleEditorKeyDown}
        aria-label={t(
          'spreadsheetGrid.cellEditor',
          { ref: cell.ref },
          { defaultValue: 'Edit cell {{ref}}' },
        )}
      />
    {:else}
      <div class={layout.contentClasses}>
        {#if renderCell}{@render renderCell(cell.value, cell.ref)}{:else}{cell.text}{/if}
      </div>
    {/if}
  </div>
{/snippet}

<div
  data-mol-id={dataMolId ?? 'spreadsheet-grid'}
  role="grid"
  tabindex="0"
  aria-rowcount={rows}
  aria-colcount={columns}
  aria-label={t('spreadsheetGrid.label', undefined, { defaultValue: 'Spreadsheet' })}
  class={layout.rootClasses}
  style={layout.rootStyle}
  onkeydown={handleKeyDown}
  onpaste={handlePasteEvent}
  onmouseup={handleMouseUp}
>
  <!-- Top-left corner (gutter × header). -->
  <div aria-hidden="true" class={layout.cornerClasses} style={layout.cornerStyle}></div>
  <!-- Column-letter header (frozen + scrollable). -->
  <div role="row" aria-rowindex="1" class={layout.headerLaneClasses} style={layout.headerLaneStyle}>
    {#each layout.frozenHeaderCells as header (header.key)}
      <div
        role="columnheader"
        aria-colindex={header.index + 1}
        class={header.classes}
        style={header.style}
      >
        {header.text}
      </div>
    {/each}
    <div style={layout.headerScrollerStyle}>
      {#each layout.scrollingHeaderCells as header (header.key)}
        <div
          role="columnheader"
          aria-colindex={header.index + 1}
          class={header.classes}
          style={header.style}
        >
          {header.text}
        </div>
      {/each}
    </div>
  </div>
  <!-- Row-number gutter (frozen + scrollable). -->
  <div aria-hidden="true" class={layout.gutterLaneClasses} style={layout.gutterLaneStyle}>
    {#each layout.frozenGutterCells as label (label.key)}
      <div class={label.classes} style={label.style}>{label.text}</div>
    {/each}
    <div style={layout.gutterScrollerStyle}>
      {#each layout.scrollingGutterCells as label (label.key)}
        <div class={label.classes} style={label.style}>{label.text}</div>
      {/each}
    </div>
  </div>
  <!-- Frozen-rows × scrolling-cols region. -->
  {#if layout.showFrozenRows}
    <div style={layout.frozenRowsRegionStyle}>
      <div style={layout.frozenRowsInnerStyle}>
        {#each layout.frozenRowsCells as cell (cell.ref)}{@render cellBox(cell)}{/each}
      </div>
    </div>
  {/if}
  <!-- Frozen-cols × scrolling-rows region. -->
  {#if layout.showFrozenCols}
    <div style={layout.frozenColsRegionStyle}>
      <div style={layout.frozenColsInnerStyle}>
        {#each layout.frozenColsCells as cell (cell.ref)}{@render cellBox(cell)}{/each}
      </div>
    </div>
  {/if}
  <!-- Frozen-rows × frozen-cols corner. -->
  {#if layout.showFrozenCorner}
    <div style={layout.frozenCornerStyle}>
      {#each layout.frozenCornerCells as cell (cell.ref)}{@render cellBox(cell)}{/each}
    </div>
  {/if}
  <!-- Main scrollable region. -->
  <div
    data-mol-id="spreadsheet-grid-scroll"
    style={layout.scrollRegionStyle}
    onscroll={handleScroll}
  >
    <div style={layout.scrollSpacerStyle}>
      {#each layout.mainCells as cell (cell.ref)}{@render cellBox(cell)}{/each}
    </div>
  </div>
  <!-- Hidden total-size hint for accessibility tooling. -->
  <span class={layout.totalClasses} style={layout.totalStyle} aria-hidden="true"
    >{layout.totalText}</span
  >
</div>
