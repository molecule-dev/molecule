/**
 * PasswordGenerator component (React parity).
 *
 * @module
 */

import {
  Component,
  type OnChanges,
  type OnDestroy,
  type OnInit,
  signal,
  type SimpleChanges,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { copyTextWithFallback } from '@molecule/app-clipboard'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

import {
  clampLength,
  DEFAULT_CHARSET,
  generatePassword,
  MAX_LENGTH,
  MIN_LENGTH,
} from './generator.js'
import type { PasswordCharsetOptions } from './types.js'

/**
 * Cryptographically-secure password generator UI.
 *
 * Renders a length slider (`MIN_LENGTH`-`MAX_LENGTH`), six character-class
 * toggles (uppercase / lowercase / digits / symbols / no-similar /
 * no-ambiguous), a copyable read-only output, a regenerate button, and
 * a "Use this password" picker that fires `onPick(password)`.
 *
 * The host IS the outer `<div>` (`div[mol-password-generator]`), matching
 * React's root exactly. Randomness is sourced via `crypto.getRandomValues`
 * (see `./generator.ts`). All styling flows through `getClassMap()` and all
 * user-visible strings through the binding's reactive `t()` — no Tailwind
 * class strings, no hardcoded text.
 */
@Component({
  selector: 'div[mol-password-generator]',
  standalone: true,
  imports: [Button],
  inputs: [
    'defaultLength',
    'defaultCharset',
    'onPick',
    'autoCopy',
    'ariaLabel',
    'dataMolId',
    'className',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
    'data-mol-component': 'password-generator',
  },
  // prettier-ignore
  template: `<div [class]="rowClasses()"
    ><input
      type="text"
      readonly
      [value]="password()"
      [attr.value]="password()"
      (focus)="selectReadout($event)"
      [attr.aria-label]="readoutLabel()"
      data-mol-id="password-readout"
      [class]="readoutClasses()"
      [style]="passwordStyle"
    /><button
      mol-button
      [variant]="'solid'"
      [size]="'sm'"
      (click)="copyNow()"
      data-mol-id="password-copy"
    >{{ copyLabel() }}</button
    ><button
      mol-button
      [variant]="'outline'"
      [size]="'sm'"
      (click)="regenerate()"
      data-mol-id="password-regenerate"
    >{{ regenerateLabel() }}</button
    ></div
  ><div [class]="lengthBlockClasses()"
    ><label for="password-generator-length" [class]="lengthLabelClasses()">{{ lengthLabel() }}</label
    ><input
      id="password-generator-length"
      type="range"
      [min]="minLength"
      [max]="maxLength"
      [step]="1"
      [value]="length()"
      [attr.value]="length()"
      (input)="onLengthInput($event)"
      [attr.aria-label]="lengthAria()"
      data-mol-id="password-length"
      [style]="sliderStyle"
    /></div
  ><div [class]="togglesClasses()"
    ><label [class]="toggleRowClasses()" data-mol-id="password-toggle-uppercase"
      ><input
        type="checkbox"
        [checked]="charset().uppercase"
        [attr.checked]="initialCharset.uppercase ? '' : null"
        (change)="onToggle('uppercase', $event)"
        [attr.aria-label]="uppercaseLabel()"
      /><span [class]="cm.textSize('sm')">{{ uppercaseLabel() }}</span></label
    ><label [class]="toggleRowClasses()" data-mol-id="password-toggle-lowercase"
      ><input
        type="checkbox"
        [checked]="charset().lowercase"
        [attr.checked]="initialCharset.lowercase ? '' : null"
        (change)="onToggle('lowercase', $event)"
        [attr.aria-label]="lowercaseLabel()"
      /><span [class]="cm.textSize('sm')">{{ lowercaseLabel() }}</span></label
    ><label [class]="toggleRowClasses()" data-mol-id="password-toggle-digits"
      ><input
        type="checkbox"
        [checked]="charset().digits"
        [attr.checked]="initialCharset.digits ? '' : null"
        (change)="onToggle('digits', $event)"
        [attr.aria-label]="digitsLabel()"
      /><span [class]="cm.textSize('sm')">{{ digitsLabel() }}</span></label
    ><label [class]="toggleRowClasses()" data-mol-id="password-toggle-symbols"
      ><input
        type="checkbox"
        [checked]="charset().symbols"
        [attr.checked]="initialCharset.symbols ? '' : null"
        (change)="onToggle('symbols', $event)"
        [attr.aria-label]="symbolsLabel()"
      /><span [class]="cm.textSize('sm')">{{ symbolsLabel() }}</span></label
    ><label [class]="toggleRowClasses()" data-mol-id="password-toggle-noSimilar"
      ><input
        type="checkbox"
        [checked]="charset().noSimilar"
        [attr.checked]="initialCharset.noSimilar ? '' : null"
        (change)="onToggle('noSimilar', $event)"
        [attr.aria-label]="noSimilarLabel()"
      /><span [class]="cm.textSize('sm')">{{ noSimilarLabel() }}</span></label
    ><label [class]="toggleRowClasses()" data-mol-id="password-toggle-noAmbiguous"
      ><input
        type="checkbox"
        [checked]="charset().noAmbiguous"
        [attr.checked]="initialCharset.noAmbiguous ? '' : null"
        (change)="onToggle('noAmbiguous', $event)"
        [attr.aria-label]="noAmbiguousLabel()"
      /><span [class]="cm.textSize('sm')">{{ noAmbiguousLabel() }}</span></label
    ></div
  >@if (onPick) {
    <button mol-button [variant]="'solid'" [size]="'md'" (click)="pickNow()" data-mol-id="password-pick">{{
      pickLabel()
    }}</button>
  }`,
})
export class PasswordGenerator implements OnInit, OnChanges, OnDestroy {
  /** Initial password length. Clamped to `[8, 64]`. Defaults to `20`. */
  defaultLength?: number
  /** Optional initial charset overrides (read once, at mount). */
  defaultCharset?: Partial<PasswordCharsetOptions>
  /** Called when the user clicks "Use this password". */
  onPick?: (password: string) => void
  /** Write every freshly-generated password to the clipboard. */
  autoCopy?: boolean
  /** Optional aria-label override on the read-only password output. */
  ariaLabel?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Extra wrapper classes. */
  className?: string

  /** The slider's lower bound (React's `MIN_LENGTH`). */
  protected readonly minLength = MIN_LENGTH
  /** The slider's upper bound (React's `MAX_LENGTH`). */
  protected readonly maxLength = MAX_LENGTH

  /** React's inline style for the read-only readout. */
  protected readonly passwordStyle =
    'font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; word-break: break-all; letter-spacing: 0.04em'
  /** React's inline style for the slider track. */
  protected readonly sliderStyle = 'width: 100%'

  /** The reactive i18n binding, read in the injection context. */
  private readonly i18n = useTranslation()

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The current password length. */
  protected readonly length = signal(clampLength(20))

  /** The current charset toggles. */
  protected readonly charset = signal<PasswordCharsetOptions>({ ...DEFAULT_CHARSET })

  /** The displayed password. */
  protected readonly password = signal('')

  /** Whether the last copy succeeded ("Copied!" is showing). */
  protected readonly copied = signal(false)

  /**
   * The charset as it was at mount — React's controlled checkbox carries the
   * `checked` ATTRIBUTE from mount (react-dom writes `defaultChecked`) and
   * only the live property afterwards.
   */
  protected initialCharset: PasswordCharsetOptions = { ...DEFAULT_CHARSET }

  /** The pending feedback reset timer, cleared when the component dies. */
  private copiedTimer?: ReturnType<typeof setTimeout>

  /**
   * React's `useState` initializers: read the props once, at mount. A later
   * `defaultLength` / `defaultCharset` prop change does not reset the state.
   */
  ngOnInit(): void {
    const initialLength = clampLength(this.defaultLength ?? 20)
    this.initialCharset = { ...DEFAULT_CHARSET, ...this.defaultCharset }
    this.length.set(initialLength)
    this.charset.set(this.initialCharset)
    this.password.set(generatePassword(initialLength, this.initialCharset))
    // React's mount effect regenerates once more; the displayed password is
    // that second draw, exactly as in React.
    this.regenerate()
  }

  /**
   * React's effect dependency on `autoCopy`: enabling it regenerates.
   *
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    const autoCopy = changes['autoCopy']
    if (autoCopy && !autoCopy.firstChange) this.regenerate()
  }

  /** Detaches the feedback timer with the component. */
  ngOnDestroy(): void {
    clearTimeout(this.copiedTimer)
  }

  /**
   * The wrapper class list (React's `cm.cn(cm.stack(2), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm.cn(this.cm.stack(2), this.className)
  }

  /**
   * The readout row's class (React's `cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm.flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The readout input's class list (React's `cm.cn(cm.input(), cm.flex1)`).
   * @returns The class string.
   */
  readoutClasses(): string {
    return this.cm.cn(this.cm.input(), this.cm.flex1)
  }

  /**
   * The length block's class (React's `cm.stack(1)`).
   * @returns The class string.
   */
  lengthBlockClasses(): string {
    return this.cm.stack(1)
  }

  /**
   * The length label's class list (React's `cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  lengthLabelClasses(): string {
    return this.cm.cn(this.cm.textSize('xs'), this.cm.fontWeight('semibold'))
  }

  /**
   * The toggles container's class (React's `cm.flex({ direction: 'col', gap: 'xs' })`).
   * @returns The class string.
   */
  togglesClasses(): string {
    return this.cm.flex({ direction: 'col', gap: 'xs' })
  }

  /**
   * One toggle row's class (React's `cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  toggleRowClasses(): string {
    return this.cm.flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The readout's accessible label (React's `ariaLabel ?? t('password-generator.readoutLabel')`).
   * @returns The label text.
   */
  readoutLabel(): string {
    return (
      this.ariaLabel ??
      this.i18n.t('password-generator.readoutLabel', {}, { defaultValue: 'Generated password' })
    )
  }

  /**
   * The copy button's text (React's `t('password-generator.copied'|'password-generator.copy')`).
   * @returns The button text.
   */
  copyLabel(): string {
    return this.copied()
      ? this.i18n.t('password-generator.copied', {}, { defaultValue: 'Copied!' })
      : this.i18n.t('password-generator.copy', {}, { defaultValue: 'Copy' })
  }

  /**
   * The regenerate button's text (React's `t('password-generator.regenerate')`).
   * @returns The button text.
   */
  regenerateLabel(): string {
    return this.i18n.t('password-generator.regenerate', {}, { defaultValue: 'Regenerate' })
  }

  /**
   * The length label (React's `t('password-generator.length', { length })`).
   * @returns The label text.
   */
  lengthLabel(): string {
    return this.i18n.t(
      'password-generator.length',
      { length: this.length() },
      { defaultValue: 'Length: {{length}}' },
    )
  }

  /**
   * The slider's accessible label (React's `t('password-generator.lengthLabel')`).
   * @returns The label text.
   */
  lengthAria(): string {
    return this.i18n.t('password-generator.lengthLabel', {}, { defaultValue: 'Password length' })
  }

  /**
   * The uppercase toggle's label (React's `t('password-generator.toggle.uppercase')`).
   * @returns The label text.
   */
  uppercaseLabel(): string {
    return this.i18n.t(
      'password-generator.toggle.uppercase',
      {},
      { defaultValue: 'Uppercase (A-Z)' },
    )
  }

  /**
   * The lowercase toggle's label (React's `t('password-generator.toggle.lowercase')`).
   * @returns The label text.
   */
  lowercaseLabel(): string {
    return this.i18n.t(
      'password-generator.toggle.lowercase',
      {},
      { defaultValue: 'Lowercase (a-z)' },
    )
  }

  /**
   * The digits toggle's label (React's `t('password-generator.toggle.digits')`).
   * @returns The label text.
   */
  digitsLabel(): string {
    return this.i18n.t('password-generator.toggle.digits', {}, { defaultValue: 'Digits (0-9)' })
  }

  /**
   * The symbols toggle's label (React's `t('password-generator.toggle.symbols')`).
   * @returns The label text.
   */
  symbolsLabel(): string {
    return this.i18n.t('password-generator.toggle.symbols', {}, { defaultValue: 'Symbols (!@#…)' })
  }

  /**
   * The no-similar toggle's label (React's `t('password-generator.toggle.noSimilar')`).
   * @returns The label text.
   */
  noSimilarLabel(): string {
    return this.i18n.t(
      'password-generator.toggle.noSimilar',
      {},
      { defaultValue: 'Skip similar (0/O/1/l/I)' },
    )
  }

  /**
   * The no-ambiguous toggle's label (React's `t('password-generator.toggle.noAmbiguous')`).
   * @returns The label text.
   */
  noAmbiguousLabel(): string {
    return this.i18n.t(
      'password-generator.toggle.noAmbiguous',
      {},
      { defaultValue: 'Skip ambiguous (space, quotes)' },
    )
  }

  /**
   * The pick button's text (React's `t('password-generator.pick')`).
   * @returns The button text.
   */
  pickLabel(): string {
    return this.i18n.t('password-generator.pick', {}, { defaultValue: 'Use this password' })
  }

  /**
   * Generates a fresh password for the current length and charset, and copies
   * it when `autoCopy` is on — React's `regenerate`.
   */
  regenerate(): void {
    const next = generatePassword(this.length(), this.charset())
    this.password.set(next)
    if (this.autoCopy) this.writeClipboard(next)
  }

  /**
   * React's range `onChange`: clamps the value, stores it and regenerates.
   *
   * @param event - The native input event.
   */
  onLengthInput(event: Event): void {
    this.length.set(clampLength(Number((event.target as HTMLInputElement).value)))
    this.regenerate()
  }

  /**
   * React's checkbox `onChange`: flips one charset toggle and regenerates.
   *
   * @param key - The toggle's charset key.
   * @param event - The native change event.
   */
  onToggle(key: keyof PasswordCharsetOptions, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked
    this.charset.set({ ...this.charset(), [key]: checked })
    this.regenerate()
  }

  /**
   * Selects the readout's content on focus (React's
   * `onFocus={(e) => e.target.select()}`), so manual Ctrl/Cmd+C works.
   *
   * @param event - The native focus event.
   */
  selectReadout(event: FocusEvent): void {
    ;(event.target as HTMLInputElement).select()
  }

  /** Copies the displayed password (React's `copyNow`). */
  copyNow(): void {
    this.writeClipboard(this.password())
  }

  /** Hands the displayed password to `onPick` (React's `pickNow`). */
  pickNow(): void {
    this.onPick?.(this.password())
  }

  /**
   * Lazy clipboard write — never blocks the regenerate path on failure.
   *
   * @param value - The password text to copy.
   */
  private writeClipboard(value: string): void {
    void copyTextWithFallback(value).then((copiedOk) => {
      if (!copiedOk) return
      this.copied.set(true)
      if (this.copiedTimer) clearTimeout(this.copiedTimer)
      this.copiedTimer = setTimeout(() => this.copied.set(false), 1500)
    })
  }
}
