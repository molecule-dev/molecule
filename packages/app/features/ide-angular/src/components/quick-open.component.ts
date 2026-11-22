/**
 * Quick Open (Cmd+P) — file finder overlay.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `QuickOpen` (see that
 * file for the design notes): the same inputs (React prop names), the same DOM
 * for the same input, the same callbacks. It fetches the project file list and
 * presents a fuzzy-filterable picker — the overlay itself is the package's
 * `QuickPicker`, rendered as the host's one child with the derived rows and
 * the placeholder translation.
 *
 * React's component renders no root of its own — it is the QuickPicker's
 * fragment of two roots — so the host is an empty, layout-neutral element
 * (`display: contents`) whose content is adopted beside it every
 * change-detection pass (`ngDoCheck`, the kit's own session-gate convention,
 * the same one the QuickPicker and CommandPalette components run for their
 * roots). The derived rows are a `computed`, so the picker's `items` input
 * keeps one identity until the file list or the icon template arrives (React's
 * `items` memo) and a change-detection pass alone never re-sets the picker's
 * highlight. Each row's file-type icon is the material-file-icons SVG injected
 * into a fixed-size span by a private icon component, the way React's
 * `FileTypeIcon` renders it; the span reads its file name back from the row's
 * `data-mol-id`, the only per-row context a shared `ng-template` sees through
 * the picker's outlet. All user-facing text goes through `t()`.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  computed,
  type DoCheck,
  ElementRef,
  inject,
  type OnChanges,
  signal,
  type SimpleChanges,
  type TemplateRef,
  ViewChild,
} from '@angular/core'
import { getIcon } from 'material-file-icons'

import { useHttpClient, useTranslation } from '@molecule/app-angular'
import { getLogger } from '@molecule/app-logger'

import type { QuickPickerItem } from './quick-picker.component.js'
import { QuickPicker } from './quick-picker.component.js'

const logger = getLogger('quick-open')

/**
 * A row's file-type icon: the file name's material icon injected as the span's
 * content (React's `FileTypeIcon` via `dangerouslySetInnerHTML`), styled one
 * property at a time the way React writes them. The file name comes from the
 * row button's `data-mol-id` (`quick-picker-item-<path>`), read once the span
 * sits inside it; the per-row file is fixed, so the icon is applied once.
 */
@Component({
  selector: 'span[mol-quick-open-file-icon]',
  standalone: true,
  template: '',
})
class QuickOpenFileIcon implements AfterViewInit, DoCheck {
  /** The icon host span. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** Whether the icon has been applied (the file of a row never changes). */
  private applied = false

  /** Applies the icon once the span exists. */
  ngAfterViewInit(): void {
    this.apply()
  }

  /**
   * Re-applies while the row is not attached yet: the embedded view renders
   * before the row's attributes are readable on some passes.
   */
  ngDoCheck(): void {
    if (!this.applied) this.apply()
  }

  /** Derives the row's file name and injects its icon. */
  private apply(): void {
    const el = this.host.nativeElement
    const row = el.closest('[data-mol-id^="quick-picker-item-"]')
    if (!row) return
    const path = (row.getAttribute('data-mol-id') ?? '').slice('quick-picker-item-'.length)
    const name = path.split('/').pop() ?? path
    // React's per-property writes (the DOM's style attribute is the CSSOM's
    // serialization, not a written string).
    el.style.display = 'inline-flex'
    el.style.flexShrink = '0'
    el.style.width = '16px'
    el.style.height = '16px'
    el.innerHTML = getIcon(name).svg
    this.applied = true
  }
}

/**
 * Quick Open file finder overlay.
 */
