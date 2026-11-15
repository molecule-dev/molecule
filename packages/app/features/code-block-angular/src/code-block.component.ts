/**
 * CodeBlock component (React parity).
 *
 * @module
 */

import { Component, type OnDestroy } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

/**
 * CodeBlock component.
 *
 * Read-only code block with an optional header (filename + language tag),
 * optional line numbers, and a copy-to-clipboard button. The host IS the outer
 * `<div>` (`div[mol-code-block]`), matching React's root exactly.
 *
 * Does NOT perform syntax highlighting, and `code` is always rendered as
 * escaped plain text — Angular interpolation escapes it, so pre-highlighted
 * HTML displays as literal tags. To highlight, wrap or replace this component
 * with your highlighter's own renderer. Copy/Copied labels are read through
 * the binding's reactive `useTranslation()`, so a locale switch refreshes the
 * text the way React's `useTranslation()` re-renders it.
 */
@Component({
  selector: 'div[mol-code-block]',
  standalone: true,
  imports: [Button],
  inputs: ['code', 'language', 'showLineNumbers', 'showCopy', 'filename', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // The `<pre>`/`<code>` content is written contiguous: whitespace in this
  // template would render inside the preformatted block.
  template: `@if (hasHeader()) {
      <header [class]="headerClasses()">
        <div [class]="headerInnerClasses()">
          @if (filename) {
            <span [class]="filenameClasses()">{{ filename }}</span>
          }
          @if (language) {
            <span [class]="languageClasses()">{{ language }}</span>
          }
        </div>
        @if (copyEnabled()) {
          <button mol-button [variant]="'ghost'" [size]="'sm'" (click)="copyCode()">
            {{ buttonLabel() }}
          </button>
        }
      </header>
    }
    <pre
      [class]="preClasses()"
    ><code>@if (lineNumbers()) {<span>@for (line of lines(); track $index) {<span><span aria-hidden="true" style="display: inline-block; width: 2.5em; opacity: 0.4; user-select: none">{{ $index + 1 }}</span>{{ line }}{{ eol }}</span>}</span>} @else {<ng-container>{{ code }}</ng-container>}</code></pre>`,
})
export class CodeBlock implements OnDestroy {
  /** Source code to display. */
  code?: string
  /** Language tag shown in the header. */
  language?: string
  /** Show line numbers (defaults to true at read time). */
  showLineNumbers?: boolean
  /** Show a copy-to-clipboard button (defaults to true at read time). */
  showCopy?: boolean
  /** Optional custom filename / caption shown left of the language. */
  filename?: string
  /** Extra classes. */
  className?: string

  /** The newline each rendered line ends with (React's `{'\n'}`). */
  readonly eol = '\n'

  /** Whether the last copy succeeded ("Copied!" is showing). */
  private copied = false

  /** The pending feedback reset timer, cleared when the component dies. */
  private timer?: ReturnType<typeof setTimeout>

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the label on a locale switch.
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper class list (React's `cm.cn(cm.stack(0), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(0), this.className)
  }

  /**
   * The header's class (React's `cm.flex({ justify: 'between', align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().flex({ justify: 'between', align: 'center', gap: 'sm' })
  }

  /**
   * The header's inner row class (React's `cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  headerInnerClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The filename span's class (React's `cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  filenameClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * The language span's class (React's `cm.textSize('xs')`).
   * @returns The class string.
   */
  languageClasses(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The `<pre>` class (React's `cm.cn(cm.sp('p', 3), cm.textSize('sm'))`).
   * @returns The class string.
   */
  preClasses(): string {
    return this.cm().cn(this.cm().sp('p', 3), this.cm().textSize('sm'))
  }

  /**
   * Whether to render line numbers (React's default parameter for `showLineNumbers`).
   * @returns True when line numbers are shown.
   */
  lineNumbers(): boolean {
    return this.showLineNumbers === undefined ? true : this.showLineNumbers
  }

  /**
   * Whether to render the copy button (React's default parameter for `showCopy`).
   * @returns True when the copy button is shown.
   */
  copyEnabled(): boolean {
    return this.showCopy === undefined ? true : this.showCopy
  }

  /**
   * Whether the header renders at all (React's `filename || language || showCopy`).
   * @returns True when the header is shown.
   */
  hasHeader(): boolean {
    return Boolean(this.filename || this.language || this.copyEnabled())
  }

  /**
   * The code split into lines (React's `code.split('\n')`).
   * @returns The lines.
   */
  lines(): string[] {
    return (this.code ?? '').split('\n')
  }

  /**
   * The copy button's text, following the copied state and the locale.
   * @returns The button text.
   */
  buttonLabel(): string {
    return this.copied
      ? this.i18n.t('codeBlock.copied', undefined, { defaultValue: 'Copied!' })
      : this.i18n.t('codeBlock.copy', undefined, { defaultValue: 'Copy' })
  }

  /**
   * Copies the code, then shows the "Copied!" feedback for 1500 ms.
   */
  copyCode(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(this.code ?? '').then(() => {
        this.copied = true
        this.timer = setTimeout(() => {
          this.copied = false
        }, 1500)
      })
    }
  }

  /** Detaches the feedback timer with the component. */
  ngOnDestroy(): void {
    clearTimeout(this.timer)
  }
}
