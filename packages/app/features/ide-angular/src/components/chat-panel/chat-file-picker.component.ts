/**
 * React's section “File picker popup” (ChatPanel.tsx lines 7660–7754): the `@`
 * picker's ranked rows above the composer, each with its file name, its
 * directory, a highlight for the keyboard-selected row and an `active` / `open`
 * marker for the editor's current file and open tabs.
 *
 * React renders the popup only while the picker is open AND at least one entry
 * matched, so the host — React's own root `<div>` — is the popup box then and
 * unwraps (`data-parity-unwrap`, `display: contents`) when React renders
 * nothing.
 *
 * @module
 */

import { Component, inject } from '@angular/core'

import type { FileEntry } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { ChatInnerState } from './chat-inner-state.js'
import { ChatMention } from './chat-mention.slice.js'
import { ChatPickers } from './chat-pickers.slice.js'
import { ChatPopups } from './chat-popups.slice.js'

/** One row's pre-rendered data. */
interface FilePickerRow {
  /** The picker's entry (React's `key` and click argument). */
  entry: FileEntry
  /** The row's index in the filtered list. */
  index: number
  /** The file's last path segment. */
  fileName: string
  /** The directory the file sits in (empty at the root). */
  dirPath: string
  /** Whether this is the editor's active file. */
  isActive: boolean
  /** Whether the file is an open (but not active) tab. */
  isOpenTab: boolean
}

/** The closed state: React renders nothing, so the host unwraps to nothing. */
const UNWRAP_STYLE = styleText({ display: 'contents' })

/** The file name span's inline style. */
const FILE_NAME_STYLE = styleText({ fontFamily: 'monospace', fontWeight: 500 })

/** The directory span's inline style. */
const DIR_PATH_STYLE = styleText({ fontSize: '11px', fontFamily: 'monospace', opacity: 0.6 })

/** The `active` / `open` marker's inline style. */
const MARKER_STYLE = styleText({
  marginLeft: 'auto',
  fontSize: '10px',
  opacity: 0.5,
  flexShrink: 0,
})

/**
 * React's “File picker popup” section: the `@` picker's ranked file rows.
 */
@Component({
  selector: 'div[mol-chat-file-picker]',
  standalone: true,
  host: {
    '[attr.data-parity-unwrap]': 'open() ? null : ""',
    '[attr.class]': 'open() ? rootClass : null',
    '[attr.style]': 'open() ? rootStyle() : unwrapStyle',
  },
  // prettier-ignore
  template: `@for (row of rows(); track row.entry.name) {<button type="button" (click)="select(row.entry)" (mouseenter)="onRowEnter($event)" (mouseleave)="onRowLeave($event, row.index)" [attr.class]="rowClass" [attr.style]="rowStyle(row)"><span [attr.style]="fileNameStyle">{{ row.fileName }}</span>@if (row.dirPath) {<span [attr.class]="mutedClass" [attr.style]="dirPathStyle">{{ row.dirPath }}</span>}@if (row.isActive || row.isOpenTab) {<span [attr.style]="markerStyle">{{ markerText(row) }}</span>}</button>}`,
})
export class ChatFilePicker {
  /** The shared state, read for the env (ClassMap, translator, viewport cap) and props. */
  private readonly state = inject(ChatInnerState)

  /** The popups slice: the open picker (its query and highlighted row). */
  private readonly popups = inject(ChatPopups)

  /** The pickers slice: the ranked, filtered entries. */
  private readonly pickers = inject(ChatPickers)

  /** The mention slice: the row action that stages a file. */
  private readonly mention = inject(ChatMention)

  /** The closed state's inline style (the host unwraps away). */
  protected readonly unwrapStyle: string | null = UNWRAP_STYLE

  /** The file name span's inline style. */
  protected readonly fileNameStyle: string | null = FILE_NAME_STYLE

  /** The directory span's inline style. */
  protected readonly dirPathStyle: string | null = DIR_PATH_STYLE

  /** The marker span's inline style. */
  protected readonly markerStyle: string | null = MARKER_STYLE

  /** The popup box's ClassMap classes. */
  protected readonly rootClass: string

  /** The row button's ClassMap classes. */
  protected readonly rowClass: string

