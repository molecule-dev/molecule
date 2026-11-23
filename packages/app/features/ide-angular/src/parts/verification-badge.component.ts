/**
 * Inline verification result badge.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `VerificationBadge` (see
 * that file for the design notes): the same inputs (React prop names), the
 * same DOM for the same input, the same behaviour. A green check for a pass —
 * with the stored render-check advisory in the theme's warning token, never an
 * inline colour — and an expandable error card for a failure, its label
 * counted per category and its output behind the disclosure.
 *
 * The component is a part (React renders it inside ChatPanel without exporting
 * it), so it lives in `src/parts/`. React's root is one element chosen by the
 * status (the pass row or the failure card), so the template's element renders
 * in front of the host (`placeContentBefore`) and the host leaves the DOM: the
 * rendered tree is React's, with no wrapper element of its own.
 *
 * Styling uses `getClassMap()` (`cm.*`) for the text and the advisory; the
 * inline styles are the ones React writes (badge geometry, severity tints,
 * disclosure), serialized through `styleText`. All user-facing text goes
 * through `t()`.
 *
 * @module
 */

import { Component, ElementRef, inject } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

/** Props for {@link VerificationBadge} — the React prop names. */
export interface VerificationBadgeProps {
  /** The verification outcome. */
  status: 'ok' | 'error'
  /** The runner's output (shown behind the failure disclosure). */
  output?: string
  /** The workspaces the verification covered. */
  workspaces: string[]
  /** The check categories that reported (`type`, `lint`, `runtime`). */
  categories?: string[]
  /** Whether the stored render check could not run for this pass. */
  renderCheckUnavailable?: boolean
}

/** The pass badge's row layout. */
const PASSED_STYLE = styleText({
  display: 'flex',
  alignItems: 'baseline',
  gap: 6,
  padding: '3px 0px',
  fontSize: 13,
})

/** The pass check glyph's placement. */
const CHECK_STYLE = styleText({
  flexShrink: 0,
  alignSelf: 'center',
  position: 'relative',
  top: -1,
})

/**
 * Inline badge showing a verification status: green check for a pass,
 * expandable error card for a failure.
 */
@Component({
  selector: 'div[mol-verification-badge]',
  standalone: true,
  inputs: ['status', 'output', 'workspaces', 'categories', 'renderCheckUnavailable'],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `@if (status === 'ok') {<div [attr.style]="passedStyle" [class]="cm.textMuted"><svg width="10" height="10" viewBox="0 0 10 10" [attr.style]="checkStyle"><path d="M2 5.5 L4.2 7.8 L8 3" fill="none" stroke="#3fb950" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span>{{ passedLabel() }}@if (renderCheckUnavailable) {<span data-mol-id="render-check-unavailable" [class]="cm.textWarning"> · {{ unavailableLabel() }}</span>}</span></div>} @else {<div [attr.style]="failedCardStyle()"><button type="button" [class]="cm.cn(cm.textSize('xs'), cm.w('full'))" [attr.style]="failureButtonStyle()" (click)="toggle()"><span [attr.style]="labelStyle">{{ failureLabel() }}</span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12" [attr.style]="chevronStyle()"><polyline points="4,6 8,10 12,6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></polyline></svg></button>@if (expanded && output) {<pre [class]="cm.textSize('xs')" [attr.style]="outputStyle()">{{ output }}</pre>}</div>}`,
})
export class VerificationBadge {
  /** The component's own host element, which React does not render. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** Renders the badge's element in front of the host and keeps the host out of the DOM. */
  constructor() {
    usePlacement(() => {
      const host = this.host.nativeElement
      placeContentBefore(host, host)
      setElementPresent(host, false)
    })
  }

  /** The verification outcome. */
  status: VerificationBadgeProps['status'] = 'ok'

  /** The runner's output (shown behind the failure disclosure). */
  output?: string

  /** The workspaces the verification covered. */
  workspaces: string[] = []

  /** The check categories that reported (`type`, `lint`, `runtime`). */
  categories?: string[]

  /** Whether the stored render check could not run for this pass. */
  renderCheckUnavailable = false

  /** Whether the failure card's output is disclosed. */
  expanded = false

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The translation handle (locale-reactive). */
  private readonly i18n = useTranslation()

  /** The pass badge's row layout. */
  protected readonly passedStyle = PASSED_STYLE

  /** The pass check glyph's placement. */
  protected readonly checkStyle = CHECK_STYLE

  /** The failure label's flex slot (React writes `flex: 1`; the CSSOM records `1 1 0%`). */
  protected readonly labelStyle = styleText({ flex: '1 1 0%' })

  /** Toggles the failure output. */
  toggle(): void {
    this.expanded = !this.expanded
  }

