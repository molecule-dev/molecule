/**
 * EmbedSnippet component (React parity).
 *
 * @module
 */

import { Component, type DoCheck, ElementRef, inject, type OnDestroy, signal } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { copyTextWithFallback } from '@molecule/app-clipboard'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

import { substituteTemplate } from './substitute.js'
import type { EmbedSnippetControls, EmbedSnippetThemeOption, EmbedSnippetValues } from './types.js'

/** Default theme options used when `controls.theme === true`. */
const DEFAULT_THEME_OPTIONS: ReadonlyArray<{
  value: string
  labelKey: string
  defaultLabel: string
}> = [
  { value: 'light', labelKey: 'embedSnippet.theme.light', defaultLabel: 'Light' },
  { value: 'dark', labelKey: 'embedSnippet.theme.dark', defaultLabel: 'Dark' },
  { value: 'auto', labelKey: 'embedSnippet.theme.auto', defaultLabel: 'Auto' },
]

/**
 * EmbedSnippet component.
 *
 * The "Copy embed code" panel: a substituted snippet inside a `<pre>`, a
 * copy-to-clipboard button with "Copied!" feedback, and (optionally) inline
 * width / height / theme controls bound to `values` + `change`. The host IS
 * the outer `<section>` (`section[mol-embed-snippet]`), matching React's root
 * exactly. Styling routes through ClassMap tokens and every visible string
 * goes through the reactive `useTranslation()`, so a locale switch refreshes
 * the text (React's components re-render through `useTranslation()`).
 */
@Component({
  selector: 'section[mol-embed-snippet]',
  standalone: true,
  imports: [Button],
  inputs: [
    'template',
    'controls',
    'values',
    'language',
    'heading',
    'eyebrow',
    'feedbackMs',
    'molId',
    'className',
    'onChange',
    'onCopy',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'molIdText()',
    '[attr.data-mol-language]': 'languageText()',
    '[attr.aria-label]': 'ariaLabel()',
  },
  template: `<header [attr.data-mol-id]="headerId()" [class]="headerClasses()">
      <div>
        <p
          [attr.data-mol-id]="eyebrowId()"
          [class]="eyebrowClasses()"
          [textContent]="eyebrowText()"
        ></p>
        <h3
          [attr.data-mol-id]="headingId()"
          [class]="headingClasses()"
          [textContent]="headingText()"
        ></h3>
      </div>
      <button
        mol-button
        [variant]="'solid'"
        [size]="'sm'"
        [attr.data-mol-id]="copyButtonId()"
        (click)="copyValue()"
      >
        {{ copyLabel() }}
      </button>
    </header>
    @if (controls) {
      <div [attr.data-mol-id]="controlsId()" [class]="controlsClasses()">
        @if (controls.width) {
          <label [attr.data-mol-id]="controlId('width')" [class]="rowClasses()">
            <span [class]="captionClasses()">{{ widthLabel() }}</span>
            <input
              type="text"
              inputmode="numeric"
              [attr.value]="valueText('width')"
              (input)="onFieldInput('width', $event)"
              [class]="inputClasses()"
              [attr.aria-label]="widthLabel()"
              [attr.data-mol-id]="inputId('width')"
            />
          </label>
        }
        @if (controls.height) {
          <label [attr.data-mol-id]="controlId('height')" [class]="rowClasses()">
            <span [class]="captionClasses()">{{ heightLabel() }}</span>
            <input
              type="text"
              inputmode="numeric"
              [attr.value]="valueText('height')"
              (input)="onFieldInput('height', $event)"
              [class]="inputClasses()"
              [attr.aria-label]="heightLabel()"
              [attr.data-mol-id]="inputId('height')"
            />
          </label>
        }
        @if (themeOptions().length > 0) {
          <label [attr.data-mol-id]="controlId('theme')" [class]="rowClasses()">
            <span [class]="captionClasses()">{{ themeLabel() }}</span>
            <select
              (change)="onThemeChange($event)"
              [class]="selectClasses()"
              [attr.aria-label]="themeLabel()"
              [attr.data-mol-id]="inputId('theme')"
            >
              @for (option of themeOptions(); track option.value) {
                <option [attr.value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>
        }
      </div>
    }
    <pre
      [attr.data-mol-id]="codeId()"
      [class]="codeClasses()"
      translate="no"
    ><code>{{ rendered() }}</code></pre>`,
})
export class EmbedSnippet implements DoCheck, OnDestroy {
  /** Snippet template with `{{width}}`, `{{height}}`, `{{theme}}` placeholders. */
  template = ''
  /** Optional inline controls (width / height / theme) bound to `values`. */
  controls?: EmbedSnippetControls
  /** Current control values. */
  values?: EmbedSnippetValues
  /** Snippet language token (defaults to `'html'` at read time). */
  language?: string
  /** Optional heading override (defaults to a translated `Embed code`). */
  heading?: string
  /** Optional eyebrow override (defaults to a translated `Copy embed code`). */
  eyebrow?: string
  /** How long the "Copied!" feedback lingers (ms; defaults to 1500 at read time). */
  feedbackMs?: number
  /** Stable `data-mol-id` token for the panel root (defaults to `'embed-snippet'`). */
  molId?: string
  /** Extra class string appended to the panel root. */
  className?: string