  /** The directory span's ClassMap classes. */
  protected readonly mutedClass: string

  /** Resolves the ClassMap once, at construction. */
  constructor() {
    const cm: UIClassMap = this.state.env.cm
    this.rootClass = cm.cn(cm.surface, cm.borderAll)
    this.rowClass = cm.w('full')
    this.mutedClass = cm.textMuted
  }

  /**
   * Whether React would render the popup: the picker is open with a match.
   *
   * @returns Whether the popup is shown.
   */
  protected open(): boolean {
    return this.popups.filePicker() !== null && this.pickers.filteredEntries().length > 0
  }

  /**
   * The popup box's inline style (anchored above the composer, capped to the
   * viewport).
   *
   * @returns The `style` attribute text.
   */
  protected rootStyle(): string | null {
    return styleText({
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      marginBottom: 0,
      borderRadius: '6px 6px 0 0',
      overflow: 'hidden',
      zIndex: 100,
      boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
      maxHeight: this.state.env.popupMaxHeight(),
      overflowY: 'auto',
    })
  }

  /**
   * The rows to render, in the picker's ranked order.
   *
   * @returns One row per filtered entry.
   */
  protected rows(): FilePickerRow[] {
    const entries = this.pickers.filteredEntries()
    const props = this.state.props()
    const activeNorm = props.activeFile ? this.normalizeTabPath(props.activeFile) : null
    const openTabSet = new Set((props.openTabs ?? []).map((path) => this.normalizeTabPath(path)))
    return entries.map((entry, index) => {
      const isActive = activeNorm === entry.name
      return {
        entry,
        index,
        fileName: entry.name.split('/').pop() ?? entry.name,
        dirPath: entry.name.includes('/') ? entry.name.slice(0, entry.name.lastIndexOf('/')) : '',
        isActive,
        isOpenTab: !isActive && openTabSet.has(entry.name),
      }
    })
  }

  /**
   * A row's inline style: its border separator, highlight and hover target.
   *
   * @param row - The row.
   * @returns The `style` attribute text.
   */
  protected rowStyle(row: FilePickerRow): string | null {
    return styleText({
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      border: 'none',
      borderTop: row.index > 0 ? '1px solid rgba(128,128,128,0.12)' : 'none',
      cursor: 'pointer',
      color: 'inherit',
      textAlign: 'left',
      fontSize: '12px',
      background:
        row.index === this.popups.filePicker()?.selectedIdx
          ? 'rgba(128,128,128,0.1)'
          : 'transparent',
    })
  }

  /**
   * The `active` / `open` marker's text.
   *
   * @param row - The row.
   * @returns The translated marker.
   */
  protected markerText(row: FilePickerRow): string {
    // Follows a locale switch, the way React's whole-component re-render does.
    void this.state.env.locale()
    return row.isActive
      ? this.state.env.t('ide.chat.activeFile', undefined, { defaultValue: 'active' })
      : this.state.env.t('ide.chat.openTab', undefined, { defaultValue: 'open' })
  }

  /**
   * Stages the clicked row's file (React's `stableSelectFileEntry`).
   *
   * @param entry - The chosen entry.
   */
  protected select(entry: FileEntry): void {
    this.mention.selectFileEntry(entry)
  }

  /**
   * A row hover (React's `onMouseEnter` style write).
   *
   * @param event - The mouse event (its currentTarget is the row button).
   */
  protected onRowEnter(event: Event): void {
    ;(event.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.15)'
  }

  /**
   * A row hover exit (React's `onMouseLeave` style write).
   *
   * @param event - The mouse event (its currentTarget is the row button).
   * @param index - The row's index.
   */
  protected onRowLeave(event: Event, index: number): void {
    ;(event.currentTarget as HTMLElement).style.background =
      index === this.popups.filePicker()?.selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent'
  }

  /**
   * Normalizes an editor path to the picker's project-relative form.
   *
   * @param path - The editor tab path.
   * @returns The project-relative path.
   */
  private normalizeTabPath(path: string): string {
    return path.startsWith('/workspace/')
      ? path.slice('/workspace/'.length)
      : path.startsWith('/')
        ? path.slice(1)
        : path
  }
}
