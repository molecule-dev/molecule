/**
 * React's section “File attachment chips” (ChatPanel.tsx lines 5819–5890): the
 * row of staged attachments the composer sends with the message, each chip
 * showing an image's object-URL thumbnail, the file's name, its formatted size
 * and a remove button.
 *
 * React renders the row only while at least one file is staged, so the host —
 * React's own root `<div>` — is the chip row then and unwraps
 * (`data-parity-unwrap`, `display: contents`) when React renders nothing.
 *
 * @module
 */

import { Component, inject } from '@angular/core'

import { formatSize } from '@molecule/app-ide-panel-logic'
import type { AttachedFile } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { ChatAttachments } from './chat-attachments.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatPopups } from './chat-popups.slice.js'

/** One chip's pre-rendered data. */
interface AttachmentChip {
  /** The chip's key (React's `f.path ?? f.filename`). */
  key: string
  /** The display name (the path's last segment, else the filename). */
  label: string
  /** The attachment's filename (React's `alt`). */
  filename: string
  /** The file size in bytes (0 hides the size label). */
  size: number
  /** The image's object URL, when the attachment has a preview. */
  previewUrl?: string
}

/** React's inline style for the chip row. */
const ROOT_STYLE = styleText({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
  padding: '6px 10px 0',
})

/** The closed state: React renders nothing, so the host unwraps to nothing. */
const UNWRAP_STYLE = styleText({ display: 'contents' })

/** The chip's inline style. */
const CHIP_STYLE = styleText({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  borderRadius: '4px',
  padding: '2px 6px',
})

/** The thumbnail's inline style. */
const IMAGE_STYLE = styleText({ width: 18, height: 18, objectFit: 'cover', borderRadius: 2 })

/** The name's inline style. */
const NAME_STYLE = styleText({ fontFamily: 'monospace', opacity: 0.85 })

/** The size label's inline style. */
const SIZE_STYLE = styleText({ fontSize: 10 })

/** The remove button's inline style on a fine pointer. */
const REMOVE_STYLE = styleText({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'inherit',
  opacity: 0.5,
  lineHeight: 1,
  padding: 0,
  fontSize: '13px',
})

/** The remove button's inline style on a coarse pointer (a tappable 32px box). */
const REMOVE_STYLE_COARSE = styleText({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'inherit',
  opacity: 0.5,
  lineHeight: 1,
  padding: 0,
  fontSize: '13px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 32,
  minHeight: 32,
})

/**
 * React's “File attachment chips” section: the staged attachments' chips and
 * their remove buttons.
 */
@Component({
  selector: 'div[mol-chat-attachment-chips]',
  standalone: true,
  host: {
    '[attr.data-parity-unwrap]': 'closed() ? "" : null',
    '[attr.style]': 'closed() ? unwrapStyle : rootStyle',
  },
  // prettier-ignore
  template: `@for (item of chips(); track item.key) {<span [attr.class]="chipClass" [attr.style]="chipStyle">@if (item.previewUrl) {<img [attr.src]="item.previewUrl" [attr.alt]="item.filename" [attr.style]="imageStyle" />}<span [attr.style]="nameStyle">{{ item.label }}</span>@if (item.size > 0) {<span [attr.class]="mutedClass" [attr.style]="sizeStyle">{{ sizeText(item.size) }}</span>}<button type="button" [attr.data-mol-id]="'chat-attachment-remove-' + item.key" [attr.aria-label]="removeLabel(item)" (click)="remove(item.key)" [attr.style]="removeStyle()">×</button></span>}`,
})
export class ChatAttachmentChips {
  /** The shared state, read for the env (ClassMap, coarse pointer and translator). */
  private readonly state = inject(ChatInnerState)

  /** The popups slice: the staged attachments. */
  private readonly popups = inject(ChatPopups)

  /** The attachments slice: the remove action. */
  private readonly attachments = inject(ChatAttachments)

  /** The chip row's inline style while it is shown. */
  protected readonly rootStyle: string | null = ROOT_STYLE

  /** The closed state's inline style (the host unwraps away). */
  protected readonly unwrapStyle: string | null = UNWRAP_STYLE

  /** The chip's inline style. */
  protected readonly chipStyle: string | null = CHIP_STYLE

  /** The thumbnail's inline style. */
  protected readonly imageStyle: string | null = IMAGE_STYLE

  /** The name's inline style. */
  protected readonly nameStyle: string | null = NAME_STYLE

  /** The size label's inline style. */
  protected readonly sizeStyle: string | null = SIZE_STYLE

  /** The chip's ClassMap classes. */
  protected readonly chipClass: string

  /** The size label's ClassMap classes. */
  protected readonly mutedClass: string

  /** Resolves the ClassMap and the static classes once, at construction. */
  constructor() {
    const cm: UIClassMap = this.state.env.cm
    this.chipClass = cm.cn(cm.surfaceSecondary, cm.textSize('xs'))
    this.mutedClass = cm.textMuted
  }

  /**
   * Whether React would render nothing: no file is staged.
   *
   * @returns Whether the chip row is closed.
   */
  protected closed(): boolean {
    return this.popups.attachedFiles().length === 0
  }

  /**
   * The chips to render, in React's staged order.
   *
   * @returns One item per staged attachment.
   */
  protected chips(): AttachmentChip[] {
    return this.popups.attachedFiles().map((file: AttachedFile) => {
      const key = file.path ?? file.filename
      const splitName = file.path ? (file.path.split('/').pop() ?? '') : file.filename
      const item: AttachmentChip = {
        key,
        label: splitName,
        filename: file.filename,
        size: file.size,
      }
      if (file.previewUrl) item.previewUrl = file.previewUrl
      return item
    })
  }

  /**
   * The remove button's inline style (wider on a coarse pointer).
   *
   * @returns The `style` attribute text.
   */
  protected removeStyle(): string | null {
    return this.state.env.isCoarse() ? REMOVE_STYLE_COARSE : REMOVE_STYLE
  }

  /**
   * The size label's text.
   *
   * @param size - The size in bytes.
   * @returns The formatted size.
   */
  protected sizeText(size: number): string {
    return formatSize(size)
  }

  /**
   * The remove button's accessible label.
   *
   * @param item - The chip.
   * @returns The translated label.
   */
  protected removeLabel(item: AttachmentChip): string {
    // Follows a locale switch, the way React's whole-component re-render does.
    void this.state.env.locale()
    return this.state.env.t(
      'ide.chat.removeAttachment',
      { name: item.label },
      { defaultValue: 'Remove {{name}}' },
    )
  }

  /**
   * Removes one chip (React's `removeAttachment`).
   *
   * @param key - The attachment's key.
   */
  protected remove(key: string): void {
    this.attachments.removeAttachment(key)
  }
}
