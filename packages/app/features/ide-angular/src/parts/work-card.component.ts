/**
 * The work tray: one full-width row of chips — plan, background tasks, tests,
 * uncommitted files — that sits UNDER the composer's rounded top edge like a
 * layer behind it. Each section is a `DockStrip` that draws its chip into the
 * row and, when its chip is open, its detail below it; one section is open at
 * a time. The tray has a top, left and right border and no bottom edge: the
 * composer is drawn over its lower 8px.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `WorkCard` (see that
 * file for the design notes): the same DOM for the same input, the same tray
 * state. The host element is React's frame (`div[mol-work-card]` carries the
 * `data-mol-id` and the frame's border and surface); the template holds the
 * chip row, the detail element and the projected strips. The tray holds its
 * state as writable signals ({@link TrayState}, this component's own token)
 * and provides `WorkTrayContext` (the read-only shape the Angular `DockStrip`
 * injects) to its projected content; publishing the header and detail
 * elements happens as soon as the view has them, and the shared parent view
 * is marked for check so the strips' next check reads them. The component is
 * a part (React renders it inside ChatPanel without exporting it), so it
 * lives in `src/parts/`. Styling uses `getClassMap()` (`cm.*`); the only
 * inline styles are layout the ClassMap can't express, serialized through
 * `styleText` the way React writes numbers (`8` → `8px`), with the theme
 * colors in the serialized `rgb()` form React's style attribute carries.
 *
 * @module
 */

import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  InjectionToken,
  signal,
  type WritableSignal,
} from '@angular/core'

import { useThemeMode } from '@molecule/app-angular'
import { styleText } from '@molecule/app-ui-angular'

import { WorkTrayContext, type WorkTrayValue } from './dock-strip.component.js'

/** The frame surface React's style attribute carries, per theme mode. */
const SURFACE = {
  /** Light: an off-white page chip row. */
  light: 'rgb(246, 248, 250)',
  /** Dark: a whisper of white over the page. */
  dark: 'rgba(255, 255, 255, 0.04)',
} as const

/** The frame edge React's style attribute carries, per theme mode. */
const EDGE = {
  /** Light: the hairline gray of a page card. */
  light: 'rgb(208, 215, 222)',
  /** Dark: the hairline gray of a dark card. */
  dark: 'rgb(61, 68, 77)',
} as const

/** The tray's inline styles, serialized the way React writes them. */
const s = {
  /**
   * The frame's edge and surface, exploded into the longhands the DOM keeps.
   *
   * @param isLight - Light theme.
   * @returns The `style` attribute text.
   */
  root: (isLight: boolean): string | null =>
    styleText({
      background: isLight ? SURFACE.light : SURFACE.dark,
      borderColor: `${isLight ? EDGE.light : EDGE.dark} ${isLight ? EDGE.light : EDGE.dark} currentcolor`,
      borderImage: 'none',
      borderRadius: '8px 8px 0 0',
      borderStyle: 'solid solid none',
      borderWidth: '1px 1px medium',
      boxSizing: 'border-box',
      flexShrink: 0,
      // Tucked 8px under the composer, which is drawn on top of it.
      marginBottom: -8,
      paddingBottom: 8,
      position: 'relative',
    }),
  /** The chip row. */
  header: styleText({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
  }),
  /** The open section's detail, scrolled when tall. */
  detail: styleText({ maxHeight: 220, overflowY: 'auto' }),
} as const

/**
 * The tray state the frame itself writes: the element signals writable, the
 * open section and its toggle. `WorkTrayContext` (the strips' read-only view)
 * is provided from the same state.
 */
interface TrayState {
  /** Where the chips go; null until the frame's view has rendered it. */
  headerEl: WritableSignal<HTMLElement | null>
  /** Where the open section's detail goes. */
  detailEl: WritableSignal<HTMLElement | null>
  /** The open section's `molId`, if any. */
  openId: WritableSignal<string | null>
  /** Open this section (or close it, when it is already the open one). */
  toggle(id: string): void
}

/** The tray state token, held writable for the frame itself. */
const TrayStateToken = new InjectionToken<TrayState>('WorkCard.TrayState')

/**
 * Reads the tray state the component provides to its strips.
 *
 * @returns The tray state.
 */
function providedTray(): TrayState {
  return inject(TrayStateToken)
}

/**
 * The work tray frame. The sections (strips) are the projected content.
 */
@Component({
  selector: 'div[mol-work-card]',
  standalone: true,
  providers: [
    {
      provide: TrayStateToken,
      useFactory: (): TrayState => {
        const openId = signal<string | null>(null)
        return {
          headerEl: signal<HTMLElement | null>(null),
          detailEl: signal<HTMLElement | null>(null),
          openId,
          toggle: (id: string): void => {
            openId.set(openId() === id ? null : id)
          },
        }
      },
    },
    {
      provide: WorkTrayContext,
      useFactory: (state: TrayState): WorkTrayValue => ({
        headerEl: state.headerEl,
        detailEl: state.detailEl,
        openId: state.openId,
        toggle: (id: string): void => state.toggle(id),
      }),
      deps: [TrayStateToken],
    },
  ],
  host: {
    'data-mol-id': 'work-card',
    '[attr.style]': 'rootStyle()',
  },
  template: `<div mol-tray-header [attr.style]="s.header"></div>
    <div mol-tray-detail [attr.style]="s.detail"></div>
    <ng-content />`,
})
export class WorkCard {
  /** The tray's inline styles. */
  protected readonly s = s

  /** The tray state the strips read. */
  private readonly tray = providedTray()

  /** The bonded theme mode, read at render the way React reads it. */
  private readonly mode = useThemeMode()

  /** The frame element (React's root div). */
  private readonly hostEl = inject(ElementRef).nativeElement as HTMLElement

  /** Marks for check when a publish first lands, so the strips re-read. */
  private readonly changeDetector = inject(ChangeDetectorRef)

  /**
   * Publishes the two elements once the view exists, and re-checks afterwards
   * so a publish that lands after a strip's check still reaches it (Angular
   * checks this component and its projected strips in one pass, and the
   * strips read the signals in their own checks). The template marks the two
   * elements with `mol-*` attributes the conformance normalizer drops, the
   * way the strip's own detail holder is found.
   */
  ngAfterViewInit(): void {
    this.publishTrayElements()
  }

  /** Publishes again on every check, until the elements are in place. */
  ngDoCheck(): void {
    this.publishTrayElements()
  }

  /**
   * The frame's edge and surface for the current theme mode.
   * @returns The `style` attribute text.
   */
  protected rootStyle(): string | null {
    return s.root(this.mode() === 'light')
  }

  /**
   * Puts the chip row and the detail element where the strips read them. The
   * first publish that actually lands marks the shared parent view for check,
   * so the strips' next check runs in this render cycle; setting a signal to
   * the element it already holds is a no-op and re-marks nothing.
   */
  private publishTrayElements(): void {
    const header = this.hostEl.querySelector<HTMLElement>(':scope > [mol-tray-header]')
    const detail = this.hostEl.querySelector<HTMLElement>(':scope > [mol-tray-detail]')
    if (!header || !detail) return
    if (this.tray.headerEl() === header && this.tray.detailEl() === detail) return
    this.tray.headerEl.set(header)
    this.tray.detailEl.set(detail)
    this.changeDetector.markForCheck()
  }
}