  /**
   * The pass copy.
   * @returns The translated "Checks passed".
   */
  protected passedLabel(): string {
    return this.i18n.t('ide.chat.verificationPassed', undefined, {
      defaultValue: 'Checks passed',
    })
  }

  /**
   * The unavailable-advisory copy.
   * @returns The translated advisory.
   */
  protected unavailableLabel(): string {
    return this.i18n.t('ide.chat.renderCheckUnavailable', undefined, {
      defaultValue: 'Render check unavailable',
    })
  }

  /**
   * Whether only lint categories reported (amber, not red).
   * @returns True for a lint-only failure.
   */
  private isLintOnly(): boolean {
    const cats = this.categories ?? []
    return cats.length > 0 && cats.every((category) => category === 'lint')
  }

  /**
   * The failure label: per-category counts, or the generic failure.
   * @returns The translated label.
   */
  protected failureLabel(): string {
    const t = this.i18n.t
    const cats = this.categories ?? []
    const output = this.output
    const errorCount = output ? (output.match(/\berror\b/gi) ?? []).length || 1 : 1
    const warningCount = output ? (output.match(/\bwarning\b/gi) ?? []).length : 0
    const parts: string[] = []
    if (cats.includes('type')) {
      const n = output ? (output.match(/error TS\d+/g) ?? []).length || errorCount : errorCount
      parts.push(
        n === 1
          ? t('ide.chat.typeErrorCount', { count: 1 }, { defaultValue: '1 type error' })
          : t('ide.chat.typeErrorsCount', { count: n }, { defaultValue: '{{count}} type errors' }),
      )
    }
    if (cats.includes('lint')) {
      const n = output ? (output.match(/\d+:\d+\s+error/g) ?? []).length || 1 : 1
      if (n > 0)
        parts.push(
          n === 1
            ? t('ide.chat.lintErrorCount', { count: 1 }, { defaultValue: '1 lint error' })
            : t(
                'ide.chat.lintErrorsCount',
                { count: n },
                { defaultValue: '{{count}} lint errors' },
              ),
        )
      if (warningCount > 0)
        parts.push(
          warningCount === 1
            ? t('ide.chat.lintWarningCount', { count: 1 }, { defaultValue: '1 warning' })
            : t(
                'ide.chat.lintWarningsCount',
                { count: warningCount },
                { defaultValue: '{{count}} warnings' },
              ),
        )
    }
    if (cats.includes('runtime')) {
      parts.push(t('ide.chat.runtimeErrors', undefined, { defaultValue: 'Runtime errors' }))
    }
    return parts.length > 0
      ? parts.join(', ')
      : t('ide.chat.verificationFailed', undefined, { defaultValue: 'Errors found' })
  }

  /**
   * The failure card's chrome.
   * @returns The style attribute text.
   */
  protected failedCardStyle(): string | null {
    return styleText({
      margin: '4px 0px',
      borderRadius: 6,
      border: `1px solid ${this.borderColor()}`,
      background: this.bgColor(),
      overflow: 'hidden',
    })
  }

  /**
   * The failure disclosure's button chrome.
   * @returns The style attribute text.
   */
  protected failureButtonStyle(): string | null {
    return styleText({
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 8px',
      // React writes `none`; the CSSOM records it as `medium`.
      border: 'medium',
      background: 'transparent',
      color: this.textColor(),
      cursor: 'pointer',
      textAlign: 'left',
    })
  }

  /**
   * The disclosure chevron's placement.
   * @returns The style attribute text.
   */
  protected chevronStyle(): string | null {
    return styleText({
      flexShrink: 0,
      transform: this.expanded ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 150ms',
      opacity: 0.6,
    })
  }

  /**
   * The disclosed output's chrome.
   * @returns The style attribute text.
   */
  protected outputStyle(): string | null {
    return styleText({
      margin: '0px',
      padding: '6px 8px',
      borderTop: `1px solid ${this.borderColor()}`,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      maxHeight: 200,
      overflow: 'auto',
      opacity: 0.85,
      fontFamily: 'var(--mol-font-mono, monospace)',
      color: 'inherit',
    })
  }

  /**
   * The failure frame's colour (the CSSOM's spaced `rgba()` form).
   * @returns The border colour.
   */
  private borderColor(): string {
    return this.isLintOnly() ? 'rgba(234, 179, 8, 0.4)' : 'rgba(248, 81, 73, 0.3)'
  }

  /**
   * The failure card's tint.
   * @returns The background colour.
   */
  private bgColor(): string {
    return this.isLintOnly() ? 'rgba(234, 179, 8, 0.06)' : 'rgba(248, 81, 73, 0.06)'
  }

  /**
   * The failure label's colour, as the CSSOM serializes the hex.
   * @returns The text colour.
   */
  private textColor(): string {
    return this.isLintOnly() ? 'rgb(212, 160, 23)' : 'rgb(248, 81, 73)'
  }
}