@Component({
  selector: 'div[mol-quick-open]',
  standalone: true,
  imports: [QuickPicker, QuickOpenFileIcon],
  inputs: ['projectId', 'onFileOpen', 'onDismiss'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `<div mol-quick-picker [items]="items()" [onSelect]="pick" [onDismiss]="onDismiss" [loading]="loading()" [placeholder]="placeholderText()"></div><ng-template #fileIcon><span mol-quick-open-file-icon></span></ng-template>`,
})
export class QuickOpen implements OnChanges, AfterViewInit {
  /** Project ID used for API calls. */
  projectId = ''

  /** Called when the user selects a file. */
  onFileOpen: (path: string) => void = () => {}

  /** Called when the picker is dismissed. */
  onDismiss: () => void = () => {}

  /** The bonded HTTP client (an `HttpProvider` in the tree supplies it). */
  private readonly http = useHttpClient()

  /** The fetched file paths, in the reply's order. */
  private readonly files = signal<string[]>([])

  /** Whether a fetch is in flight (starts true, as React's `useState(true)`). */
  private readonly loading = signal(true)

  /** The row icon template, resolved after the view is created. */
  private readonly fileIconTemplate = signal<TemplateRef<unknown> | undefined>(undefined)

  /** The fetch a new run supersedes (React's per-effect `cancelled` flag). */
  private fetchTicket = 0

  /** The row icon template query. */
  @ViewChild('fileIcon') private fileIconQuery?: TemplateRef<unknown>

  /**
   * The rows QuickPicker renders: the `/workspace/` prefix stripped for
   * display, the bare name as the label, the display path as the detail beside
   * it when it differs, each with the row icon template (React's `items`
   * memo — one identity until the file list or the icon template changes, so a
   * change-detection pass alone never re-sets the picker's highlight).
   */
  protected readonly items = computed<QuickPickerItem[]>(() => {
    const icon = this.fileIconTemplate()
    return this.files().map((file) => {
      const display = file.replace(/^\/workspace\//, '')
      const name = display.split('/').pop() ?? display
      return {
        id: file,
        label: name,
        detail: display !== name ? display : undefined,
        icon,
      }
    })
  })

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** This component's host element, for the content adoption below. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * React's effect: the initial binding and every replaced `projectId`
   * re-fetch the list (`ngOnChanges` fires for the first binding too).
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId']) this.load()
  }

  /**
   * Resolves the row icon template once the view exists; the rows recompute
   * through their `computed` when it arrives.
   */
  ngAfterViewInit(): void {
    this.fileIconTemplate.set(this.fileIconQuery)
  }

  /**
   * Adopts the QuickPicker's roots beside the host every change-detection
   * pass, so the host element (a layout-neutral wrapper React does not have)
   * never appears in a `@focus` path — the kit's own session-gate convention
   * for fragment-rooted components.
   */
  ngDoCheck(): void {
    const parent = this.host.nativeElement.parentNode
    if (!parent) return
    for (const node of Array.from(this.host.nativeElement.childNodes))
      parent.insertBefore(node, this.host.nativeElement)
  }

  /**
   * Fetches the project's file list. A later run supersedes this one: its
   * reply is ignored the way React's `cancelled` flag ignores it — except the
   * failure, which is logged even so (React's `.catch` body).
   */
  private load(): void {
    const ticket = ++this.fetchTicket
    this.loading.set(true)
    void this.http
      .get<{ files: string[] }>(`/projects/${this.projectId}/files-list`)
      .then((res) => {
        if (ticket === this.fetchTicket) this.files.set(res.data.files)
      })
      .catch((error) => {
        logger.warn('quick-open: file list fetch failed; showing an empty picker', { error })
      })
      .finally(() => {
        if (ticket === this.fetchTicket) this.loading.set(false)
      })
  }

  /**
   * The picker's placeholder, translated — its OWN key
   * (`ide.quickOpen.placeholder`).
   * @returns The placeholder text.
   */
  protected placeholderText(): string {
    return this.i18n.t('ide.quickOpen.placeholder', undefined, {
      defaultValue: 'Search files by name…',
    })
  }

  /**
   * Selects a row: opens its file, then dismisses the picker — React's
   * `onSelect` body. An arrow FIELD, not a method: the template binds the
   * reference into the QuickPicker's input, and a plain method reference would
   * lose `this` when it is invoked.
   *
   * @param item - The selected row's item.
   */
  protected readonly pick = (item: QuickPickerItem): void => {
    this.onFileOpen(item.id)
    this.onDismiss()
  }
}
