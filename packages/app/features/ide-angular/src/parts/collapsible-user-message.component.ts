/**
 * A user message's body, collapsed behind a gradient when it is taller than
 * {@link USER_MSG_COLLAPSE_HEIGHT}, with a full-width chevron strip that
 * expands it.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `CollapsibleUserMessage`
 * (see that file for the design notes): the same inputs (React's `content` and
 * `isLight`), the same DOM for the same input. React measures the body in a
 * `useEffect([content])`; here the measure runs after the view is checked and
 * only when the text changed, which is the same "first render and every content
 * change" contract. The chevron is the strip's only content, so the button names
 * itself with `aria-label` and reports its state with `aria-expanded`.
 *
 * React's root is a single `<div style="position: relative">`, so that element
 * renders in front of the host (`placeElementBefore`) and the host leaves the
 * DOM: the rendered tree is React's, with no wrapper element of its own. The
 * inline styles are written through `[attr.style]`, whose text lands in the DOM
 * as is, so every declaration is pre-serialized the way React's CSSOM writes it
 * (`border: medium`, `padding: 2px 0px`, spaced `rgba()`). All user-facing text
 * goes through `t()`.
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
import { USER_MSG_COLLAPSE_HEIGHT } from '@molecule/app-ide-panel-logic'
import { styleText } from '@molecule/app-ui-angular'

/** Props for {@link CollapsibleUserMessage} — the React prop names, React's own contract. */
export interface CollapsibleUserMessageProps {
  /** The raw message text. */
  content: string
  /** Whether the host theme is light (drives the fade colour). */
  isLight: boolean
}

/** The component's static inline styles, serialized once the way React's CSSOM writes them. */
const STYLES = {
  /** The clipping frame (React's root `<div>`). */
  wrapper: styleText({ position: 'relative' }),
  /** The disclosure strip's chrome. */
  strip: styleText({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '2px 0px',
    margin: '2px 0px 0px',
    background: 'transparent',
    // React writes `none`; the CSSOM records it as `medium`.
    border: 'medium',
    borderRadius: '0 0 4px 4px',
    cursor: 'pointer',
    color: 'inherit',
    transition: 'background 100ms',
  }),
} as const

/**
 * A height-limited user message body with an expand toggle.
 */
@Component({
  selector: 'div[mol-collapsible-user-message]',
  standalone: true,
  inputs: ['content', 'isLight'],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `<div #root [attr.style]="s.wrapper"><div #body [attr.style]="bodyStyle()">{{ content }}</div>@if (overflows() && !expanded()) {<div [attr.style]="fadeStyle()"></div>}@if (overflows()) {<button type="button" [attr.aria-label]="expandLabel()" [attr.aria-expanded]="expanded()" (click)="toggle()" (mouseenter)="onStripHover($event, true)" (mouseleave)="onStripHover($event, false)" [attr.style]="s.strip"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" [attr.style]="chevronStyle()"><polyline points="4,6 8,10 12,6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></polyline></svg></button>}</div>`,
})
export class CollapsibleUserMessage implements AfterViewChecked {
  /** The root `<div>` React renders. */
  @ViewChild('root') private root?: ElementRef<HTMLElement>

  /** The component's own host element, which React does not render. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** Renders the root in front of the host and keeps the host out of the DOM. */
  constructor() {
    usePlacement(() => {
      const root = this.root?.nativeElement
      if (root) placeElementBefore(root, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }

  /** The raw message text. */
  content = ''

  /** Whether the host theme is light (drives the fade colour). */
  isLight = true

  /** Whether the rendered body is taller than the clip, so the strip renders. */
  protected readonly overflows = signal(false)

  /** Whether the body is expanded (React's `useState(false)`). */
  protected readonly expanded = signal(false)

  /** The static style texts. */
  protected readonly s = STYLES

  /** The reactive translation handle. */
  private readonly i18n = useTranslation()

  /** The text the body was last measured with (React's effect dependency). */
  private measuredContent: string | undefined

  /** The clipped body element (React's `innerRef`). */
  @ViewChild('body') private body?: ElementRef<HTMLElement>

  /**
   * Re-measures the body after every check whose text changed — React's
   * `useEffect([content])`, which runs on mount and on every content change.
   */
  ngAfterViewChecked(): void {
    if (this.measuredContent === this.content) return
    const element = this.body?.nativeElement
    if (!element) return
    this.measuredContent = this.content
    this.overflows.set(element.scrollHeight > USER_MSG_COLLAPSE_HEIGHT)
  }

  /**
   * The body's clip (React's `maxHeight`/`overflow`/`whiteSpace`), always set.
   * @returns The style attribute text.
   */
  protected bodyStyle(): string | null {
    return styleText({
      maxHeight: this.expanded() ? 'none' : `${USER_MSG_COLLAPSE_HEIGHT}px`,
      overflow: 'hidden',
      whiteSpace: 'pre-wrap',
    })
  }

  /**
   * The fade drawn over a clipped body while collapsed.
   * @returns The style attribute text.
   */
  protected fadeStyle(): string | null {
    return styleText({
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '40px',
      background: this.isLight
        ? 'linear-gradient(transparent, var(--mol-color-surface-secondary, #f5f5f5))'
        : 'linear-gradient(transparent, var(--mol-color-surface-secondary, #1e1e1e))',
      pointerEvents: 'none',
    })
  }

  /**
   * The chevron's glyph rotation.
   * @returns The style attribute text.
   */
  protected chevronStyle(): string | null {
    return styleText({
      display: 'block',
      opacity: 0.5,
      transform: this.expanded() ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 150ms',
    })
  }

  /**
   * The strip's accessible name: the chevron is its only content.
   * @returns "Show less" while expanded, "Show more" while clipped.
   */
  protected expandLabel(): string {
    return this.expanded()
      ? this.i18n.t('ide.chat.collapseMessage', undefined, { defaultValue: 'Show less' })
      : this.i18n.t('ide.chat.expandMessage', undefined, { defaultValue: 'Show more' })
  }

  /** Toggles the body's overflow disclosure (React's `setExpanded((v) => !v)`). */
  protected toggle(): void {
    this.expanded.update((value) => !value)
  }

  /**
   * The strip's hover background, written straight onto the element the way
   * React's `onMouseEnter`/`onMouseLeave` write `currentTarget.style.background`.
   *
   * @param event - The mouse event.
   * @param entering - True on enter, false on leave.
   */
  protected onStripHover(event: Event, entering: boolean): void {
    const element = event.currentTarget
    if (!(element instanceof HTMLElement)) return
    element.style.background = entering
      ? this.isLight
        ? 'rgba(99,102,241,0.12)'
        : 'rgba(99,102,241,0.18)'
      : 'transparent'
  }
}