  /**
   * Called whenever a control changes (React's `onChange`). A function input,
   * so it is bound as `[onChange]=onValuesChange` in the host template.
   */
  onChange?: (next: EmbedSnippetValues) => void

  /**
   * Called after a successful copy (React's `onCopy`). A function input,
   * bound as `[onCopy]=onCopied` in the host template.
   */
  onCopy?: (rendered: string) => void

  /** The element ref of the host (the outer `<section>`). */
  private readonly el = inject(ElementRef)

  /** Reactive translation, read in the injection context (follows locale switches). */
  private readonly i18n = useTranslation()

  /** Whether the last copy succeeded ("Copied!" is showing). */
  private readonly copied = signal(false)

  /** The pending feedback reset timer, cleared when the component dies. */
  private timer?: ReturnType<typeof setTimeout>

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The panel's class list (React's `cm.cn(cm.surface, className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().surface, this.className)
  }

  /**
   * The header's class list.
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'between', gap: 'md' }),
      this.cm().sp('px', 4),
      this.cm().sp('py', 3),
      this.cm().borderB,
    )
  }

  /**
   * The eyebrow's class list.
   * @returns The class string.
   */
  eyebrowClasses(): string {
    return this.cm().cn(
      this.cm().textSize('xs'),
      this.cm().fontWeight('medium'),
      this.cm().textMuted,
    )
  }

  /**
   * The heading's class list.
   * @returns The class string.
   */
  headingClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('bold'))
  }

  /**
   * The controls row's class list.
   * @returns The class string.
   */
  controlsClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
      this.cm().sp('px', 4),
      this.cm().sp('py', 3),
      this.cm().borderB,
    )
  }

  /**
   * One control row's class list.
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }))
  }

  /**
   * A control caption's class list.
   * @returns The class string.
   */
  captionClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().textMuted)
  }

  /**
   * A control input's class list.
   * @returns The class string.
   */
  inputClasses(): string {
    return this.cm().input()
  }

  /**
   * The theme select's class list.
   * @returns The class string.
   */
  selectClasses(): string {
    return this.cm().select()
  }

  /**
   * The code block's class list.
   * @returns The class string.
   */
  codeClasses(): string {
    return this.cm().cn(this.cm().sp('px', 4), this.cm().sp('py', 3), this.cm().textSize('sm'))
  }

  /**
   * The panel's `data-mol-id` (React's `molId` default).
   * @returns The token.
   */
  molIdText(): string {
    return this.molId ?? 'embed-snippet'
  }

  /**
   * The header's `data-mol-id` (React's `` `${molId}-header` ``).
   * @returns The token.
   */
  headerId(): string {
    return `${this.molIdText()}-header`
  }

  /**
   * The eyebrow's `data-mol-id`.
   * @returns The token.
   */
  eyebrowId(): string {
    return `${this.molIdText()}-eyebrow`
  }

  /**
   * The heading's `data-mol-id`.
   * @returns The token.
   */
  headingId(): string {
    return `${this.molIdText()}-heading`
  }

  /**
   * The copy button's `data-mol-id`.
   * @returns The token.
   */
  copyButtonId(): string {
    return `${this.molIdText()}-copy-button`
  }

  /**
   * The controls row's `data-mol-id`.
   * @returns The token.
   */
  controlsId(): string {
    return `${this.molIdText()}-controls`
  }

  /**
   * One control label's `data-mol-id`.
   * @param name - The control's name.
   * @returns The token.
   */
  controlId(name: 'width' | 'height' | 'theme'): string {
    return `${this.molIdText()}-control-${name}`
  }

  /**
   * One control input's `data-mol-id`.
   * @param name - The control's name.
   * @returns The token.
   */
  inputId(name: 'width' | 'height' | 'theme'): string {
    return `${this.molIdText()}-input-${name}`
  }

  /**
   * The code block's `data-mol-id`.
   * @returns The token.
   */
  codeId(): string {
    return `${this.molIdText()}-code`
  }

  /**
   * The snippet language (React's `language` default).
   * @returns The language token.
   */
  languageText(): string {
    return this.language ?? 'html'
  }

  /**
   * The heading text (React's `heading ?? t('embedSnippet.heading', …)`).
   * @returns The heading.
   */
  headingText(): string {
    return (
      this.heading ?? this.i18n.t('embedSnippet.heading', undefined, { defaultValue: 'Embed code' })
    )
  }

  /**
   * The eyebrow text (React's `eyebrow ?? t('embedSnippet.eyebrow', …)`).
   * @returns The eyebrow.
   */
  eyebrowText(): string {
    return (
      this.eyebrow ??
      this.i18n.t('embedSnippet.eyebrow', undefined, { defaultValue: 'Copy embed code' })
    )
  }

  /**
   * The copy button's text, following the copied state and the locale.
   * @returns The button text.
   */
  copyLabel(): string {
    return this.copied()
      ? this.i18n.t('embedSnippet.copied', undefined, { defaultValue: 'Copied!' })
      : this.i18n.t('embedSnippet.copy', undefined, { defaultValue: 'Copy' })
  }

  /**
   * The panel's accessible name (React's `t('embedSnippet.aria.region', { language }, …)`).
   * @returns The label.
   */
  ariaLabel(): string {
    return this.i18n.t(
      'embedSnippet.aria.region',
      { language: this.languageText() },
      { defaultValue: 'Embed code ({{language}})' },
    )
  }

  /**
   * The width control's caption (React's literal
   * `t('embedSnippet.controls.width', …)` — a key built in code is a key the
   * i18n gate cannot see).
   * @returns The caption text.
   */
  widthLabel(): string {
    return this.i18n.t('embedSnippet.controls.width', undefined, { defaultValue: 'Width' })
  }

  /**
   * The height control's caption (React's literal
   * `t('embedSnippet.controls.height', …)`).
   * @returns The caption text.
   */
  heightLabel(): string {
    return this.i18n.t('embedSnippet.controls.height', undefined, { defaultValue: 'Height' })
  }

  /**
   * The theme control's caption (React's literal
   * `t('embedSnippet.controls.theme', …)`).
   * @returns The caption text.
   */
  themeLabel(): string {
    return this.i18n.t('embedSnippet.controls.theme', undefined, { defaultValue: 'Theme' })
  }

  /**
   * The theme options (React's caller array, or the translated defaults for
   * `controls.theme === true`).
   * @returns The options to render.
   */
  themeOptions(): EmbedSnippetThemeOption[] {
    const theme = this.controls?.theme
    if (Array.isArray(theme)) return theme
    if (theme)
      return DEFAULT_THEME_OPTIONS.map((opt) => ({
        value: opt.value,
        label: this.i18n.t(opt.labelKey, undefined, { defaultValue: opt.defaultLabel }),
      }))
    return []
  }

  /**
   * The rendered snippet (React's `substituteTemplate(template, values)`).
   * @returns The snippet text.
   */
  rendered(): string {
    return substituteTemplate(this.template, this.values)
  }

  /**
   * A control input's value text (React's `String(values.<name> ?? '')`).
   * @param name - The control's name.
   * @returns The value text.
   */
  valueText(name: 'width' | 'height'): string {
    return String(this.values?.[name] ?? '')
  }

  /**
   * React's `updateValue({ [name]: value })`: emits the caller's values with
   * one control's value replaced.
   * @param name - The control's name.
   * @param value - Its new value.
   */
  private emitValue(name: keyof EmbedSnippetValues, value: string): void {
    this.onChange?.({ ...(this.values ?? {}), [name]: value })
  }

  /**
   * Handles a width or height input's native event (React's `onWidthChange` /
   * `onHeightChange`).
   * @param name - The control's name.
   * @param event - The native input event.
   */
  onFieldInput(name: 'width' | 'height', event: Event): void {
    this.emitValue(name, (event.target as HTMLInputElement).value)
  }

  /**
   * Handles the theme select's native event (React's `onThemeChange`).
   * @param event - The native change event.
   */
  onThemeChange(event: Event): void {
    this.emitValue('theme', (event.target as HTMLSelectElement).value)
  }

  /**
   * Copies the rendered snippet, then shows the "Copied!" feedback for
   * `feedbackMs` and fires the `copy` output — React's `handleCopy`.
   */
  copyValue(): void {
    const rendered = this.rendered()
    void copyTextWithFallback(rendered).then((copied) => {
      if (!copied) return
      this.copied.set(true)
      this.onCopy?.(rendered)
      this.timer = setTimeout(() => this.copied.set(false), this.feedbackMs ?? 1500)
    })
  }

  /**
   * React's controlled controls: after every change detection the inputs'
   * values and the theme select's selection follow the `values` prop again (the
   * `[attr.value]` binding writes the attribute; the property and the select's
   * selectedness are synced here, with react-dom's first-option fallback).
   */
  ngDoCheck(): void {
    if (!this.controls) return
    const root = this.el.nativeElement as HTMLElement
    const molId = this.molIdText()
    this.syncInput(root, `${molId}-input-width`, this.valueText('width'))
    this.syncInput(root, `${molId}-input-height`, this.valueText('height'))
    this.syncSelect(root, `${molId}-input-theme`, String(this.values?.theme ?? ''))
  }

  /**
   * Syncs one text input's live value to the prop's text.
   * @param root - The host element.
   * @param molId - The input's `data-mol-id`.
   * @param text - The prop's text.
   */
  private syncInput(root: HTMLElement, molId: string, text: string): void {
    const input = root.querySelector<HTMLInputElement>(`input[data-mol-id="${molId}"]`)
    if (input && input.value !== text) input.value = text
  }

  /**
   * Applies the select's controlled value the way react-dom's `updateOptions`
   * does: the matching option, else the first non-disabled option, else none.
   * @param root - The host element.
   * @param molId - The select's `data-mol-id`.
   * @param desired - The value the props currently hold.
   */
  private syncSelect(root: HTMLElement, molId: string, desired: string): void {
    const select = root.querySelector<HTMLSelectElement>(`select[data-mol-id="${molId}"]`)
    if (!select) return
    const options = Array.from(select.options)
    const match = options.find((option) => option.value === desired)
    if (match) {
      match.selected = true
      return
    }
    const fallback = options.find((option) => !option.disabled)
    if (fallback) fallback.selected = true
    else select.selectedIndex = -1
  }

  /** Detaches the feedback timer with the component. */
  ngOnDestroy(): void {
    clearTimeout(this.timer)
  }
}
