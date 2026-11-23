/**
 * The collapsible AI thinking/reasoning block.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `ThinkingBlock` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, the same behaviour. It auto-expands while streaming so the
 * user can watch the model think in real time; once streaming ends the manual
 * toggle takes over, and the content scrolls to its bottom as new thinking
 * arrives (React's `useEffect([open, content])`, reproduced here after the view
 * is checked so the measured element exists).
 *
 * The component is a part (React renders it inside ChatPanel without exporting
 * it), so it lives in `src/parts/`. React's root is a single `<div>`, so that
 * element renders in front of the host (`placeElementBefore`) and the host
 * leaves the DOM: the rendered tree is React's, with no wrapper element of its
 * own. The inline styles are written through `[attr.style]`, whose text lands
 * in the DOM as is, so every declaration is pre-serialized the way React's
 * CSSOM records it (`border: medium`, `padding: 2px 0px`). The disclosure label
 * uses the shared `formatThinkingDuration` — no logic is copied.
 *
 * @module
 */

import {
  type AfterViewChecked,
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  placeElementBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import { formatThinkingDuration } from '@molecule/app-ide-panel-logic'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

/** Props for {@link ThinkingBlock} — the React prop names, React's own contract. */
export interface ThinkingBlockProps {
  /** The thinking / reasoning text. */
  content: string
  /** How long the model thought, when the run recorded it. */
  durationMs?: number
  /** Whether the block is still receiving content. */
  isStreaming?: boolean
}

/** The component's static inline styles, serialized once the way React's CSSOM writes them. */
const STYLES = {
  /** The block's bottom rhythm (React's root `<div>`). */
  root: styleText({ marginBottom: '6px' }),
  /** The disclosure toggle's chrome. */
  toggle: styleText({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    // React writes `none`; the CSSOM records it as `medium`.
    border: 'medium',
    cursor: 'pointer',
    color: 'inherit',
    padding: '2px 0px',
  }),
  /** The streaming content's clip and typography. */
  content: styleText({
    paddingLeft: '16px',
    marginTop: '4px',
    maxHeight: '200px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    fontStyle: 'italic',
    opacity: 0.7,
  }),
} as const

/**
 * Collapsible block for displaying AI thinking/reasoning content.
 */
@Component({
  selector: 'div[mol-thinking-block]',
  standalone: true,
  inputs: ['content', 'durationMs', 'isStreaming'],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `<div #root [attr.style]="s.root"><button type="button" (click)="toggle()" [attr.style]="s.toggle"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12" [attr.style]="chevronStyle()"><polyline points="6,4 10,8 6,12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></polyline></svg><span [class]="labelClass">{{ label() }}</span></button>@if (open()) {<div #contentEl [class]="labelClass" [attr.style]="s.content">{{ content }}</div>}</div>`,
})
export class ThinkingBlock implements AfterViewChecked {
  /** The root `<div>` React renders. */
  @ViewChild('root') private root?: ElementRef<HTMLElement>

  /** The component's own host element, which React does not render. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Renders the root in front of the host and keeps the host out of the DOM,
   * and composes the label's ClassMap classes once.
   */
  constructor() {
    usePlacement(() => {
      const root = this.root?.nativeElement
      if (root) placeElementBefore(root, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
    this.labelClass = this.cm.cn(this.cm.textMuted, this.cm.textSize('xs'))
  }

  /** The thinking / reasoning text. */
  content = ''

  /** How long the model thought, when the run recorded it. */
  durationMs?: number

  /** Whether the block is still receiving content. */
  isStreaming = false

  /** React's `manualToggle`: null means "follow `isStreaming`". */
  private readonly manualToggle = signal<boolean | null>(null)

  /** The disclosed content element (present only while open). */
  @ViewChild('contentEl') private contentEl?: ElementRef<HTMLDivElement>

  /** The `open` value the content was last scrolled at. */
  private scrolledOpen: boolean | null = null

  /** The content text the element was last scrolled for. */
  private scrolledContent: string | null = null

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The static style texts. */
  protected readonly s = STYLES

  /** The translated label's ClassMap classes. */
  protected readonly labelClass: string

  /** The translation handle (locale-reactive). */
  private readonly i18n = useTranslation()

  /**
   * Whether the content is disclosed: the manual toggle wins once set, and
   * while streaming the default is open.
   *
   * @returns True when the content renders.
   */
  protected open(): boolean {
    return this.manualToggle() ?? this.isStreaming === true
  }

  /**
   * React's `useEffect([open, content])`: scroll the content to its bottom on
   * mount and whenever the open state or the text changes. Runs after the view
   * is checked, so the element exists when it opened this pass.
   */
  ngAfterViewChecked(): void {
    const open = this.open()
    if (!open) {
      this.scrolledOpen = false
      return
    }
    if (this.scrolledOpen === open && this.scrolledContent === this.content) return
    const element = this.contentEl?.nativeElement
    if (!element) return
    this.scrolledOpen = open
    this.scrolledContent = this.content
    element.scrollTop = element.scrollHeight
  }

  /**
   * The chevron's glyph rotation.
   *
   * @returns The style attribute text.
   */
  protected chevronStyle(): string | null {
    return styleText({
      display: 'block',
      flexShrink: 0,
      opacity: 0.5,
      transform: this.open() ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 150ms',
    })
  }

  /**
   * The disclosure label: the streaming label, the recorded duration, or the
   * brief default.
   *
   * @returns The translated label.
   */
  protected label(): string {
    const t = this.i18n.t
    if (this.isStreaming) return t('ide.chat.thinking', undefined, { defaultValue: 'Thinking' })
    if (this.durationMs != null) return formatThinkingDuration(t, this.durationMs)
    return t('ide.chat.thoughtBriefly', undefined, { defaultValue: 'Thought briefly' })
  }

  /** Flips the manual disclosure state (React's `setManualToggle`). */
  protected toggle(): void {
    const current = this.manualToggle() ?? this.isStreaming === true
    this.manualToggle.set(!current)
  }
}
